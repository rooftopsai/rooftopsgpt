// db/agent-activity.ts
// Database operations for AI Agent activity log

import { supabase as supabaseClient } from "@/lib/supabase/browser-client"
import {
  AgentActivityLog,
  AgentActivityLogInsert,
  AgentActivityActionType
} from "@/types/agent-types"

// Type assertion for agent tables (tables not yet in generated types)
const supabase = supabaseClient as any

export const getAgentActivityById = async (
  activityId: string
): Promise<AgentActivityLog | null> => {
  const { data: activity, error } = await supabase
    .from("agent_activity_log")
    .select("*")
    .eq("id", activityId)
    .maybeSingle()

  if (error) {
    console.error("Error fetching agent activity:", error)
    return null
  }

  return activity as AgentActivityLog | null
}

export const getAgentActivityBySessionId = async (
  sessionId: string,
  options?: {
    actionTypes?: AgentActivityActionType[]
    limit?: number
    offset?: number
  }
): Promise<AgentActivityLog[]> => {
  let query = supabase
    .from("agent_activity_log")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })

  if (options?.actionTypes && options.actionTypes.length > 0) {
    query = query.in("action_type", options.actionTypes)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 50) - 1
    )
  }

  const { data: activities, error } = await query

  if (error) {
    console.error("Error fetching agent activity:", error)
    return []
  }

  return activities as AgentActivityLog[]
}

export const getAgentActivityByUserId = async (
  userId: string,
  options?: {
    actionTypes?: AgentActivityActionType[]
    limit?: number
    offset?: number
  }
): Promise<AgentActivityLog[]> => {
  let query = supabase
    .from("agent_activity_log")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (options?.actionTypes && options.actionTypes.length > 0) {
    query = query.in("action_type", options.actionTypes)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 50) - 1
    )
  }

  const { data: activities, error } = await query

  if (error) {
    console.error("Error fetching agent activity:", error)
    return []
  }

  return activities as AgentActivityLog[]
}

export const createAgentActivity = async (
  activity: AgentActivityLogInsert
): Promise<AgentActivityLog> => {
  const { data: createdActivity, error } = await supabase
    .from("agent_activity_log")
    .insert([activity] as any)
    .select("*")
    .single()

  if (error) {
    throw new Error(`Failed to create agent activity: ${error.message}`)
  }

  return createdActivity as AgentActivityLog
}

// Helper functions for common activity types
export const logSessionCreated = async (
  userId: string,
  sessionId: string,
  sessionName: string
): Promise<AgentActivityLog> => {
  return createAgentActivity({
    user_id: userId,
    session_id: sessionId,
    action_type: "session_created",
    title: "Session Started",
    description: `Started new agent session: ${sessionName}`,
    metadata: { session_name: sessionName }
  })
}

export const logSessionCompleted = async (
  userId: string,
  sessionId: string,
  tasksCompleted: number
): Promise<AgentActivityLog> => {
  return createAgentActivity({
    user_id: userId,
    session_id: sessionId,
    action_type: "session_completed",
    title: "Session Completed",
    description: `Completed session with ${tasksCompleted} tasks`,
    metadata: { tasks_completed: tasksCompleted }
  })
}

export const logMessageSent = async (
  userId: string,
  sessionId: string,
  messagePreview: string
): Promise<AgentActivityLog> => {
  return createAgentActivity({
    user_id: userId,
    session_id: sessionId,
    action_type: "message_sent",
    title: "Message Sent",
    description: messagePreview.substring(0, 100),
    metadata: { message_preview: messagePreview.substring(0, 200) }
  })
}

export const logMessageReceived = async (
  userId: string,
  sessionId: string,
  messagePreview: string
): Promise<AgentActivityLog> => {
  return createAgentActivity({
    user_id: userId,
    session_id: sessionId,
    action_type: "message_received",
    title: "Response Received",
    description: messagePreview.substring(0, 100),
    metadata: { message_preview: messagePreview.substring(0, 200) }
  })
}

export const logTaskCreated = async (
  userId: string,
  sessionId: string,
  taskTitle: string
): Promise<AgentActivityLog> => {
  return createAgentActivity({
    user_id: userId,
    session_id: sessionId,
    action_type: "task_created",
    title: "Task Created",
    description: taskTitle,
    metadata: { task_title: taskTitle }
  })
}

export const logTaskCompleted = async (
  userId: string,
  sessionId: string,
  taskTitle: string
): Promise<AgentActivityLog> => {
  return createAgentActivity({
    user_id: userId,
    session_id: sessionId,
    action_type: "task_completed",
    title: "Task Completed",
    description: taskTitle,
    metadata: { task_title: taskTitle }
  })
}

export const logTaskFailed = async (
  userId: string,
  sessionId: string,
  taskTitle: string,
  error: string
): Promise<AgentActivityLog> => {
  return createAgentActivity({
    user_id: userId,
    session_id: sessionId,
    action_type: "task_failed",
    title: "Task Failed",
    description: `${taskTitle}: ${error}`,
    metadata: { task_title: taskTitle, error }
  })
}

export const logToolCalled = async (
  userId: string,
  sessionId: string,
  toolName: string,
  args?: Record<string, unknown>
): Promise<AgentActivityLog> => {
  return createAgentActivity({
    user_id: userId,
    session_id: sessionId,
    action_type: "tool_called",
    title: `Tool: ${toolName}`,
    description: `Calling ${toolName}`,
    metadata: { tool_name: toolName, arguments: args || {} } as any
  })
}

export const logToolCompleted = async (
  userId: string,
  sessionId: string,
  toolName: string,
  resultPreview?: string
): Promise<AgentActivityLog> => {
  return createAgentActivity({
    user_id: userId,
    session_id: sessionId,
    action_type: "tool_completed",
    title: `Tool Completed: ${toolName}`,
    description: resultPreview?.substring(0, 100) || "Success",
    metadata: {
      tool_name: toolName,
      result_preview: resultPreview?.substring(0, 500)
    }
  })
}

export const logToolFailed = async (
  userId: string,
  sessionId: string,
  toolName: string,
  error: string
): Promise<AgentActivityLog> => {
  return createAgentActivity({
    user_id: userId,
    session_id: sessionId,
    action_type: "tool_failed",
    title: `Tool Failed: ${toolName}`,
    description: error.substring(0, 100),
    metadata: { tool_name: toolName, error }
  })
}

export const logError = async (
  userId: string,
  sessionId: string | null,
  errorMessage: string,
  metadata?: Record<string, unknown>
): Promise<AgentActivityLog> => {
  return createAgentActivity({
    user_id: userId,
    session_id: sessionId,
    action_type: "error",
    title: "Error",
    description: errorMessage.substring(0, 100),
    metadata: { error: errorMessage, ...metadata }
  })
}

export const getRecentActivity = async (
  userId: string,
  limit: number = 20
): Promise<AgentActivityLog[]> => {
  return getAgentActivityByUserId(userId, { limit })
}
