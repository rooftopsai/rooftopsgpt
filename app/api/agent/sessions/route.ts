// app/api/agent/sessions/route.ts
// API routes for managing agent sessions

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { checkAgentAccess } from "@/lib/entitlements"
import {
  AgentSessionInsert,
  AgentSessionUpdate
} from "@/types/agent-types"

export const runtime = "nodejs"

// GET: List agent sessions for the current user
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

    // Check agent access
    const hasAccess = await checkAgentAccess(user.id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Agent feature requires Premium or Business subscription" },
        { status: 403 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")

    let query = supabase
      .from("agent_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq("status", status)
    }

    const { data: sessions, error } = await query

    if (error) {
      console.error("Error fetching agent sessions:", error)
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 }
      )
    }

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error("Agent sessions GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST: Create a new agent session
export async function POST(request: NextRequest) {
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

    // Check agent access
    const hasAccess = await checkAgentAccess(user.id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Agent feature requires Premium or Business subscription" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, model, system_prompt, workspace_id } = body

    const sessionData: AgentSessionInsert = {
      user_id: user.id,
      name: name || "New Agent Session",
      description,
      model: model || "gpt-4o",
      system_prompt,
      workspace_id,
      status: "active"
    }

    const { data: session, error } = await supabase
      .from("agent_sessions")
      .insert([sessionData])
      .select("*")
      .single()

    if (error) {
      console.error("Error creating agent session:", error)
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      )
    }

    // Log activity
    await supabase.from("agent_activity_log").insert([
      {
        user_id: user.id,
        session_id: session.id,
        action_type: "session_created",
        title: "Session Started",
        description: `Started new agent session: ${session.name}`
      }
    ])

    // Track usage
    const currentMonth = new Date().toISOString().slice(0, 7)
    try {
      await supabase.rpc("increment_agent_sessions", {
        p_user_id: user.id,
        p_month: currentMonth
      })
    } catch {
      // RPC might not exist yet, that's ok
    }

    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    console.error("Agent sessions POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PATCH: Update an existing session
export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const { session_id, ...updateData } = body

    if (!session_id) {
      return NextResponse.json(
        { error: "session_id is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const { data: existingSession } = await supabase
      .from("agent_sessions")
      .select("user_id")
      .eq("id", session_id)
      .single()

    if (!existingSession || existingSession.user_id !== user.id) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      )
    }

    const { data: session, error } = await supabase
      .from("agent_sessions")
      .update(updateData as AgentSessionUpdate)
      .eq("id", session_id)
      .select("*")
      .single()

    if (error) {
      console.error("Error updating agent session:", error)
      return NextResponse.json(
        { error: "Failed to update session" },
        { status: 500 }
      )
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error("Agent sessions PATCH error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE: Delete a session
export async function DELETE(request: NextRequest) {
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

    if (!sessionId) {
      return NextResponse.json(
        { error: "session_id is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const { data: existingSession } = await supabase
      .from("agent_sessions")
      .select("user_id")
      .eq("id", sessionId)
      .single()

    if (!existingSession || existingSession.user_id !== user.id) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from("agent_sessions")
      .delete()
      .eq("id", sessionId)

    if (error) {
      console.error("Error deleting agent session:", error)
      return NextResponse.json(
        { error: "Failed to delete session" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Agent sessions DELETE error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
