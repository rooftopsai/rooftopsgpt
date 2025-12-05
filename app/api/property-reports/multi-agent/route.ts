// @ts-nocheck
// Multi-Agent Property Report Orchestrator
// Coordinates all 4 agents to generate comprehensive property analysis

import { NextRequest, NextResponse } from "next/server"
import { getServerProfile } from "@/lib/server/server-chat-helpers"

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
    const { capturedImages, solarData, address, location, workspaceId } = body

    if (!capturedImages || capturedImages.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 })
    }

    console.log(`[Multi-Agent Orchestrator] Starting analysis for ${address}`)
    console.log(
      `[Multi-Agent Orchestrator] ${capturedImages.length} images received`
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

      const measurementResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"}/api/agents/measurement-specialist`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            overheadImages,
            solarData,
            address
          })
        }
      )

      if (!measurementResponse.ok) {
        throw new Error(
          `Measurement agent failed: ${await measurementResponse.text()}`
        )
      }

      agentResults.measurement = await measurementResponse.json()
      agentTimings.measurement = Date.now() - agent1Start
      console.log(`[Agent 1] Completed in ${agentTimings.measurement}ms`)
      console.log(
        `[Agent 1] Facets: ${agentResults.measurement?.data?.measurements?.facetCount}`
      )
      console.log(
        `[Agent 1] Area: ${agentResults.measurement?.data?.measurements?.totalRoofArea} sq ft`
      )
    } catch (error) {
      console.error("[Agent 1] Error:", error)
      return NextResponse.json(
        { error: "Measurement Specialist failed", details: error.message },
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

      const [conditionResponse, costResponse] = await Promise.all([
        // Agent 2: Condition Inspector
        fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"}/api/agents/condition-inspector`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              allImages,
              address,
              measurementData: agentResults.measurement?.data
            })
          }
        ),
        // Agent 3: Cost Estimator
        fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"}/api/agents/cost-estimator`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              measurementData: agentResults.measurement?.data,
              conditionData: {
                condition: { material: { type: "Estimating..." } }
              }, // Placeholder for parallel execution
              address,
              location
            })
          }
        )
      ])

      const parallelTime = Date.now() - parallelStart
      console.log(
        `[Agents 2 & 3] Parallel execution completed in ${parallelTime}ms`
      )

      if (!conditionResponse.ok) {
        throw new Error(
          `Condition agent failed: ${await conditionResponse.text()}`
        )
      }
      if (!costResponse.ok) {
        throw new Error(`Cost agent failed: ${await costResponse.text()}`)
      }

      agentResults.condition = await conditionResponse.json()
      agentResults.cost = await costResponse.json()

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
      const refinedCostResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"}/api/agents/cost-estimator`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            measurementData: agentResults.measurement?.data,
            conditionData: agentResults.condition?.data,
            address,
            location
          })
        }
      )

      if (refinedCostResponse.ok) {
        agentResults.cost = await refinedCostResponse.json()
        console.log("[Agent 3] Cost estimate refined with condition data")
      }
    } catch (error) {
      console.error("[Agents 2 & 3] Error:", error)
      return NextResponse.json(
        { error: "Condition or Cost agent failed", details: error.message },
        { status: 500 }
      )
    }

    // ═══════════════════════════════════════════════════════════════════
    // AGENT 4: QUALITY CONTROLLER
    // ═══════════════════════════════════════════════════════════════════
    try {
      console.log("[Agent 4] Starting Quality Controller...")
      const agent4Start = Date.now()

      const qualityResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"}/api/agents/quality-controller`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            measurementData: agentResults.measurement?.data,
            conditionData: agentResults.condition?.data,
            costData: agentResults.cost?.data,
            address,
            solarData
          })
        }
      )

      if (!qualityResponse.ok) {
        throw new Error(
          `Quality controller failed: ${await qualityResponse.text()}`
        )
      }

      agentResults.quality = await qualityResponse.json()
      agentTimings.quality = Date.now() - agent4Start
      console.log(`[Agent 4] Completed in ${agentTimings.quality}ms`)
      console.log(
        `[Agent 4] Overall confidence: ${agentResults.quality?.data?.overallConfidence?.combined}`
      )
      console.log(
        `[Agent 4] Quality score: ${agentResults.quality?.data?.metadata?.qualityScore}/100`
      )
    } catch (error) {
      console.error("[Agent 4] Error:", error)
      return NextResponse.json(
        { error: "Quality Controller failed", details: error.message },
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
