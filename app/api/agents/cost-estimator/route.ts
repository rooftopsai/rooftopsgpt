// @ts-nocheck
// Agent 3: Cost Estimator
// Takes measurement and condition data to generate material needs and cost estimates

import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { measurementData, conditionData, address, location } = body

    if (!measurementData || !conditionData) {
      return NextResponse.json(
        { error: "Missing measurement or condition data" },
        { status: 400 }
      )
    }

    const prompt = `You are Agent 3: COST ESTIMATOR - A roofing contractor specializing in accurate project estimates and material calculations.

YOUR EXCLUSIVE MISSION: Calculate material needs and provide cost estimates based on measurements and condition assessment.

═══════════════════════════════════════════════════════════════════
💰 YOUR SPECIALIZATION: COST ESTIMATION & MATERIAL PLANNING
═══════════════════════════════════════════════════════════════════

Property: ${address}
${location ? `Location: ${location.lat}, ${location.lng}` : ""}

═══════════════════════════════════════════════════════════════════
📊 DATA FROM OTHER AGENTS
═══════════════════════════════════════════════════════════════════

MEASUREMENT SPECIALIST (Agent 1) determined:
• Total Roof Area: ${measurementData.measurements?.totalRoofArea || "N/A"} sq ft
• Roofing Squares: ${measurementData.measurements?.squares || "N/A"}
• Facet Count: ${measurementData.measurements?.facetCount || "N/A"}
• Pitch: ${measurementData.measurements?.estimatedPitch || "N/A"}
• Ridge Length: ${measurementData.measurements?.ridgeLength || "N/A"} ft
• Valley Length: ${measurementData.measurements?.valleyLength || "N/A"} ft
• Complexity: ${measurementData.measurements?.complexity || "N/A"}

CONDITION INSPECTOR (Agent 2) determined:
• Current Material: ${conditionData.condition?.material?.type || "N/A"}
• Overall Condition: ${conditionData.condition?.overallCondition || "N/A"}
• Estimated Age: ${conditionData.condition?.estimatedAge?.years || "N/A"} years
• Urgency: ${conditionData.condition?.urgency || "N/A"}
• Damage Present: ${conditionData.condition?.damageAssessment?.hasDamage ? "Yes" : "No"}
• Damage Severity: ${conditionData.condition?.damageAssessment?.severity || "None"}

═══════════════════════════════════════════════════════════════════
📋 YOUR COST ESTIMATION WORKFLOW
═══════════════════════════════════════════════════════════════════

STEP 1: MATERIAL CALCULATIONS
Based on the roof area and complexity, calculate:

A. PRIMARY ROOFING MATERIAL
   - Shingles/material needed (squares + 10-15% waste factor)
   - Adjust waste factor for complexity:
     • Simple: +10%
     • Moderate: +12%
     • Complex: +15%

B. UNDERLAYMENT
   - Synthetic underlayment (1 roll per 4 squares typically)
   - Ice & water shield for valleys, eaves (linear feet needed)

C. RIDGE CAP SHINGLES
   - Based on ridge length (calculate linear feet needed)
   - Typical: 1 bundle per 35 linear feet

D. VALLEY MATERIAL
   - Based on valley length
   - Metal valley or woven valley considerations

E. STARTER STRIPS
   - Based on eave length (perimeter calculation)

F. VENTILATION
   - Ridge vent (linear feet of ridge)
   - Roof vents or turbines (1 per 300 sq ft typically)

G. FLASHING
   - Pipe boots, chimney flashing, wall flashing
   - Estimate based on typical penetrations

H. FASTENERS
   - Nails/screws (estimate based on area and material type)

I. DRIP EDGE
   - Eave and rake edges (linear feet needed)

STEP 2: LABOR ESTIMATION
Calculate labor hours and cost:
- Tear-off (if replacement): 0.5-1.5 hours per square depending on layers
- Installation: 1.5-3 hours per square depending on complexity and pitch
- Complexity factors:
  • Simple roof: Lower end
  • Moderate: Middle range
  • Complex: Higher end, add 20-30%
- Steep pitch surcharge: +15-25% for 8/12 or steeper

STEP 3: COST RANGES BY MATERIAL TYPE
Provide estimates for common material options:

A. ASPHALT SHINGLES (3-tab)
   - Material: $90-$150 per square
   - Labor: $150-$250 per square
   - Total: $240-$400 per square

B. ASPHALT SHINGLES (Architectural/Dimensional)
   - Material: $150-$250 per square
   - Labor: $175-$300 per square
   - Total: $325-$550 per square

C. METAL ROOFING (Standing Seam)
   - Material: $400-$700 per square
   - Labor: $300-$500 per square
   - Total: $700-$1,200 per square

D. METAL SHINGLES/PANELS
   - Material: $300-$500 per square
   - Labor: $250-$400 per square
   - Total: $550-$900 per square

E. TILE (Concrete)
   - Material: $300-$500 per square
   - Labor: $400-$600 per square
   - Total: $700-$1,100 per square

F. TILE (Clay)
   - Material: $600-$1,000 per square
   - Labor: $500-$800 per square
   - Total: $1,100-$1,800 per square

G. SLATE
   - Material: $800-$1,500+ per square
   - Labor: $600-$1,000 per square
   - Total: $1,400-$2,500+ per square

STEP 4: PROJECT COST BREAKDOWN
Provide detailed cost breakdown:
- Material costs (itemized)
- Labor costs
- Tear-off/disposal (if replacement)
- Additional costs:
  • Permits
  • Dumpster/disposal
  • Deck repairs (if needed - estimate 5-10% contingency)
  • Rotten wood replacement contingency
  • Skylights/chimney work if applicable

STEP 5: RECOMMENDATIONS
Based on condition and budget:
- Recommended material type(s) for this property
- Repair vs. replacement recommendation
- Priority repairs if full replacement not urgent
- Cost-benefit analysis of different material options
- Expected ROI and lifespan for each option

STEP 6: REGIONAL ADJUSTMENTS
Consider typical regional cost variations:
- Urban vs. rural
- High-cost vs. low-cost markets
- Provide national average with note about regional variation

═══════════════════════════════════════════════════════════════════
✅ CRITICAL: RESPOND WITH VALID JSON ONLY
═══════════════════════════════════════════════════════════════════

{
  "agent": "cost_estimator",
  "materialCalculations": {
    "roofingSquares": <number>,
    "wasteFactorPercent": <number>,
    "totalSquaresWithWaste": <number>,
    "underlaymentRolls": <number>,
    "iceAndWaterShield": <linear feet>,
    "ridgeCapBundles": <number>,
    "starterStrips": <linear feet>,
    "dripEdge": <linear feet>,
    "estimatedVents": <number>,
    "flashingKits": <number>
  },
  "laborEstimate": {
    "tearOffHours": <number or range>,
    "installationHours": <number or range>,
    "totalLaborHours": <number or range>,
    "complexityMultiplier": <number>,
    "pitchSurcharge": <number percent or 0>
  },
  "costEstimates": [
    {
      "materialType": "<e.g. Architectural Asphalt Shingles>",
      "recommended": <boolean - true for best match>,
      "breakdown": {
        "materials": <dollar amount>,
        "labor": <dollar amount>,
        "tearOff": <dollar amount>,
        "disposal": <dollar amount>,
        "permits": <dollar amount>,
        "contingency": <dollar amount>,
        "subtotal": <dollar amount>,
        "taxEstimate": <dollar amount>,
        "total": <dollar amount>
      },
      "range": {
        "low": <dollar amount>,
        "high": <dollar amount>
      },
      "pricePerSquare": <dollar amount>,
      "expectedLifespan": <years>,
      "warranty": "<typical warranty>",
      "pros": ["<list benefits>"],
      "cons": ["<list drawbacks>"]
    }
  ],
  "recommendation": {
    "recommendedAction": "<replace|repair|monitor>",
    "urgencyTimeline": "<immediate|1-2 years|3-5 years|5-10 years>",
    "bestValueOption": "<material type>",
    "premiumOption": "<material type>",
    "reasoning": "<why these recommendations>",
    "priorityRepairs": ["<if not full replacement>"],
    "costBenefitAnalysis": "<explanation of options>"
  },
  "assumptions": [
    "<list key assumptions made in estimates>"
  ],
  "disclaimers": [
    "Estimates are preliminary and based on aerial imagery",
    "Final pricing requires on-site inspection",
    "Regional costs may vary significantly",
    "Does not include structural repairs if needed",
    "Contingency included for typical unexpected issues"
  ],
  "confidence": "<low|medium|high>",
  "notes": "<any additional notes or considerations>"
}

NO MARKDOWN. NO CODE BLOCKS. JUST RAW JSON.

IMPORTANT: Use current 2025 pricing. Be realistic and comprehensive. Include all typical costs.`

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
                "You are a specialized roofing cost estimator. Respond only with valid JSON. Use realistic 2025 pricing."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.3, // Lower temperature for precise cost calculations
          max_completion_tokens: 4000
        })
      }
    )

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error("OpenAI API error:", errorText)
      return NextResponse.json(
        { error: "Failed to estimate costs", details: errorText },
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
        agent: "cost_estimator",
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
    console.error("Cost Estimator error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}
