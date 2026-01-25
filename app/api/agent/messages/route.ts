// app/api/agent/messages/route.ts
// API routes for managing agent messages

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { checkAgentAccess } from "@/lib/entitlements"

export const runtime = "nodejs"

// GET: Get messages for a session
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
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    if (!sessionId) {
      return NextResponse.json(
        { error: "session_id is required" },
        { status: 400 }
      )
    }

    // Verify session ownership
    const { data: session } = await supabase
      .from("agent_sessions")
      .select("user_id")
      .eq("id", sessionId)
      .single()

    if (!session || session.user_id !== user.id) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      )
    }

    const { data: messages, error } = await supabase
      .from("agent_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("Error fetching agent messages:", error)
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      )
    }

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("Agent messages GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE: Delete messages (clear conversation)
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

    // Verify session ownership
    const { data: session } = await supabase
      .from("agent_sessions")
      .select("user_id")
      .eq("id", sessionId)
      .single()

    if (!session || session.user_id !== user.id) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from("agent_messages")
      .delete()
      .eq("session_id", sessionId)

    if (error) {
      console.error("Error deleting agent messages:", error)
      return NextResponse.json(
        { error: "Failed to delete messages" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Agent messages DELETE error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
