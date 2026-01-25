// db/agent-sessions.ts
// Database operations for AI Agent sessions

import { supabase as supabaseClient } from "@/lib/supabase/browser-client"
import {
  AgentSession,
  AgentSessionInsert,
  AgentSessionUpdate,
  AgentSessionStatus
} from "@/types/agent-types"

// Type assertion for agent tables (tables not yet in generated types)
const supabase = supabaseClient as any

export const getAgentSessionById = async (
  sessionId: string
): Promise<AgentSession | null> => {
  const { data: session, error } = await supabase
    .from("agent_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle()

  if (error) {
    console.error("Error fetching agent session:", error)
    return null
  }

  return session as AgentSession | null
}

export const getAgentSessionsByUserId = async (
  userId: string,
  options?: {
    status?: AgentSessionStatus
    limit?: number
    offset?: number
  }
): Promise<AgentSession[]> => {
  let query = supabase
    .from("agent_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })

  if (options?.status) {
    query = query.eq("status", options.status)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
  }

  const { data: sessions, error } = await query

  if (error) {
    console.error("Error fetching agent sessions:", error)
    return []
  }

  return sessions as AgentSession[]
}

export const getActiveAgentSession = async (
  userId: string
): Promise<AgentSession | null> => {
  const { data: session, error } = await supabase
    .from("agent_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("Error fetching active agent session:", error)
    return null
  }

  return session as AgentSession | null
}

export const createAgentSession = async (
  session: AgentSessionInsert
): Promise<AgentSession> => {
  const { data: createdSession, error } = await supabase
    .from("agent_sessions")
    .insert([session] as any)
    .select("*")
    .single()

  if (error) {
    throw new Error(`Failed to create agent session: ${error.message}`)
  }

  return createdSession as AgentSession
}

export const updateAgentSession = async (
  sessionId: string,
  update: AgentSessionUpdate
): Promise<AgentSession> => {
  const { data: updatedSession, error } = await supabase
    .from("agent_sessions")
    .update(update as any)
    .eq("id", sessionId)
    .select("*")
    .single()

  if (error) {
    throw new Error(`Failed to update agent session: ${error.message}`)
  }

  return updatedSession as AgentSession
}

export const deleteAgentSession = async (sessionId: string): Promise<boolean> => {
  const { error } = await supabase
    .from("agent_sessions")
    .delete()
    .eq("id", sessionId)

  if (error) {
    throw new Error(`Failed to delete agent session: ${error.message}`)
  }

  return true
}

export const incrementSessionTokens = async (
  sessionId: string,
  tokensUsed: number
): Promise<void> => {
  const { error } = await (supabase.rpc as any)("increment_agent_session_tokens", {
    p_session_id: sessionId,
    p_tokens: tokensUsed
  })

  // If RPC doesn't exist, fall back to manual update
  if (error) {
    const session = await getAgentSessionById(sessionId)
    if (session) {
      await updateAgentSession(sessionId, {
        total_tokens_used: session.total_tokens_used + tokensUsed
      })
    }
  }
}

export const incrementSessionTasksCompleted = async (
  sessionId: string
): Promise<void> => {
  const session = await getAgentSessionById(sessionId)
  if (session) {
    await updateAgentSession(sessionId, {
      total_tasks_completed: session.total_tasks_completed + 1
    })
  }
}
