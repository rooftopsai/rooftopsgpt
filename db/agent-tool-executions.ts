// db/agent-tool-executions.ts
// Database operations for AI Agent tool executions

import { supabase as supabaseClient } from "@/lib/supabase/browser-client"
import {
  AgentToolExecution,
  AgentToolExecutionInsert,
  AgentToolStatus
} from "@/types/agent-types"
import { Json } from "@/supabase/types"

// Type assertion for agent tables (tables not yet in generated types)
const supabase = supabaseClient as any

export const getAgentToolExecutionById = async (
  executionId: string
): Promise<AgentToolExecution | null> => {
  const { data: execution, error } = await supabase
    .from("agent_tool_executions")
    .select("*")
    .eq("id", executionId)
    .maybeSingle()

  if (error) {
    console.error("Error fetching agent tool execution:", error)
    return null
  }

  return execution as AgentToolExecution | null
}

export const getAgentToolExecutionsBySessionId = async (
  sessionId: string,
  options?: {
    status?: AgentToolStatus
    limit?: number
    offset?: number
  }
): Promise<AgentToolExecution[]> => {
  let query = supabase
    .from("agent_tool_executions")
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

  const { data: executions, error } = await query

  if (error) {
    console.error("Error fetching agent tool executions:", error)
    return []
  }

  return executions as AgentToolExecution[]
}

export const getAgentToolExecutionsByTaskId = async (
  taskId: string
): Promise<AgentToolExecution[]> => {
  const { data: executions, error } = await supabase
    .from("agent_tool_executions")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching agent tool executions:", error)
    return []
  }

  return executions as AgentToolExecution[]
}

export const getPendingConfirmations = async (
  userId: string
): Promise<AgentToolExecution[]> => {
  const { data: executions, error } = await supabase
    .from("agent_tool_executions")
    .select("*")
    .eq("user_id", userId)
    .eq("requires_confirmation", true)
    .is("confirmed_at", null)
    .eq("status", "pending")
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching pending confirmations:", error)
    return []
  }

  return executions as AgentToolExecution[]
}

export const createAgentToolExecution = async (
  execution: AgentToolExecutionInsert
): Promise<AgentToolExecution> => {
  const { data: createdExecution, error } = await supabase
    .from("agent_tool_executions")
    .insert([execution] as any)
    .select("*")
    .single()

  if (error) {
    throw new Error(`Failed to create agent tool execution: ${error.message}`)
  }

  return createdExecution as AgentToolExecution
}

export const updateAgentToolExecution = async (
  executionId: string,
  update: Partial<AgentToolExecution>
): Promise<AgentToolExecution> => {
  const { data: updatedExecution, error } = await supabase
    .from("agent_tool_executions")
    .update(update as any)
    .eq("id", executionId)
    .select("*")
    .single()

  if (error) {
    throw new Error(`Failed to update agent tool execution: ${error.message}`)
  }

  return updatedExecution as AgentToolExecution
}

export const startToolExecution = async (
  executionId: string
): Promise<AgentToolExecution> => {
  return updateAgentToolExecution(executionId, {
    status: "running"
  })
}

export const completeToolExecution = async (
  executionId: string,
  output: Json,
  executionTimeMs: number
): Promise<AgentToolExecution> => {
  return updateAgentToolExecution(executionId, {
    status: "completed",
    tool_output: output,
    execution_time_ms: executionTimeMs,
    completed_at: new Date().toISOString()
  })
}

export const failToolExecution = async (
  executionId: string,
  errorMessage: string
): Promise<AgentToolExecution> => {
  return updateAgentToolExecution(executionId, {
    status: "failed",
    error_message: errorMessage,
    completed_at: new Date().toISOString()
  })
}

export const confirmToolExecution = async (
  executionId: string,
  confirmedBy: string
): Promise<AgentToolExecution> => {
  return updateAgentToolExecution(executionId, {
    confirmed_at: new Date().toISOString(),
    confirmed_by: confirmedBy
  })
}

export const cancelToolExecution = async (
  executionId: string
): Promise<AgentToolExecution> => {
  return updateAgentToolExecution(executionId, {
    status: "cancelled",
    completed_at: new Date().toISOString()
  })
}

export const getToolExecutionStats = async (
  userId: string,
  month?: string
): Promise<{
  total: number
  completed: number
  failed: number
  avgExecutionTimeMs: number
}> => {
  let query = supabase
    .from("agent_tool_executions")
    .select("status, execution_time_ms")
    .eq("user_id", userId)

  if (month) {
    query = query.gte("created_at", `${month}-01T00:00:00Z`)
    query = query.lt(
      "created_at",
      `${month}-${new Date(parseInt(month.split("-")[0]), parseInt(month.split("-")[1]), 0).getDate()}T23:59:59Z`
    )
  }

  const { data: executions, error } = await query

  if (error) {
    console.error("Error fetching tool execution stats:", error)
    return { total: 0, completed: 0, failed: 0, avgExecutionTimeMs: 0 }
  }

  const typedExecutions = executions as Array<{ status: string; execution_time_ms: number | null }>
  const completedExecutions = typedExecutions.filter(e => e.status === "completed")
  const avgExecutionTimeMs =
    completedExecutions.length > 0
      ? completedExecutions.reduce(
          (sum, e) => sum + (e.execution_time_ms || 0),
          0
        ) / completedExecutions.length
      : 0

  return {
    total: typedExecutions.length,
    completed: completedExecutions.length,
    failed: typedExecutions.filter(e => e.status === "failed").length,
    avgExecutionTimeMs: Math.round(avgExecutionTimeMs)
  }
}
