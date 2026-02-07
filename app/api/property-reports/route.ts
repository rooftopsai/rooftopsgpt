import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { checkReportLimit } from "@/lib/entitlements"
import { incrementReportUsage } from "@/db/user-usage"

// GET - Fetch all property reports for the current user
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Get workspace_id from query params
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspace_id")

    if (!workspaceId) {
      return new NextResponse("workspace_id is required", { status: 400 })
    }

    // Fetch property reports for this user and workspace
    const { data: reports, error } = await supabase
      .from("property_reports")
      .select("*")
      .eq("user_id", user.id)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching property reports:", error)
      return new NextResponse(error.message, { status: 500 })
    }

    return NextResponse.json(reports)
  } catch (error: any) {
    console.error("Error in GET /api/property-reports:", error)
    return new NextResponse(error.message, { status: 500 })
  }
}

// POST - Create a new property report
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Check if user can generate another report
    const limitCheck = await checkReportLimit(user.id)
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: "REPORT_LIMIT_REACHED",
          message: "You've reached your report generation limit for this month",
          remaining: limitCheck.remaining,
          limit: limitCheck.limit
        },
        { status: 403 }
      )
    }

    const body = await request.json()

    const {
      workspaceId,
      address,
      latitude,
      longitude,
      analysisData,
      capturedImages,
      satelliteViews,
      solarMetrics,
      debugInfo
    } = body

    if (!workspaceId || !address || !analysisData) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    if (!latitude || !longitude) {
      return new NextResponse("Missing latitude or longitude", { status: 400 })
    }

    // Extract structured data from analysis
    const structuredData = analysisData.structuredData || {}

    // Helper function to safely parse integers
    const parseIntSafe = (value: any): number | null => {
      if (value === null || value === undefined) return null
      const parsed = typeof value === "string" ? parseFloat(value) : value
      return Math.round(parsed) // Round to nearest integer
    }

    // Helper function to safely parse floats
    const parseFloatSafe = (value: any): number | null => {
      if (value === null || value === undefined) return null
      return typeof value === "string" ? parseFloat(value) : value
    }

    // Insert property report
    // NOTE: We don't store captured_images or satellite_views to save on Supabase egress costs
    // Users regenerate reports instead of viewing historical ones, so these images aren't needed
    const { data: report, error } = await supabase
      .from("property_reports")
      .insert({
        user_id: user.id,
        workspace_id: workspaceId,
        address,
        latitude,
        longitude,
        analysis_data: analysisData,
        captured_images: null, // Don't store images - saves 10-20 MB per report
        satellite_views: null, // Don't store images - saves egress costs
        solar_metrics: solarMetrics || null,
        debug_info: debugInfo || null,

        // Extract structured fields with proper type conversion
        facet_count: parseIntSafe(structuredData.facetCount),
        roof_area: parseFloatSafe(structuredData.roofArea),
        roof_area_range: structuredData.roofAreaRange || null,
        squares: parseIntSafe(structuredData.squares),
        pitch: structuredData.pitch || null,
        ridge_length: parseFloatSafe(structuredData.ridgeLength),
        valley_length: parseFloatSafe(structuredData.valleyLength),
        complexity: structuredData.complexity || null,
        confidence: structuredData.confidence || null,
        material: structuredData.material || null,
        condition: structuredData.condition || null,
        user_summary: analysisData.userSummary || null,
        detailed_analysis: analysisData.detailedAnalysis || null
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating property report:", error)
      const errorMessage = error.message || "Failed to create property report"
      const errorDetails = error.code ? ` (Code: ${error.code})` : ""
      return new NextResponse(`${errorMessage}${errorDetails}`, { status: 500 })
    }

    // Track the usage after successful report creation
    const updatedUsage = await incrementReportUsage(user.id)

    return NextResponse.json({
      ...report,
      usage: {
        remaining: limitCheck.limit - updatedUsage.reports_generated,
        limit: limitCheck.limit
      }
    })
  } catch (error: any) {
    console.error("Error in POST /api/property-reports:", error)
    const errorMessage = error.message || "Internal server error"
    return new NextResponse(errorMessage, { status: 500 })
  }
}
