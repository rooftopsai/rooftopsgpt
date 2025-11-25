// app > api > analyze-roof > route.ts

import axios from 'axios';
import { NextResponse } from 'next/server';
import sharp from 'sharp';

interface SatelliteView {
  imageData: string;
  viewName: string;
  timestamp: string;
}

interface RoofingMetrics {
    facetCount?: number | null;
    facetCountRange?: [number,number] | null;
  
    roofArea?: number | null;
    roofAreaRange?: [number,number] | null;
  
    squares?: number | null;
    squaresRange?: [number,number] | null;
  
    ridgeLength?: number | null;
    ridgeLengthRange?: [number,number] | null;
  
    valleyLength?: number | null;
    valleyLengthRange?: [number,number] | null;
  
    complexity: string | null;
    confidence: string | null;
  
    pitchEstimates: Record<string,string> | null;
    materialRecommendations: string[] | null;
    maintenanceIssues: string[] | null;
    installationChallenges: string[] | null;

    userSummary: string | null;
  }
  

// Function to optimize image and convert to proper format for LLM APIs
async function optimizeImage(imageBase64: string): Promise<string> {
  try {
    // Extract the base64 data from the data URL
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
      console.error('Invalid image data URL format');
      // If format is invalid, return original without prefix
      if (imageBase64.includes('base64,')) {
        return imageBase64.split('base64,')[1];
      }
      return imageBase64;
    }
    
    const contentType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Process the image - resize and compress while maintaining quality
    const optimizedBuffer = await sharp(buffer)
      .resize({
        width: 800, 
        height: 600, 
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ 
        quality: 100,
        progressive: true,
        optimizeScans: true
      })
      .toBuffer();
    
    // Return just the base64 data without prefix as required by Anthropic API
    return optimizedBuffer.toString('base64');
  } catch (error) {
    console.error('Error optimizing image:', error);
    // Return original data but strip prefix if present
    if (typeof imageBase64 === 'string' && imageBase64.includes('base64,')) {
      return imageBase64.split('base64,')[1];
    }
    return imageBase64;
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();
  let processingSteps: string[] = [];
  
  try {
    // Parse request body
    const body = await request.json();
    const { 
      satelliteViews, 
      address, 
      model = 'claude-3-7-sonnet-20250219',
      provider = 'anthropic',
      debug = false
    } = body;
    
    processingSteps.push(`Received request for address: ${address}`);
    processingSteps.push(`Using model: ${model}`);
    processingSteps.push(`Provider: ${provider}`);
    
    if (!satelliteViews || satelliteViews.length === 0) {
      return NextResponse.json(
        { error: 'No satellite views provided' },
        { status: 400 }
      );
    }
    
    // Check API keys
    if (provider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
      console.error("Anthropic API key is missing");
      return NextResponse.json(
        { error: 'Server configuration error: Anthropic API key missing' },
        { status: 500 }
      );
    }
    
    if (provider === 'openai' && !process.env.OPENAI_API_KEY) {
      console.error("OpenAI API key is missing");
      return NextResponse.json(
        { error: 'Server configuration error: OpenAI API key missing' },
        { status: 500 }
      );
    }
    
    processingSteps.push(`Processing ${satelliteViews.length} satellite view images`);
    
    // Process all satellite views
    const optimizedViews = await Promise.all(
      satelliteViews.map(async (view: SatelliteView, index: number) => {
        if (!view) return null;
        
        try {
          processingSteps.push(`Optimizing ${view.viewName} view image`);
          const optimizedData = await optimizeImage(view.imageData);
          return {
            ...view,
            imageData: optimizedData,
          };
        } catch (error) {
          console.error(`Error processing ${view.viewName} view:`, error);
          processingSteps.push(`Error processing ${view.viewName} view: ${error.message}`);
          return null;
        }
      })
    );
    
    // Filter out null views
    const validViews = optimizedViews.filter(view => view !== null);
    
    if (validViews.length === 0) {
      return NextResponse.json(
        { error: 'No valid satellite views after processing' },
        { status: 400 }
      );
    }
    
    processingSteps.push(`Successfully processed ${validViews.length} valid views`);

    // Create the expert roofing prompt with proper quoting
    const expertPrompt = `
    ## The Task
    As an expert roofing analyst, I need your detailed assessment of a property at ${address}. I'm providing ${validViews.length} satellite images showing the roof from different angles. 
    Focus on the property most centered in these images and compare all images to determine the most accurate details about the subject property. 
    
    ## Focus on real accuracy
    We are pursuing highly accurate number of facets and square footage of the roof so that we can determine the number of squares needed to replace the subject roof.

    ## Evaluate the images as if a real person would
    Keep in mind that there may be shadows on the roof so examine the images closely to most accuractly determine the specific details like facets and size. 
    I have done my best to outline the different facets on the roof but you need to look at all angles and determine the most likely number of facets in a range with a margin of error of plus or minus 2. 
    The green lines represent a grid to assist in measurements.

    ## Generate the following report
    Please analyze the following aspects with professional accuracy:

1. ROOF GEOMETRY:
   - Count all distinct roof facets/planes. If you are unable to be precise, give a small ranged estimate.
   - Identify ridge lines, valleys, hips, and dormers
   - Approximate the total roof area in square feet

2. MATERIAL ASSESSMENT:
   - Identify probable roofing material and condition
   - Note signs of aging, damage, or maintenance issues 
   - Evaluate solar potential based on orientation

3. INSTALLATION CONSIDERATIONS:
   - Identify access challenges or safety concerns
   - Note complex features requiring special attention
   - Estimate total ridge and valley lengths (in feet)

4. QUANTITATIVE METRICS (provide specific numbers):
   - Total facet count range
   - Estimated roof area (sq. ft)
   - Estimated number of roofing squares
   - Total Ridges/hips length (linear ft)  
   - Total Valley length (linear ft)
   - Complexity rating (simple, moderate, complex)
   - Confidence level in your assessment (low or medium, never high, if low explain why in 1-3 words)

+  5. USER SUMMARY (240-250 characters):
   - Make this summary impressive to a seasoned roofing industry professional
   - Always begin the summary with "Based on what I can see"
   - Provide a single, clear sentence that a home services representative or homeowner can read in one breath.
   - Keep it under 250 characters but more than 240 characters
   - Include the roof area estimate, estimated squares, estimated facets, current roofing material, and complexity of roof
   - If there is any obstruction keeping you from being able to understand the property, mention that
   - Mention the complexity level of the roof based on the size and number of facets (flat roof = simple / steep and multiple facets = complex / most roofs will likely be moderate) 
   - End with the confidence level you have of your analysis (low if there is high obstruction or low quality image, medium if it is clear, never use high because its still an estimate using AI)

Provide a concise but comprehensive assessment with specific measurements and observations. If you cannot be precise, give a small range so that the reader of the report can have valuable takeaways.

This analysis will be used for professional roofing estimates, so accuracy is critical.`;

    // Route to appropriate LLM provider
    if (provider === 'anthropic') {
      return await analyzeWithAnthropic(validViews, expertPrompt, model, processingSteps, startTime);
    } else if (provider === 'openai') {
      return await analyzeWithOpenAI(validViews, expertPrompt, model, processingSteps, startTime);
    } else {
      return NextResponse.json(
        { error: `Unknown provider: ${provider}` },
        { status: 400 }
      );
    }
    
  } catch (error: any) {
    console.error('Error in request processing:', error);
    processingSteps.push(`Request processing error: ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'Failed to process request', 
        details: error.message,
        processingSteps
      },
      { status: 500 }
    );
  }
}

// Analyze with Anthropic's Claude
async function analyzeWithAnthropic(
  validViews: any[],
  expertPrompt: string,
  model: string,
  processingSteps: string[],
  startTime: number
) {
  // Prepare the messages for Claude
  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: expertPrompt
        }
      ]
    }
  ];
  
  // Add each satellite view
  for (const view of validViews) {
    messages.push({
      role: 'user',
      content: [
        {
          type: 'text',
          text: `This is the ${view.viewName} view of the property. Pay attention to any unique features or perspectives visible from this angle.`
        },
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: view.imageData
          }
        }
      ]
    });
  }
  
  processingSteps.push(`Prepared messages for Anthropic API with ${messages.length} content blocks`);
  
  // Send to Claude API
  try {
    processingSteps.push(`Sending request to Anthropic API`);
    
    const claudeResponse = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: model,
        max_tokens: 4000,
        temperature: 0.1, // Lower temperature for more consistent and precise responses
        system: "You are an expert roofing analyst with experience in satellite imagery interpretation. Provide accurate, detailed, and precise measurements when analyzing roofs. Include specific numbers whenever possible.",
        messages: messages
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        timeout: 120000 // 2 minute timeout
      }
    );
    
    const endTime = Date.now();
    const requestDuration = endTime - startTime;
    
    processingSteps.push(`Received response from Anthropic API in ${requestDuration}ms`);
    
    // Get the LLM's response text
    const analysisText = claudeResponse.data.content[0].text;
    
    // Parse results to extract structured data
    const structuredData = parseRoofingMetrics(analysisText);
    
    return NextResponse.json({
      rawAnalysis: analysisText,
      structuredData,
      processingSteps,
      requestDuration,
      debug: {
        modelUsed: model,
        provider: 'anthropic',
        viewsProcessed: validViews.length,
        promptLength: expertPrompt.length,
        responseTime: requestDuration
      }
    });
    
  } catch (error: any) {
    console.error("Anthropic API call failed:", error.message);
    processingSteps.push(`API call failed: ${error.message}`);
    
    // Enhanced error logging
    if (error.response) {
      console.error("Error status:", error.response.status);
      console.error("Error details:", error.response.data);
      processingSteps.push(`Error status: ${error.response.status}`);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze roof with Anthropic API',
        details: error.response?.data || error.message,
        processingSteps
      },
      { status: error.response?.status || 500 }
    );
  }
}

// Analyze with OpenAI models
async function analyzeWithOpenAI(
  validViews: any[],
  expertPrompt: string,
  model: string,
  processingSteps: string[],
  startTime: number
) {
  try {
    processingSteps.push(`Preparing request for OpenAI API`);
    
    // Prepare content for OpenAI
    const messages = [
      {
        role: 'system',
        content: "You are an expert roofing analyst with experience in satellite imagery interpretation. Provide accurate, detailed, and precise measurements when analyzing roofs. Include specific numbers whenever possible."
      },
      {
        role: 'user',
        content: []
      }
    ];
    
    // Add the main prompt
    messages[1].content.push({
      type: 'text',
      text: expertPrompt
    });
    
    // Add each satellite view
    for (const view of validViews) {
      messages[1].content.push({
        type: 'text',
        text: `This is the ${view.viewName} view of the property. Pay attention to any unique features or perspectives visible from this angle.`
      });
      
      messages[1].content.push({
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${view.imageData}`
        }
      });
    }
    
    processingSteps.push(`Sending request to OpenAI API using model ${model}`);
    
    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: model,
        messages: messages,
        max_tokens: 4000,
        temperature: 0.1
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        timeout: 120000 // 2 minute timeout
      }
    );
    
    const endTime = Date.now();
    const requestDuration = endTime - startTime;
    
    processingSteps.push(`Received response from OpenAI API in ${requestDuration}ms`);
    
    // Get the LLM's response text
    const analysisText = openaiResponse.data.choices[0].message.content;
    
    // Parse results to extract structured data
    const structuredData = parseRoofingMetrics(analysisText);
    
    return NextResponse.json({
      rawAnalysis: analysisText,
      structuredData,
      processingSteps,
      requestDuration,
      debug: {
        modelUsed: model,
        provider: 'openai',
        viewsProcessed: validViews.length,
        promptLength: expertPrompt.length,
        responseTime: requestDuration
      }
    });
    
  } catch (error: any) {
    console.error("OpenAI API call failed:", error.message);
    processingSteps.push(`API call failed: ${error.message}`);
    
    // Enhanced error logging
    if (error.response) {
      console.error("Error status:", error.response.status);
      console.error("Error details:", error.response.data);
      processingSteps.push(`Error status: ${error.response.status}`);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze roof with OpenAI API',
        details: error.response?.data || error.message,
        processingSteps
      },
      { status: error.response?.status || 500 }
    );
  }
}

// Helper function to parse the LLM response into structured data that's useful for roofers
function parseRoofingMetrics(analysis: string): RoofingMetrics {
    function extractRange(re: RegExp): [number,number] | null {
      const m = analysis.match(re);
      if (m && m[1] && m[2]) {
        return [
          parseInt(m[1].replace(/,/g,''), 10),
          parseInt(m[2].replace(/,/g,''), 10)
        ];
      }
      return null;
    }
  
    // 1) FACETS
    const facetCountRange = extractRange(/facet\s*count(?:\s*range)?\s*[:\s]+(\d+)\s*[-–]\s*(\d+)/i);
    const facetCountSingle = facetCountRange
      ? null
      : (() => {
        const m = analysis.match(/total\s*facet\s*count\s*[:\s]+(\d+)/i);
        return m ? parseInt(m[1],10) : null;
      })();
  
    // 2) AREA
    const roofAreaRange = extractRange(/roof\s*area(?:\s*range)?\s*[:\s]+([\d,]+)\s*[-–]\s*([\d,]+)/i);
    const roofAreaSingle = roofAreaRange
      ? null
      : (() => {
        const m = analysis.match(/estimated\s*total\s*roof\s*area\s*[:\s]+([\d,]+)\s*sq/i);
        return m ? parseFloat(m[1].replace(/,/g,'')) : null;
      })();
  
    // 3) SQUARES
    const squaresRange = extractRange(/roofing\s*squares(?:\s*range)?\s*[:\s]+(\d+)\s*[-–]\s*(\d+)/i);
    const squaresSingle = squaresRange
      ? null
      : (() => {
        const m = analysis.match(/estimated\s*number\s*of\s*roofing\s*squares\s*[:\s]+(\d+)/i);
        return m ? parseInt(m[1],10) : null;
      })();
  
    // 4) RIDGE
    const ridgeRange = extractRange(/ridge(?:s|\/hips)?\s*length(?:\s*range)?\s*[:\s]+(\d+)\s*[-–]\s*(\d+)/i);
    const ridgeSingle = ridgeRange
      ? null
      : (() => {
        const m = analysis.match(/total\s*ridge(?:s|\/hips)?\s*length\s*[:\s]+(\d+)/i);
        return m ? parseInt(m[1],10) : null;
      })();
  
    // 5) VALLEY
    const valleyRange = extractRange(/valley\s*length(?:\s*range)?\s*[:\s]+(\d+)\s*[-–]\s*(\d+)/i);
    const valleySingle = valleyRange
      ? null
      : (() => {
        const m = analysis.match(/total\s*valley\s*length\s*[:\s]+(\d+)/i);
        return m ? parseInt(m[1],10) : null;
      })();
  
    // 6) COMPLEXITY & CONFIDENCE
    const complexityMatch = analysis.match(/complexity.*?[:\s]+(simple|moderate|complex)/i);
    const confidenceMatch = analysis.match(/confidence.*?[:\s]+(low|medium|high)/i);
  
    // 7) PITCH, MATERIALS, MAINTENANCE, INSTALLATION (same as before)
    const pitchEstimates: Record<string,string> = {};
    const pitchRegex = /(\w+(?:\s+\w+)?)\s+facet[^:]*?pitch[^:]*:\s*(\d+\/\d+)/gi;
    let pm: RegExpExecArray | null;
    while ((pm = pitchRegex.exec(analysis)) !== null) {
      pitchEstimates[pm[1].toLowerCase()] = pm[2];
    }
  
    const materialRecommendations: string[] = [];
    const matSection = analysis.match(/(?:recommended|suitable|appropriate)\s+materials?[^:]*:(.+?)(?:\n\n|\n[A-Z]|\s*$)/is);
    if (matSection?.[1]) {
      materialRecommendations.push(
        ...matSection[1].split(/[,;\n]/).map(s => s.trim()).filter(s => s)
      );
    }
  
    const maintenanceIssues: string[] = [];
    const maintSection = analysis.match(/(?:maintenance|issues?|concerns?)\s*:[^:]*:(.+?)(?:\n\n|\n[A-Z]|\s*$)/is);
    if (maintSection?.[1]) {
      maintenanceIssues.push(
        ...maintSection[1].split(/[,;\n]/).map(s => s.trim()).filter(s => s)
      );
    }
  
    const installationChallenges: string[] = [];
    const instSection = analysis.match(/(?:installation|challenges?|considerations?)\s*:[^:]*:(.+?)(?:\n\n|\n[A-Z]|\s*$)/is);
    if (instSection?.[1]) {
      installationChallenges.push(
        ...instSection[1].split(/[,;\n]/).map(s => s.trim()).filter(s => s)
      );
    }

    const userSummaryMatch = analysis.match(
        /USER SUMMARY[^\n\r]*[:\-]\s*(.+)/i
      );
      const userSummary = userSummaryMatch
        ? userSummaryMatch[1].trim().slice(0, 350)  // enforce 250-char cap
        : null;
  
    return {
      facetCount: facetCountSingle,
      facetCountRange,
      roofArea: roofAreaSingle,
      roofAreaRange,
      squares: squaresSingle,
      squaresRange,
      ridgeLength: ridgeSingle,
      ridgeLengthRange: ridgeRange,
      valleyLength: valleySingle,
      valleyLengthRange: valleyRange,
      complexity: complexityMatch?.[1] ?? null,
      confidence: confidenceMatch?.[1] ?? null,
      pitchEstimates: Object.keys(pitchEstimates).length ? pitchEstimates : null,
      materialRecommendations: materialRecommendations.length ? materialRecommendations : null,
      maintenanceIssues: maintenanceIssues.length ? maintenanceIssues : null,
      installationChallenges: installationChallenges.length ? installationChallenges : null,
      userSummary
    };
  }
  