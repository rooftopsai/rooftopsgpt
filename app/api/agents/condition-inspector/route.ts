// @ts-nocheck
// Agent 2: Condition Inspector
// Analyzes all 6 views for material identification, condition assessment, damage detection

import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 180 // 3 minutes for AI processing

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { allImages, address, measurementData } = body

    if (!allImages || allImages.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 })
    }

    const prompt = `You are Agent 2: CONDITION INSPECTOR - A master roofer specializing in condition assessment and material identification.

YOUR EXCLUSIVE MISSION: Assess roof condition, identify materials, and detect damage or wear.

🧠 CRITICAL: ANALYZE LIKE A HUMAN INSPECTOR FROM ALL ANGLES
You have access to ${allImages.length} images showing this roof from multiple angles. Use this unique advantage:
• Examine ALL images - what's obscured by shadows in one angle may be clear in another
• Don't be fooled by shadows - verify features across multiple angles before making conclusions
• If trees block part of the roof, look at other angles to see hidden areas
• Cross-reference observations: If you see damage/wear in one image, verify it appears from other angles
• When image quality is low or trees obstruct views in all angles, make your BEST EDUCATED GUESS based on:
  - What you CAN see clearly
  - Architectural patterns (if one section shows wear, similar sections likely have similar conditions)
  - Building age indicators visible in unobstructed areas
  - Material consistency across visible portions

Think like a professional inspector walking around the property with a drone - combine all perspectives to form a complete assessment.

═══════════════════════════════════════════════════════════════════
🔍 YOUR SPECIALIZATION: CONDITION & MATERIAL ASSESSMENT
═══════════════════════════════════════════════════════════════════

You are analyzing: ${address}

You have ${allImages.length} views (overhead + angled views from all cardinal directions).
${
  measurementData
    ? `
The Measurement Specialist (Agent 1) has determined:
• Facet Count: ${measurementData.measurements?.facetCount || "N/A"}
• Total Roof Area: ${measurementData.measurements?.totalRoofArea || "N/A"} sq ft
• Complexity: ${measurementData.measurements?.complexity || "N/A"}
`
    : ""
}

═══════════════════════════════════════════════════════════════════
📋 YOUR CONDITION ASSESSMENT WORKFLOW
═══════════════════════════════════════════════════════════════════

STEP 1: MATERIAL IDENTIFICATION
Examine all views closely to identify roofing material:
• Asphalt Shingles (3-tab or architectural/dimensional)
• Metal Roofing (standing seam, corrugated, metal shingles)
• Tile (clay, concrete, slate)
• Flat/Low-slope (TPO, EPDM, built-up, modified bitumen)
• Wood Shakes/Shingles
• Other specialty materials

Look for:
- Texture patterns (granular for asphalt, smooth for metal, distinct shapes for tile)
- Color and finish
- Installation pattern (horizontal lines, overlapping scales, etc.)
- Reflectivity and sheen

STEP 2: CONDITION ASSESSMENT
Rate the overall condition on this scale:

• NEW (0-3 years): Pristine, no visible wear, vibrant color
• EXCELLENT (4-7 years): Minimal wear, intact, no visible damage
• GOOD (8-12 years): Light wear, all shingles intact, minor color fading
• FAIR (13-18 years): Moderate wear, some granule loss, visible aging
• POOR (19-25 years): Significant wear, curling/cracking, nearing end of life
• FAILING (25+ years): Severe damage, missing shingles, immediate replacement needed

STEP 3: DAMAGE DETECTION
Look for specific issues:
• Missing, loose, or damaged shingles/tiles
• Curling, cupping, or blistering
• Granule loss (bare spots on asphalt shingles)
• Moss, algae, or biological growth
• Sagging or waviness (structural concerns)
• Storm damage (hail dents, wind damage)
• Rust or corrosion (metal roofs)
• Cracked or broken tiles
• Poor flashing around chimneys/vents/skylights
• Gutter issues or ice dam evidence

STEP 4: AGE ESTIMATION
Based on material type, wear patterns, and condition:
• Estimate installation year or age range
• Consider typical lifespan for this material type
• Estimate remaining useful life

STEP 5: MAINTENANCE & RISK FACTORS
• Trees overhanging (debris, moss risk, impact damage)
• Vegetation on roof (immediate concern)
• Complex geometry (water pooling, ice dam risk)
• Valley wear (high water flow areas)
• Flashing condition around penetrations
• Ventilation adequacy (visible vents, ridge vents)

STEP 6: URGENCY ASSESSMENT
• IMMEDIATE: Failing roof, active leaks likely, safety concerns
• URGENT (1-2 years): Poor condition, plan replacement soon
• PLANNED (3-5 years): Fair condition, budget for future replacement
• MONITOR (5-10 years): Good condition, routine maintenance
• EXCELLENT (10+ years): New/excellent condition, no concerns

═══════════════════════════════════════════════════════════════════
✅ CRITICAL: RESPOND WITH VALID JSON ONLY
═══════════════════════════════════════════════════════════════════

{
  "agent": "condition_inspector",
  "condition": {
    "material": {
      "type": "<specific material type>",
      "subtype": "<e.g. architectural shingles, standing seam metal>",
      "color": "<observed color>",
      "confidence": "<low|medium|high>"
    },
    "overallCondition": "<new|excellent|good|fair|poor|failing>",
    "estimatedAge": {
      "years": <number or range>,
      "installationYearEstimate": <year or range>,
      "confidence": "<low|medium|high>"
    },
    "remainingLifespan": {
      "years": <number or range>,
      "percentage": <0-100>,
      "confidence": "<low|medium|high>"
    },
    "damageAssessment": {
      "hasDamage": <boolean>,
      "damageTypes": ["<list any damage observed>"],
      "severity": "<none|minor|moderate|severe|critical>",
      "details": "<description of any damage>"
    },
    "specificIssues": [
      {
        "issue": "<issue name>",
        "location": "<where on roof>",
        "severity": "<minor|moderate|severe>",
        "description": "<details>"
      }
    ],
    "riskFactors": [
      "<list environmental or structural risk factors>"
    ],
    "maintenanceNeeds": [
      "<list recommended maintenance actions>"
    ],
    "urgency": "<immediate|urgent|planned|monitor|excellent>",
    "urgencyReason": "<why this urgency level>"
  },
  "viewAnalysis": {
    "overheadObservations": "<what you saw in overhead views>",
    "northViewObservations": "<what you saw from north>",
    "eastViewObservations": "<what you saw from east>",
    "southViewObservations": "<what you saw from south>",
    "westViewObservations": "<what you saw from west>"
  },
  "recommendations": [
    "<list prioritized recommendations for homeowner>"
  ],
  "professionalAssessment": "<your complete narrative assessment as an expert>",
  "confidence": "<low|medium|high>",
  "uncertainties": "<any aspects you're unsure about>"
}

NO MARKDOWN. NO CODE BLOCKS. JUST RAW JSON.`

    // Build message content with images
    const messageContent: any[] = [
      {
        type: "text",
        text: prompt
      }
    ]

    // Add all images
    allImages.forEach((img: any) => {
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
                "You are a specialized roof condition inspector. Respond only with valid JSON."
            },
            {
              role: "user",
              content: messageContent
            }
          ],
          temperature: 0.4, // Slightly higher for condition assessment nuance
          max_completion_tokens: 4000
        })
      }
    )

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error("OpenAI API error:", errorText)
      return NextResponse.json(
        { error: "Failed to analyze condition", details: errorText },
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
        agent: "condition_inspector",
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
    console.error("Condition Inspector error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}
