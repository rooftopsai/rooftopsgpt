// Cost Estimator Agent - Pure function (no Next.js dependencies)
// Extracted core logic from app/api/agents/cost-estimator/route.ts

// ═══════════════════════════════════════════════════════════════════
// MODEL CONFIGURATION - Change this to switch between models
// ═══════════════════════════════════════════════════════════════════
const MODEL_CONFIG = {
  provider: "openai" as "openai" | "anthropic", // Switch between "openai" or "anthropic"
  model:
    "gpt-5.1-2025-11-13" as
      | "gpt-5.1-2025-11-13"
      | "claude-opus-4-5-20251101",
  temperature: 0.3, // Lower temperature for precise cost calculations
  maxTokens: 2000 // Reduced from 4000 - optimized for concise output
}

export async function runCostEstimator({
  measurementData,
  conditionData,
  address,
  location
}: {
  measurementData: any
  conditionData: any
  address: string
  location?: { lat: number; lng: number }
}) {
  if (!measurementData || !conditionData) {
    throw new Error("Missing measurement or condition data")
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
Calculate basic material needs:
- Primary roofing material (squares + waste factor based on complexity)
- Underlayment and ice & water shield
- Ridge cap, starter strips, drip edge
- Ventilation, flashing, fasteners

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
Provide estimates for 2-3 most suitable material options based on current material and condition.

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
        "total": <dollar amount>
      },
      "range": {
        "low": <dollar amount>,
        "high": <dollar amount>
      },
      "expectedLifespan": <years>,
      "pros": ["<2-3 key benefits>"],
      "cons": ["<2-3 key drawbacks>"]
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
  "confidence": "<low|medium|high>",
  "notes": "<1-2 sentence summary of key considerations>"
}

NO MARKDOWN. NO CODE BLOCKS. JUST RAW JSON.

IMPORTANT: Use current 2025 pricing. Be realistic and comprehensive. Include all typical costs.`

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
          "You are a specialized roofing cost estimator. Respond only with valid JSON. Use realistic 2025 pricing.",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Anthropic API error:", errorText)
      throw new Error(`Failed to estimate costs: ${errorText}`)
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
              "You are a specialized roofing cost estimator. Respond only with valid JSON. Use realistic 2025 pricing."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: MODEL_CONFIG.temperature,
        max_completion_tokens: MODEL_CONFIG.maxTokens
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("OpenAI API error:", errorText)
      throw new Error(`Failed to estimate costs: ${errorText}`)
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
      agent: "cost_estimator",
      data: result,
      model: MODEL_CONFIG.model,
      tokensUsed: data.usage
    }
  } catch (parseError) {
    console.error("Failed to parse agent response:", parseError)
    throw new Error(`Failed to parse agent response: ${content}`)
  }
}
