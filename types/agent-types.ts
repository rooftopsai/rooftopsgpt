// types/agent-types.ts
// TypeScript types for the AI Agent feature
// These types match the database schema defined in migrations/20260123_add_agent_tables.sql

import { Json } from "@/supabase/types"

// Agent Session Status
export type AgentSessionStatus = "active" | "paused" | "completed" | "failed"

// Agent Task Status
export type AgentTaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled"

// Agent Tool Execution Status
export type AgentToolStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"

// Agent Activity Action Types
export type AgentActivityActionType =
  | "session_created"
  | "session_resumed"
  | "session_paused"
  | "session_completed"
  | "message_sent"
  | "message_received"
  | "task_created"
  | "task_started"
  | "task_completed"
  | "task_failed"
  | "task_cancelled"
  | "tool_called"
  | "tool_completed"
  | "tool_failed"
  | "tool_confirmed"
  | "error"
  | "warning"
  | "info"

// Agent Message Role
export type AgentMessageRole = "user" | "assistant" | "system" | "tool"

// Agent Session
export interface AgentSession {
  id: string
  user_id: string
  workspace_id: string | null
  name: string
  description: string | null
  status: AgentSessionStatus
  model: string
  system_prompt: string | null
  total_tokens_used: number
  total_tasks_completed: number
  metadata: Json
  created_at: string
  updated_at: string
}

export interface AgentSessionInsert {
  id?: string
  user_id: string
  workspace_id?: string | null
  name?: string
  description?: string | null
  status?: AgentSessionStatus
  model?: string
  system_prompt?: string | null
  total_tokens_used?: number
  total_tasks_completed?: number
  metadata?: Json
  created_at?: string
  updated_at?: string
}

export interface AgentSessionUpdate {
  id?: string
  user_id?: string
  workspace_id?: string | null
  name?: string
  description?: string | null
  status?: AgentSessionStatus
  model?: string
  system_prompt?: string | null
  total_tokens_used?: number
  total_tasks_completed?: number
  metadata?: Json
  created_at?: string
  updated_at?: string
}

// Agent Message
export interface AgentMessage {
  id: string
  session_id: string
  user_id: string
  role: AgentMessageRole
  content: string
  tokens_used: number | null
  tool_calls: Json | null
  tool_call_id: string | null
  metadata: Json
  created_at: string
}

export interface AgentMessageInsert {
  id?: string
  session_id: string
  user_id: string
  role: AgentMessageRole
  content: string
  tokens_used?: number | null
  tool_calls?: Json | null
  tool_call_id?: string | null
  metadata?: Json
  created_at?: string
}

// Agent Task
export interface AgentTask {
  id: string
  session_id: string
  user_id: string
  title: string
  description: string | null
  status: AgentTaskStatus
  priority: number
  result: string | null
  error_message: string | null
  started_at: string | null
  completed_at: string | null
  metadata: Json
  created_at: string
  updated_at: string
}

export interface AgentTaskInsert {
  id?: string
  session_id: string
  user_id: string
  title: string
  description?: string | null
  status?: AgentTaskStatus
  priority?: number
  result?: string | null
  error_message?: string | null
  started_at?: string | null
  completed_at?: string | null
  metadata?: Json
  created_at?: string
  updated_at?: string
}

export interface AgentTaskUpdate {
  id?: string
  session_id?: string
  user_id?: string
  title?: string
  description?: string | null
  status?: AgentTaskStatus
  priority?: number
  result?: string | null
  error_message?: string | null
  started_at?: string | null
  completed_at?: string | null
  metadata?: Json
  created_at?: string
  updated_at?: string
}

// Agent Tool Execution
export interface AgentToolExecution {
  id: string
  session_id: string
  task_id: string | null
  user_id: string
  tool_name: string
  tool_input: Json
  tool_output: Json | null
  status: AgentToolStatus
  error_message: string | null
  execution_time_ms: number | null
  requires_confirmation: boolean
  confirmed_at: string | null
  confirmed_by: string | null
  created_at: string
  completed_at: string | null
}

export interface AgentToolExecutionInsert {
  id?: string
  session_id: string
  task_id?: string | null
  user_id: string
  tool_name: string
  tool_input: Json
  tool_output?: Json | null
  status?: AgentToolStatus
  error_message?: string | null
  execution_time_ms?: number | null
  requires_confirmation?: boolean
  confirmed_at?: string | null
  confirmed_by?: string | null
  created_at?: string
  completed_at?: string | null
}

// Agent Activity Log
export interface AgentActivityLog {
  id: string
  session_id: string | null
  user_id: string
  action_type: AgentActivityActionType
  title: string
  description: string | null
  metadata: Json
  created_at: string
}

export interface AgentActivityLogInsert {
  id?: string
  session_id?: string | null
  user_id: string
  action_type: AgentActivityActionType
  title: string
  description?: string | null
  metadata?: Json
  created_at?: string
}

// Agent Usage (for billing)
export interface AgentUsage {
  id: string
  user_id: string
  month: string
  total_tokens_input: number
  total_tokens_output: number
  total_tasks_executed: number
  total_tool_calls: number
  total_sessions: number
  estimated_cost_cents: number
  created_at: string
  updated_at: string
}

export interface AgentUsageInsert {
  id?: string
  user_id: string
  month: string
  total_tokens_input?: number
  total_tokens_output?: number
  total_tasks_executed?: number
  total_tool_calls?: number
  total_sessions?: number
  estimated_cost_cents?: number
  created_at?: string
  updated_at?: string
}

// Chat message format for the agent UI
export interface AgentChatMessage {
  id: string
  role: AgentMessageRole
  content: string
  timestamp: Date
  toolCalls?: AgentToolCall[]
  isStreaming?: boolean
  metadata?: Json
}

export interface AgentToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
  result?: string
  status: AgentToolStatus
  requiresConfirmation?: boolean
}

// Agent Configuration
export interface AgentConfig {
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
  enabledTools: string[]
  autoApproveTools: boolean
}

// Default agent configuration
export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  model: "gpt-4o",
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: `You are a helpful AI assistant for Rooftops AI, a roofing business management platform. You help roofing company employees with tasks such as:

- Looking up customer information and job details in the CRM
- Researching material costs and availability
- Generating and sending reports
- Scheduling and coordinating jobs
- Answering questions about roofing best practices
- Helping with estimates and proposals

Be professional, efficient, and proactive in offering assistance. When using tools, explain what you're doing and report results clearly.`,
  enabledTools: [],
  autoApproveTools: false
}

// Agent session with related data
export interface AgentSessionWithDetails extends AgentSession {
  messages?: AgentMessage[]
  tasks?: AgentTask[]
  recentActivity?: AgentActivityLog[]
}

// Summary stats for agent usage
export interface AgentUsageStats {
  totalSessions: number
  totalMessages: number
  totalTasksCompleted: number
  totalToolCalls: number
  totalTokensUsed: number
  estimatedCostCents: number
  periodStart: string
  periodEnd: string
}
