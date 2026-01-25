// lib/agent/agent-executor.ts
// Core execution engine for the Rooftops AI Agent

import OpenAI from "openai"
import { Json } from "@/supabase/types"
import {
  AgentSession,
  AgentMessage,
  AgentTask,
  AgentToolExecution,
  AgentChatMessage,
  AgentToolCall,
  AgentConfig,
  DEFAULT_AGENT_CONFIG
} from "@/types/agent-types"
import { getAgentSystemPrompt } from "./agent-system-prompt"
import {
  BUILTIN_AGENT_TOOLS,
  convertToOpenAITools,
  toolRequiresConfirmation
} from "./agent-tools"

export interface AgentExecutorOptions {
  userId: string
  sessionId: string
  config?: Partial<AgentConfig>
  onMessage?: (message: AgentChatMessage) => void
  onToolCall?: (toolCall: AgentToolCall) => void
  onTokenUsage?: (inputTokens: number, outputTokens: number) => void
}

export interface AgentExecutionResult {
  response: string
  toolCalls: AgentToolCall[]
  tokensUsed: {
    input: number
    output: number
  }
  pendingConfirmations: AgentToolCall[]
}

export class AgentExecutor {
  private openai: OpenAI
  private config: AgentConfig
  private userId: string
  private sessionId: string
  private conversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
    []
  private onMessage?: (message: AgentChatMessage) => void
  private onToolCall?: (toolCall: AgentToolCall) => void
  private onTokenUsage?: (inputTokens: number, outputTokens: number) => void

  constructor(apiKey: string, options: AgentExecutorOptions) {
    this.openai = new OpenAI({ apiKey })
    this.config = { ...DEFAULT_AGENT_CONFIG, ...options.config }
    this.userId = options.userId
    this.sessionId = options.sessionId
    this.onMessage = options.onMessage
    this.onToolCall = options.onToolCall
    this.onTokenUsage = options.onTokenUsage

    // Initialize with system prompt
    this.conversationHistory.push({
      role: "system",
      content: getAgentSystemPrompt(this.config.systemPrompt)
    })
  }

  // Load existing conversation history from database
  loadHistory(messages: AgentMessage[]): void {
    for (const msg of messages) {
      if (msg.role === "system") continue // Skip system messages, we have our own

      if (msg.role === "tool" && msg.tool_call_id) {
        this.conversationHistory.push({
          role: "tool",
          content: msg.content,
          tool_call_id: msg.tool_call_id
        })
      } else if (msg.role === "assistant" && msg.tool_calls) {
        this.conversationHistory.push({
          role: "assistant",
          content: msg.content || null,
          tool_calls: msg.tool_calls as unknown as OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]
        })
      } else {
        this.conversationHistory.push({
          role: msg.role as "user" | "assistant",
          content: msg.content
        })
      }
    }
  }

  // Execute a user message and return the agent's response
  async execute(userMessage: string): Promise<AgentExecutionResult> {
    // Add user message to history
    this.conversationHistory.push({
      role: "user",
      content: userMessage
    })

    // Notify about user message
    this.onMessage?.({
      id: crypto.randomUUID(),
      role: "user",
      content: userMessage,
      timestamp: new Date()
    })

    const tools = convertToOpenAITools(BUILTIN_AGENT_TOOLS)
    const toolCalls: AgentToolCall[] = []
    const pendingConfirmations: AgentToolCall[] = []
    let totalInputTokens = 0
    let totalOutputTokens = 0

    // Loop to handle tool calls
    let continueLoop = true
    let finalResponse = ""

    while (continueLoop) {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: this.conversationHistory,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? "auto" : undefined,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      })

      // Track token usage
      if (response.usage) {
        totalInputTokens += response.usage.prompt_tokens
        totalOutputTokens += response.usage.completion_tokens
      }

      const message = response.choices[0].message

      // Add assistant message to history
      if (message.tool_calls && message.tool_calls.length > 0) {
        this.conversationHistory.push({
          role: "assistant",
          content: message.content || null,
          tool_calls: message.tool_calls
        })

        // Process tool calls
        for (const toolCall of message.tool_calls) {
          const toolName = toolCall.function.name
          const toolArgs = JSON.parse(toolCall.function.arguments || "{}")

          const agentToolCall: AgentToolCall = {
            id: toolCall.id,
            name: toolName,
            arguments: toolArgs,
            status: "pending"
          }

          // Check if this tool requires confirmation
          if (toolRequiresConfirmation(toolName)) {
            agentToolCall.requiresConfirmation = true
            agentToolCall.status = "pending"
            pendingConfirmations.push(agentToolCall)

            // Add placeholder tool response
            this.conversationHistory.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                status: "pending_confirmation",
                message: `Action "${toolName}" requires user confirmation before execution.`
              })
            })
          } else {
            // Execute the tool
            this.onToolCall?.(agentToolCall)
            const result = await this.executeTool(toolName, toolArgs)
            agentToolCall.result = JSON.stringify(result)
            agentToolCall.status = "completed"

            // Add tool result to history
            this.conversationHistory.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(result)
            })
          }

          toolCalls.push(agentToolCall)
        }

        // If there are pending confirmations, stop the loop
        if (pendingConfirmations.length > 0) {
          continueLoop = false
          finalResponse =
            message.content ||
            "I need your confirmation before proceeding with the following action(s)."
        }
      } else {
        // No tool calls, this is the final response
        continueLoop = false
        finalResponse = message.content || ""

        this.conversationHistory.push({
          role: "assistant",
          content: finalResponse
        })
      }

      // Safety limit to prevent infinite loops
      if (toolCalls.length > 10) {
        continueLoop = false
        finalResponse += "\n\n[Stopped: Too many tool calls in a single turn]"
      }
    }

    // Notify about token usage
    this.onTokenUsage?.(totalInputTokens, totalOutputTokens)

    // Notify about final response
    this.onMessage?.({
      id: crypto.randomUUID(),
      role: "assistant",
      content: finalResponse,
      timestamp: new Date(),
      toolCalls
    })

    return {
      response: finalResponse,
      toolCalls,
      tokensUsed: {
        input: totalInputTokens,
        output: totalOutputTokens
      },
      pendingConfirmations
    }
  }

  // Execute a confirmed tool
  async executeConfirmedTool(toolCall: AgentToolCall): Promise<AgentToolCall> {
    const result = await this.executeTool(toolCall.name, toolCall.arguments)
    toolCall.result = JSON.stringify(result)
    toolCall.status = "completed"

    // Update the tool response in history
    const toolIndex = this.conversationHistory.findIndex(
      msg =>
        msg.role === "tool" &&
        (msg as OpenAI.Chat.Completions.ChatCompletionToolMessageParam)
          .tool_call_id === toolCall.id
    )

    if (toolIndex !== -1) {
      this.conversationHistory[toolIndex] = {
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result)
      }
    }

    this.onToolCall?.(toolCall)
    return toolCall
  }

  // Cancel a pending tool
  cancelTool(toolCall: AgentToolCall): AgentToolCall {
    toolCall.status = "cancelled"
    toolCall.result = JSON.stringify({
      status: "cancelled",
      message: "Action was cancelled by the user."
    })

    // Update the tool response in history
    const toolIndex = this.conversationHistory.findIndex(
      msg =>
        msg.role === "tool" &&
        (msg as OpenAI.Chat.Completions.ChatCompletionToolMessageParam)
          .tool_call_id === toolCall.id
    )

    if (toolIndex !== -1) {
      this.conversationHistory[toolIndex] = {
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify({
          status: "cancelled",
          message: "User cancelled this action."
        })
      }
    }

    return toolCall
  }

  // Execute a specific tool
  private async executeTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    try {
      switch (toolName) {
        case "web_search":
          return this.executeWebSearch(args)
        case "get_material_prices":
          return this.getMaterialPrices(args)
        case "get_weather_forecast":
          return this.getWeatherForecast(args)
        case "generate_report":
          return this.generateReport(args)
        case "create_estimate":
          return this.createEstimate(args)
        case "draft_email":
          return this.draftEmail(args)
        case "send_email":
          return this.sendEmail(args)
        case "search_customers":
          return this.searchCustomers(args)
        case "get_customer_details":
          return this.getCustomerDetails(args)
        case "search_jobs":
          return this.searchJobs(args)
        case "check_calendar":
          return this.checkCalendar(args)
        case "schedule_appointment":
          return this.scheduleAppointment(args)
        default:
          return {
            error: `Unknown tool: ${toolName}`,
            status: "error"
          }
      }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Tool execution failed",
        status: "error"
      }
    }
  }

  // Tool implementations (these would connect to actual services)
  private async executeWebSearch(
    args: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // In production, this would call a search API
    return {
      status: "success",
      query: args.query,
      results: [
        {
          title: "Sample Search Result",
          url: "https://example.com",
          snippet:
            "This is a placeholder result. In production, this would return real search results."
        }
      ],
      message:
        "Web search functionality will be connected to a search API in production."
    }
  }

  private async getMaterialPrices(
    args: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // In production, this would connect to supplier APIs or a pricing database
    return {
      status: "success",
      material_type: args.material_type,
      prices: [
        {
          supplier: "Sample Supplier",
          price_per_unit: "$XX.XX",
          unit: "per square",
          availability: "In Stock"
        }
      ],
      message:
        "Material pricing will be connected to supplier integrations in production."
    }
  }

  private async getWeatherForecast(
    args: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // In production, this would call a weather API
    return {
      status: "success",
      location: args.location,
      forecast: [
        {
          date: new Date().toISOString().split("T")[0],
          condition: "Sunny",
          high: "75°F",
          low: "55°F",
          precipitation: "0%"
        }
      ],
      message:
        "Weather forecast will be connected to a weather API in production."
    }
  }

  private async generateReport(
    args: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return {
      status: "success",
      report_type: args.report_type,
      title: args.title,
      content: `<h1>${args.title}</h1><p>Report content would be generated here based on the provided data.</p>`,
      message: "Report generated successfully."
    }
  }

  private async createEstimate(
    args: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return {
      status: "success",
      estimate: {
        customer: args.customer_name,
        property: args.property_address,
        area: args.roof_area_sqft,
        estimated_total: "To be calculated based on materials and labor",
        valid_until: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString()
      },
      message:
        "Estimate created. In production, this would calculate actual costs."
    }
  }

  private async draftEmail(
    args: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return {
      status: "success",
      draft: {
        to: args.to,
        subject: args.subject,
        body:
          args.body ||
          `Dear Customer,\n\n[Email body would be drafted based on context]\n\nBest regards,\n[Your Name]`,
        tone: args.tone || "professional"
      },
      message: "Email draft created. Ready for review."
    }
  }

  private async sendEmail(
    args: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // In production, this would integrate with email service
    return {
      status: "success",
      sent_to: args.to,
      subject: args.subject,
      message_id: crypto.randomUUID(),
      message:
        "Email sent successfully. (In production, this would actually send the email.)"
    }
  }

  private async searchCustomers(
    args: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // In production, this would query the CRM database
    return {
      status: "success",
      query: args.query,
      results: [
        {
          id: "sample-customer-id",
          name: "Sample Customer",
          email: "customer@example.com",
          phone: "(555) 123-4567",
          status: "customer"
        }
      ],
      message:
        "Customer search will be connected to CRM integration in production."
    }
  }

  private async getCustomerDetails(
    args: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return {
      status: "success",
      customer: {
        id: args.customer_id,
        name: "Sample Customer",
        email: "customer@example.com",
        phone: "(555) 123-4567",
        address: "123 Main St, City, State 12345",
        jobs_count: 3,
        total_revenue: "$15,000"
      },
      message:
        "Customer details will be fetched from CRM integration in production."
    }
  }

  private async searchJobs(
    args: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return {
      status: "success",
      jobs: [
        {
          id: "sample-job-id",
          customer: "Sample Customer",
          address: "123 Main St",
          status: "scheduled",
          date: new Date().toISOString().split("T")[0]
        }
      ],
      message: "Job search will be connected to job management in production."
    }
  }

  private async checkCalendar(
    args: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return {
      status: "success",
      date_range: {
        start: args.start_date,
        end: args.end_date
      },
      available_slots: [
        { date: args.start_date, time: "9:00 AM", duration: "4 hours" },
        { date: args.start_date, time: "2:00 PM", duration: "4 hours" }
      ],
      message:
        "Calendar availability will be connected to scheduling system in production."
    }
  }

  private async scheduleAppointment(
    args: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return {
      status: "success",
      appointment: {
        id: crypto.randomUUID(),
        title: args.title,
        date: args.date,
        time: args.time,
        duration: args.duration_hours,
        location: args.location
      },
      message:
        "Appointment scheduled. (In production, this would create the actual calendar event.)"
    }
  }

  // Get current conversation for saving
  getConversationHistory(): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return this.conversationHistory
  }
}

// Factory function to create an agent executor
export function createAgentExecutor(
  apiKey: string,
  options: AgentExecutorOptions
): AgentExecutor {
  return new AgentExecutor(apiKey, options)
}
