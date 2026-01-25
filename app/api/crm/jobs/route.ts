// app/api/crm/jobs/route.ts
// CRUD API for jobs

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { createJob, listJobs, JobFilters } from "@/lib/crm/jobs"

// GET /api/crm/jobs - List jobs
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
    const status = searchParams.get("status")
    const jobType = searchParams.get("jobType")
    const customerId = searchParams.get("customerId")
    const crewId = searchParams.get("crewId")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")

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

    // Build filters
    const filters: JobFilters = {}
    if (status) filters.status = status.split(",") as any
    if (jobType) filters.jobType = jobType.split(",") as any
    if (customerId) filters.customerId = customerId
    if (crewId) filters.crewId = crewId
    if (search) filters.search = search

    const result = await listJobs(
      workspaceId,
      filters,
      { page, pageSize },
      supabase
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in GET /api/crm/jobs:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/crm/jobs - Create a new job
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
    const { workspaceId, ...jobData } = body

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      )
    }

    if (!jobData.title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 })
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

    const job = await createJob({ workspaceId, ...jobData }, supabase)

    if (!job) {
      return NextResponse.json(
        { error: "Failed to create job" },
        { status: 500 }
      )
    }

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/crm/jobs:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
