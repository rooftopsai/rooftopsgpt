// @ts-nocheck
// Multi-Agent Property Report Orchestrator
// Coordinates all 4 agents to generate comprehensive property analysis
// REFACTORED: Direct function calls (no HTTP) to avoid Vercel auth issues

import { NextRequest, NextResponse } from "next/server"
import { getServerProfile } from "@/lib/server/server-chat-helpers"
// Import pure agent functions (no Next.js dependencies, no Vercel auth issues)
import { runMeasurementSpecialist } from "@/lib/agents/measurement-specialist"
import { runConditionInspector } from "@/lib/agents/condition-inspector"
import { runCostEstimator } from "@/lib/agents/cost-estimator"
import { runQualityController } from "@/lib/agents/quality-controller"

export const maxDuration = 300 // 5 minutes for multi-agent processing

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Authentication
    const profile = await getServerProfile()
    if (!profile?.user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      capturedImages,
      solarData,
      solarMetrics,
      address,
      location,
      workspaceId
    } = body

    if (!capturedImages || capturedImages.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 })
    }

    console.log(`[Multi-Agent Orchestrator] Starting analysis for ${address}`)
    console.log(
      `[Multi-Agent Orchestrator] ${capturedImages.length} images received`
    )
    console.log(
      `[Multi-Agent Orchestrator] Solar data received:`,
      solarData?.solarPotential?.maxArrayPanelsCount || "No solar data"
    )

    // Separate overhead images from angled views
    // Images have 'viewName' property, not 'name' (e.g., "Overhead (Context)", "Overhead (Detail)")
    const overheadImages = capturedImages.filter(
      (img: any) =>
        img.viewName?.toLowerCase().includes("overhead") ||
        img.viewName?.toLowerCase().includes("context") ||
        img.viewName?.toLowerCase().includes("detail") ||
        img.viewName?.toLowerCase().startsWith("top-")
    )

    const allImages = capturedImages

    console.log(
      `[Multi-Agent Orchestrator] ${overheadImages.length} overhead images, ${allImages.length} total images`
    )

    // Track agent execution
    const agentResults: any = {
      measurement: null,
      condition: null,
      cost: null,
      quality: null
    }

    const agentTimings: any = {}

    // ═══════════════════════════════════════════════════════════════════
    // AGENT 1: MEASUREMENT SPECIALIST
    // ═══════════════════════════════════════════════════════════════════
    try {
      console.log("[Agent 1] Starting Measurement Specialist...")
      const agent1Start = Date.now()

      // Call pure function directly (no Next.js Request/Response, no Vercel auth)
      agentResults.measurement = await runMeasurementSpecialist({
        overheadImages,
        solarData: solarMetrics, // Pass extracted metrics for measurements
        address
      })

      agentTimings.measurement = Date.now() - agent1Start
      console.log(`[Agent 1] Completed in ${agentTimings.measurement}ms`)
      console.log(
        `[Agent 1] Facets: ${agentResults.measurement?.data?.measurements?.facetCount}`
      )
      console.log(
        `[Agent 1] Area: ${agentResults.measurement?.data?.measurements?.totalRoofArea} sq ft`
      )
    } catch (error: any) {
      console.error("[Agent 1] Error:", error)
      return NextResponse.json(
        {
          error: "Measurement Specialist failed",
          details: error.message,
          agent: "measurement-specialist",
          timestamp: new Date().toISOString(),
          
        },
        { status: 500 }
      )
    }

    // ═══════════════════════════════════════════════════════════════════
    // AGENTS 2 & 3: RUN IN PARALLEL (Condition & Cost can run simultaneously)
    // ═══════════════════════════════════════════════════════════════════
    try {
      console.log(
        "[Agents 2 & 3] Starting Condition Inspector and Cost Estimator in parallel..."
      )
      const parallelStart = Date.now()

      const [conditionResult, costResult] = await Promise.all([
        // Agent 2: Condition Inspector (pure function call)
        runConditionInspector({
          allImages,
          address,
          measurementData: agentResults.measurement?.data
        }),
        // Agent 3: Cost Estimator (pure function call)
        runCostEstimator({
          measurementData: agentResults.measurement?.data,
          conditionData: {
            condition: { material: { type: "Estimating..." } }
          }, // Placeholder for parallel execution
          address,
          location
        })
      ])

      const parallelTime = Date.now() - parallelStart
      console.log(
        `[Agents 2 & 3] Parallel execution completed in ${parallelTime}ms`
      )

      agentResults.condition = conditionResult
      agentResults.cost = costResult

      agentTimings.condition = parallelTime
      agentTimings.cost = parallelTime

      console.log(
        `[Agent 2] Material: ${agentResults.condition?.data?.condition?.material?.type}`
      )
      console.log(
        `[Agent 2] Condition: ${agentResults.condition?.data?.condition?.overallCondition}`
      )
      console.log(
        `[Agent 3] Estimated cost: $${agentResults.cost?.data?.costEstimates?.[0]?.breakdown?.total}`
      )

      // Now update cost estimator with actual condition data
      console.log("[Agent 3] Refining cost estimate with condition data...")
      agentResults.cost = await runCostEstimator({
        measurementData: agentResults.measurement?.data,
        conditionData: agentResults.condition?.data,
        address,
        location
      })
      console.log("[Agent 3] Cost estimate refined with condition data")
    } catch (error: any) {
      console.error("[Agents 2 & 3] Error:", error)
      return NextResponse.json(
        {
          error: "Condition or Cost agent failed",
          details: error.message,
          agent: "condition-inspector or cost-estimator",
          timestamp: new Date().toISOString(),
          
        },
        { status: 500 }
      )
    }

    // ═══════════════════════════════════════════════════════════════════
    // AGENT 4: QUALITY CONTROLLER
    // ═══════════════════════════════════════════════════════════════════
    try {
      console.log("[Agent 4] Starting Quality Controller...")
      const agent4Start = Date.now()

      agentResults.quality = await runQualityController({
        measurementData: agentResults.measurement?.data,
        conditionData: agentResults.condition?.data,
        costData: agentResults.cost?.data,
        address,
        solarData
      })
      agentTimings.quality = Date.now() - agent4Start
      console.log(`[Agent 4] Completed in ${agentTimings.quality}ms`)
      console.log(
        `[Agent 4] Overall confidence: ${agentResults.quality?.data?.overallConfidence?.combined}`
      )
      console.log(
        `[Agent 4] Quality score: ${agentResults.quality?.data?.metadata?.qualityScore}/100`
      )
    } catch (error: any) {
      console.error("[Agent 4] Error:", error)
      return NextResponse.json(
        {
          error: "Quality Controller failed",
          details: error.message,
          agent: "quality-controller",
          timestamp: new Date().toISOString(),
          
        },
        { status: 500 }
      )
    }

    // ═══════════════════════════════════════════════════════════════════
    // COMPILE FINAL REPORT
    // ═══════════════════════════════════════════════════════════════════
    const totalTime = Date.now() - startTime
    console.log(
      `[Multi-Agent Orchestrator] Analysis complete in ${totalTime}ms`
    )
    console.log(
      `[Multi-Agent Orchestrator] Breakdown: Agent1=${agentTimings.measurement}ms, Agents2&3=${agentTimings.condition}ms, Agent4=${agentTimings.quality}ms`
    )

    const finalReport = {
      success: true,
      multiAgent: true,
      model: "gpt-5.1-2025-11-13",

      // Property info at top level for easy access
      address: address,
      location: location,

      // Executive summary from Quality Controller
      executiveSummary:
        agentResults.quality?.data?.finalReport?.executiveSummary,

      // Complete agent outputs
      agents: {
        measurement: agentResults.measurement?.data,
        condition: agentResults.condition?.data,
        cost: agentResults.cost?.data,
        quality: agentResults.quality?.data
      },

      // Final validated report from Quality Controller
      finalReport: agentResults.quality?.data?.finalReport,

      // Validation and confidence scores
      validation: agentResults.quality?.data?.validation,
      flaggedIssues: agentResults.quality?.data?.flaggedIssues,
      overallConfidence: agentResults.quality?.data?.overallConfidence,

      // Solar data - store the FULL Google Solar API response (with solarPotential, financials, etc.)
      solarData: solarData,

      // Captured images
      capturedImages: capturedImages,
      satelliteViews: capturedImages,

      // Performance metrics
      performance: {
        totalTime,
        agentTimings,
        tokensUsed: {
          measurement: agentResults.measurement?.tokensUsed,
          condition: agentResults.condition?.tokensUsed,
          cost: agentResults.cost?.tokensUsed,
          quality: agentResults.quality?.tokensUsed
        }
      },

      // Metadata
      metadata: {
        timestamp: new Date().toISOString(),
        address,
        location,
        workspaceId,
        imageCount: capturedImages.length,
        hasSolarData: !!solarData,
        agentsUsed: 4,
        qualityScore: agentResults.quality?.data?.metadata?.qualityScore,
        readyForCustomer: agentResults.quality?.data?.metadata?.readyForCustomer
      }
    }

    console.log("[Multi-Agent Orchestrator] Final report compiled successfully")
    console.log("[Multi-Agent Orchestrator] Address in final report:", address)

    return NextResponse.json(finalReport)
  } catch (error) {
    console.error("[Multi-Agent Orchestrator] Fatal error:", error)
    return NextResponse.json(
      {
        error: "Multi-agent analysis failed",
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
