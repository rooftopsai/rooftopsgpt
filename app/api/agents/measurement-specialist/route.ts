// @ts-nocheck
// Agent 1: Measurement Specialist
// Analyzes overhead images for precise measurements: facet counting, area calculation, pitch estimation

import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { overheadImages, solarData, address } = body

    if (!overheadImages || overheadImages.length === 0) {
      return NextResponse.json(
        { error: "No overhead images provided" },
        { status: 400 }
      )
    }

    const prompt = `You are Agent 1: MEASUREMENT SPECIALIST - An expert roof measurement technician with 30+ years of experience.

YOUR EXCLUSIVE MISSION: Provide the most accurate roof measurements possible.

⚠️ CRITICAL ACCURACY REQUIREMENT ⚠️
Your facet count accuracy is being measured. You will be evaluated on how close your count is to the actual facet count.
DO NOT RUSH. DO NOT GUESS. COUNT EVERY SINGLE FACET CAREFULLY.

🚨 MANDATORY COUNTING PROCESS 🚨
You MUST follow this exact step-by-step process. Do NOT skip any step:

STEP A: Use the DETAIL (zoomed in) image. Zoom level is very close - you can see individual shingles and every crease.

STEP B: Count ALL ridge lines you can see (peaks where two slopes meet at the top). Each ridge line means AT LEAST 2 facets.

STEP C: Count ALL valley lines you can see (V-shaped areas where two slopes meet at the bottom). Each valley connects exactly 2 facets.

STEP D: Count ALL hip lines you can see (diagonal lines from eave to peak). Each hip separates 2 facets.

STEP E: Look for any lower-level structures (porches, bay windows, attached garages). Count their facets separately.

STEP F: Add up your totals and double-check against what you see in BOTH images.

STEP G: If your count seems low compared to the complexity you see, YOU MISSED FACETS. Recount.

═══════════════════════════════════════════════════════════════════
📐 YOUR SPECIALIZATION: MEASUREMENTS ONLY
═══════════════════════════════════════════════════════════════════

You are analyzing overhead satellite imagery for: ${address}

You have been provided ${overheadImages.length} overhead views optimized for measurement:
• CONTEXT view: Overall structure understanding
• DETAIL view: VERY close-up, zoomed in view - USE THIS FOR FACET COUNTING (it shows every ridge, valley, and crease clearly)

Each image includes:
✓ Edge detection highlighting roof planes
✓ 10x10 measurement grid overlay
✓ Bright yellow scale bar (20 meters / 65 feet)
✓ Shadow compensation and sharpening
✓ North arrow for orientation

${
  solarData
    ? `
═══════════════════════════════════════════════════════════════════
📊 GOOGLE SOLAR API REFERENCE DATA
═══════════════════════════════════════════════════════════════════

Ground truth measurements from Google Solar API:
• Roof Area: ${solarData.roofArea ? Math.round(solarData.roofArea) : "N/A"} sq ft
• Solar Panels Fit: ${solarData.maxPanels || "N/A"} panels
• Building Area: ${solarData.buildingArea ? Math.round(solarData.buildingArea) : "N/A"} sq ft

Use these as REFERENCE ONLY - you must verify visually with the imagery.
═══════════════════════════════════════════════════════════════════
`
    : ""
}

═══════════════════════════════════════════════════════════════════
📋 YOUR MEASUREMENT WORKFLOW
═══════════════════════════════════════════════════════════════════

STEP 1: COUNT EVERY ROOF PLANE (FACETS) - CRITICAL ACCURACY REQUIRED
A facet = any distinct flat surface that meets another surface at a different angle.

🎯 VISUAL DETECTION TECHNIQUES:
• CREASES/RIDGES: Look for EVERY visible crease, fold, or ridge line - these indicate separate facets
• SHADOW ANALYSIS: Don't be fooled by shadows! Shadows fall on SINGLE facets. Look for actual geometric breaks
• TEXTURE CHANGES: Where shingle lines change direction = different facet
• HIP LINES: Diagonal lines running from eave to peak = separate facets on each side
• VALLEY LINES: V-shaped junctions where water flows = separate facets meeting
• DORMERS: Each dormer face is a separate facet (front, sides, top)
• SKYLIGHTS/PENETRATIONS: Look around them for facet boundaries

⚠️ COMMON MISTAKES TO AVOID:
• ❌ Don't count shadows as facet boundaries - verify with multiple images
• ❌ Don't miss small facets on bay windows, chimney crickets, or porch roofs
• ❌ Don't overlook garage roofs attached to main structure
• ❌ Don't miss facets on lower levels or second stories
• ❌ Don't count flat areas with slight wear/discoloration as separate facets

✅ SYSTEMATIC COUNTING PROCESS:
1. Start with MAIN ROOF STRUCTURE:
   - Gable roof (simplest) = 2 main facets (front + back)
   - Hip roof = 4+ main facets (2 primary + 2 hip ends)
   - Complex roof = count each visible plane where shingles meet at an angle

2. Add DORMER FACETS (each dormer adds multiple facets):
   - Gable dormer = 3 facets (front triangle + 2 side slopes)
   - Shed dormer = 1 facet (single sloped plane)
   - Hip dormer = 3-4 facets (multiple angled planes)

3. Add GARAGE/ATTACHED STRUCTURES:
   - Count garage roof facets separately
   - Include attached porch roofs

4. Add LOWER LEVEL FEATURES:
   - Bay window roofs (often 2-3 small facets)
   - Covered entry porches
   - Sunroom/addition roofs

5. VERIFY YOUR COUNT:
   - Count ridges (peaks) - each ridge has facets on both sides
   - Count valleys - each valley connects exactly 2 facets
   - Count hips - each hip line separates 2 facets
   - Use BOTH zoom levels to confirm small facets aren't missed

🔍 CROSS-REFERENCE METHOD:
Look at the same roof from MULTIPLE angles in your images. If you can see a crease or ridge line from DIFFERENT directions, it's definitely a separate facet boundary.

📚 FACET COUNTING EXAMPLES TO LEARN FROM:

Example 1: SIMPLE GABLE ROOF
- Main structure: 2 facets (front slope + back slope)
- 1 garage: +2 facets (garage has 2 slopes)
- TOTAL: 4 facets

Example 2: HIP ROOF WITH DORMERS
- Main hip structure: 4 facets (2 main sides + 2 hip ends)
- 2 gable dormers: +6 facets (each dormer = 3 facets: front + 2 sides)
- 1 small porch: +2 facets
- TOTAL: 12 facets

Example 3: COMPLEX L-SHAPED HOUSE
- Main section (hip): 4 facets
- L-section (gable): 2 facets
- 3 dormers: +9 facets (3 × 3)
- Garage: +2 facets
- Bay window roof: +2 facets
- Small porch: +1 facet
- TOTAL: 20 facets

🎯 CRITICAL COUNTING RULES:
1. Use the DETAIL (zoomed in) image for primary counting - it shows facet boundaries clearly
2. Use the CONTEXT image to verify you didn't miss entire sections
3. Count EVERY visible ridge, hip, or valley line - each represents a facet boundary
4. If you're unsure between 2 numbers, choose the HIGHER count (better to overcount than undercount)
5. Trace each facet with your analysis - literally enumerate them: "Facet 1: front main slope, Facet 2: back main slope, Facet 3: north garage slope..." etc.

⚠️ MANDATORY: In your methodology, you MUST list out each facet individually to prove your count.

STEP 2: MEASURE ROOF AREA (USE SOLAR API AS VALIDATION)
Using the BRIGHT YELLOW scale bar (20m / 65ft):
1. Count grid squares covering the roof footprint
2. Calculate area per grid square from scale bar
3. Multiply: squares × area = footprint area
4. Estimate pitch from shadows and angles
5. Apply pitch multiplier:
   - Low slope (≤4/12): +5-8%
   - Medium (6/12): +12%
   - Medium-steep (8/12): +20%
   - Steep (10/12+): +30%+

${
  solarData
    ? `
🎯 CRITICAL: Cross-check your measurement against Solar API data (${Math.round(solarData.roofArea || 0)} sq ft)
- If your measurement differs by >15%, RE-CHECK your grid counting and pitch estimate
- Solar API is highly accurate - use it to validate your visual assessment
- Common issue: underestimating pitch multiplier leads to low total area
`
    : ""
}

STEP 3: MEASURE LINEAR FEATURES
• Ridge length (peak lines)
• Valley length (where planes meet)
• Hip length (angled corners)
• Eave length (roof edges)

STEP 4: ASSESS COMPLEXITY
• Simple: Basic gable or hip, few valleys
• Moderate: Multiple planes, some dormers
• Complex: Many facets, multiple levels, intricate valleys

STEP 5: DETERMINE CONFIDENCE
• HIGH: Clear views, measurements align, no obstructions
• MEDIUM: Some trees/shadows but main structure clear
• LOW: Heavy obstruction, unclear features

═══════════════════════════════════════════════════════════════════
✅ CRITICAL: RESPOND WITH VALID JSON ONLY
═══════════════════════════════════════════════════════════════════

{
  "agent": "measurement_specialist",
  "measurements": {
    "facetCount": <number>,
    "facetCountRange": [<min>, <max>],
    "roofFootprintArea": <sq ft>,
    "estimatedPitch": "<e.g. 6/12>",
    "pitchMultiplier": <1.12 for 6/12 pitch>,
    "totalRoofArea": <sq ft including pitch>,
    "roofAreaRange": [<min>, <max>],
    "squares": <area/100>,
    "ridgeLength": <linear feet>,
    "valleyLength": <linear feet>,
    "hipLength": <linear feet>,
    "eaveLength": <linear feet>,
    "complexity": "<simple|moderate|complex>",
    "confidence": "<low|medium|high>"
  },
  "methodology": "REQUIRED: Document your counting process following Steps A-G above. Show your work for ridge lines, valley lines, hip lines, and lower structures.",
  "stepByStepCounting": {
    "stepB_ridgeLines": {
      "count": <number of ridge lines you see>,
      "description": "Describe each ridge line location",
      "facetsImplied": <number - usually count × 2>
    },
    "stepC_valleyLines": {
      "count": <number of valley lines you see>,
      "description": "Describe each valley line location",
      "facetsConnected": <number - each valley connects 2 facets>
    },
    "stepD_hipLines": {
      "count": <number of hip lines you see>,
      "description": "Describe each hip line location",
      "facetsSeparated": <number - each hip separates 2 facets>
    },
    "stepE_lowerStructures": {
      "count": <number of lower structures (porches, garage, etc)>,
      "description": "List each structure and its facet count",
      "facetsTotal": <sum of all lower structure facets>
    },
    "stepF_totalCalculation": "Explain how you arrived at your total facet count using the counts above",
    "stepG_validationCheck": "Did your count seem low? Did you recount? Explain."
  },
  "facetBreakdown": {
    "mainRoofFacets": <number - main structure facets>,
    "dormerFacets": <number - all dormer facets combined>,
    "garageFacets": <number - garage roof facets>,
    "otherFacets": <number - porches, bay windows, etc>,
    "totalFacets": <number - must match facetCount above>,
    "enumeratedList": "MANDATORY: List each facet: 'Facet 1: [description], Facet 2: [description], ...' up to your total count. This proves you actually counted each one."
  },
  "observations": "Key structural observations: ridge lines, valley lines, hip lines, dormers, attached structures",
  "uncertainties": "Any aspects you're unsure about or areas that need on-site verification",
  "comparisonToSolarAPI": "${solarData ? `How does your ${Math.round(solarData.roofArea || 0)} sq ft Solar API reference compare to your measurement? If significantly different, explain why and which is more reliable.` : "N/A - no Solar API data available"}"
}

NO MARKDOWN. NO CODE BLOCKS. JUST RAW JSON.`

    // Build message content with images
    const messageContent: any[] = [
      {
        type: "text",
        text: prompt
      }
    ]

    // Add overhead images
    overheadImages.forEach((img: any) => {
      messageContent.push({
        type: "image_url",
        image_url: {
          url: img.imageData,
          detail: "high"
        }
      })
    })

    // Call OpenAI API with GPT-5.1
    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-5.1-2025-11-13",
          messages: [
            {
              role: "system",
              content:
                "You are a specialized roof measurement expert. Respond only with valid JSON."
            },
            {
              role: "user",
              content: messageContent
            }
          ],
          temperature: 0.3, // Lower temperature for precise measurements
          max_completion_tokens: 4000
        })
      }
    )

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error("OpenAI API error:", errorText)
      return NextResponse.json(
        { error: "Failed to analyze measurements", details: errorText },
        { status: 500 }
      )
    }

    const data = await openaiResponse.json()
    const content = data.choices[0]?.message?.content

    // Parse JSON response
    try {
      const jsonMatch =
        content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) ||
        content.match(/(\{[\s\S]*\})/)
      const result = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(content)

      return NextResponse.json({
        success: true,
        agent: "measurement_specialist",
        data: result,
        model: "gpt-5.1-2025-11-13",
        tokensUsed: data.usage
      })
    } catch (parseError) {
      console.error("Failed to parse agent response:", parseError)
      return NextResponse.json(
        { error: "Failed to parse agent response", rawContent: content },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Measurement Specialist error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}
