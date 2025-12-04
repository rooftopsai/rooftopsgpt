import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

// GET - Fetch a specific property report by ID
export async function GET(
  request: Request,
  { params }: { params: { reportId: string } }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { data: report, error } = await supabase
      .from("property_reports")
      .select("*")
      .eq("id", params.reportId)
      .eq("user_id", user.id)
      .single()

    if (error) {
      console.error("Error fetching property report:", error)
      return new NextResponse(error.message, { status: 500 })
    }

    if (!report) {
      return new NextResponse("Report not found", { status: 404 })
    }

    return NextResponse.json(report)
  } catch (error: any) {
    console.error("Error in GET /api/property-reports/[reportId]:", error)
    return new NextResponse(error.message, { status: 500 })
  }
}

// DELETE - Delete a specific property report
export async function DELETE(
  request: Request,
  { params }: { params: { reportId: string } }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { error } = await supabase
      .from("property_reports")
      .delete()
      .eq("id", params.reportId)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error deleting property report:", error)
      return new NextResponse(error.message, { status: 500 })
    }

    return new NextResponse("Report deleted successfully", { status: 200 })
  } catch (error: any) {
    console.error("Error in DELETE /api/property-reports/[reportId]:", error)
    return new NextResponse(error.message, { status: 500 })
  }
}
