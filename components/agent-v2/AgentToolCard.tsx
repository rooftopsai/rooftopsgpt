"use client"

import { useState } from "react"
import {
  IconChevronDown,
  IconChevronUp,
  IconSearch,
  IconCloud,
  IconMail,
  IconHome,
  IconCurrencyDollar,
  IconCalendar,
  IconBrandSlack,
  IconPlugConnected,
  IconCheck,
  IconX,
  IconLoader2,
  IconFileText,
  IconPalette
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { ArtifactViewer } from "./ArtifactViewer"

interface AgentToolCardProps {
  toolName: string
  result?: any
  status: "running" | "completed" | "failed"
  compact?: boolean
}

export function AgentToolCard({
  toolName,
  result,
  status,
  compact = false
}: AgentToolCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toolConfig = getToolConfig(toolName)
  const Icon = toolConfig.icon
  const summary = getSummary(toolName, result)

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border p-2 text-sm",
          status === "running" && "border-primary/30 bg-primary/5",
          status === "completed" && "border-green-500/30 bg-green-500/5",
          status === "failed" && "border-destructive/30 bg-destructive/5"
        )}
      >
        {status === "running" ? (
          <IconLoader2 className="size-4 animate-spin text-primary" />
        ) : (
          <Icon className="size-4 text-muted-foreground" />
        )}
        <span className="text-muted-foreground">{toolConfig.label}</span>
        {status === "completed" && (
          <IconCheck className="ml-auto size-4 text-green-500" />
        )}
        {status === "failed" && (
          <IconX className="ml-auto size-4 text-destructive" />
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "rounded-lg border",
        status === "running" && "border-primary/30 bg-primary/5",
        status === "completed" && "border-border bg-muted/30",
        status === "failed" && "border-destructive/30 bg-destructive/5"
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            status === "running" && "bg-primary/10",
            status === "completed" && "bg-muted",
            status === "failed" && "bg-destructive/10"
          )}
        >
          {status === "running" ? (
            <IconLoader2 className="size-4 animate-spin text-primary" />
          ) : (
            <Icon
              className={cn(
                "size-4",
                status === "completed" && "text-muted-foreground",
                status === "failed" && "text-destructive"
              )}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">
              {toolConfig.label}
            </span>
            {status === "completed" && (
              <IconCheck className="size-4 text-green-500" />
            )}
            {status === "failed" && (
              <IconX className="size-4 text-destructive" />
            )}
          </div>
          {summary && (
            <p className="truncate text-sm text-muted-foreground">{summary}</p>
          )}
        </div>

        {result && (
          <div className="text-muted-foreground">
            {isExpanded ? (
              <IconChevronUp className="size-5" />
            ) : (
              <IconChevronDown className="size-5" />
            )}
          </div>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && result && (
        <div className="border-t border-border p-3">
          <ToolResultDisplay toolName={toolName} result={result} />
        </div>
      )}
    </div>
  )
}

function ToolResultDisplay({
  toolName,
  result
}: {
  toolName: string
  result: any
}) {
  // Weather result
  if (toolName === "get_weather_forecast" && result.status === "success") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-2xl font-semibold text-foreground">
              {result.current?.temp_f}°F
            </p>
            <p className="text-sm text-muted-foreground">
              {result.current?.condition}
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Humidity: {result.current?.humidity}</p>
            <p>Wind: {result.current?.wind_mph} mph</p>
          </div>
        </div>
        {result.roofing_advisory && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {result.roofing_advisory}
          </p>
        )}
      </div>
    )
  }

  // Search results
  if (toolName === "web_search" && result.results) {
    return (
      <div className="space-y-2">
        {result.results.slice(0, 3).map((r: any, i: number) => (
          <a
            key={i}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-border p-2 transition-colors hover:bg-muted"
          >
            <p className="text-sm font-medium text-primary hover:underline">
              {r.title}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {r.description}
            </p>
          </a>
        ))}
      </div>
    )
  }

  // Email draft
  if (toolName === "draft_email" && result.draft) {
    return (
      <div className="space-y-2 text-sm">
        <div className="flex gap-2">
          <span className="text-muted-foreground">To:</span>
          <span className="text-foreground">{result.draft.to}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-muted-foreground">Subject:</span>
          <span className="font-medium text-foreground">
            {result.draft.subject}
          </span>
        </div>
        <div className="mt-2 whitespace-pre-wrap rounded-lg bg-muted p-3 text-foreground">
          {result.draft.body}
        </div>
      </div>
    )
  }

  // Property report
  if (toolName === "generate_property_report" && result.roof) {
    return (
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Roof Area</p>
          <p className="font-medium text-foreground">
            {result.roof.totalArea?.toLocaleString()} sq ft
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Facets</p>
          <p className="font-medium text-foreground">{result.roof.facetCount}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Main Pitch</p>
          <p className="font-medium text-foreground">{result.roof.mainPitch}</p>
        </div>
        {result.solar && (
          <div>
            <p className="text-muted-foreground">Solar Potential</p>
            <p className="font-medium text-foreground">
              {result.solar.maxPanels} panels
            </p>
          </div>
        )}
      </div>
    )
  }

  // Artifact display - business cards, flyers, etc.
  if (toolName === "generate_artifact" && result.status === "success" && result.html) {
    return (
      <ArtifactViewer
        html={result.html}
        artifactType={result.artifact_type}
        companyName={result.company_name}
      />
    )
  }

  // Generic JSON display
  return (
    <pre className="max-h-40 overflow-auto rounded-lg bg-muted p-2 text-xs text-muted-foreground">
      {JSON.stringify(result, null, 2)}
    </pre>
  )
}

function getToolConfig(toolName: string): { icon: any; label: string } {
  const configs: Record<string, { icon: any; label: string }> = {
    web_search: { icon: IconSearch, label: "Web Search" },
    get_weather_forecast: { icon: IconCloud, label: "Weather" },
    get_material_prices: { icon: IconCurrencyDollar, label: "Material Prices" },
    draft_email: { icon: IconMail, label: "Draft Email" },
    send_email: { icon: IconMail, label: "Send Email" },
    generate_property_report: { icon: IconHome, label: "Property Report" },
    generate_artifact: { icon: IconPalette, label: "Create Design" },
    generate_report: { icon: IconFileText, label: "Generate Report" },
    check_calendar: { icon: IconCalendar, label: "Calendar" },
    schedule_appointment: { icon: IconCalendar, label: "Schedule" }
  }

  if (configs[toolName]) {
    return configs[toolName]
  }

  // MCP tool detection
  const nameLower = toolName.toLowerCase()
  if (nameLower.includes("gmail") || nameLower.includes("email")) {
    return { icon: IconMail, label: formatToolName(toolName) }
  }
  if (nameLower.includes("calendar")) {
    return { icon: IconCalendar, label: formatToolName(toolName) }
  }
  if (nameLower.includes("slack")) {
    return { icon: IconBrandSlack, label: formatToolName(toolName) }
  }

  return { icon: IconPlugConnected, label: formatToolName(toolName) }
}

function formatToolName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, l => l.toUpperCase())
}

function getSummary(toolName: string, result: any): string | null {
  if (!result) return null

  if (toolName === "web_search" && result.results?.length) {
    return `Found ${result.results.length} results`
  }
  if (toolName === "get_weather_forecast" && result.current) {
    return `${result.current.temp_f}°F, ${result.current.condition}`
  }
  if (toolName === "draft_email" && result.draft) {
    return `To: ${result.draft.to}`
  }
  if (toolName === "generate_property_report" && result.roof) {
    return `${result.roof.totalArea?.toLocaleString()} sq ft roof`
  }
  if (toolName === "generate_artifact" && result.artifact_type) {
    const type = result.artifact_type.replace("_", " ")
    return `${type.charAt(0).toUpperCase() + type.slice(1)} ready to download`
  }

  if (result.status === "success") {
    return "Completed successfully"
  }
  if (result.status === "error") {
    return result.message || "Failed"
  }

  return null
}
