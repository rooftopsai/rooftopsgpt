import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
  requireFeatureAccess,
  trackAndCheckFeature
} from "@/lib/subscription-helpers"

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

    // Check if user has access to property_reports feature
    const accessCheck = await requireFeatureAccess(user.id, "property_reports")
    if (!accessCheck.allowed) {
      return NextResponse.json(
        {
          error: accessCheck.error,
          limit: accessCheck.limit,
          currentUsage: accessCheck.currentUsage
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    console.log("📝 Property report POST body:", JSON.stringify(body, null, 2))

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
      console.error("❌ Missing required fields:", {
        workspaceId: !!workspaceId,
        address: !!address,
        analysisData: !!analysisData
      })
      return new NextResponse("Missing required fields", { status: 400 })
    }

    if (!latitude || !longitude) {
      console.error("❌ Missing latitude or longitude:", {
        latitude,
        longitude
      })
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
    const { data: report, error } = await supabase
      .from("property_reports")
      .insert({
        user_id: user.id,
        workspace_id: workspaceId,
        address,
        latitude,
        longitude,
        analysis_data: analysisData,
        captured_images: capturedImages || null,
        satellite_views: satelliteViews || null,
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
    await trackAndCheckFeature(user.id, "property_reports", 1)

    console.log("✅ Property report created successfully:", report.id)
    return NextResponse.json(report)
  } catch (error: any) {
    console.error("Error in POST /api/property-reports:", error)
    const errorMessage = error.message || "Internal server error"
    return new NextResponse(errorMessage, { status: 500 })
  }
}
