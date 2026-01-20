// Measurement Specialist Agent - Pure function (no Next.js dependencies)
// Extracted core logic from app/api/agents/measurement-specialist/route.ts

// ═══════════════════════════════════════════════════════════════════
// MODEL CONFIGURATION - Change this to switch between models
// ═══════════════════════════════════════════════════════════════════
const MODEL_CONFIG = {
  provider: "openai" as "openai" | "anthropic", // Switch between "openai" or "anthropic"
  model:
    "gpt-5.1-2025-11-13" as
      | "gpt-5.1-2025-11-13"
      | "claude-opus-4-5-20251101",
  temperature: 0.3,
  maxTokens: 4000
}

export async function runMeasurementSpecialist({
  overheadImages,
  solarData,
  address
}: {
  overheadImages: any[]
  solarData?: any
  address: string
}) {
  if (!overheadImages || overheadImages.length === 0) {
    throw new Error("No overhead images provided")
  }

  const prompt = `You are Agent 1: MEASUREMENT SPECIALIST - A human expert roof measurement technician with 30+ years of experience.

YOUR EXCLUSIVE MISSION: Provide the most accurate roof measurements and facet count possible.

⚠️ CRITICAL ACCURACY REQUIREMENT ⚠️
Do this task the way a human would. Humans would look at all angles of the roof and count each facet. They would know that shadows may be deceiving. They would know that if a tree or something is blocking part of the view they would use other angles to make the best educated guess. Your facet count accuracy is being measured. You will be evaluated on how close your count is to the actual facet count.
DO NOT RUSH. DO NOT GUESS. COUNT EVERY SINGLE FACET CAREFULLY.

🚨 MANDATORY COUNTING PROCESS 🚨
You MUST follow this exact step-by-step process. Do NOT skip any step:

STEP A: Use all of the detailed images of the roof for the property most centered in the image. It is possible a neighboring house is in part of an image but ignore it. You are doing this as if you are a human using their same technique. Zoom level is very close - you can see individual shingles and every crease.

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
• Roof Area: ${solarData.totalRoofAreaSqFt ? Math.round(solarData.totalRoofAreaSqFt) : "N/A"} sq ft
• Roof Segment Count: ${solarData.roofSegmentCount || "N/A"} segments
• Building Area: ${solarData.buildingAreaSqFt ? Math.round(solarData.buildingAreaSqFt) : "N/A"} sq ft

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

🧠 CRITICAL: ANALYZE LIKE A HUMAN VIEWING FROM ALL ANGLES
You have a UNIQUE ADVANTAGE over traditional roof inspectors - you can see this roof from MULTIPLE overhead angles simultaneously. Use this to your advantage:

• MULTI-ANGLE ANALYSIS: Examine ALL provided images (Context + Detail views). A facet boundary that's subtle in one image may be obvious in another angle.
• SHADOW DISAMBIGUATION: If shadows obscure part of the roof in one image, check the other angles. Shadows fall differently from each direction - USE THIS to see past them and identify true facet boundaries.
• TREE COVERAGE WORKAROUND: If trees block part of the roof in one angle, look at the other images. What's hidden from one perspective is often visible from another.
• CROSS-REFERENCE VALIDATION: If you see a ridge line or valley in one image, verify it appears in the other angles. This confirms it's a real geometric feature, not an artifact.
• LOW QUALITY COMPENSATION: If image quality is poor or trees significantly obstruct the view in ALL angles:
  - Make your BEST EDUCATED GUESS based on what you CAN see
  - Use architectural logic: If you see one side of a gable with 2 facets, the other side likely mirrors it
  - Use roof complexity patterns: A hip roof with 2 dormers visible likely has similar features on the obscured side
  - Consider the building footprint: An L-shaped house suggests multiple roof sections even if partially hidden
  - ALWAYS provide your reasoning in the methodology section when making educated guesses

Think like a human inspector walking around the property - you're seeing it from multiple vantage points. Combine all angles to form a complete mental model of the roof structure.

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

4. ADD LOWER LEVEL FEATURES:
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
🎯 CRITICAL: Cross-check your measurement against Solar API data (${Math.round(solarData.totalRoofAreaSqFt || 0)} sq ft)
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
  "comparisonToSolarAPI": "${solarData ? `How does your ${Math.round(solarData.totalRoofAreaSqFt || 0)} sq ft Solar API reference compare to your measurement? If significantly different, explain why and which is more reliable.` : "N/A - no Solar API data available"}"
}

NO MARKDOWN. NO CODE BLOCKS. JUST RAW JSON.`

  // Build message content with images
  const messageContent: any[] = [
    {
      type: "text",
      text: prompt
    }
  ]

  // Add overhead images (format based on provider)
  overheadImages.forEach((img: any) => {
    if (MODEL_CONFIG.provider === "anthropic") {
      // Anthropic format: base64 image
      const imageData = img.imageData
      if (imageData.startsWith("data:")) {
        const matches = imageData.match(/^data:(.+?);base64,(.+)$/)
        if (matches) {
          const mediaType = matches[1]
          const base64Data = matches[2]
          messageContent.push({
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64Data
            }
          })
        }
      }
    } else {
      // OpenAI format: image_url
      messageContent.push({
        type: "image_url",
        image_url: {
          url: img.imageData,
          detail: "high"
        }
      })
    }
  })

  // Call appropriate API based on provider
  let response: Response
  let data: any
  let content: string

  if (MODEL_CONFIG.provider === "anthropic") {
    // Call Anthropic API
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key":
          process.env.GLOBAL_ANTHROPIC_API_KEY ||
          process.env.ANTHROPIC_API_KEY ||
          "",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL_CONFIG.model,
        max_tokens: MODEL_CONFIG.maxTokens,
        temperature: MODEL_CONFIG.temperature,
        system:
          "You are a specialized roof measurement expert. Respond only with valid JSON.",
        messages: [
          {
            role: "user",
            content: messageContent
          }
        ]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Anthropic API error:", errorText)
      throw new Error(`Failed to analyze measurements: ${errorText}`)
    }

    data = await response.json()
    content = data.content[0]?.text
  } else {
    // Call OpenAI API
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL_CONFIG.model,
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
        temperature: MODEL_CONFIG.temperature,
        max_completion_tokens: MODEL_CONFIG.maxTokens
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("OpenAI API error:", errorText)
      throw new Error(`Failed to analyze measurements: ${errorText}`)
    }

    data = await response.json()
    content = data.choices[0]?.message?.content
  }

  // Parse JSON response
  try {
    const jsonMatch =
      content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) ||
      content.match(/(\{[\s\S]*\})/)
    const result = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(content)

    return {
      success: true,
      agent: "measurement_specialist",
      data: result,
      model: MODEL_CONFIG.model,
      tokensUsed: data.usage
    }
  } catch (parseError) {
    console.error("Failed to parse agent response:", parseError)
    throw new Error(`Failed to parse agent response: ${content}`)
  }
}
