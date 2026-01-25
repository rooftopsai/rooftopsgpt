"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect
} from "react"
import { toast } from "sonner"
import {
  AgentSession,
  AgentMessage,
  AgentTask,
  AgentActivityLog,
  AgentChatMessage,
  AgentToolCall,
  AgentConfig,
  DEFAULT_AGENT_CONFIG,
  AgentUsageStats
} from "@/types/agent-types"

interface AgentContextValue {
  // Session state
  sessions: AgentSession[]
  currentSession: AgentSession | null
  isLoadingSessions: boolean

  // Messages state
  messages: AgentChatMessage[]
  isLoadingMessages: boolean
  isGenerating: boolean
  streamingContent: string

  // Tasks state
  tasks: AgentTask[]
  isLoadingTasks: boolean

  // Activity state
  activities: AgentActivityLog[]
  isLoadingActivities: boolean

  // Usage state
  usage: AgentUsageStats | null
  hasAccess: boolean
  isCheckingAccess: boolean

  // Pending confirmations
  pendingConfirmations: AgentToolCall[]

  // Active tool calls being processed
  activeToolCalls: AgentToolCall[]

  // Config
  config: AgentConfig

  // Actions
  loadSessions: () => Promise<void>
  createSession: (name?: string, description?: string) => Promise<AgentSession | null>
  selectSession: (sessionId: string) => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  sendMessage: (message: string, useStreaming?: boolean) => Promise<void>
  confirmToolCall: (toolCallId: string) => Promise<void>
  cancelToolCall: (toolCallId: string) => Promise<void>
  loadTasks: (sessionId?: string) => Promise<void>
  createTask: (title: string, description?: string) => Promise<void>
  updateTaskStatus: (taskId: string, status: string) => Promise<void>
  loadActivities: (sessionId?: string) => Promise<void>
  loadUsage: () => Promise<void>
  checkAccess: () => Promise<boolean>
  setConfig: (config: Partial<AgentConfig>) => void
  clearMessages: () => void
}

const AgentContext = createContext<AgentContextValue | null>(null)

export function AgentProvider({ children }: { children: ReactNode }) {
  // Session state
  const [sessions, setSessions] = useState<AgentSession[]>([])
  const [currentSession, setCurrentSession] = useState<AgentSession | null>(null)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)

  // Messages state
  const [messages, setMessages] = useState<AgentChatMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [activeToolCalls, setActiveToolCalls] = useState<AgentToolCall[]>([])

  // Tasks state
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [isLoadingTasks, setIsLoadingTasks] = useState(false)

  // Activity state
  const [activities, setActivities] = useState<AgentActivityLog[]>([])
  const [isLoadingActivities, setIsLoadingActivities] = useState(false)

  // Usage state
  const [usage, setUsage] = useState<AgentUsageStats | null>(null)
  const [hasAccess, setHasAccess] = useState(false)
  const [isCheckingAccess, setIsCheckingAccess] = useState(true)

  // Pending confirmations
  const [pendingConfirmations, setPendingConfirmations] = useState<AgentToolCall[]>([])

  // Config
  const [config, setConfigState] = useState<AgentConfig>(DEFAULT_AGENT_CONFIG)

  // Check access on mount
  useEffect(() => {
    checkAccess()
  }, [])

  // Load sessions on mount if user has access
  useEffect(() => {
    if (hasAccess && !isCheckingAccess) {
      loadSessions()
    }
  }, [hasAccess, isCheckingAccess])

  const checkAccess = useCallback(async (): Promise<boolean> => {
    setIsCheckingAccess(true)
    try {
      console.log("[AgentContext] Checking agent access...")
      const response = await fetch("/api/agent/usage")
      const data = await response.json()
      console.log("[AgentContext] Access check response:", { status: response.status, data })
      const access = data.hasAccess === true
      console.log("[AgentContext] Setting hasAccess to:", access)
      setHasAccess(access)
      if (access && data.usage) {
        setUsage({
          totalSessions: data.usage.sessions.total,
          totalMessages: 0,
          totalTasksCompleted: data.usage.tasks.total,
          totalToolCalls: data.usage.toolCalls,
          totalTokensUsed: data.usage.tokens.total,
          estimatedCostCents: parseInt(data.usage.estimatedCostCents) || 0,
          periodStart: data.month + "-01",
          periodEnd: data.month + "-31"
        })
      }
      return access
    } catch (error) {
      console.error("[AgentContext] Error checking agent access:", error)
      setHasAccess(false)
      return false
    } finally {
      setIsCheckingAccess(false)
    }
  }, [])

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true)
    try {
      const response = await fetch("/api/agent/sessions")
      const data = await response.json()
      if (data.sessions) {
        setSessions(data.sessions)
      }
    } catch (error) {
      console.error("Error loading sessions:", error)
    } finally {
      setIsLoadingSessions(false)
    }
  }, [])

  const createSession = useCallback(
    async (name?: string, description?: string): Promise<AgentSession | null> => {
      try {
        const response = await fetch("/api/agent/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name || "New Agent Session",
            description,
            model: config.model
          })
        })
        const data = await response.json()
        if (data.session) {
          setSessions(prev => [data.session, ...prev])
          setCurrentSession(data.session)
          setMessages([])
          return data.session
        }
        return null
      } catch (error) {
        console.error("Error creating session:", error)
        return null
      }
    },
    [config.model]
  )

  const selectSession = useCallback(async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      setCurrentSession(session)
      setMessages([])
      setIsLoadingMessages(true)

      try {
        const response = await fetch(
          `/api/agent/messages?session_id=${sessionId}`
        )
        const data = await response.json()
        if (data.messages) {
          const chatMessages: AgentChatMessage[] = data.messages.map(
            (msg: AgentMessage) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.created_at),
              toolCalls: msg.tool_calls as unknown as AgentToolCall[] | undefined
            })
          )
          setMessages(chatMessages)
        }
      } catch (error) {
        console.error("Error loading messages:", error)
      } finally {
        setIsLoadingMessages(false)
      }
    }
  }, [sessions])

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await fetch(`/api/agent/sessions?session_id=${sessionId}`, {
        method: "DELETE"
      })
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      if (currentSession?.id === sessionId) {
        setCurrentSession(null)
        setMessages([])
      }
    } catch (error) {
      console.error("Error deleting session:", error)
    }
  }, [currentSession])

  const sendMessage = useCallback(
    async (message: string, useStreaming: boolean = true) => {
      let sessionId = currentSession?.id

      // Create a new session if none exists
      if (!sessionId) {
        const newSession = await createSession()
        if (!newSession) {
          console.error("[AgentContext] Failed to create session")
          return
        }
        sessionId = newSession.id
      }

      // Add optimistic user message
      const userMessage: AgentChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: message,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, userMessage])
      setIsGenerating(true)
      setStreamingContent("")
      setPendingConfirmations([])
      setActiveToolCalls([])

      // Use streaming endpoint for real-time response
      if (useStreaming) {
        try {
          const response = await fetch("/api/agent/chat/stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              session_id: sessionId,
              message,
              config: {
                model: config.model,
                temperature: config.temperature,
                max_tokens: config.maxTokens
              }
            })
          })

          if (!response.ok) {
            throw new Error("Stream request failed")
          }

          const reader = response.body?.getReader()
          const decoder = new TextDecoder()
          let buffer = ""
          let assistantMessageId = crypto.randomUUID()
          let accumulatedContent = ""
          let collectedToolCalls: AgentToolCall[] = []

          // Add placeholder assistant message for streaming
          setMessages(prev => [
            ...prev,
            {
              id: assistantMessageId,
              role: "assistant",
              content: "",
              timestamp: new Date(),
              isStreaming: true
            }
          ])

          while (reader) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n")
            buffer = lines.pop() || ""

            for (const line of lines) {
              if (line.startsWith("event:")) {
                const eventType = line.slice(6).trim()
                continue
              }
              if (line.startsWith("data:")) {
                const data = line.slice(5).trim()
                if (!data) continue

                try {
                  const parsed = JSON.parse(data)

                  // Handle different event types
                  if (parsed.name !== undefined && parsed.content === undefined && parsed.id === undefined) {
                    // Session renamed event
                    setCurrentSession(prev =>
                      prev ? { ...prev, name: parsed.name } : prev
                    )
                    setSessions(prev =>
                      prev.map(s =>
                        s.id === sessionId ? { ...s, name: parsed.name } : s
                      )
                    )
                  } else if (parsed.content !== undefined) {
                    // Token event
                    accumulatedContent += parsed.content
                    setStreamingContent(accumulatedContent)
                    setMessages(prev =>
                      prev.map(msg =>
                        msg.id === assistantMessageId
                          ? { ...msg, content: accumulatedContent }
                          : msg
                      )
                    )
                  } else if (parsed.id && parsed.name && parsed.arguments !== undefined) {
                    // Tool start event
                    const newToolCall: AgentToolCall = {
                      id: parsed.id,
                      name: parsed.name,
                      arguments: parsed.arguments,
                      status: "running",
                      requiresConfirmation: parsed.requiresConfirmation || false
                    }
                    collectedToolCalls.push(newToolCall)
                    setActiveToolCalls(prev => [...prev, newToolCall])
                  } else if (parsed.result !== undefined && parsed.id) {
                    // Tool complete event
                    collectedToolCalls = collectedToolCalls.map(tc =>
                      tc.id === parsed.id
                        ? { ...tc, status: "completed" as const, result: parsed.result }
                        : tc
                    )
                    setActiveToolCalls(prev =>
                      prev.map(tc =>
                        tc.id === parsed.id
                          ? { ...tc, status: "completed" as const, result: parsed.result }
                          : tc
                      )
                    )
                  } else if (parsed.response !== undefined) {
                    // Done event - finalize the message
                    setMessages(prev =>
                      prev.map(msg =>
                        msg.id === assistantMessageId
                          ? {
                              ...msg,
                              content: parsed.response,
                              isStreaming: false,
                              toolCalls: parsed.tool_calls?.map((tc: any) => ({
                                id: tc.id,
                                name: tc.name,
                                arguments: tc.arguments,
                                result: tc.result,
                                status: tc.status || "completed",
                                requiresConfirmation: tc.requiresConfirmation || false
                              }))
                            }
                          : msg
                      )
                    )
                    if (parsed.pending_confirmations?.length > 0) {
                      setPendingConfirmations(parsed.pending_confirmations)
                    }
                  } else if (parsed.message && !parsed.response) {
                    // Error event
                    toast.error(parsed.message || "An error occurred")
                    setMessages(prev =>
                      prev.map(msg =>
                        msg.id === assistantMessageId
                          ? { ...msg, content: `Error: ${parsed.message}`, isStreaming: false }
                          : msg
                      )
                    )
                  }
                } catch (e) {
                  console.error("[AgentContext] Failed to parse SSE data:", e)
                }
              }
            }
          }
        } catch (error: any) {
          console.error("[AgentContext] Streaming error:", error)
          toast.error("Connection interrupted. Trying again...")
          // Fall back to non-streaming
          await sendMessageNonStreaming(sessionId, message)
        } finally {
          setIsGenerating(false)
          setStreamingContent("")
          setActiveToolCalls([])
        }
        return
      }

      // Non-streaming fallback
      await sendMessageNonStreaming(sessionId, message)
    },
    [currentSession, createSession, config]
  )

  // Non-streaming message handler (fallback)
  const sendMessageNonStreaming = async (sessionId: string, message: string) => {
    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          message,
          config: {
            model: config.model,
            temperature: config.temperature,
            max_tokens: config.maxTokens
          }
        })
      })

      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
        const errorMessage: AgentChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Error: ${data.error}`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
      } else {
        const formattedToolCalls: AgentToolCall[] | undefined = data.tool_calls?.map((tc: any) => ({
          id: tc.id,
          name: tc.name,
          arguments: tc.arguments,
          result: tc.result,
          status: tc.status || "completed",
          requiresConfirmation: tc.requiresConfirmation || false
        }))

        const assistantMessage: AgentChatMessage = {
          id: data.message_id || crypto.randomUUID(),
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
          toolCalls: formattedToolCalls
        }
        setMessages(prev => [...prev, assistantMessage])

        if (data.pending_confirmations?.length > 0) {
          setPendingConfirmations(data.pending_confirmations)
        }
      }
    } catch (error: any) {
      console.error("Error sending message:", error)
      toast.error("Failed to send message. Please try again.")
      const errorMessage: AgentChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, there was an error processing your request. Please try again.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsGenerating(false)
    }
  }

  const confirmToolCall = useCallback(async (toolCallId: string) => {
    if (!currentSession) return

    try {
      const response = await fetch("/api/agent/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: currentSession.id,
          tool_call_id: toolCallId,
          action: "confirm"
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Action approved and executed")
        // Update the message with the confirmed tool call
        setMessages(prev =>
          prev.map(msg => {
            if (msg.toolCalls) {
              return {
                ...msg,
                toolCalls: msg.toolCalls.map(tc =>
                  tc.id === toolCallId
                    ? { ...tc, status: "completed" as const, result: data.result }
                    : tc
                )
              }
            }
            return msg
          })
        )

        // Add a confirmation message
        const confirmMessage: AgentChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.result?.message || "Action confirmed and executed.",
          timestamp: new Date()
        }
        setMessages(prev => [...prev, confirmMessage])
      } else if (data.error) {
        toast.error(data.error)
      }

      setPendingConfirmations(prev => prev.filter(tc => tc.id !== toolCallId))
    } catch (error) {
      console.error("Error confirming tool call:", error)
      toast.error("Failed to confirm action")
    }
  }, [currentSession])

  const cancelToolCall = useCallback(async (toolCallId: string) => {
    if (!currentSession) return

    try {
      await fetch("/api/agent/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: currentSession.id,
          tool_call_id: toolCallId,
          action: "cancel"
        })
      })

      toast.info("Action cancelled")
      // Update the message with the cancelled tool call
      setMessages(prev =>
        prev.map(msg => {
          if (msg.toolCalls) {
            return {
              ...msg,
              toolCalls: msg.toolCalls.map(tc =>
                tc.id === toolCallId
                  ? { ...tc, status: "cancelled" as const }
                  : tc
              )
            }
          }
          return msg
        })
      )

      // Add a cancellation message
      const cancelMessage: AgentChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Action cancelled. Let me know if you'd like to do something else.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, cancelMessage])

      setPendingConfirmations(prev => prev.filter(tc => tc.id !== toolCallId))
    } catch (error) {
      console.error("Error cancelling tool call:", error)
      toast.error("Failed to cancel action")
    }
  }, [currentSession])

  const loadTasks = useCallback(async (sessionId?: string) => {
    setIsLoadingTasks(true)
    try {
      const url = sessionId
        ? `/api/agent/tasks?session_id=${sessionId}`
        : "/api/agent/tasks"
      const response = await fetch(url)
      const data = await response.json()
      if (data.tasks) {
        setTasks(data.tasks)
      }
    } catch (error) {
      console.error("Error loading tasks:", error)
    } finally {
      setIsLoadingTasks(false)
    }
  }, [])

  const createTask = useCallback(
    async (title: string, description?: string) => {
      if (!currentSession) return

      try {
        const response = await fetch("/api/agent/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: currentSession.id,
            title,
            description
          })
        })
        const data = await response.json()
        if (data.task) {
          setTasks(prev => [data.task, ...prev])
        }
      } catch (error) {
        console.error("Error creating task:", error)
      }
    },
    [currentSession]
  )

  const updateTaskStatus = useCallback(async (taskId: string, status: string) => {
    try {
      const response = await fetch("/api/agent/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, status })
      })
      const data = await response.json()
      if (data.task) {
        setTasks(prev =>
          prev.map(t => (t.id === taskId ? data.task : t))
        )
      }
    } catch (error) {
      console.error("Error updating task:", error)
    }
  }, [])

  const loadActivities = useCallback(async (sessionId?: string) => {
    setIsLoadingActivities(true)
    try {
      const url = sessionId
        ? `/api/agent/activity?session_id=${sessionId}`
        : "/api/agent/activity"
      const response = await fetch(url)
      const data = await response.json()
      if (data.activities) {
        setActivities(data.activities)
      }
    } catch (error) {
      console.error("Error loading activities:", error)
    } finally {
      setIsLoadingActivities(false)
    }
  }, [])

  const loadUsage = useCallback(async () => {
    try {
      const response = await fetch("/api/agent/usage")
      const data = await response.json()
      if (data.usage) {
        setUsage({
          totalSessions: data.usage.sessions.total,
          totalMessages: 0,
          totalTasksCompleted: data.usage.tasks.total,
          totalToolCalls: data.usage.toolCalls,
          totalTokensUsed: data.usage.tokens.total,
          estimatedCostCents: parseInt(data.usage.estimatedCostCents) || 0,
          periodStart: data.month + "-01",
          periodEnd: data.month + "-31"
        })
      }
    } catch (error) {
      console.error("Error loading usage:", error)
    }
  }, [])

  const setConfig = useCallback((newConfig: Partial<AgentConfig>) => {
    setConfigState(prev => ({ ...prev, ...newConfig }))
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return (
    <AgentContext.Provider
      value={{
        sessions,
        currentSession,
        isLoadingSessions,
        messages,
        isLoadingMessages,
        isGenerating,
        streamingContent,
        tasks,
        isLoadingTasks,
        activities,
        isLoadingActivities,
        usage,
        hasAccess,
        isCheckingAccess,
        pendingConfirmations,
        activeToolCalls,
        config,
        loadSessions,
        createSession,
        selectSession,
        deleteSession,
        sendMessage,
        confirmToolCall,
        cancelToolCall,
        loadTasks,
        createTask,
        updateTaskStatus,
        loadActivities,
        loadUsage,
        checkAccess,
        setConfig,
        clearMessages
      }}
    >
      {children}
    </AgentContext.Provider>
  )
}

export function useAgent() {
  const context = useContext(AgentContext)
  if (!context) {
    throw new Error("useAgent must be used within an AgentProvider")
  }
  return context
}
