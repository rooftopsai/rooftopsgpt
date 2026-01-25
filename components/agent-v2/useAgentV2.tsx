"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import { AgentTask, TaskStep } from "./AgentTaskView"
import { TaskSummary } from "./AgentHistory"

// Extended task step with timing info
export interface ExtendedTaskStep extends TaskStep {
  startedAt?: Date
  completedAt?: Date
  durationMs?: number
  retryCount?: number
}

// Extended task with more metadata
export interface ExtendedAgentTask extends Omit<AgentTask, "steps"> {
  steps: ExtendedTaskStep[]
  startedAt: Date
  completedAt?: Date
  totalDurationMs?: number
  streamingContent?: string
  tokenCount?: { input: number; output: number; total: number }
}

export interface ConnectedApp {
  slug: string
  name: string
  icon?: string
  enabled: boolean
}

// AI Employee persona for activation
export interface AIEmployeePersona {
  id: string
  name: string
  role: string
  systemPrompt: string
}

export function useAgentV2(workspaceId: string) {
  const [currentTask, setCurrentTask] = useState<ExtendedAgentTask | null>(null)
  const [recentTasks, setRecentTasks] = useState<TaskSummary[]>([])
  const [connectedApps, setConnectedApps] = useState<string[]>([])
  const [connectedAppsDetails, setConnectedAppsDetails] = useState<ConnectedApp[]>([])
  const [isLoadingApps, setIsLoadingApps] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState<string>("")
  const [isConnecting, setIsConnecting] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)
  const retryCountRef = useRef<Map<string, number>>(new Map())
  const sessionIdRef = useRef<string | null>(null)

  // Keep ref in sync with state
  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  // Load connected apps on mount
  useEffect(() => {
    loadConnectedApps()
    loadRecentTasks()
  }, [])

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to cancel running task
      if (e.key === "Escape" && currentTask?.status === "running") {
        e.preventDefault()
        cancelTask()
        toast.info("Task cancelled")
      }

      // Cmd/Ctrl + K to clear and start new task
      if ((e.metaKey || e.ctrlKey) && e.key === "k" && currentTask?.status !== "running") {
        e.preventDefault()
        clearTask()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentTask?.status])

  const loadConnectedApps = async () => {
    setIsLoadingApps(true)
    try {
      // Fetch connected accounts from Pipedream
      const response = await fetch("/api/pipedream/accounts")
      const data = await response.json()
      if (data.accounts) {
        const apps = data.accounts.map((acc: any) => acc.appName || acc.appSlug)
        setConnectedApps(apps)
        setConnectedAppsDetails(data.accounts.map((acc: any) => ({
          slug: acc.appSlug,
          name: acc.appName || acc.appSlug,
          icon: acc.iconUrl,
          enabled: true
        })))
      }
    } catch (error) {
      console.error("[useAgentV2] Failed to load connected apps:", error)
    } finally {
      setIsLoadingApps(false)
    }
  }

  const loadRecentTasks = async () => {
    try {
      const response = await fetch("/api/agent/sessions?limit=10")
      const data = await response.json()
      if (data.sessions) {
        // Deduplicate by ID
        const seen = new Set<string>()
        const tasks: TaskSummary[] = data.sessions
          .filter((s: any) => {
            if (seen.has(s.id)) return false
            seen.add(s.id)
            return true
          })
          .map((s: any) => ({
            id: s.id,
            goal: s.name || "Untitled task",
            status: s.status === "failed" ? "failed" : s.status === "cancelled" ? "cancelled" : "completed",
            completedAt: new Date(s.updated_at || s.created_at),
            stepCount: s.total_tasks_completed || 0
          }))
        setRecentTasks(tasks)
      }
    } catch (error) {
      console.error("[useAgentV2] Failed to load recent tasks:", error)
    }
  }

  const createSession = async (options?: { name?: string; systemPrompt?: string }): Promise<string | null> => {
    try {
      const response = await fetch("/api/agent/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: options?.name || "New Task",
          model: "gpt-4o",
          system_prompt: options?.systemPrompt
        })
      })
      const data = await response.json()
      if (data.session) {
        return data.session.id
      }
      return null
    } catch (error) {
      console.error("[useAgentV2] Failed to create session:", error)
      return null
    }
  }

  // Activate an AI Employee with their persona
  const activateEmployee = useCallback(async (persona: AIEmployeePersona) => {
    // Clear any existing task/session
    setCurrentTask(null)
    setSessionId(null)
    sessionIdRef.current = null
    setStreamingContent("")

    // Create session with the employee's system prompt
    const newSessionId = await createSession({
      name: `${persona.name} - ${persona.role}`,
      systemPrompt: persona.systemPrompt
    })

    if (!newSessionId) {
      toast.error("Failed to activate AI employee")
      return
    }

    setSessionId(newSessionId)
    sessionIdRef.current = newSessionId

    // Send activation message to trigger the AI's intro
    const activationMessage = `Hello! I'm ready to work. What would you like me to help with today?`

    // Now run the task with this message
    abortControllerRef.current = new AbortController()

    const taskId = crypto.randomUUID()
    const startTime = new Date()
    const newTask: ExtendedAgentTask = {
      id: taskId,
      goal: `Activating ${persona.name}...`,
      status: "running",
      steps: [],
      startedAt: startTime,
      streamingContent: ""
    }
    setCurrentTask(newTask)

    try {
      const response = await fetch("/api/agent/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: newSessionId,
          message: activationMessage,
          config: {
            model: "gpt-4o",
            temperature: 0.7,
            max_tokens: 4096
          }
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error("Failed to activate employee")
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let fullResponse = ""

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data:")) {
            const data = line.slice(5).trim()
            if (!data) continue

            try {
              const parsed = JSON.parse(data)

              // Handle token streaming
              if (parsed.content !== undefined && !parsed.id) {
                fullResponse += parsed.content
                setStreamingContent(prev => prev + parsed.content)
                setCurrentTask(prev => {
                  if (!prev) return prev
                  return {
                    ...prev,
                    goal: `${persona.name} is ready`,
                    streamingContent: fullResponse
                  }
                })
              }

              // Handle completion
              if (parsed.response !== undefined) {
                setCurrentTask(prev => {
                  if (!prev) return prev
                  return {
                    ...prev,
                    status: "completed",
                    response: parsed.response || fullResponse,
                    goal: `${persona.name} is ready`,
                    completedAt: new Date(),
                    totalDurationMs: new Date().getTime() - startTime.getTime(),
                    streamingContent: undefined
                  }
                })
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      // Ensure task is marked complete
      setCurrentTask(prev => {
        if (!prev) return prev
        if (prev.status === "running") {
          return {
            ...prev,
            status: "completed",
            response: fullResponse,
            goal: `${persona.name} is ready`,
            completedAt: new Date(),
            totalDurationMs: new Date().getTime() - startTime.getTime(),
            streamingContent: undefined
          }
        }
        return prev
      })
    } catch (error: any) {
      if (error.name !== "AbortError") {
        toast.error("Failed to activate AI employee")
        setCurrentTask(prev => {
          if (!prev) return prev
          return {
            ...prev,
            status: "failed",
            error: error.message,
            completedAt: new Date()
          }
        })
      }
    } finally {
      setStreamingContent("")
    }
  }, [])

  const sendTask = useCallback(async (goal: string) => {
    // Create session if needed
    let currentSessionId = sessionId
    if (!currentSessionId) {
      currentSessionId = await createSession()
      if (!currentSessionId) {
        toast.error("Failed to start task")
        return
      }
      setSessionId(currentSessionId)
      sessionIdRef.current = currentSessionId // Also update ref immediately
    }

    // Reset retry counts
    retryCountRef.current.clear()

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    // Initialize task state with timing
    const taskId = crypto.randomUUID()
    const startTime = new Date()
    const newTask: ExtendedAgentTask = {
      id: taskId,
      goal,
      status: "running",
      steps: [],
      startedAt: startTime,
      streamingContent: ""
    }
    setCurrentTask(newTask)
    setStreamingContent("")

    try {
      const response = await fetch("/api/agent/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: currentSessionId,
          message: goal,
          config: {
            model: "gpt-4o",
            temperature: 0.7,
            max_tokens: 4096
          }
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Request failed with status ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let fullResponse = ""
      const stepStartTimes = new Map<string, Date>()

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data:")) {
            const data = line.slice(5).trim()
            if (!data) continue

            try {
              const parsed = JSON.parse(data)

              // Handle session renamed event
              if (parsed.name && !parsed.content && !parsed.id) {
                // Session was renamed, update if needed
              }

              // Handle token events - stream content in real-time
              if (parsed.content !== undefined && !parsed.id) {
                fullResponse += parsed.content
                setStreamingContent(prev => prev + parsed.content)
                setCurrentTask(prev => {
                  if (!prev) return prev
                  return {
                    ...prev,
                    streamingContent: fullResponse
                  }
                })
              }

              // Handle tool start
              if (parsed.id && parsed.name && parsed.arguments !== undefined) {
                const stepStartTime = new Date()
                stepStartTimes.set(parsed.id, stepStartTime)

                const step: ExtendedTaskStep = {
                  id: parsed.id,
                  description: getToolDescription(parsed.name, parsed.arguments),
                  toolName: parsed.name,
                  status: parsed.requiresConfirmation ? "awaiting_confirmation" : "running",
                  preview: parsed.arguments,
                  startedAt: stepStartTime,
                  retryCount: 0
                }

                setCurrentTask(prev => {
                  if (!prev) return prev
                  return {
                    ...prev,
                    status: parsed.requiresConfirmation ? "awaiting_confirmation" : "running",
                    steps: [...prev.steps, step],
                    streamingContent: "" // Clear streaming content when tool starts
                  }
                })
                setStreamingContent("")
              }

              // Handle tool complete
              if (parsed.result !== undefined && parsed.id) {
                const stepStartTime = stepStartTimes.get(parsed.id)
                const completedAt = new Date()
                const durationMs = stepStartTime ? completedAt.getTime() - stepStartTime.getTime() : undefined

                setCurrentTask(prev => {
                  if (!prev) return prev
                  return {
                    ...prev,
                    steps: prev.steps.map(s =>
                      s.id === parsed.id
                        ? {
                            ...s,
                            status: "completed" as const,
                            result: parsed.result,
                            completedAt,
                            durationMs
                          }
                        : s
                    )
                  }
                })
              }

              // Handle tool pending (needs confirmation)
              if (parsed.id && parsed.name && !parsed.result && !parsed.arguments) {
                setCurrentTask(prev => {
                  if (!prev) return prev
                  return {
                    ...prev,
                    status: "awaiting_confirmation",
                    steps: prev.steps.map(s =>
                      s.id === parsed.id
                        ? { ...s, status: "awaiting_confirmation" as const }
                        : s
                    )
                  }
                })
              }

              // Handle done event
              if (parsed.response !== undefined) {
                const completedAt = new Date()
                const totalDurationMs = completedAt.getTime() - startTime.getTime()

                setCurrentTask(prev => {
                  if (!prev) return prev
                  const finalTask = {
                    ...prev,
                    status: parsed.pending_confirmations?.length > 0
                      ? "awaiting_confirmation" as const
                      : "completed" as const,
                    response: parsed.response,
                    completedAt,
                    totalDurationMs,
                    tokenCount: parsed.tokens_used,
                    streamingContent: undefined
                  }

                  // Add to recent tasks if completed
                  if (finalTask.status === "completed") {
                    const taskSummary: TaskSummary = {
                      id: taskId,
                      goal,
                      status: "completed",
                      completedAt,
                      stepCount: prev.steps.length
                    }
                    setRecentTasks(prevTasks => [taskSummary, ...prevTasks.slice(0, 9)])
                  }

                  return finalTask
                })
                setStreamingContent("")
              }

              // Handle error event
              if (parsed.message && !parsed.response && !parsed.content) {
                const errorMessage = parsed.message

                // Check if this is a retryable error
                const isRetryable = isRetryableError(errorMessage)

                if (isRetryable) {
                  toast.error(`Error: ${errorMessage}. Retrying...`)
                } else {
                  toast.error(errorMessage)
                  setCurrentTask(prev => {
                    if (!prev) return prev
                    return {
                      ...prev,
                      status: "failed",
                      error: errorMessage,
                      completedAt: new Date(),
                      totalDurationMs: new Date().getTime() - startTime.getTime()
                    }
                  })
                }
              }
            } catch (e) {
              console.error("[useAgentV2] Failed to parse SSE data:", e)
            }
          }
        }
      }

      // Stream ended - if task is still running, mark it based on content received
      setCurrentTask(prev => {
        if (!prev) return prev
        // Only update if task is still marked as running (not awaiting confirmation or already completed)
        if (prev.status === "running") {
          const completedAt = new Date()
          const totalDurationMs = completedAt.getTime() - startTime.getTime()
          const finalStatus = prev.steps.some(s => s.status === "awaiting_confirmation")
            ? "awaiting_confirmation" as const
            : "completed" as const

          // Add to recent tasks if completed
          if (finalStatus === "completed") {
            const taskSummary: TaskSummary = {
              id: prev.id,
              goal: prev.goal,
              status: "completed",
              completedAt,
              stepCount: prev.steps.length
            }
            setRecentTasks(prevTasks => {
              const filtered = prevTasks.filter(t => t.id !== prev.id)
              return [taskSummary, ...filtered.slice(0, 9)]
            })
          }

          return {
            ...prev,
            status: finalStatus,
            response: fullResponse || prev.response,
            completedAt,
            totalDurationMs,
            streamingContent: undefined
          }
        }
        return prev
      })
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("[useAgentV2] Task cancelled by user")
        setCurrentTask(prev => {
          if (!prev) return prev
          return {
            ...prev,
            status: "failed",
            error: "Task cancelled by user",
            completedAt: new Date(),
            totalDurationMs: new Date().getTime() - startTime.getTime()
          }
        })
      } else {
        console.error("[useAgentV2] Task error:", error)

        // Provide helpful error messages
        let userMessage = "Task failed. Please try again."
        if (error.message?.includes("network") || error.message?.includes("fetch")) {
          userMessage = "Network error. Please check your connection and try again."
        } else if (error.message?.includes("timeout")) {
          userMessage = "Request timed out. Please try again."
        } else if (error.message?.includes("401") || error.message?.includes("403")) {
          userMessage = "Authentication error. Please refresh the page and try again."
        }

        toast.error(userMessage)
        setCurrentTask(prev => {
          if (!prev) return prev
          return {
            ...prev,
            status: "failed",
            error: error.message || "Task failed",
            completedAt: new Date(),
            totalDurationMs: new Date().getTime() - startTime.getTime()
          }
        })
      }
    } finally {
      setStreamingContent("")
    }
  }, [sessionId])

  const confirmAction = useCallback(async (stepId: string) => {
    // Use ref for immediate access (state may not be updated yet)
    const currentSessionId = sessionIdRef.current || sessionId
    if (!currentSessionId) {
      toast.error("Session not ready. Please try again.")
      console.error("[useAgentV2] confirmAction called without sessionId")
      return
    }

    // Update step to show processing
    setCurrentTask(prev => {
      if (!prev) return prev
      return {
        ...prev,
        steps: prev.steps.map(s =>
          s.id === stepId
            ? { ...s, status: "running" as const }
            : s
        )
      }
    })

    try {
      const response = await fetch("/api/agent/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: currentSessionId,
          tool_call_id: stepId,
          action: "confirm"
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Action completed successfully")
        const completedAt = new Date()
        setCurrentTask(prev => {
          if (!prev) return prev
          const step = prev.steps.find(s => s.id === stepId)
          const durationMs = step?.startedAt
            ? completedAt.getTime() - step.startedAt.getTime()
            : undefined

          const updatedTask = {
            ...prev,
            status: "completed" as const,
            completedAt,
            steps: prev.steps.map(s =>
              s.id === stepId
                ? {
                    ...s,
                    status: "completed" as const,
                    result: data.result,
                    completedAt,
                    durationMs
                  }
                : s
            )
          }

          // Add to recent tasks
          const taskSummary: TaskSummary = {
            id: prev.id,
            goal: prev.goal,
            status: "completed",
            completedAt,
            stepCount: prev.steps.length
          }
          setRecentTasks(prevTasks => {
            // Avoid duplicates
            const filtered = prevTasks.filter(t => t.id !== prev.id)
            return [taskSummary, ...filtered.slice(0, 9)]
          })

          return updatedTask
        })
      } else if (data.error) {
        toast.error(data.error)
        setCurrentTask(prev => {
          if (!prev) return prev
          return {
            ...prev,
            status: "failed",
            steps: prev.steps.map(s =>
              s.id === stepId
                ? { ...s, status: "failed" as const, error: data.error }
                : s
            )
          }
        })
      }
    } catch (error) {
      console.error("[useAgentV2] Confirm error:", error)
      toast.error("Failed to confirm action. Please try again.")
      setCurrentTask(prev => {
        if (!prev) return prev
        return {
          ...prev,
          steps: prev.steps.map(s =>
            s.id === stepId
              ? { ...s, status: "awaiting_confirmation" as const }
              : s
          )
        }
      })
    }
  }, [sessionId])

  const cancelAction = useCallback(async (stepId: string) => {
    const currentSessionId = sessionIdRef.current || sessionId
    if (!currentSessionId) {
      toast.error("Session not ready. Please try again.")
      return
    }

    try {
      await fetch("/api/agent/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: currentSessionId,
          tool_call_id: stepId,
          action: "cancel"
        })
      })

      toast.info("Action cancelled")
      setCurrentTask(prev => {
        if (!prev) return prev
        return {
          ...prev,
          status: "completed",
          completedAt: new Date(),
          steps: prev.steps.map(s =>
            s.id === stepId
              ? { ...s, status: "failed" as const, error: "Cancelled by user" }
              : s
          )
        }
      })
    } catch (error) {
      console.error("[useAgentV2] Cancel error:", error)
      toast.error("Failed to cancel action")
    }
  }, [sessionId])

  const retryStep = useCallback(async (stepId: string) => {
    const currentSessionId = sessionIdRef.current || sessionId
    if (!currentSessionId || !currentTask) return

    const step = currentTask.steps.find(s => s.id === stepId)
    if (!step || step.status !== "failed") return

    const currentRetryCount = retryCountRef.current.get(stepId) || 0
    if (currentRetryCount >= 3) {
      toast.error("Maximum retry attempts reached")
      return
    }

    retryCountRef.current.set(stepId, currentRetryCount + 1)

    // Update step to running
    setCurrentTask(prev => {
      if (!prev) return prev
      return {
        ...prev,
        status: "running",
        steps: prev.steps.map(s =>
          s.id === stepId
            ? {
                ...s,
                status: "running" as const,
                error: undefined,
                retryCount: currentRetryCount + 1,
                startedAt: new Date()
              }
            : s
        )
      }
    })

    toast.info(`Retrying... (attempt ${currentRetryCount + 2})`)

    // Re-send the original goal to retry
    // In a more sophisticated implementation, you'd retry just the failed step
    // For now, we'll show a message
    toast.info("Please re-submit your request to retry")
  }, [sessionId, currentTask])

  const cancelTask = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  const clearTask = useCallback(() => {
    setCurrentTask(null)
    setSessionId(null)
    sessionIdRef.current = null
    setStreamingContent("")
    retryCountRef.current.clear()
  }, [])

  const copyResult = useCallback((result: any) => {
    const text = typeof result === "string" ? result : JSON.stringify(result, null, 2)
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }, [])

  const shareResult = useCallback(async (task: ExtendedAgentTask) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: task.goal,
          text: task.response || "Agent task result",
        })
      } catch (error) {
        // User cancelled or share failed
        copyResult(task.response || "")
      }
    } else {
      copyResult(task.response || "")
    }
  }, [copyResult])

  const connectApp = useCallback(async (appSlug: string) => {
    setIsConnecting(true)
    try {
      const response = await fetch("/api/pipedream/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appSlug })
      })

      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
        return
      }

      // The API returns connectLinkUrl from Pipedream SDK (with app param already included)
      const connectUrl = data.connectLinkUrl
      if (connectUrl) {
        // Open in new window for OAuth
        const popup = window.open(connectUrl, "_blank", "width=600,height=700,scrollbars=yes")

        if (popup) {
          toast.info("Complete the connection in the popup window")

          // Poll for popup close to refresh apps
          const pollInterval = setInterval(() => {
            if (popup.closed) {
              clearInterval(pollInterval)
              // Refresh connected apps after popup closes
              setTimeout(() => {
                loadConnectedApps()
                toast.success("Checking for new connections...")
              }, 1000)
            }
          }, 500)

          // Clean up after 5 minutes max
          setTimeout(() => clearInterval(pollInterval), 300000)
        } else {
          toast.error("Popup blocked. Please allow popups for this site.")
        }
      } else {
        toast.error("Failed to get connection URL")
      }
    } catch (error) {
      console.error("[useAgentV2] Connect error:", error)
      toast.error("Failed to start app connection")
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const refreshApps = useCallback(async () => {
    await loadConnectedApps()
    toast.success("Apps refreshed")
  }, [])

  return {
    currentTask,
    recentTasks,
    connectedApps,
    connectedAppsDetails,
    isLoadingApps,
    isConnecting,
    streamingContent,
    sendTask,
    activateEmployee,
    confirmAction,
    cancelAction,
    retryStep,
    cancelTask,
    clearTask,
    copyResult,
    shareResult,
    connectApp,
    refreshApps
  }
}

// Helper to check if an error is retryable
function isRetryableError(message: string): boolean {
  const retryablePatterns = [
    "rate limit",
    "timeout",
    "temporarily unavailable",
    "503",
    "502",
    "429"
  ]
  const lowerMessage = message.toLowerCase()
  return retryablePatterns.some(pattern => lowerMessage.includes(pattern))
}

// Helper to generate human-readable descriptions for tool calls
function getToolDescription(toolName: string, args: any): string {
  const nameLower = toolName.toLowerCase()

  if (nameLower.includes("weather") || nameLower.includes("forecast")) {
    return `Checking weather for ${args.location || args.city || "location"}`
  }

  if (nameLower.includes("search") || nameLower.includes("web")) {
    return `Searching for "${args.query || args.q || "information"}"`
  }

  if (nameLower.includes("email") || nameLower.includes("mail") || nameLower.includes("gmail")) {
    if (nameLower.includes("send")) {
      return `Sending email to ${args.to || args.recipient || "recipient"}`
    }
    if (nameLower.includes("draft")) {
      return `Drafting email to ${args.to || args.recipient || "recipient"}`
    }
    if (nameLower.includes("read") || nameLower.includes("get") || nameLower.includes("list")) {
      return "Fetching emails"
    }
    return "Working with email"
  }

  if (nameLower.includes("calendar")) {
    if (nameLower.includes("create") || nameLower.includes("schedule")) {
      return `Scheduling: ${args.title || args.summary || "event"}`
    }
    if (nameLower.includes("get") || nameLower.includes("list")) {
      return "Checking calendar"
    }
    return "Working with calendar"
  }

  if (nameLower.includes("property") || nameLower.includes("report")) {
    return `Generating property report for ${args.address || "address"}`
  }

  if (nameLower.includes("price") || nameLower.includes("material")) {
    return `Looking up prices for ${args.material || args.product || "materials"}`
  }

  if (nameLower.includes("slack")) {
    if (nameLower.includes("send") || nameLower.includes("post")) {
      return `Sending message to #${args.channel || "channel"}`
    }
    return "Working with Slack"
  }

  if (nameLower.includes("docs") || nameLower.includes("document")) {
    if (nameLower.includes("create")) {
      return `Creating document: ${args.title || "Untitled"}`
    }
    return "Working with documents"
  }

  if (nameLower.includes("sheet") || nameLower.includes("spreadsheet")) {
    return "Working with spreadsheet"
  }

  // Default
  return `Running ${formatToolName(toolName)}`
}

function formatToolName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}
