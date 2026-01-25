// db/agent-messages.ts
// Database operations for AI Agent messages

import { supabase as supabaseClient } from "@/lib/supabase/browser-client"
import { AgentMessage, AgentMessageInsert } from "@/types/agent-types"

// Type assertion for agent tables (tables not yet in generated types)
const supabase = supabaseClient as any

export const getAgentMessageById = async (
  messageId: string
): Promise<AgentMessage | null> => {
  const { data: message, error } = await supabase
    .from("agent_messages")
    .select("*")
    .eq("id", messageId)
    .maybeSingle()

  if (error) {
    console.error("Error fetching agent message:", error)
    return null
  }

  return message as AgentMessage | null
}

export const getAgentMessagesBySessionId = async (
  sessionId: string,
  options?: {
    limit?: number
    offset?: number
    order?: "asc" | "desc"
  }
): Promise<AgentMessage[]> => {
  let query = supabase
    .from("agent_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: options?.order === "asc" })

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 50) - 1
    )
  }

  const { data: messages, error } = await query

  if (error) {
    console.error("Error fetching agent messages:", error)
    return []
  }

  return messages as AgentMessage[]
}

export const createAgentMessage = async (
  message: AgentMessageInsert
): Promise<AgentMessage> => {
  const { data: createdMessage, error } = await supabase
    .from("agent_messages")
    .insert([message] as any)
    .select("*")
    .single()

  if (error) {
    throw new Error(`Failed to create agent message: ${error.message}`)
  }

  return createdMessage as AgentMessage
}

export const createAgentMessages = async (
  messages: AgentMessageInsert[]
): Promise<AgentMessage[]> => {
  const { data: createdMessages, error } = await supabase
    .from("agent_messages")
    .insert(messages as any)
    .select("*")

  if (error) {
    throw new Error(`Failed to create agent messages: ${error.message}`)
  }

  return createdMessages as AgentMessage[]
}

export const deleteAgentMessage = async (messageId: string): Promise<boolean> => {
  const { error } = await supabase
    .from("agent_messages")
    .delete()
    .eq("id", messageId)

  if (error) {
    throw new Error(`Failed to delete agent message: ${error.message}`)
  }

  return true
}

export const deleteAgentMessagesBySessionId = async (
  sessionId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from("agent_messages")
    .delete()
    .eq("session_id", sessionId)

  if (error) {
    throw new Error(`Failed to delete agent messages: ${error.message}`)
  }

  return true
}

export const getRecentAgentMessages = async (
  userId: string,
  limit: number = 10
): Promise<AgentMessage[]> => {
  const { data: messages, error } = await supabase
    .from("agent_messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Error fetching recent agent messages:", error)
    return []
  }

  return messages as AgentMessage[]
}
