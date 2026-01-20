// Quality Controller Agent - Pure function (no Next.js dependencies)
// Extracted core logic from app/api/agents/quality-controller/route.ts

// ═══════════════════════════════════════════════════════════════════
// MODEL CONFIGURATION - Change this to switch between models
// ═══════════════════════════════════════════════════════════════════
const MODEL_CONFIG = {
  provider: "openai" as "openai" | "anthropic", // Switch between "openai" or "anthropic"
  model:
    "gpt-5.1-2025-11-13" as
      | "gpt-5.1-2025-11-13"
      | "claude-opus-4-5-20251101",
  temperature: 0.2, // Very low temperature for precise validation
  maxTokens: 6000 // More tokens for comprehensive synthesis
}

export async function runQualityController({
  measurementData,
  conditionData,
  costData,
  address,
  solarData
}: {
  measurementData: any
  conditionData: any
  costData: any
  address: string
  solarData?: any
}) {
  if (!measurementData || !conditionData || !costData) {
    throw new Error("Missing agent data")
  }

  const prompt = `You are Agent 4: QUALITY CONTROLLER - The senior roofing expert who reviews all analyses for accuracy and consistency.

YOUR EXCLUSIVE MISSION: Validate all agent outputs, identify inconsistencies, flag concerns, and synthesize a comprehensive final report.

🚨 CRITICAL BREVITY REQUIREMENT 🚨
Your executiveSummary must be SHORT - only 2-3 sentences, maximum 60 words. Be direct and concise. The user wants brief, actionable information, not lengthy explanations.

═══════════════════════════════════════════════════════════════════
✅ YOUR SPECIALIZATION: QUALITY ASSURANCE & SYNTHESIS
═══════════════════════════════════════════════════════════════════

Property: ${address}

You are the final checkpoint. Three specialized agents have analyzed this property, and you must:
1. Validate their findings for consistency
2. Identify any conflicts or concerns
3. Flag data that seems incorrect or uncertain
4. Synthesize everything into a cohesive, accurate final report
5. Provide confidence scores and identify areas needing human review

═══════════════════════════════════════════════════════════════════
📊 AGENT 1: MEASUREMENT SPECIALIST FINDINGS
═══════════════════════════════════════════════════════════════════

${JSON.stringify(measurementData.data || measurementData, null, 2)}

═══════════════════════════════════════════════════════════════════
🔍 AGENT 2: CONDITION INSPECTOR FINDINGS
═══════════════════════════════════════════════════════════════════

${JSON.stringify(conditionData.data || conditionData, null, 2)}

═══════════════════════════════════════════════════════════════════
💰 AGENT 3: COST ESTIMATOR FINDINGS
═══════════════════════════════════════════════════════════════════

${JSON.stringify(costData.data || costData, null, 2)}

${
  solarData
    ? `
═══════════════════════════════════════════════════════════════════
☀️ GOOGLE SOLAR API GROUND TRUTH
═══════════════════════════════════════════════════════════════════

${JSON.stringify(solarData, null, 2)}
`
    : ""
}

═══════════════════════════════════════════════════════════════════
📋 YOUR QUALITY CONTROL WORKFLOW
═══════════════════════════════════════════════════════════════════

STEP 1: CROSS-VALIDATION CHECKS

A. MEASUREMENT VALIDATION
   • Does this reflect the same count of facets as a human reviewer would count?
   • Does the facet count make sense for the complexity?
   • Is the roof area reasonable given the property size?
   • Do the measurements align with Solar API data (if available)?
   • Are the linear measurements (ridge, valley) proportional to area?
   • Is the pitch estimate consistent with the complexity?
   • ⚠️ CRITICAL: Use ONLY the manual facet count from Agent 1. DO NOT reconcile with Solar API segment count.
   • Solar API segments ≠ roof facets. Segments are solar placement zones, not architectural facets.
   • Rate: ✓ Valid | ⚠ Questionable | ✗ Likely Error

B. CONDITION-MEASUREMENT ALIGNMENT
   • Does the material match the measurements? (e.g., tile roofs = higher pitch typically)
   • Is the complexity rating consistent with the facet count?
   • Does the condition age align with visible wear?
   • Rate: ✓ Consistent | ⚠ Minor Issues | ✗ Inconsistent

C. COST-DATA ALIGNMENT
   • Are costs reasonable for the measured area?
   • Do material quantities match the measurements?
   • Is the recommended material appropriate for the condition?
   • Are labor estimates aligned with complexity and pitch?
   • Rate: ✓ Aligned | ⚠ Review Needed | ✗ Misaligned

D. SOLAR API COMPARISON (if available)
   • How do roof AREA measurements compare to Solar API total roof area?
   • How does PITCH estimate compare to Solar API predominant pitch?
   • ⚠️ DO NOT compare facet counts - Solar API "segments" are NOT the same as architectural facets
   • If area/pitch differ significantly, which is more likely correct and why?
   • Rate: ✓ Matches | ⚠ Minor Variance | ✗ Major Discrepancy

STEP 2: CONFIDENCE ASSESSMENT
For each major finding, assign confidence:
- HIGH: Multiple data points agree, clear imagery, no concerns
- MEDIUM: Some uncertainty, but reasonable conclusions
- LOW: Significant uncertainty, conflicts, or unclear data

STEP 3: FLAG CONCERNS
Identify specific issues that need attention:
- Measurement discrepancies
- Unusual findings
- Data gaps
- Conflicting information
- Low confidence assessments
- Recommendations for human review

STEP 4: SYNTHESIZE FINAL REPORT
Create a comprehensive, cohesive report that:
- Presents the most accurate data from manual analysis
- Use Agent 1's manual facet count WITHOUT reconciliation or averaging with Solar API segments
- For roof area and pitch, Solar API can be used as validation reference
- Provides clear, actionable insights
- Includes appropriate disclaimers
- Guides the homeowner on next steps

STEP 5: EXECUTIVE SUMMARY
Write a 2-3 sentence summary for the homeowner that captures:
- What they have (roof type, size, condition)
- What they should know (key concerns, timeline)
- What action to take (repair, replace, monitor, get quotes)

═══════════════════════════════════════════════════════════════════
✅ CRITICAL: RESPOND WITH VALID JSON ONLY
═══════════════════════════════════════════════════════════════════

{
  "agent": "quality_controller",
  "validation": {
    "measurementValidation": {
      "status": "<valid|questionable|error>",
      "concerns": ["<list any measurement concerns>"],
      "confidence": "<low|medium|high>",
      "notes": "<validation notes>"
    },
    "conditionAlignment": {
      "status": "<consistent|minor_issues|inconsistent>",
      "concerns": ["<list any alignment issues>"],
      "confidence": "<low|medium|high>",
      "notes": "<alignment notes>"
    },
    "costAlignment": {
      "status": "<aligned|review_needed|misaligned>",
      "concerns": ["<list any cost concerns>"],
      "confidence": "<low|medium|high>",
      "notes": "<cost validation notes>"
    },
    "solarAPIComparison": {
      "status": "<matches|minor_variance|major_discrepancy|no_solar_data>",
      "areaVariancePercent": <number or null>,
      "explanation": "<why AREA/PITCH differences exist, which to trust - DO NOT discuss facet count reconciliation>",
      "notes": "<comparison notes for area and pitch only - Solar API segments are NOT roof facets>"
    }
  },
  "flaggedIssues": [
    {
      "severity": "<low|medium|high|critical>",
      "category": "<measurement|condition|cost|consistency>",
      "issue": "<description of the issue>",
      "recommendation": "<what should be done about it>",
      "needsHumanReview": <boolean>
    }
  ],
  "overallConfidence": {
    "measurements": "<low|medium|high>",
    "condition": "<low|medium|high>",
    "costs": "<low|medium|high>",
    "combined": "<low|medium|high>",
    "reasoning": "<why this confidence level>"
  },
  "finalReport": {
    "executiveSummary": "<CRITICAL: Write a BRIEF 2-3 sentence summary ONLY. Be concise and direct. Maximum 60 words.>",
    "propertyOverview": {
      "address": "${address}",
      "roofArea": <best estimate sq ft>,
      "roofingSquares": <best estimate>,
      "facetCount": <validated count>,
      "pitch": "<validated pitch>",
      "complexity": "<validated complexity>",
      "currentMaterial": "<validated material>",
      "currentCondition": "<validated condition>",
      "estimatedAge": <validated age>,
      "remainingLife": <validated remaining years>
    },
    "keyFindings": [
      "<list 3-5 most important findings>"
    ],
    "measurements": {
      "roofArea": <sq ft>,
      "squares": <number>,
      "facets": <CRITICAL: Use Agent 1's manual count exactly - DO NOT reconcile with Solar API segments>,
      "pitch": "<e.g. 6/12>",
      "ridgeLength": <feet>,
      "valleyLength": <feet>,
      "complexity": "<simple|moderate|complex>",
      "confidence": "<low|medium|high>",
      "notes": "<any measurement notes from validation - DO NOT mention Solar API segment reconciliation>"
    },
    "condition": {
      "material": "<type and subtype>",
      "overallCondition": "<new|excellent|good|fair|poor|failing>",
      "age": <years>,
      "remainingLife": <years>,
      "damagePresent": <boolean>,
      "damageSeverity": "<none|minor|moderate|severe|critical>",
      "urgency": "<immediate|urgent|planned|monitor|excellent>",
      "maintenanceNeeds": ["<list>"],
      "confidence": "<low|medium|high>",
      "notes": "<any condition notes from validation>"
    },
    "costEstimate": {
      "recommendedMaterial": "<material type>",
      "estimatedCost": {
        "low": <dollar amount>,
        "mid": <dollar amount>,
        "high": <dollar amount>
      },
      "breakdown": {
        "materials": <dollar amount>,
        "labor": <dollar amount>,
        "tearOff": <dollar amount>,
        "other": <dollar amount>
      },
      "alternativeOptions": [
        {
          "material": "<type>",
          "costRange": "<low-high>",
          "expectedLife": <years>,
          "recommended": <boolean>
        }
      ],
      "confidence": "<low|medium|high>",
      "notes": "<any cost notes from validation>"
    },
    "recommendations": {
      "primaryRecommendation": "<replace|repair|monitor>",
      "timeline": "<immediate|1-2 years|3-5 years|5-10 years>",
      "priorityActions": ["<ordered list of actions>"],
      "nextSteps": ["<what homeowner should do>"],
      "budgetGuidance": "<budget planning advice>",
      "notes": "<additional recommendations>"
    },
    "disclaimers": [
      "Analysis based on aerial satellite imagery only",
      "On-site inspection required for final accuracy",
      "Hidden damage or structural issues not visible from aerial views",
      "Costs are estimates and vary by region and contractor",
      "Weather, permits, and site access may affect final costs"
    ]
  },
  "recommendationsForImprovement": {
    "needsOnSiteInspection": <boolean>,
    "specificAreasToInspect": ["<list areas needing closer inspection>"],
    "additionalDataNeeded": ["<what would improve the assessment>"],
    "humanExpertReview": <boolean>,
    "reasonForHumanReview": "<why human review is recommended>"
  },
  "agentPerformance": {
    "measurementAgent": "<excellent|good|fair|poor>",
    "conditionAgent": "<excellent|good|fair|poor>",
    "costAgent": "<excellent|good|fair|poor>",
    "notes": "<any notes on agent performance>"
  },
  "metadata": {
    "analysisTimestamp": "${new Date().toISOString()}",
    "totalAgentsUsed": 4,
    "allAgentsCompleted": true,
    "qualityScore": <0-100>,
    "readyForCustomer": <boolean>
  }
}

NO MARKDOWN. NO CODE BLOCKS. JUST RAW JSON.

BE THOROUGH. BE CRITICAL. BE HONEST ABOUT LIMITATIONS. THE HOMEOWNER DESERVES ACCURATE INFORMATION.`

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
          "You are a senior quality controller reviewing roof analysis reports. Be critical, thorough, and honest. Respond only with valid JSON.",
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
      throw new Error(`Failed to perform quality control: ${errorText}`)
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
              "You are a senior quality controller reviewing roof analysis reports. Be critical, thorough, and honest. Respond only with valid JSON."
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
      throw new Error(`Failed to perform quality control: ${errorText}`)
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
      agent: "quality_controller",
      data: result,
      model: MODEL_CONFIG.model,
      tokensUsed: data.usage
    }
  } catch (parseError) {
    console.error("Failed to parse agent response:", parseError)
    throw new Error(`Failed to parse agent response: ${content}`)
  }
}
