// db/agent-usage.ts
// Database operations for AI Agent usage tracking (for billing)

import { supabase as supabaseClient } from "@/lib/supabase/browser-client"
import { AgentUsage, AgentUsageInsert, AgentUsageStats } from "@/types/agent-types"

// Type assertion for agent tables (tables not yet in generated types)
const supabase = supabaseClient as any

// Get current month in YYYY-MM format
export const getCurrentMonth = (): string => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export const getAgentUsageByMonth = async (
  userId: string,
  month: string
): Promise<AgentUsage | null> => {
  const { data: usage, error } = await supabase
    .from("agent_usage")
    .select("*")
    .eq("user_id", userId)
    .eq("month", month)
    .maybeSingle()

  if (error) {
    console.error("Error fetching agent usage:", error)
    return null
  }

  return usage as AgentUsage | null
}

export const getOrCreateAgentUsage = async (
  userId: string,
  month?: string
): Promise<AgentUsage> => {
  const targetMonth = month || getCurrentMonth()

  // Try to get existing usage
  const existing = await getAgentUsageByMonth(userId, targetMonth)
  if (existing) {
    return existing
  }

  // Create new usage record
  const { data: newUsage, error } = await supabase
    .from("agent_usage")
    .insert([{ user_id: userId, month: targetMonth }] as any)
    .select("*")
    .single()

  if (error) {
    // If insert fails due to race condition, try to get again
    const retryUsage = await getAgentUsageByMonth(userId, targetMonth)
    if (retryUsage) {
      return retryUsage
    }
    throw new Error(`Failed to create agent usage: ${error.message}`)
  }

  return newUsage as AgentUsage
}

export const trackTokenUsage = async (
  userId: string,
  inputTokens: number,
  outputTokens: number
): Promise<AgentUsage> => {
  const usage = await getOrCreateAgentUsage(userId)

  const { data: updatedUsage, error } = await supabase
    .from("agent_usage")
    .update({
      total_tokens_input: usage.total_tokens_input + inputTokens,
      total_tokens_output: usage.total_tokens_output + outputTokens,
      // Estimate cost: ~$0.01 per 1K input tokens, ~$0.03 per 1K output tokens for GPT-4
      estimated_cost_cents:
        usage.estimated_cost_cents +
        Math.ceil((inputTokens / 1000) * 1) +
        Math.ceil((outputTokens / 1000) * 3)
    } as any)
    .eq("id", usage.id)
    .select("*")
    .single()

  if (error) {
    throw new Error(`Failed to track token usage: ${error.message}`)
  }

  return updatedUsage as AgentUsage
}

export const trackTaskExecution = async (userId: string): Promise<AgentUsage> => {
  const usage = await getOrCreateAgentUsage(userId)

  const { data: updatedUsage, error } = await supabase
    .from("agent_usage")
    .update({
      total_tasks_executed: usage.total_tasks_executed + 1
    } as any)
    .eq("id", usage.id)
    .select("*")
    .single()

  if (error) {
    throw new Error(`Failed to track task execution: ${error.message}`)
  }

  return updatedUsage as AgentUsage
}

export const trackToolCall = async (userId: string): Promise<AgentUsage> => {
  const usage = await getOrCreateAgentUsage(userId)

  const { data: updatedUsage, error } = await supabase
    .from("agent_usage")
    .update({
      total_tool_calls: usage.total_tool_calls + 1
    } as any)
    .eq("id", usage.id)
    .select("*")
    .single()

  if (error) {
    throw new Error(`Failed to track tool call: ${error.message}`)
  }

  return updatedUsage as AgentUsage
}

export const trackSessionCreated = async (userId: string): Promise<AgentUsage> => {
  const usage = await getOrCreateAgentUsage(userId)

  const { data: updatedUsage, error } = await supabase
    .from("agent_usage")
    .update({
      total_sessions: usage.total_sessions + 1
    } as any)
    .eq("id", usage.id)
    .select("*")
    .single()

  if (error) {
    throw new Error(`Failed to track session creation: ${error.message}`)
  }

  return updatedUsage as AgentUsage
}

export const getAgentUsageStats = async (
  userId: string,
  startMonth?: string,
  endMonth?: string
): Promise<AgentUsageStats> => {
  const currentMonth = getCurrentMonth()
  const start = startMonth || currentMonth
  const end = endMonth || currentMonth

  const { data: usageRecords, error } = await supabase
    .from("agent_usage")
    .select("*")
    .eq("user_id", userId)
    .gte("month", start)
    .lte("month", end)

  if (error) {
    console.error("Error fetching agent usage stats:", error)
    return {
      totalSessions: 0,
      totalMessages: 0,
      totalTasksCompleted: 0,
      totalToolCalls: 0,
      totalTokensUsed: 0,
      estimatedCostCents: 0,
      periodStart: start,
      periodEnd: end
    }
  }

  const typedRecords = usageRecords as AgentUsage[]
  const stats = typedRecords.reduce(
    (acc, record) => {
      return {
        totalSessions: acc.totalSessions + record.total_sessions,
        totalMessages: acc.totalMessages + 0, // Messages tracked separately
        totalTasksCompleted: acc.totalTasksCompleted + record.total_tasks_executed,
        totalToolCalls: acc.totalToolCalls + record.total_tool_calls,
        totalTokensUsed:
          acc.totalTokensUsed +
          record.total_tokens_input +
          record.total_tokens_output,
        estimatedCostCents:
          acc.estimatedCostCents + record.estimated_cost_cents,
        periodStart: start,
        periodEnd: end
      }
    },
    {
      totalSessions: 0,
      totalMessages: 0,
      totalTasksCompleted: 0,
      totalToolCalls: 0,
      totalTokensUsed: 0,
      estimatedCostCents: 0,
      periodStart: start,
      periodEnd: end
    }
  )

  return stats
}

export const getCurrentMonthUsage = async (
  userId: string
): Promise<AgentUsage | null> => {
  return getAgentUsageByMonth(userId, getCurrentMonth())
}

// Check if user has exceeded their agent usage limits
export const checkAgentUsageLimits = async (
  userId: string,
  limits: {
    maxTokens?: number
    maxTasks?: number
    maxToolCalls?: number
    maxSessions?: number
  }
): Promise<{
  withinLimits: boolean
  tokensRemaining?: number
  tasksRemaining?: number
  toolCallsRemaining?: number
  sessionsRemaining?: number
}> => {
  const usage = await getCurrentMonthUsage(userId)

  if (!usage) {
    return {
      withinLimits: true,
      tokensRemaining: limits.maxTokens,
      tasksRemaining: limits.maxTasks,
      toolCallsRemaining: limits.maxToolCalls,
      sessionsRemaining: limits.maxSessions
    }
  }

  const totalTokens = usage.total_tokens_input + usage.total_tokens_output
  const tokensRemaining = limits.maxTokens
    ? limits.maxTokens - totalTokens
    : undefined
  const tasksRemaining = limits.maxTasks
    ? limits.maxTasks - usage.total_tasks_executed
    : undefined
  const toolCallsRemaining = limits.maxToolCalls
    ? limits.maxToolCalls - usage.total_tool_calls
    : undefined
  const sessionsRemaining = limits.maxSessions
    ? limits.maxSessions - usage.total_sessions
    : undefined

  const withinLimits =
    (tokensRemaining === undefined || tokensRemaining > 0) &&
    (tasksRemaining === undefined || tasksRemaining > 0) &&
    (toolCallsRemaining === undefined || toolCallsRemaining > 0) &&
    (sessionsRemaining === undefined || sessionsRemaining > 0)

  return {
    withinLimits,
    tokensRemaining: tokensRemaining !== undefined ? Math.max(0, tokensRemaining) : undefined,
    tasksRemaining: tasksRemaining !== undefined ? Math.max(0, tasksRemaining) : undefined,
    toolCallsRemaining: toolCallsRemaining !== undefined ? Math.max(0, toolCallsRemaining) : undefined,
    sessionsRemaining: sessionsRemaining !== undefined ? Math.max(0, sessionsRemaining) : undefined
  }
}
