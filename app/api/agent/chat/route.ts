// app/api/agent/chat/route.ts
// Main chat endpoint for the AI Agent
// Integrates with Pipedream MCP for connected apps (Gmail, Calendar, CRM, etc.)

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { checkAgentAccess } from "@/lib/entitlements"
import OpenAI from "openai"
import {
  getAgentSystemPrompt,
  getDynamicSystemPrompt
} from "@/lib/agent/agent-system-prompt"
import {
  BUILTIN_AGENT_TOOLS,
  convertToOpenAITools,
  toolRequiresConfirmation
} from "@/lib/agent/agent-tools"
import { GLOBAL_API_KEYS } from "@/lib/api-keys"
import {
  MCPSessionManager,
  isPipedreamConfigured
} from "@/lib/pipedream/mcp-session"
import { requiresConfirmation as mcpRequiresConfirmation } from "@/lib/pipedream/action-rules"

export const runtime = "nodejs"
export const maxDuration = 120

// Cache for MCP sessions per user
const mcpSessionCache = new Map<string, MCPSessionManager>()

// Generate an intelligent session name from the first message
function generateSessionName(message: string): string {
  // Clean and truncate the message
  const cleaned = message.trim().replace(/\s+/g, " ")

  // Common patterns to extract meaningful titles
  const patterns = [
    // Property/address related
    {
      regex: /(?:property|report|roof|analysis)\s+(?:for|at|on)\s+(.{10,50})/i,
      prefix: ""
    },
    {
      regex:
        /(\d+\s+[A-Za-z]+(?:\s+[A-Za-z]+)?(?:\s+(?:st|street|ave|avenue|rd|road|dr|drive|ln|lane|blvd|way|ct|court))?)/i,
      prefix: "Property: "
    },

    // Weather related
    { regex: /weather\s+(?:for|in|at)\s+([A-Za-z\s,]+)/i, prefix: "Weather: " },
    {
      regex: /forecast\s+(?:for|in|at)\s+([A-Za-z\s,]+)/i,
      prefix: "Forecast: "
    },

    // Email related
    {
      regex:
        /(?:draft|write|send)\s+(?:an?\s+)?email\s+(?:to|about|for)\s+(.{5,40})/i,
      prefix: "Email: "
    },

    // Search related
    {
      regex: /(?:search|find|look\s+up|research)\s+(?:for\s+)?(.{5,40})/i,
      prefix: "Search: "
    },

    // Material/pricing related
    {
      regex: /(?:price|cost|pricing)\s+(?:for|of)\s+(.{5,40})/i,
      prefix: "Pricing: "
    },
    { regex: /(.{5,30})\s+(?:price|cost|pricing)/i, prefix: "Pricing: " },

    // Customer related
    { regex: /(?:customer|client)\s+(.{5,40})/i, prefix: "Customer: " },

    // Job/project related
    { regex: /(?:job|project)\s+(?:for|at|on)\s+(.{5,40})/i, prefix: "Job: " },

    // Schedule related
    {
      regex: /(?:schedule|appointment|meeting)\s+(?:for|with)\s+(.{5,40})/i,
      prefix: "Schedule: "
    },

    // Estimate related
    {
      regex: /(?:estimate|quote)\s+(?:for|on)\s+(.{5,40})/i,
      prefix: "Estimate: "
    }
  ]

  // Try to match patterns
  for (const { regex, prefix } of patterns) {
    const match = cleaned.match(regex)
    if (match && match[1]) {
      const extracted = match[1].trim()
      // Capitalize first letter and clean up
      const title = extracted.charAt(0).toUpperCase() + extracted.slice(1)
      // Truncate if too long
      const truncated =
        title.length > 40 ? title.substring(0, 37) + "..." : title
      return prefix + truncated
    }
  }

  // Fallback: Use first part of message as title
  // Remove common starting words
  let title = cleaned
    .replace(
      /^(hey|hi|hello|please|can you|could you|i need|i want|help me)\s+/i,
      ""
    )
    .replace(/^(to|with|for|about)\s+/i, "")

  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1)

  // Truncate to reasonable length
  if (title.length > 50) {
    // Try to cut at word boundary
    const truncated = title.substring(0, 47)
    const lastSpace = truncated.lastIndexOf(" ")
    if (lastSpace > 30) {
      title = truncated.substring(0, lastSpace) + "..."
    } else {
      title = truncated + "..."
    }
  }

  return title || "New Conversation"
}

interface ChatRequest {
  session_id: string
  message: string
  config?: {
    model?: string
    temperature?: number
    max_tokens?: number
  }
}

// Helper to get or create MCP session for a user
async function getMCPSession(
  userId: string,
  sessionId: string
): Promise<MCPSessionManager | null> {
  if (!isPipedreamConfigured()) {
    console.log("[Agent] Pipedream not configured, skipping MCP integration")
    return null
  }

  const cacheKey = `${userId}-${sessionId}`

  if (mcpSessionCache.has(cacheKey)) {
    return mcpSessionCache.get(cacheKey)!
  }

  try {
    const mcpSession = new MCPSessionManager(userId, sessionId)
    await mcpSession.connect()
    mcpSessionCache.set(cacheKey, mcpSession)
    return mcpSession
  } catch (error) {
    console.error("[Agent] Failed to connect to Pipedream MCP:", error)
    return null
  }
}

// Convert MCP tools to OpenAI format
function convertMCPToolsToOpenAI(
  mcpTools: any[]
): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return mcpTools.map(tool => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description || `Execute ${tool.name}`,
      parameters: tool.inputSchema || { type: "object", properties: {} }
    }
  }))
}

// Check if a tool is a Pipedream MCP tool
function isMCPTool(toolName: string, mcpToolNames: Set<string>): boolean {
  return mcpToolNames.has(toolName)
}

// Check if any tool requires confirmation (built-in or MCP)
function checkToolRequiresConfirmation(
  toolName: string,
  isMCP: boolean
): boolean {
  if (isMCP) {
    return mcpRequiresConfirmation(toolName)
  }
  return toolRequiresConfirmation(toolName)
}

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

    const body: ChatRequest = await request.json()
    const { session_id, message, config } = body

    if (!session_id || !message) {
      return NextResponse.json(
        { error: "session_id and message are required" },
        { status: 400 }
      )
    }

    // Get the session
    const { data: session, error: sessionError } = await supabase
      .from("agent_sessions")
      .select("*")
      .eq("id", session_id)
      .eq("user_id", user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Get existing messages for context
    const { data: existingMessages } = await supabase
      .from("agent_messages")
      .select("*")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true })
      .limit(50) // Limit context window

    // Check if this is the first message - if so, generate intelligent session name
    const isFirstMessage = !existingMessages || existingMessages.length === 0
    if (isFirstMessage && session.name.includes("New")) {
      const intelligentName = generateSessionName(message)
      await supabase
        .from("agent_sessions")
        .update({ name: intelligentName })
        .eq("id", session_id)
      console.log(
        `[Agent] Generated session name: "${intelligentName}" for session ${session_id}`
      )
    }

    // Build conversation history - system prompt will be added after MCP tools are loaded
    const conversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
      []

    // Add existing messages
    if (existingMessages) {
      for (const msg of existingMessages) {
        if (msg.role === "tool" && msg.tool_call_id) {
          conversationHistory.push({
            role: "tool",
            content: msg.content,
            tool_call_id: msg.tool_call_id
          })
        } else if (msg.role === "assistant" && msg.tool_calls) {
          // Ensure tool_calls have the required 'type' field for OpenAI API
          const toolCallsArray = Array.isArray(msg.tool_calls)
            ? msg.tool_calls
            : []
          const formattedToolCalls = toolCallsArray.map((tc: any) => ({
            id: tc.id,
            type: "function" as const,
            function: {
              name: tc.name || tc.function?.name,
              arguments:
                typeof tc.arguments === "string"
                  ? tc.arguments
                  : JSON.stringify(tc.arguments || tc.function?.arguments || {})
            }
          }))
          conversationHistory.push({
            role: "assistant",
            content: msg.content || null,
            tool_calls: formattedToolCalls
          })
        } else if (msg.role === "user" || msg.role === "assistant") {
          conversationHistory.push({
            role: msg.role,
            content: msg.content
          })
        }
      }
    }

    // Add the new user message
    conversationHistory.push({
      role: "user",
      content: message
    })

    // Save user message to database
    const { data: userMessage } = await supabase
      .from("agent_messages")
      .insert([
        {
          session_id,
          user_id: user.id,
          role: "user",
          content: message
        }
      ])
      .select("*")
      .single()

    // Log activity
    await supabase.from("agent_activity_log").insert([
      {
        user_id: user.id,
        session_id,
        action_type: "message_sent",
        title: "Message Sent",
        description: message.substring(0, 100)
      }
    ])

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: GLOBAL_API_KEYS.openai
    })

    const model = config?.model || session.model || "gpt-4o"

    // Get built-in tools
    const builtinTools = convertToOpenAITools(BUILTIN_AGENT_TOOLS)

    // Initialize MCP session and get Pipedream tools
    let mcpSession: MCPSessionManager | null = null
    let mcpTools: any[] = []
    const mcpToolNames = new Set<string>()
    let connectedAppNames: string[] = []

    try {
      mcpSession = await getMCPSession(user.id, session_id)
      if (mcpSession) {
        // Get user's enabled apps from database
        const { data: dataSources } = await supabase
          .from("pipedream_data_sources")
          .select("app_slug, app_name")
          .eq("user_id", user.id)
          .eq("enabled", true)

        if (dataSources && dataSources.length > 0) {
          const enabledApps = dataSources.map(ds => ds.app_slug)
          connectedAppNames = dataSources.map(ds => ds.app_name || ds.app_slug)
          console.log("[Agent] Selecting Pipedream apps:", enabledApps)

          try {
            await mcpSession.selectApps(enabledApps)
            const allMcpTools = await mcpSession.listTools()

            // Filter out configuration tools - only include executable tools
            mcpTools = allMcpTools.filter((tool: any) => {
              const isConfigTool =
                tool.name.startsWith("begin_configuration_") ||
                tool.name.includes("_configure_") ||
                tool.name === "select_apps"
              if (isConfigTool) {
                console.log(`[Agent] Skipping config tool: ${tool.name}`)
              }
              return !isConfigTool
            })

            mcpTools.forEach(tool => mcpToolNames.add(tool.name))
            console.log(
              "[Agent] Loaded",
              mcpTools.length,
              "usable MCP tools from Pipedream"
            )

            if (mcpTools.length === 0 && allMcpTools.length > 0) {
              console.log(
                "[Agent] Warning: All MCP tools require OAuth configuration"
              )
            }
          } catch (mcpError) {
            console.error("[Agent] Error loading MCP tools:", mcpError)
          }
        }
      }
    } catch (error) {
      console.error("[Agent] MCP initialization error:", error)
    }

    // Combine built-in tools with MCP tools
    const mcpToolsOpenAI = convertMCPToolsToOpenAI(mcpTools)
    const allTools = [...builtinTools, ...mcpToolsOpenAI]
    console.log(
      "[Agent] Total tools available:",
      allTools.length,
      "(built-in:",
      builtinTools.length,
      ", MCP:",
      mcpToolsOpenAI.length,
      ")"
    )

    // Now add the system prompt with knowledge of available tools
    const mcpToolDescriptions = mcpTools
      .map((t: any) => `- ${t.name}: ${t.description || "No description"}`)
      .join("\n")
    const systemPrompt = getDynamicSystemPrompt({
      customInstructions: session.system_prompt,
      connectedApps: connectedAppNames,
      mcpToolDescriptions: mcpToolDescriptions || undefined
    })

    conversationHistory.unshift({
      role: "system",
      content: systemPrompt
    })

    let totalInputTokens = 0
    let totalOutputTokens = 0
    const toolCalls: any[] = []
    const pendingConfirmations: any[] = []

    // Process with potential tool calls
    let continueLoop = true
    let finalResponse = ""
    let iterationCount = 0
    const maxIterations = 5

    while (continueLoop && iterationCount < maxIterations) {
      iterationCount++

      const response = await openai.chat.completions.create({
        model,
        messages: conversationHistory,
        tools: allTools.length > 0 ? allTools : undefined,
        tool_choice: allTools.length > 0 ? "auto" : undefined,
        temperature: config?.temperature || 0.7,
        max_tokens: config?.max_tokens || 4096
      })

      if (response.usage) {
        totalInputTokens += response.usage.prompt_tokens
        totalOutputTokens += response.usage.completion_tokens
      }

      const assistantMessage = response.choices[0].message

      if (
        assistantMessage.tool_calls &&
        assistantMessage.tool_calls.length > 0
      ) {
        // Add assistant message with tool calls to history
        conversationHistory.push({
          role: "assistant",
          content: assistantMessage.content || null,
          tool_calls: assistantMessage.tool_calls
        })

        // Save assistant message with tool_calls to database FIRST (before tool responses)
        const formattedToolCallsForDb = assistantMessage.tool_calls.map(tc => ({
          id: tc.id,
          type: "function",
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments
          }
        }))

        await supabase.from("agent_messages").insert([
          {
            session_id,
            user_id: user.id,
            role: "assistant",
            content: assistantMessage.content || "",
            tool_calls: formattedToolCallsForDb
          }
        ])

        // Process each tool call
        for (const toolCall of assistantMessage.tool_calls) {
          const toolName = toolCall.function.name
          const toolArgs = JSON.parse(toolCall.function.arguments || "{}")
          const isToolMCP = isMCPTool(toolName, mcpToolNames)

          const toolCallRecord = {
            id: toolCall.id,
            name: toolName,
            arguments: toolArgs,
            status: "pending",
            requiresConfirmation: checkToolRequiresConfirmation(
              toolName,
              isToolMCP
            ),
            isMCP: isToolMCP
          }

          if (toolCallRecord.requiresConfirmation) {
            // Store pending confirmation
            pendingConfirmations.push(toolCallRecord)

            const pendingContent = JSON.stringify({
              status: "pending_confirmation",
              message: `Action "${toolName}" requires user confirmation.`,
              isMCP: isToolMCP
            })

            // Add placeholder response
            conversationHistory.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: pendingContent
            })

            // Save tool response message for pending confirmation
            await supabase.from("agent_messages").insert([
              {
                session_id,
                user_id: user.id,
                role: "tool",
                content: pendingContent,
                tool_call_id: toolCall.id
              }
            ])

            // Save tool execution record with MCP flag
            const { error: execInsertError } = await supabase
              .from("agent_tool_executions")
              .insert([
                {
                  session_id,
                  user_id: user.id,
                  tool_name: toolName,
                  tool_input: { ...toolArgs, _isMCP: isToolMCP },
                  status: "pending",
                  requires_confirmation: true
                }
              ])

            if (execInsertError) {
              console.error(
                "[Agent] Failed to insert pending tool execution:",
                execInsertError
              )
            } else {
              console.log(
                "[Agent] Saved pending tool execution for:",
                toolName,
                "session:",
                session_id
              )
            }
          } else {
            // Execute the tool - MCP or built-in
            let result: Record<string, unknown>

            if (isToolMCP && mcpSession) {
              // Execute via Pipedream MCP
              try {
                console.log("[Agent] Executing MCP tool:", toolName, toolArgs)
                const mcpResult = await mcpSession.callTool(toolName, toolArgs)
                result = {
                  status: "success",
                  source: "pipedream",
                  data: mcpResult.content || mcpResult
                }
              } catch (mcpError: any) {
                console.error("[Agent] MCP tool execution error:", mcpError)
                result = {
                  status: "error",
                  source: "pipedream",
                  message:
                    mcpError.message || "Failed to execute connected app action"
                }
              }
            } else {
              // Execute built-in tool with workspace context
              result = await executeBuiltinTool(toolName, toolArgs, {
                workspaceId: session.workspace_id,
                userId: user.id
              })
            }

            toolCallRecord.status = "completed"
            ;(toolCallRecord as any).result = result

            const toolResultContent = JSON.stringify(result)

            // Add tool result to history
            conversationHistory.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: toolResultContent
            })

            // Save tool response message to database for conversation reconstruction
            await supabase.from("agent_messages").insert([
              {
                session_id,
                user_id: user.id,
                role: "tool",
                content: toolResultContent,
                tool_call_id: toolCall.id
              }
            ])

            // Log tool execution
            await supabase.from("agent_tool_executions").insert([
              {
                session_id,
                user_id: user.id,
                tool_name: toolName,
                tool_input: toolArgs,
                tool_output: result,
                status: "completed"
              }
            ])

            await supabase.from("agent_activity_log").insert([
              {
                user_id: user.id,
                session_id,
                action_type: "tool_completed",
                title: `Tool: ${toolName}`,
                description: `Executed ${toolName}`
              }
            ])
          }

          toolCalls.push(toolCallRecord)
        }

        // If we have pending confirmations, stop and ask user
        if (pendingConfirmations.length > 0) {
          continueLoop = false
          finalResponse =
            assistantMessage.content ||
            "I need your confirmation before proceeding."
        }
      } else {
        // No tool calls, we have the final response
        continueLoop = false
        finalResponse = assistantMessage.content || ""

        conversationHistory.push({
          role: "assistant",
          content: finalResponse
        })

        // Save the final assistant message (no tool calls)
        await supabase.from("agent_messages").insert([
          {
            session_id,
            user_id: user.id,
            role: "assistant",
            content: finalResponse,
            tokens_used: totalInputTokens + totalOutputTokens
          }
        ])
      }
    }

    // Get the last saved message ID for the response
    const { data: lastMessage } = await supabase
      .from("agent_messages")
      .select("id")
      .eq("session_id", session_id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    const savedAssistantMessage = lastMessage

    // Update session stats
    await supabase
      .from("agent_sessions")
      .update({
        total_tokens_used:
          session.total_tokens_used + totalInputTokens + totalOutputTokens
      })
      .eq("id", session_id)

    // Track usage for billing
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
          total_tokens_input: usage.total_tokens_input + totalInputTokens,
          total_tokens_output: usage.total_tokens_output + totalOutputTokens,
          total_tool_calls: usage.total_tool_calls + toolCalls.length
        })
        .eq("id", usage.id)
    } else {
      await supabase.from("agent_usage").insert([
        {
          user_id: user.id,
          month: currentMonth,
          total_tokens_input: totalInputTokens,
          total_tokens_output: totalOutputTokens,
          total_tool_calls: toolCalls.length,
          total_sessions: 1
        }
      ])
    }

    return NextResponse.json({
      response: finalResponse,
      message_id: savedAssistantMessage?.id,
      tool_calls: toolCalls,
      pending_confirmations: pendingConfirmations,
      tokens_used: {
        input: totalInputTokens,
        output: totalOutputTokens,
        total: totalInputTokens + totalOutputTokens
      }
    })
  } catch (error: any) {
    console.error("Agent chat error:", error)

    // Handle OpenAI API errors specifically
    if (error?.code || error?.error) {
      const openAIError = error.error || error
      console.error("OpenAI API Error:", {
        code: openAIError.code,
        message: openAIError.message,
        param: openAIError.param,
        type: openAIError.type
      })
      return NextResponse.json(
        {
          error: `AI API Error: ${openAIError.message || "Unknown error"}`,
          details: {
            code: openAIError.code,
            param: openAIError.param
          }
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// Helper function to escape HTML
function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }
  return text.replace(/[&<>"']/g, char => htmlEscapes[char])
}

// Helper function to adjust color brightness
function adjustColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16)
  const amt = Math.round(2.55 * percent)
  const R = (num >> 16) + amt
  const G = ((num >> 8) & 0x00ff) + amt
  const B = (num & 0x0000ff) + amt
  return (
    "#" +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  )
}

// Execute built-in tools - exported for streaming route
export async function executeBuiltinTool(
  toolName: string,
  args: Record<string, unknown>,
  context?: { workspaceId?: string; userId?: string }
): Promise<Record<string, unknown>> {
  try {
    switch (toolName) {
      case "web_search": {
        // Use the Brave Search API
        const query = args.query as string
        if (!query) {
          return { status: "error", message: "Search query is required" }
        }

        try {
          const braveApiKey =
            process.env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_AI_API_KEY
          if (!braveApiKey) {
            return {
              status: "error",
              message:
                "Web search is not configured. Please ask your administrator to set up the Brave Search API."
            }
          }

          const response = await fetch(
            `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
            {
              headers: {
                Accept: "application/json",
                "X-Subscription-Token": braveApiKey
              }
            }
          )

          if (!response.ok) {
            return { status: "error", message: "Web search request failed" }
          }

          const data = await response.json()
          const results =
            data.web?.results
              ?.map((result: any) => ({
                title: result.title,
                description: result.description,
                url: result.url
              }))
              .slice(0, 5) || []

          return {
            status: "success",
            query,
            results,
            result_count: results.length
          }
        } catch (searchError) {
          console.error("Web search error:", searchError)
          return { status: "error", message: "Web search failed" }
        }
      }

      case "get_material_prices": {
        // Perform a web search for material prices
        const materialType = args.material_type as string
        const region = (args.region as string) || "USA"

        try {
          const braveApiKey =
            process.env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_AI_API_KEY
          if (!braveApiKey) {
            return {
              status: "partial",
              material: materialType,
              region,
              message:
                "Direct pricing lookup unavailable. Consider asking me to do a web search for current prices."
            }
          }

          const query = `${materialType} roofing prices ${region} 2026`
          const response = await fetch(
            `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
            {
              headers: {
                Accept: "application/json",
                "X-Subscription-Token": braveApiKey
              }
            }
          )

          if (!response.ok) {
            return {
              status: "partial",
              material: materialType,
              region,
              message:
                "Could not fetch current prices. Try asking me to search the web for pricing."
            }
          }

          const data = await response.json()
          const results =
            data.web?.results
              ?.map((result: any) => ({
                title: result.title,
                snippet: result.description,
                url: result.url
              }))
              .slice(0, 3) || []

          return {
            status: "success",
            material: materialType,
            region,
            price_sources: results,
            note: "Prices shown are from web search results. Verify with local suppliers for accurate quotes."
          }
        } catch (searchError) {
          return {
            status: "partial",
            material: materialType,
            region,
            message:
              "Price lookup encountered an error. Ask me to search the web for current pricing."
          }
        }
      }

      case "get_weather_forecast": {
        const location = args.location as string
        const days = (args.days as number) || 7

        // Use wttr.in API - handles cities, zip codes, and coordinates
        try {
          // For US zip codes, add ",US" to help with resolution
          let queryLocation = location
          if (/^\d{5}$/.test(location.trim())) {
            queryLocation = `${location},US`
          }

          const response = await fetch(
            `https://wttr.in/${encodeURIComponent(queryLocation)}?format=j1`,
            {
              headers: {
                "User-Agent": "curl/7.68.0" // wttr.in works better with curl user agent
              }
            }
          )

          if (!response.ok) {
            // Try alternative: use Open-Meteo with a geocoding step
            console.log(
              `[Weather] wttr.in failed for ${location}, status: ${response.status}`
            )
            return {
              status: "partial",
              location,
              message: `Weather service could not find location "${location}". Try using a city name like "Memphis, TN" instead of a zip code.`
            }
          }

          const data = await response.json()

          // Check if we got valid data
          if (!data.current_condition || !data.weather) {
            return {
              status: "partial",
              location,
              message: `Could not get weather data for "${location}". Try using a city name like "Memphis, TN".`
            }
          }

          const current = data.current_condition?.[0]
          const nearestArea = data.nearest_area?.[0]
          const resolvedLocation = nearestArea
            ? `${nearestArea.areaName?.[0]?.value || ""}, ${nearestArea.region?.[0]?.value || ""}`
            : location

          const forecast = data.weather
            ?.slice(0, Math.min(days, 3))
            .map((day: any) => ({
              date: day.date,
              high_f: day.maxtempF,
              low_f: day.mintempF,
              condition: day.hourly?.[4]?.weatherDesc?.[0]?.value || "Unknown",
              chance_of_rain: day.hourly?.[4]?.chanceofrain || "0"
            }))

          return {
            status: "success",
            location: resolvedLocation,
            requested_location: location,
            current: current
              ? {
                  temp_f: current.temp_F,
                  condition: current.weatherDesc?.[0]?.value,
                  humidity: current.humidity + "%",
                  wind_mph: current.windspeedMiles
                }
              : null,
            forecast,
            roofing_advisory: forecast?.some(
              (d: any) => parseInt(d.chance_of_rain) > 40
            )
              ? "Rain expected in the forecast period. Plan roofing work accordingly."
              : "Weather looks favorable for roofing work."
          }
        } catch (weatherError) {
          return {
            status: "error",
            location,
            message: "Could not fetch weather data"
          }
        }
      }

      case "draft_email":
        return {
          status: "success",
          draft: {
            to: args.to,
            subject: args.subject,
            body: args.body || "Email draft created."
          },
          message: "Email draft created. Review and confirm before sending."
        }

      case "search_customers": {
        const searchQuery = args.query as string
        const workspaceId = context?.workspaceId

        if (!workspaceId) {
          return {
            status: "error",
            message:
              "No workspace connected. Please access the agent from within a workspace."
          }
        }

        try {
          // Import CRM functions
          const { listCustomers, searchCustomers } = await import(
            "@/lib/crm/customers"
          )

          let customers
          if (searchQuery && searchQuery.trim()) {
            customers = await searchCustomers(workspaceId, searchQuery, 10)
          } else {
            const result = await listCustomers(
              workspaceId,
              {},
              { page: 1, pageSize: 10 }
            )
            customers = result.customers
          }

          if (customers.length === 0) {
            return {
              status: "success",
              query: searchQuery,
              results: [],
              message: searchQuery
                ? `No customers found matching "${searchQuery}".`
                : "No customers in the CRM yet."
            }
          }

          return {
            status: "success",
            query: searchQuery,
            results: customers.map((c: any) => ({
              id: c.id,
              name: c.name,
              phone: c.phone,
              email: c.email,
              address: [c.address, c.city, c.state].filter(Boolean).join(", "),
              status: c.status,
              source: c.source,
              tags: c.tags
            })),
            count: customers.length,
            message: `Found ${customers.length} customer(s)${searchQuery ? ` matching "${searchQuery}"` : ""}.`
          }
        } catch (error) {
          console.error("[Agent] CRM search error:", error)
          return {
            status: "error",
            query: searchQuery,
            message: "Failed to search customers. Please try again."
          }
        }
      }

      case "get_customer_details": {
        const customerId = args.customer_id as string
        const workspaceId = context?.workspaceId

        if (!workspaceId) {
          return {
            status: "error",
            message: "No workspace connected."
          }
        }

        try {
          const { getCustomer } = await import("@/lib/crm/customers")
          const { getJobsForCustomer } = await import("@/lib/crm/jobs")

          const customer = await getCustomer(customerId)
          if (!customer) {
            return {
              status: "error",
              message: "Customer not found."
            }
          }

          // Also get their jobs
          const jobs = await getJobsForCustomer(customerId)

          return {
            status: "success",
            customer: {
              id: customer.id,
              name: customer.name,
              phone: customer.phone,
              email: customer.email,
              secondaryPhone: customer.secondaryPhone,
              address: customer.address,
              city: customer.city,
              state: customer.state,
              zip: customer.zip,
              status: customer.status,
              source: customer.source,
              tags: customer.tags,
              notes: customer.notes,
              propertyType: customer.propertyType,
              preferredContactMethod: customer.preferredContactMethod,
              doNotCall: customer.doNotCall,
              doNotText: customer.doNotText,
              doNotEmail: customer.doNotEmail,
              createdAt: customer.createdAt
            },
            jobs: jobs.map((j: any) => ({
              id: j.id,
              title: j.title,
              status: j.status,
              jobType: j.jobType,
              estimatedCost: j.estimatedCost,
              scheduledDate: j.scheduledDate
            })),
            jobCount: jobs.length,
            message: `Found customer ${customer.name} with ${jobs.length} job(s).`
          }
        } catch (error) {
          console.error("[Agent] Get customer error:", error)
          return {
            status: "error",
            message: "Failed to get customer details."
          }
        }
      }

      case "search_jobs": {
        const jobSearch = args.query as string
        const statusFilter = args.status as string | undefined
        const workspaceId = context?.workspaceId

        if (!workspaceId) {
          return {
            status: "error",
            message: "No workspace connected."
          }
        }

        try {
          const { listJobs } = await import("@/lib/crm/jobs")

          const filters: any = {}
          if (jobSearch) filters.search = jobSearch
          if (statusFilter) filters.status = statusFilter

          const result = await listJobs(workspaceId, filters, {
            page: 1,
            pageSize: 15
          })

          if (result.jobs.length === 0) {
            return {
              status: "success",
              query: jobSearch,
              results: [],
              message: jobSearch
                ? `No jobs found matching "${jobSearch}".`
                : "No jobs in the system yet."
            }
          }

          return {
            status: "success",
            query: jobSearch,
            statusFilter,
            results: result.jobs.map((j: any) => ({
              id: j.id,
              title: j.title,
              jobNumber: j.jobNumber,
              status: j.status,
              jobType: j.jobType,
              address: [j.address, j.city, j.state].filter(Boolean).join(", "),
              estimatedCost: j.estimatedCost,
              actualCost: j.actualCost,
              scheduledDate: j.scheduledDate,
              customerName: j.customer?.name,
              crewName: j.crew?.name
            })),
            count: result.jobs.length,
            total: result.total,
            message: `Found ${result.jobs.length} job(s)${jobSearch ? ` matching "${jobSearch}"` : ""}${statusFilter ? ` with status "${statusFilter}"` : ""}.`
          }
        } catch (error) {
          console.error("[Agent] Job search error:", error)
          return {
            status: "error",
            message: "Failed to search jobs."
          }
        }
      }

      case "create_customer": {
        const workspaceId = context?.workspaceId
        if (!workspaceId) {
          return { status: "error", message: "No workspace connected." }
        }

        try {
          const { createCustomer } = await import("@/lib/crm/customers")

          const customer = await createCustomer({
            workspaceId,
            name: args.name as string,
            phone: args.phone as string | undefined,
            email: args.email as string | undefined,
            address: args.address as string | undefined,
            city: args.city as string | undefined,
            state: args.state as string | undefined,
            zip: args.zip as string | undefined,
            source: args.source as any,
            notes: args.notes as string | undefined,
            tags: args.tags as string[] | undefined,
            status: "lead"
          })

          if (!customer) {
            return { status: "error", message: "Failed to create customer." }
          }

          return {
            status: "success",
            customer: {
              id: customer.id,
              name: customer.name,
              phone: customer.phone,
              email: customer.email,
              address: [customer.address, customer.city, customer.state]
                .filter(Boolean)
                .join(", ")
            },
            message: `Created new customer: ${customer.name}`
          }
        } catch (error) {
          console.error("[Agent] Create customer error:", error)
          return { status: "error", message: "Failed to create customer." }
        }
      }

      case "create_job": {
        const workspaceId = context?.workspaceId
        if (!workspaceId) {
          return { status: "error", message: "No workspace connected." }
        }

        try {
          const { createJob } = await import("@/lib/crm/jobs")

          const scheduledDate = args.scheduled_date
            ? new Date(args.scheduled_date as string)
            : undefined

          const job = await createJob({
            workspaceId,
            customerId: args.customer_id as string,
            title: args.title as string,
            address: args.address as string | undefined,
            city: args.city as string | undefined,
            state: args.state as string | undefined,
            zip: args.zip as string | undefined,
            jobType: args.job_type as any,
            status: (args.status as any) || "lead",
            estimatedCost: args.estimated_cost as number | undefined,
            scheduledDate,
            notes: args.notes as string | undefined,
            isInsuranceClaim: args.is_insurance_claim as boolean | undefined
          })

          if (!job) {
            return { status: "error", message: "Failed to create job." }
          }

          return {
            status: "success",
            job: {
              id: job.id,
              title: job.title,
              status: job.status,
              jobType: job.jobType,
              estimatedCost: job.estimatedCost
            },
            message: `Created new job: ${job.title}`
          }
        } catch (error) {
          console.error("[Agent] Create job error:", error)
          return { status: "error", message: "Failed to create job." }
        }
      }

      case "update_job_status": {
        const workspaceId = context?.workspaceId
        if (!workspaceId) {
          return { status: "error", message: "No workspace connected." }
        }

        try {
          const { updateJobStatus, getJob } = await import("@/lib/crm/jobs")

          const jobId = args.job_id as string
          const newStatus = args.status as any

          const success = await updateJobStatus(jobId, newStatus)

          if (!success) {
            return { status: "error", message: "Failed to update job status." }
          }

          const updatedJob = await getJob(jobId)

          return {
            status: "success",
            job: updatedJob
              ? {
                  id: updatedJob.id,
                  title: updatedJob.title,
                  status: updatedJob.status
                }
              : null,
            message: `Updated job status to: ${newStatus}`
          }
        } catch (error) {
          console.error("[Agent] Update job status error:", error)
          return { status: "error", message: "Failed to update job status." }
        }
      }

      case "check_calendar":
        return {
          status: "info",
          available_slots: [],
          message:
            "Calendar integration is pending. Availability data will be accessible once connected to your calendar."
        }

      case "generate_report": {
        const reportType = args.report_type as string
        const title = args.title as string
        const data = args.data as any

        return {
          status: "success",
          report_type: reportType,
          title: title,
          content: `# ${title}\n\nReport generated on ${new Date().toLocaleDateString()}.\n\n${JSON.stringify(data, null, 2) || "No data provided."}`,
          message: "Report generated. You can ask me to modify or export it."
        }
      }

      case "generate_property_report": {
        const address = args.address as string
        if (!address) {
          return { status: "error", message: "Property address is required" }
        }

        try {
          // Import the property research service dynamically to avoid circular deps
          const { PropertyResearchService } = await import(
            "@/lib/property/property-service"
          )
          const { PropertyReportGenerator } = await import(
            "@/lib/property/report-generator"
          )

          console.log("[Agent] Generating property report for:", address)

          // Create an address object for the service
          const detectedAddress = {
            fullAddress: address,
            streetNumber: "",
            streetName: "",
            city: "",
            state: "",
            zipCode: "",
            confidence: 1.0
          }

          // Research the property
          const researchService = new PropertyResearchService()
          const propertyData =
            await researchService.researchProperty(detectedAddress)

          // Generate the report
          const reportGenerator = new PropertyReportGenerator()
          const report = await reportGenerator.generateReport(propertyData)

          return {
            status: "success",
            address: address,
            report_type: "property",
            property: {
              address: propertyData.address.fullAddress,
              type: propertyData.propertyDetails.propertyType,
              groundArea: propertyData.propertyDetails.groundArea
            },
            roof: {
              totalArea: propertyData.roofDetails.roofArea,
              totalSquares: propertyData.roofDetails.totalRoofSquares,
              facetCount: propertyData.roofDetails.roofFacets,
              mainPitch: propertyData.roofDetails.roofPitch,
              facets: propertyData.roofDetails.facets.slice(0, 5).map(f => ({
                area: f.area,
                pitch: f.pitch,
                orientation: f.orientation
              }))
            },
            solar: {
              maxPanels: propertyData.solarPotential.maxArrayPanels,
              yearlyEnergyKwh: Math.round(
                propertyData.solarPotential.yearlyEnergyDcKwh
              ),
              suitability: propertyData.solarPotential.suitabilityScore,
              installationCost:
                propertyData.solarPotential.costsAndSavings.installationCost,
              netSavings20Years:
                propertyData.solarPotential.costsAndSavings.netSavings,
              paybackYears:
                propertyData.solarPotential.costsAndSavings.paybackPeriodYears
            },
            imageryQuality: propertyData.imageryQuality,
            markdownReport: report.markdown,
            message:
              "Property report generated successfully with roof analysis and solar potential."
          }
        } catch (propertyError: any) {
          console.error("[Agent] Property report error:", propertyError)
          return {
            status: "error",
            address: address,
            message:
              propertyError.message ||
              "Failed to generate property report. The address may not be found or the property data is unavailable."
          }
        }
      }

      case "create_estimate":
        return {
          status: "info",
          message:
            "Estimate creation requires CRM integration. Once connected, I can create detailed roofing estimates for customers."
        }

      case "schedule_appointment":
        return {
          status: "info",
          message:
            "Appointment scheduling requires calendar integration. Once connected, I can schedule appointments for you."
        }

      case "generate_artifact": {
        const artifactType = args.artifact_type as string
        const companyName = args.company_name as string
        const title = (args.title as string) || ""
        const tagline = (args.tagline as string) || ""
        const contactInfo =
          (args.contact_info as {
            phone?: string
            email?: string
            website?: string
            address?: string
          }) || {}
        const keyServices = (args.key_services as string[]) || []
        const offer = (args.offer as string) || ""
        const style = (args.style as string) || "professional"
        const primaryColor = (args.primary_color as string) || "#24BDEB"

        // Generate the HTML artifact based on type
        let html = ""
        let cssStyles = ""

        // Common CSS variables and base styles
        const baseStyles = `
          :root {
            --primary: ${primaryColor};
            --primary-dark: ${adjustColor(primaryColor, -20)};
            --text-dark: #1a1a1a;
            --text-light: #666;
            --bg-light: #f8f9fa;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        `

        switch (artifactType) {
          case "business_card":
            cssStyles = `
              ${baseStyles}
              .business-card {
                width: 3.5in;
                height: 2in;
                background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
                border-radius: 8px;
                padding: 20px;
                color: white;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
              }
              .company-name {
                font-size: 18px;
                font-weight: 700;
                letter-spacing: 1px;
              }
              .tagline {
                font-size: 10px;
                opacity: 0.9;
                margin-top: 4px;
              }
              .contact-info {
                font-size: 11px;
                line-height: 1.6;
              }
              .contact-row {
                display: flex;
                align-items: center;
                gap: 6px;
              }
            `
            html = `
              <div class="business-card">
                <div class="header">
                  <div class="company-name">${escapeHtml(companyName)}</div>
                  ${tagline ? `<div class="tagline">${escapeHtml(tagline)}</div>` : ""}
                </div>
                <div class="contact-info">
                  ${contactInfo.phone ? `<div class="contact-row">${contactInfo.phone}</div>` : ""}
                  ${contactInfo.email ? `<div class="contact-row">${contactInfo.email}</div>` : ""}
                  ${contactInfo.website ? `<div class="contact-row">${contactInfo.website}</div>` : ""}
                </div>
              </div>
            `
            break

          case "flyer":
          case "door_hanger":
            cssStyles = `
              ${baseStyles}
              .flyer {
                width: 8.5in;
                min-height: 11in;
                background: white;
                padding: 40px;
                color: var(--text-dark);
              }
              .flyer-header {
                text-align: center;
                padding: 30px;
                background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
                color: white;
                border-radius: 12px;
                margin-bottom: 30px;
              }
              .flyer-header h1 {
                font-size: 36px;
                font-weight: 800;
                margin-bottom: 8px;
              }
              .flyer-header .company {
                font-size: 24px;
                font-weight: 600;
              }
              .flyer-header .tagline {
                font-size: 16px;
                opacity: 0.9;
                margin-top: 8px;
              }
              .offer-box {
                background: var(--bg-light);
                border: 3px dashed var(--primary);
                border-radius: 12px;
                padding: 24px;
                text-align: center;
                margin: 30px 0;
              }
              .offer-box h2 {
                font-size: 28px;
                color: var(--primary);
                font-weight: 800;
              }
              .services-list {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 16px;
                margin: 30px 0;
              }
              .service-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 16px;
                background: var(--bg-light);
                border-radius: 8px;
              }
              .service-icon {
                width: 24px;
                height: 24px;
                background: var(--primary);
                border-radius: 50%;
              }
              .contact-section {
                background: var(--text-dark);
                color: white;
                padding: 24px;
                border-radius: 12px;
                text-align: center;
                margin-top: 30px;
              }
              .contact-section h3 {
                font-size: 20px;
                margin-bottom: 16px;
              }
              .contact-grid {
                display: flex;
                justify-content: center;
                gap: 40px;
                flex-wrap: wrap;
              }
              .contact-item {
                font-size: 16px;
              }
            `
            html = `
              <div class="flyer">
                <div class="flyer-header">
                  <div class="company">${escapeHtml(companyName)}</div>
                  ${title ? `<h1>${escapeHtml(title)}</h1>` : `<h1>Quality Roofing You Can Trust</h1>`}
                  ${tagline ? `<div class="tagline">${escapeHtml(tagline)}</div>` : ""}
                </div>

                ${
                  offer
                    ? `
                <div class="offer-box">
                  <h2>${escapeHtml(offer)}</h2>
                </div>
                `
                    : ""
                }

                ${
                  keyServices.length > 0
                    ? `
                <div class="services-list">
                  ${keyServices
                    .map(
                      service => `
                    <div class="service-item">
                      <div class="service-icon"></div>
                      <span>${escapeHtml(service)}</span>
                    </div>
                  `
                    )
                    .join("")}
                </div>
                `
                    : ""
                }

                <div class="contact-section">
                  <h3>Contact Us Today!</h3>
                  <div class="contact-grid">
                    ${contactInfo.phone ? `<div class="contact-item">${contactInfo.phone}</div>` : ""}
                    ${contactInfo.email ? `<div class="contact-item">${contactInfo.email}</div>` : ""}
                    ${contactInfo.website ? `<div class="contact-item">${contactInfo.website}</div>` : ""}
                  </div>
                </div>
              </div>
            `
            break

          case "postcard":
            cssStyles = `
              ${baseStyles}
              .postcard {
                width: 6in;
                height: 4in;
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
              }
              .postcard-header {
                background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
                color: white;
                padding: 20px;
                text-align: center;
              }
              .postcard-header h1 {
                font-size: 24px;
                font-weight: 700;
              }
              .postcard-body {
                padding: 20px;
              }
              .offer {
                font-size: 18px;
                color: var(--primary);
                font-weight: 700;
                text-align: center;
                margin: 16px 0;
              }
              .contact {
                text-align: center;
                font-size: 14px;
                color: var(--text-light);
              }
            `
            html = `
              <div class="postcard">
                <div class="postcard-header">
                  <h1>${escapeHtml(companyName)}</h1>
                  ${tagline ? `<p>${escapeHtml(tagline)}</p>` : ""}
                </div>
                <div class="postcard-body">
                  ${offer ? `<div class="offer">${escapeHtml(offer)}</div>` : ""}
                  <div class="contact">
                    ${contactInfo.phone ? `<p>${contactInfo.phone}</p>` : ""}
                    ${contactInfo.website ? `<p>${contactInfo.website}</p>` : ""}
                  </div>
                </div>
              </div>
            `
            break

          default:
            return {
              status: "error",
              message: `Unknown artifact type: ${artifactType}. Supported types: business_card, flyer, door_hanger, postcard, email_template, social_post`
            }
        }

        // Combine into full HTML document
        const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(companyName)} - ${artifactType.replace("_", " ")}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>${cssStyles}</style>
</head>
<body>
  ${html}
</body>
</html>`

        return {
          status: "success",
          artifact_type: artifactType,
          html: fullHtml,
          preview_html: html,
          styles: cssStyles,
          message: `${artifactType.replace("_", " ")} created successfully! You can preview it below and download or copy the HTML.`,
          downloadable: true
        }
      }

      default:
        return {
          status: "error",
          message: `Unknown tool: ${toolName}`
        }
    }
  } catch (error) {
    console.error(`Tool execution error (${toolName}):`, error)
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Tool execution failed"
    }
  }
}
