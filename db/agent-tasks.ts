// db/agent-tasks.ts
// Database operations for AI Agent tasks

import { supabase as supabaseClient } from "@/lib/supabase/browser-client"
import {
  AgentTask,
  AgentTaskInsert,
  AgentTaskUpdate,
  AgentTaskStatus
} from "@/types/agent-types"

// Type assertion for agent tables (tables not yet in generated types)
const supabase = supabaseClient as any

export const getAgentTaskById = async (
  taskId: string
): Promise<AgentTask | null> => {
  const { data: task, error } = await supabase
    .from("agent_tasks")
    .select("*")
    .eq("id", taskId)
    .maybeSingle()

  if (error) {
    console.error("Error fetching agent task:", error)
    return null
  }

  return task as AgentTask | null
}

export const getAgentTasksBySessionId = async (
  sessionId: string,
  options?: {
    status?: AgentTaskStatus
    limit?: number
    offset?: number
  }
): Promise<AgentTask[]> => {
  let query = supabase
    .from("agent_tasks")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })

  if (options?.status) {
    query = query.eq("status", options.status)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 20) - 1
    )
  }

  const { data: tasks, error } = await query

  if (error) {
    console.error("Error fetching agent tasks:", error)
    return []
  }

  return tasks as AgentTask[]
}

export const getAgentTasksByUserId = async (
  userId: string,
  options?: {
    status?: AgentTaskStatus
    limit?: number
    offset?: number
  }
): Promise<AgentTask[]> => {
  let query = supabase
    .from("agent_tasks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (options?.status) {
    query = query.eq("status", options.status)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 20) - 1
    )
  }

  const { data: tasks, error } = await query

  if (error) {
    console.error("Error fetching agent tasks:", error)
    return []
  }

  return tasks as AgentTask[]
}

export const getActiveAgentTasks = async (
  userId: string
): Promise<AgentTask[]> => {
  const { data: tasks, error } = await supabase
    .from("agent_tasks")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["pending", "in_progress"])
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching active agent tasks:", error)
    return []
  }

  return tasks as AgentTask[]
}

export const createAgentTask = async (
  task: AgentTaskInsert
): Promise<AgentTask> => {
  const { data: createdTask, error } = await supabase
    .from("agent_tasks")
    .insert([task] as any)
    .select("*")
    .single()

  if (error) {
    throw new Error(`Failed to create agent task: ${error.message}`)
  }

  return createdTask as AgentTask
}

export const updateAgentTask = async (
  taskId: string,
  update: AgentTaskUpdate
): Promise<AgentTask> => {
  const { data: updatedTask, error } = await supabase
    .from("agent_tasks")
    .update(update as any)
    .eq("id", taskId)
    .select("*")
    .single()

  if (error) {
    throw new Error(`Failed to update agent task: ${error.message}`)
  }

  return updatedTask as AgentTask
}

export const startAgentTask = async (taskId: string): Promise<AgentTask> => {
  return updateAgentTask(taskId, {
    status: "in_progress",
    started_at: new Date().toISOString()
  })
}

export const completeAgentTask = async (
  taskId: string,
  result?: string
): Promise<AgentTask> => {
  return updateAgentTask(taskId, {
    status: "completed",
    result,
    completed_at: new Date().toISOString()
  })
}

export const failAgentTask = async (
  taskId: string,
  errorMessage: string
): Promise<AgentTask> => {
  return updateAgentTask(taskId, {
    status: "failed",
    error_message: errorMessage,
    completed_at: new Date().toISOString()
  })
}

export const cancelAgentTask = async (taskId: string): Promise<AgentTask> => {
  return updateAgentTask(taskId, {
    status: "cancelled",
    completed_at: new Date().toISOString()
  })
}

export const deleteAgentTask = async (taskId: string): Promise<boolean> => {
  const { error } = await supabase
    .from("agent_tasks")
    .delete()
    .eq("id", taskId)

  if (error) {
    throw new Error(`Failed to delete agent task: ${error.message}`)
  }

  return true
}

export const getTaskStats = async (
  userId: string,
  month?: string
): Promise<{
  total: number
  pending: number
  inProgress: number
  completed: number
  failed: number
}> => {
  let query = supabase
    .from("agent_tasks")
    .select("status")
    .eq("user_id", userId)

  if (month) {
    // Filter by month (YYYY-MM format)
    query = query.gte("created_at", `${month}-01T00:00:00Z`)
    query = query.lt(
      "created_at",
      `${month}-${new Date(parseInt(month.split("-")[0]), parseInt(month.split("-")[1]), 0).getDate()}T23:59:59Z`
    )
  }

  const { data: tasks, error } = await query

  if (error) {
    console.error("Error fetching task stats:", error)
    return { total: 0, pending: 0, inProgress: 0, completed: 0, failed: 0 }
  }

  const typedTasks = tasks as Array<{ status: string }>
  const stats = {
    total: typedTasks.length,
    pending: typedTasks.filter(t => t.status === "pending").length,
    inProgress: typedTasks.filter(t => t.status === "in_progress").length,
    completed: typedTasks.filter(t => t.status === "completed").length,
    failed: typedTasks.filter(t => t.status === "failed").length
  }

  return stats
}
