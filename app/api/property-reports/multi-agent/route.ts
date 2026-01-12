// @ts-nocheck
// Multi-Agent Property Report Orchestrator
// Coordinates all 4 agents to generate comprehensive property analysis

import { NextRequest, NextResponse } from "next/server"
import { getServerProfile } from "@/lib/server/server-chat-helpers"

export const maxDuration = 300 // 5 minutes for multi-agent processing

// Retry helper with exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  initialDelay = 1000
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Fetch] Attempt ${attempt}/${maxRetries} for ${url}`)

      // Add timeout to the fetch - increased for AI agent processing
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 180000) // 180s (3 min) timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // If successful, return immediately
      if (response.ok) {
        console.log(`[Fetch] Success on attempt ${attempt}`)
        return response
      }

      // If 4xx error, don't retry (client error)
      if (response.status >= 400 && response.status < 500) {
        console.error(`[Fetch] Client error ${response.status}, not retrying`)
        return response
      }

      // For 5xx errors, retry
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)
      console.warn(`[Fetch] Attempt ${attempt} failed with ${response.status}`)
    } catch (error: any) {
      lastError = error
      console.error(`[Fetch] Attempt ${attempt} error:`, error.message)

      // Don't retry on abort
      if (error.name === "AbortError") {
        throw new Error(`Request timeout after 180 seconds: ${url}`)
      }
    }

    // Wait before retrying (exponential backoff)
    if (attempt < maxRetries) {
      const delay = initialDelay * Math.pow(2, attempt - 1)
      console.log(`[Fetch] Waiting ${delay}ms before retry...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  // All retries failed
  throw new Error(
    `Failed after ${maxRetries} attempts: ${lastError?.message || "Unknown error"}. URL: ${url}`
  )
}

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

    // Get base URL for API calls - use the request's origin
    let baseUrl = process.env.NEXT_PUBLIC_SITE_URL

    if (!baseUrl && process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`
    }

    if (!baseUrl) {
      // Use the request's host to construct the URL
      const host = req.headers.get("host") || "localhost:3000"
      const protocol = host.includes("localhost") ? "http" : "https"
      baseUrl = `${protocol}://${host}`
    }

    console.log(`[Multi-Agent Orchestrator] Using base URL: ${baseUrl}`)

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

      const measurementResponse = await fetchWithRetry(
        `${baseUrl}/api/agents/measurement-specialist`,
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
        const errorText = await measurementResponse.text()
        throw new Error(
          `Measurement agent returned ${measurementResponse.status}: ${errorText}`
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
    } catch (error: any) {
      console.error("[Agent 1] Error:", error)
      return NextResponse.json(
        {
          error: "Measurement Specialist failed",
          details: error.message,
          agent: "measurement-specialist",
          timestamp: new Date().toISOString(),
          baseUrl
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

      const [conditionResponse, costResponse] = await Promise.all([
        // Agent 2: Condition Inspector
        fetchWithRetry(`${baseUrl}/api/agents/condition-inspector`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            allImages,
            address,
            measurementData: agentResults.measurement?.data
          })
        }),
        // Agent 3: Cost Estimator
        fetchWithRetry(`${baseUrl}/api/agents/cost-estimator`, {
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
        })
      ])

      const parallelTime = Date.now() - parallelStart
      console.log(
        `[Agents 2 & 3] Parallel execution completed in ${parallelTime}ms`
      )

      if (!conditionResponse.ok) {
        const errorText = await conditionResponse.text()
        throw new Error(
          `Condition agent returned ${conditionResponse.status}: ${errorText}`
        )
      }
      if (!costResponse.ok) {
        const errorText = await costResponse.text()
        throw new Error(
          `Cost agent returned ${costResponse.status}: ${errorText}`
        )
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
      const refinedCostResponse = await fetchWithRetry(
        `${baseUrl}/api/agents/cost-estimator`,
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
    } catch (error: any) {
      console.error("[Agents 2 & 3] Error:", error)
      return NextResponse.json(
        {
          error: "Condition or Cost agent failed",
          details: error.message,
          agent: "condition-inspector or cost-estimator",
          timestamp: new Date().toISOString(),
          baseUrl
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

      const qualityResponse = await fetchWithRetry(
        `${baseUrl}/api/agents/quality-controller`,
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
        const errorText = await qualityResponse.text()
        throw new Error(
          `Quality controller returned ${qualityResponse.status}: ${errorText}`
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
    } catch (error: any) {
      console.error("[Agent 4] Error:", error)
      return NextResponse.json(
        {
          error: "Quality Controller failed",
          details: error.message,
          agent: "quality-controller",
          timestamp: new Date().toISOString(),
          baseUrl
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

      // Solar data (if provided)
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
        readyForCustomer:
          agentResults.quality?.data?.metadata?.readyForCustomer,
        solarData: solarData
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
