// app/api/agent/activity/route.ts
// API routes for agent activity log

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export const runtime = "nodejs"

// GET: Get activity log for a session or user
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("session_id")
    const actionTypes = searchParams.get("action_types")?.split(",")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    let query = supabase
      .from("agent_activity_log")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (sessionId) {
      query = query.eq("session_id", sessionId)
    }

    if (actionTypes && actionTypes.length > 0) {
      query = query.in("action_type", actionTypes)
    }

    const { data: activities, error } = await query

    if (error) {
      console.error("Error fetching agent activity:", error)
      return NextResponse.json(
        { error: "Failed to fetch activity" },
        { status: 500 }
      )
    }

    return NextResponse.json({ activities })
  } catch (error) {
    console.error("Agent activity GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
