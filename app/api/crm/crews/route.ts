// app/api/crm/crews/route.ts
// CRUD API for crews

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { createCrew, listCrews, getAvailableCrews } from "@/lib/crm/crews"

// GET /api/crm/crews - List crews
export async function GET(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const activeOnly = searchParams.get("activeOnly") !== "false"
    const date = searchParams.get("date")
    const skills = searchParams.get("skills")
    const jobLat = searchParams.get("jobLat")
    const jobLng = searchParams.get("jobLng")

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      )
    }

    // Verify user has access to workspace
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("id", workspaceId)
      .eq("user_id", user.id)
      .single()

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      )
    }

    // If date provided, get available crews for that date
    if (date) {
      const jobLocation =
        jobLat && jobLng
          ? { lat: parseFloat(jobLat), lng: parseFloat(jobLng) }
          : undefined

      const requiredSkills = skills ? skills.split(",") : undefined

      const crews = await getAvailableCrews(
        workspaceId,
        new Date(date),
        requiredSkills,
        jobLocation,
        supabase
      )

      return NextResponse.json({ crews })
    }

    // Otherwise, list all crews
    const crews = await listCrews(workspaceId, activeOnly, supabase)

    return NextResponse.json({ crews })
  } catch (error) {
    console.error("Error in GET /api/crm/crews:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/crm/crews - Create a new crew
export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { workspaceId, ...crewData } = body

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      )
    }

    if (!crewData.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 })
    }

    // Verify user has access to workspace
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("id", workspaceId)
      .eq("user_id", user.id)
      .single()

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      )
    }

    const crew = await createCrew({ workspaceId, ...crewData }, supabase)

    if (!crew) {
      return NextResponse.json(
        { error: "Failed to create crew" },
        { status: 500 }
      )
    }

    return NextResponse.json(crew, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/crm/crews:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
