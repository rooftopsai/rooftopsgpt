"use client"

import { useState } from "react"
import { AgentChatMessage, AgentToolCall } from "@/types/agent-types"
import {
  IconUser,
  IconSparkles,
  IconCheck,
  IconX,
  IconChevronDown,
  IconChevronUp,
  IconSearch,
  IconCloud,
  IconCurrencyDollar,
  IconMail,
  IconUsers,
  IconCalendar,
  IconFileText,
  IconTool,
  IconLoader2,
  IconHome,
  IconSun,
  IconBrandGoogle,
  IconBrandSlack,
  IconPlugConnected
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { AgentPropertyReportCard } from "./agent-property-report-card"
import { AgentWeatherCard } from "./agent-weather-card"
import { AgentSearchResultsCard } from "./agent-search-results-card"
import { AgentMaterialPricesCard } from "./agent-material-prices-card"
import { AgentEmailDraftCard } from "./agent-email-draft-card"

interface AgentMessageProps {
  message: AgentChatMessage
  onConfirmTool?: (toolCallId: string) => void
  onCancelTool?: (toolCallId: string) => void
}

export function AgentMessage({
  message,
  onConfirmTool,
  onCancelTool
}: AgentMessageProps) {
  const isUser = message.role === "user"

  return (
    <div
      className={cn(
        "mx-4 my-3 flex gap-4 rounded-xl border px-4 py-4 backdrop-blur-md",
        isUser
          ? "border-blue-500/15 bg-gradient-to-br from-blue-500/5 to-purple-500/5"
          : "border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-purple-500/10"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl border shadow-sm",
          isUser
            ? "border-blue-500/30 bg-gradient-to-br from-blue-500/20 to-blue-600/20 shadow-blue-500/10"
            : "border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-blue-500/20 shadow-purple-500/10"
        )}
      >
        {isUser ? (
          <IconUser className="size-5 text-blue-400" />
        ) : (
          <IconSparkles className="size-5 text-purple-400" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-3 overflow-hidden">
        {/* Role label */}
        <div className="text-sm font-medium text-foreground">
          {isUser ? "You" : "Rooftops AI Agent"}
        </div>

        {/* Message content */}
        {message.content && (
          <div className="prose prose-slate dark:prose-invert max-w-none font-light text-foreground/90">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => (
                  <ul className="mb-2 list-disc pl-4">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-2 list-decimal pl-4">{children}</ol>
                ),
                li: ({ children }) => <li className="mb-1">{children}</li>,
                code: ({ children, className }) => {
                  const isInline = !className
                  return isInline ? (
                    <code className="rounded-md border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 text-sm text-blue-400">
                      {children}
                    </code>
                  ) : (
                    <code className="block overflow-x-auto rounded-xl border border-blue-500/15 bg-gradient-to-br from-blue-500/5 to-purple-500/5 p-4 text-sm">
                      {children}
                    </code>
                  )
                },
                pre: ({ children }) => (
                  <pre className="overflow-x-auto rounded-xl border border-blue-500/15 bg-gradient-to-br from-blue-500/5 to-purple-500/5 p-4">
                    {children}
                  </pre>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    {children}
                  </a>
                )
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Tool calls - Clean card UI */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-2">
            {message.toolCalls.map(toolCall => {
              const result = toolCall.result as any

              // Special rendering for property reports
              if (toolCall.name === "generate_property_report" && result?.status === "success" && toolCall.status === "completed") {
                return <AgentPropertyReportCard key={toolCall.id} data={result} />
              }

              // Special rendering for weather forecasts
              if (toolCall.name === "get_weather_forecast" && result?.status === "success" && toolCall.status === "completed") {
                return <AgentWeatherCard key={toolCall.id} data={result} />
              }

              // Special rendering for web search results
              if (toolCall.name === "web_search" && result?.status === "success" && toolCall.status === "completed") {
                return <AgentSearchResultsCard key={toolCall.id} data={result} />
              }

              // Special rendering for material prices
              if (toolCall.name === "get_material_prices" && result?.status === "success" && toolCall.status === "completed") {
                return <AgentMaterialPricesCard key={toolCall.id} data={result} />
              }

              // Special rendering for email drafts
              if (toolCall.name === "draft_email" && result?.status === "success" && toolCall.status === "completed") {
                return <AgentEmailDraftCard key={toolCall.id} data={result} />
              }

              return (
                <ToolCallCard
                  key={toolCall.id}
                  toolCall={toolCall}
                  onConfirm={
                    toolCall.requiresConfirmation && toolCall.status === "pending"
                      ? () => onConfirmTool?.(toolCall.id)
                      : undefined
                  }
                  onCancel={
                    toolCall.requiresConfirmation && toolCall.status === "pending"
                      ? () => onCancelTool?.(toolCall.id)
                      : undefined
                  }
                />
              )
            })}
          </div>
        )}

        {/* Streaming indicator */}
        {message.isStreaming && (
          <div className="flex items-center gap-2 text-sm font-light text-muted-foreground">
            <div className="flex gap-1.5">
              <span className="size-2 animate-bounce rounded-full bg-blue-500 shadow-sm shadow-blue-500/50 [animation-delay:-0.3s]" />
              <span className="size-2 animate-bounce rounded-full bg-blue-500 shadow-sm shadow-blue-500/50 [animation-delay:-0.15s]" />
              <span className="size-2 animate-bounce rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
            </div>
            <span>Thinking...</span>
          </div>
        )}

        {/* Timestamp */}
        <div className="text-xs font-light text-muted-foreground/60">
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          })}
        </div>
      </div>
    </div>
  )
}

interface ToolCallCardProps {
  toolCall: AgentToolCall
  onConfirm?: () => void
  onCancel?: () => void
}

function ToolCallCard({ toolCall, onConfirm, onCancel }: ToolCallCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toolConfig = getToolConfig(toolCall.name)
  const isRunning = toolCall.status === "running"
  const isPending = toolCall.status === "pending"
  const isCompleted = toolCall.status === "completed"
  const isFailed = toolCall.status === "failed"
  const needsConfirmation = toolCall.requiresConfirmation && isPending

  // Check if result contains an error
  const result = toolCall.result as any
  const hasError = result?.status === "error"
  const hasSuggestion = hasError && result?.suggestion

  // Get a user-friendly summary
  const summary = getToolSummary(toolCall)

  return (
    <div
      className={cn(
        "rounded-xl border backdrop-blur-md transition-all",
        isRunning && "border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-600/10",
        isPending && needsConfirmation && "border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10",
        isPending && !needsConfirmation && "border-blue-500/15 bg-gradient-to-br from-blue-500/5 to-purple-500/5",
        isCompleted && !hasError && "border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/10",
        (isFailed || hasError) && "border-red-500/30 bg-gradient-to-br from-red-500/10 to-pink-500/10"
      )}
    >
      {/* Main card content */}
      <div className="flex items-center gap-3 p-3">
        {/* Icon with status */}
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl border shadow-sm",
            isRunning && "border-blue-500/30 bg-gradient-to-br from-blue-500/20 to-blue-600/20 shadow-blue-500/10",
            isPending && "border-amber-500/30 bg-gradient-to-br from-amber-500/20 to-orange-500/20 shadow-amber-500/10",
            isCompleted && !hasError && "border-green-500/30 bg-gradient-to-br from-green-500/20 to-emerald-500/20 shadow-green-500/10",
            (isFailed || hasError) && "border-red-500/30 bg-gradient-to-br from-red-500/20 to-pink-500/20 shadow-red-500/10"
          )}
        >
          {isRunning ? (
            <IconLoader2 className="size-5 animate-spin text-blue-400" />
          ) : (
            <toolConfig.icon
              className={cn(
                "size-5",
                isRunning && "text-blue-400",
                isPending && "text-amber-400",
                isCompleted && !hasError && "text-green-400",
                (isFailed || hasError) && "text-red-400"
              )}
            />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{toolConfig.label}</span>
            {isCompleted && !hasError && (
              <IconCheck className="size-4 text-green-500" />
            )}
            {(isFailed || hasError) && (
              <IconX className="size-4 text-red-500" />
            )}
          </div>
          <p className={cn("truncate text-sm font-light", hasError ? "text-red-400" : "text-muted-foreground")}>{summary}</p>
          {hasSuggestion && (
            <p className="mt-1 text-xs font-light text-amber-400">{result.suggestion}</p>
          )}
        </div>

        {/* Action buttons or expand toggle */}
        <div className="flex items-center gap-2">
          {needsConfirmation ? (
            <>
              <button
                onClick={onConfirm}
                className="flex items-center gap-1.5 rounded-xl border border-green-500/30 bg-gradient-to-br from-green-500/20 to-emerald-500/20 px-3 py-1.5 text-sm font-medium text-green-400 shadow-sm shadow-green-500/10 transition-all hover:border-green-500/40 hover:from-green-500/25 hover:to-emerald-500/25"
              >
                <IconCheck className="size-4" />
                Approve
              </button>
              <button
                onClick={onCancel}
                className="flex items-center gap-1.5 rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-sm shadow-blue-500/10 transition-all hover:border-blue-500/30 hover:from-blue-500/15 hover:to-purple-500/15 hover:text-foreground"
              >
                <IconX className="size-4" />
                Deny
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="rounded-xl border border-transparent p-1.5 text-muted-foreground transition-all hover:border-blue-500/20 hover:bg-blue-500/10 hover:text-foreground"
            >
              {isExpanded ? (
                <IconChevronUp className="size-5" />
              ) : (
                <IconChevronDown className="size-5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-blue-500/15 p-3">
          {/* Arguments */}
          {Object.keys(toolCall.arguments).length > 0 && (
            <div className="mb-3">
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Input
              </div>
              <pre className="overflow-x-auto rounded-xl border border-blue-500/15 bg-gradient-to-br from-blue-500/5 to-purple-500/5 p-3 text-xs font-light text-foreground/80">
                {JSON.stringify(toolCall.arguments, null, 2)}
              </pre>
            </div>
          )}

          {/* Result */}
          {toolCall.result && (
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Result
              </div>
              <pre className="max-h-40 overflow-auto rounded-xl border border-blue-500/15 bg-gradient-to-br from-blue-500/5 to-purple-500/5 p-3 text-xs font-light text-foreground/80">
                {typeof toolCall.result === "string"
                  ? toolCall.result
                  : JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Tool configuration for icons and labels
function getToolConfig(toolName: string): { icon: any; label: string; isMCP?: boolean } {
  // Built-in tools
  const builtinConfigs: Record<string, { icon: any; label: string }> = {
    web_search: { icon: IconSearch, label: "Web Search" },
    get_weather_forecast: { icon: IconCloud, label: "Weather Forecast" },
    get_material_prices: { icon: IconCurrencyDollar, label: "Material Prices" },
    draft_email: { icon: IconMail, label: "Draft Email" },
    send_email: { icon: IconMail, label: "Send Email" },
    search_customers: { icon: IconUsers, label: "Customer Search" },
    get_customer_details: { icon: IconUsers, label: "Customer Details" },
    search_jobs: { icon: IconFileText, label: "Job Search" },
    check_calendar: { icon: IconCalendar, label: "Check Calendar" },
    schedule_appointment: { icon: IconCalendar, label: "Schedule Appointment" },
    generate_report: { icon: IconFileText, label: "Generate Report" },
    generate_property_report: { icon: IconHome, label: "Property Report" },
    create_estimate: { icon: IconCurrencyDollar, label: "Create Estimate" }
  }

  if (builtinConfigs[toolName]) {
    return builtinConfigs[toolName]
  }

  // Pipedream MCP tools - detect by common prefixes
  const toolNameLower = toolName.toLowerCase()

  // Gmail / Email tools
  if (toolNameLower.includes("gmail") || toolNameLower.includes("email")) {
    return { icon: IconMail, label: formatToolName(toolName), isMCP: true }
  }

  // Google Calendar tools
  if (toolNameLower.includes("calendar") || toolNameLower.includes("event")) {
    return { icon: IconCalendar, label: formatToolName(toolName), isMCP: true }
  }

  // Slack tools
  if (toolNameLower.includes("slack")) {
    return { icon: IconBrandSlack, label: formatToolName(toolName), isMCP: true }
  }

  // Google Sheets/Docs
  if (toolNameLower.includes("sheets") || toolNameLower.includes("google")) {
    return { icon: IconBrandGoogle, label: formatToolName(toolName), isMCP: true }
  }

  // CRM tools (Salesforce, HubSpot, etc.)
  if (toolNameLower.includes("salesforce") || toolNameLower.includes("hubspot") || toolNameLower.includes("crm") || toolNameLower.includes("contact") || toolNameLower.includes("lead") || toolNameLower.includes("deal")) {
    return { icon: IconUsers, label: formatToolName(toolName), isMCP: true }
  }

  // Generic connected app tool
  if (toolNameLower.includes("_")) {
    // Most Pipedream tools have underscores like "app_action"
    return { icon: IconPlugConnected, label: formatToolName(toolName), isMCP: true }
  }

  return { icon: IconTool, label: formatToolName(toolName) }
}

// Get a user-friendly summary of what the tool is doing
function getToolSummary(toolCall: AgentToolCall): string {
  const args = toolCall.arguments
  const result = toolCall.result as any

  switch (toolCall.name) {
    case "web_search":
      if (result?.results?.length) {
        return `Found ${result.results.length} results for "${args.query}"`
      }
      return `Searching for "${args.query}"`

    case "get_weather_forecast":
      if (result?.status === "success") {
        return `${result.location}: ${result.current?.temp_f}°F, ${result.current?.condition}`
      }
      return `Getting forecast for ${args.location}`

    case "get_material_prices":
      if (result?.price_sources?.length) {
        return `Found ${result.price_sources.length} pricing sources for ${args.material_type}`
      }
      return `Looking up prices for ${args.material_type}`

    case "draft_email":
      return `To: ${args.to} - "${args.subject}"`

    case "send_email":
      return `Sending to ${args.to}`

    case "search_customers":
      return `Searching for "${args.query}"`

    case "search_jobs":
      return args.status ? `Finding ${args.status} jobs` : "Searching jobs"

    case "check_calendar":
      return `Checking availability for ${args.date_range || "upcoming dates"}`

    case "generate_report":
      return `Creating ${args.report_type || "report"}: ${args.title || ""}`

    case "generate_property_report":
      if (result?.status === "success") {
        return `${result.roof?.totalArea?.toLocaleString() || "?"} sq ft roof, ${result.roof?.facetCount || "?"} facets`
      }
      if (result?.status === "error") {
        return result.message || "Report generation failed"
      }
      return `Analyzing property at ${args.address}`

    default:
      // Handle MCP tools with generic summary
      if (result?.status === "success") {
        if (result.source === "pipedream") {
          // Try to extract meaningful info from the result data
          const data = result.data
          if (typeof data === "string" && data.length > 0) {
            return data.length > 80 ? data.substring(0, 77) + "..." : data
          }
          return "Action completed via connected app"
        }
        return "Completed successfully"
      }
      if (result?.status === "error") {
        // Return a shortened version of the error
        const msg = result.message || "Action failed"
        return msg.length > 80 ? msg.substring(0, 77) + "..." : msg
      }
      if (result?.status === "pending_confirmation") {
        return "Waiting for your approval"
      }

      // Generic summary based on tool name
      const toolNameLower = toolCall.name.toLowerCase()
      if (toolNameLower.includes("send")) {
        return "Sending..."
      }
      if (toolNameLower.includes("create")) {
        return "Creating..."
      }
      if (toolNameLower.includes("search") || toolNameLower.includes("find") || toolNameLower.includes("get") || toolNameLower.includes("list")) {
        return "Searching..."
      }

      return toolCall.status === "completed" ? "Completed" : "Processing..."
  }
}

function formatToolName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, l => l.toUpperCase())
}
