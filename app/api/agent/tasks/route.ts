// app/api/agent/tasks/route.ts
// API routes for managing agent tasks

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { checkAgentAccess } from "@/lib/entitlements"
import { AgentTaskInsert, AgentTaskUpdate } from "@/types/agent-types"

export const runtime = "nodejs"

// GET: List tasks for a session or user
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
    const status = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")

    let query = supabase
      .from("agent_tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (sessionId) {
      query = query.eq("session_id", sessionId)
    }

    if (status) {
      query = query.eq("status", status)
    }

    const { data: tasks, error } = await query

    if (error) {
      console.error("Error fetching agent tasks:", error)
      return NextResponse.json(
        { error: "Failed to fetch tasks" },
        { status: 500 }
      )
    }

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error("Agent tasks GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST: Create a new task
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
    const { session_id, title, description, priority } = body

    if (!session_id || !title) {
      return NextResponse.json(
        { error: "session_id and title are required" },
        { status: 400 }
      )
    }

    // Verify session ownership
    const { data: session } = await supabase
      .from("agent_sessions")
      .select("user_id")
      .eq("id", session_id)
      .single()

    if (!session || session.user_id !== user.id) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      )
    }

    const taskData: AgentTaskInsert = {
      session_id,
      user_id: user.id,
      title,
      description,
      priority: priority || 0,
      status: "pending"
    }

    const { data: task, error } = await supabase
      .from("agent_tasks")
      .insert([taskData])
      .select("*")
      .single()

    if (error) {
      console.error("Error creating agent task:", error)
      return NextResponse.json(
        { error: "Failed to create task" },
        { status: 500 }
      )
    }

    // Log activity
    await supabase.from("agent_activity_log").insert([
      {
        user_id: user.id,
        session_id,
        action_type: "task_created",
        title: "Task Created",
        description: title
      }
    ])

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error("Agent tasks POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PATCH: Update a task
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
    const { task_id, ...updateData } = body

    if (!task_id) {
      return NextResponse.json(
        { error: "task_id is required" },
        { status: 400 }
      )
    }

    // Verify task ownership
    const { data: existingTask } = await supabase
      .from("agent_tasks")
      .select("user_id, session_id, title")
      .eq("id", task_id)
      .single()

    if (!existingTask || existingTask.user_id !== user.id) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      )
    }

    // Handle status transitions
    if (updateData.status) {
      if (updateData.status === "in_progress" && !updateData.started_at) {
        updateData.started_at = new Date().toISOString()
      }
      if (
        ["completed", "failed", "cancelled"].includes(updateData.status) &&
        !updateData.completed_at
      ) {
        updateData.completed_at = new Date().toISOString()
      }
    }

    const { data: task, error } = await supabase
      .from("agent_tasks")
      .update(updateData as AgentTaskUpdate)
      .eq("id", task_id)
      .select("*")
      .single()

    if (error) {
      console.error("Error updating agent task:", error)
      return NextResponse.json(
        { error: "Failed to update task" },
        { status: 500 }
      )
    }

    // Log status changes
    if (updateData.status) {
      const actionTypes: Record<string, string> = {
        in_progress: "task_started",
        completed: "task_completed",
        failed: "task_failed",
        cancelled: "task_cancelled"
      }
      const actionType = actionTypes[updateData.status]
      if (actionType) {
        await supabase.from("agent_activity_log").insert([
          {
            user_id: user.id,
            session_id: existingTask.session_id,
            action_type: actionType,
            title: `Task ${updateData.status.charAt(0).toUpperCase() + updateData.status.slice(1)}`,
            description: existingTask.title
          }
        ])

        // Update session task count if completed
        if (updateData.status === "completed") {
          const { data: session } = await supabase
            .from("agent_sessions")
            .select("total_tasks_completed")
            .eq("id", existingTask.session_id)
            .single()

          if (session) {
            await supabase
              .from("agent_sessions")
              .update({
                total_tasks_completed: session.total_tasks_completed + 1
              })
              .eq("id", existingTask.session_id)
          }

          // Track usage
          const currentMonth = new Date().toISOString().slice(0, 7)
          const { data: usage } = await supabase
            .from("agent_usage")
            .select("*")
            .eq("user_id", user.id)
            .eq("month", currentMonth)
            .single()

          if (usage) {
            await supabase
              .from("agent_usage")
              .update({
                total_tasks_executed: usage.total_tasks_executed + 1
              })
              .eq("id", usage.id)
          }
        }
      }
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error("Agent tasks PATCH error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE: Delete a task
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
    const taskId = searchParams.get("task_id")

    if (!taskId) {
      return NextResponse.json(
        { error: "task_id is required" },
        { status: 400 }
      )
    }

    // Verify task ownership
    const { data: existingTask } = await supabase
      .from("agent_tasks")
      .select("user_id")
      .eq("id", taskId)
      .single()

    if (!existingTask || existingTask.user_id !== user.id) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from("agent_tasks")
      .delete()
      .eq("id", taskId)

    if (error) {
      console.error("Error deleting agent task:", error)
      return NextResponse.json(
        { error: "Failed to delete task" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Agent tasks DELETE error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
