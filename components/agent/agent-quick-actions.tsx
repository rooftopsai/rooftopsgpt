"use client"

import { useState, useEffect } from "react"
import { useAgent } from "@/context/agent-context"
import {
  IconSearch,
  IconCloud,
  IconHome,
  IconMail,
  IconFileText,
  IconCurrencyDollar,
  IconCalendar,
  IconUsers,
  IconBrandSlack,
  IconBrandGoogle,
  IconDatabase,
  IconSparkles,
  IconChevronRight,
  IconPlugConnected,
  IconBolt,
  IconClipboardList,
  IconMapPin,
  IconPhone,
  IconReceipt,
  IconTools,
  IconTrendingUp
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface QuickAction {
  icon: any
  label: string
  description: string
  prompt: string
  category: "roofing" | "research" | "documents" | "communication" | "connected"
  priority?: number // Higher priority shows first
  requiresApp?: string[] // If specified, only show when one of these apps is connected
}

const BASE_QUICK_ACTIONS: QuickAction[] = [
  // Primary Roofing Actions - High Priority
  {
    icon: IconHome,
    label: "Roof Report",
    description: "AI-powered measurements & analysis",
    prompt: "Generate a property report for ",
    category: "roofing",
    priority: 100
  },
  {
    icon: IconCurrencyDollar,
    label: "Create Estimate",
    description: "Generate detailed job cost estimate",
    prompt: "Create a detailed roofing estimate for the property at ",
    category: "roofing",
    priority: 95
  },
  {
    icon: IconFileText,
    label: "Draft Proposal",
    description: "Professional customer proposal",
    prompt: "Draft a professional roofing proposal for ",
    category: "roofing",
    priority: 90
  },
  {
    icon: IconMapPin,
    label: "Site Assessment",
    description: "Pre-visit property check",
    prompt: "Do a site assessment and provide key details for the property at ",
    category: "roofing",
    priority: 85
  },
  // Documents
  {
    icon: IconClipboardList,
    label: "Job Summary",
    description: "Create job status report",
    prompt: "Create a job summary report for ",
    category: "documents",
    priority: 70
  },
  {
    icon: IconReceipt,
    label: "Invoice Draft",
    description: "Generate customer invoice",
    prompt: "Create an invoice draft for the roofing job at ",
    category: "documents",
    priority: 65
  },
  {
    icon: IconTools,
    label: "Material List",
    description: "Generate material takeoff",
    prompt: "Create a detailed material list for a roofing job at ",
    category: "documents",
    priority: 60
  },
  // Research
  {
    icon: IconCloud,
    label: "Weather Check",
    description: "7-day forecast for job site",
    prompt: "What's the 7-day weather forecast for ",
    category: "research",
    priority: 80
  },
  {
    icon: IconTrendingUp,
    label: "Material Prices",
    description: "Current roofing prices",
    prompt: "What are the current prices for roofing materials including shingles, underlayment, and flashing?",
    category: "research",
    priority: 55
  },
  {
    icon: IconSearch,
    label: "Building Codes",
    description: "Local code requirements",
    prompt: "What are the roofing building code requirements for ",
    category: "research",
    priority: 50
  },
  // Communication
  {
    icon: IconMail,
    label: "Draft Email",
    description: "Professional customer email",
    prompt: "Draft a professional email to a customer about ",
    category: "communication",
    priority: 75
  },
  {
    icon: IconMail,
    label: "Follow-up Email",
    description: "Estimate follow-up message",
    prompt: "Draft a follow-up email for a roofing estimate I sent to ",
    category: "communication",
    priority: 72
  },
  {
    icon: IconUsers,
    label: "Customer Update",
    description: "Job progress message",
    prompt: "Draft a job progress update for the customer at ",
    category: "communication",
    priority: 68
  },
  {
    icon: IconPhone,
    label: "Call Script",
    description: "Sales or follow-up script",
    prompt: "Create a phone call script for following up with a customer about ",
    category: "communication",
    priority: 45
  }
]

// Actions that require connected apps
const CONNECTED_APP_ACTIONS: QuickAction[] = [
  {
    icon: IconMail,
    label: "Send Email",
    description: "Send via Gmail/Outlook",
    prompt: "Send an email to ",
    category: "connected",
    priority: 85,
    requiresApp: ["gmail", "google_mail", "outlook"]
  },
  {
    icon: IconCalendar,
    label: "Check Calendar",
    description: "View your schedule",
    prompt: "Show my calendar events for this week",
    category: "connected",
    priority: 80,
    requiresApp: ["google_calendar", "outlook_calendar"]
  },
  {
    icon: IconCalendar,
    label: "Schedule Job",
    description: "Book installation date",
    prompt: "Schedule a roofing job for ",
    category: "connected",
    priority: 82,
    requiresApp: ["google_calendar", "outlook_calendar"]
  },
  {
    icon: IconBrandSlack,
    label: "Team Message",
    description: "Message your crew",
    prompt: "Send a Slack message to the team about ",
    category: "connected",
    priority: 70,
    requiresApp: ["slack"]
  },
  {
    icon: IconDatabase,
    label: "CRM Lookup",
    description: "Find customer record",
    prompt: "Look up customer ",
    category: "connected",
    priority: 75,
    requiresApp: ["salesforce", "hubspot", "zoho_crm", "pipedrive"]
  },
  {
    icon: IconDatabase,
    label: "Add to CRM",
    description: "Create new lead",
    prompt: "Add a new lead to CRM for ",
    category: "connected",
    priority: 73,
    requiresApp: ["salesforce", "hubspot", "zoho_crm", "pipedrive"]
  },
  {
    icon: IconBrandGoogle,
    label: "Create Doc",
    description: "Create Google Doc",
    prompt: "Create a Google Doc for ",
    category: "connected",
    priority: 60,
    requiresApp: ["google_docs"]
  },
  {
    icon: IconBrandGoogle,
    label: "Log to Sheet",
    description: "Add to spreadsheet",
    prompt: "Add a row to my job tracking spreadsheet with ",
    category: "connected",
    priority: 65,
    requiresApp: ["google_sheets"]
  }
]

// Smart suggestions based on conversation context
const CONTEXTUAL_SUGGESTIONS = {
  // Keywords that trigger suggestions
  triggers: {
    "property": ["Generate a property report for this address", "What's the roof area?"],
    "address": ["Generate a property report for this address", "What's the weather at this location?"],
    "customer": ["Send a follow-up email to this customer", "Schedule a callback with this customer"],
    "estimate": ["Create an estimate for this job", "Email this estimate to the customer"],
    "schedule": ["Check my availability this week", "Schedule an appointment"],
    "weather": ["Get the 7-day forecast", "Is it safe to work on the roof tomorrow?"],
    "material": ["Compare shingle prices", "What's the lead time for metal roofing?"],
    "email": ["Draft a follow-up email", "Send appointment reminder"]
  }
}

interface AgentQuickActionsProps {
  onSelectAction: (prompt: string, needsInput: boolean) => void
  visible?: boolean
  conversationContext?: string // Last few messages for context
}

export function AgentQuickActions({
  onSelectAction,
  visible = true,
  conversationContext
}: AgentQuickActionsProps) {
  const [connectedApps, setConnectedApps] = useState<string[]>([])
  const [isLoadingApps, setIsLoadingApps] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Load connected apps
  useEffect(() => {
    loadConnectedApps()
  }, [])

  const loadConnectedApps = async () => {
    setIsLoadingApps(true)
    try {
      const response = await fetch("/api/pipedream/data-sources")
      if (response.ok) {
        const data = await response.json()
        const enabledApps = (data.dataSources || [])
          .filter((ds: any) => ds.enabled)
          .map((ds: any) => ds.app_slug || ds.slug || "")
          .filter(Boolean)
        setConnectedApps(enabledApps)
      }
    } catch (error) {
      console.error("Error loading connected apps:", error)
    } finally {
      setIsLoadingApps(false)
    }
  }

  // Filter connected app actions based on what's available
  const availableConnectedActions = CONNECTED_APP_ACTIONS.filter(action => {
    if (!action.requiresApp) return false
    return action.requiresApp.some(app =>
      connectedApps.some(connected => connected.toLowerCase().includes(app.toLowerCase()))
    )
  })

  // Get contextual suggestions based on conversation
  const getContextualSuggestions = (): string[] => {
    if (!conversationContext) return []
    const contextLower = conversationContext.toLowerCase()
    const suggestions: string[] = []

    Object.entries(CONTEXTUAL_SUGGESTIONS.triggers).forEach(([keyword, prompts]) => {
      if (contextLower.includes(keyword)) {
        suggestions.push(...prompts)
      }
    })

    return suggestions.slice(0, 3) // Limit to 3 contextual suggestions
  }

  const contextualSuggestions = getContextualSuggestions()

  if (!visible) return null

  // Combine base actions with available connected actions and sort by priority
  const allActions = [...BASE_QUICK_ACTIONS, ...availableConnectedActions]
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))

  // Group actions by category
  const categories = {
    roofing: allActions.filter(a => a.category === "roofing"),
    research: allActions.filter(a => a.category === "research"),
    documents: allActions.filter(a => a.category === "documents"),
    communication: allActions.filter(a => a.category === "communication"),
    connected: allActions.filter(a => a.category === "connected")
  }

  const categoryLabels: Record<string, { label: string; icon: any; color: string }> = {
    roofing: { label: "Roofing", icon: IconHome, color: "teal" },
    research: { label: "Research", icon: IconSearch, color: "blue" },
    documents: { label: "Documents", icon: IconFileText, color: "purple" },
    communication: { label: "Communicate", icon: IconMail, color: "orange" },
    connected: { label: "Connected Apps", icon: IconPlugConnected, color: "green" }
  }

  const getCategoryColors = (category: string, isSelected: boolean) => {
    const colors: Record<string, { border: string; bg: string; text: string; selectedBorder: string; selectedBg: string; selectedText: string }> = {
      roofing: {
        border: "border-teal-600/30",
        bg: "bg-teal-500/5",
        text: "text-teal-400",
        selectedBorder: "border-teal-500/60",
        selectedBg: "bg-teal-500/15",
        selectedText: "text-teal-300"
      },
      research: {
        border: "border-blue-600/30",
        bg: "bg-blue-500/5",
        text: "text-blue-400",
        selectedBorder: "border-blue-500/60",
        selectedBg: "bg-blue-500/15",
        selectedText: "text-blue-300"
      },
      documents: {
        border: "border-purple-600/30",
        bg: "bg-purple-500/5",
        text: "text-purple-400",
        selectedBorder: "border-purple-500/60",
        selectedBg: "bg-purple-500/15",
        selectedText: "text-purple-300"
      },
      communication: {
        border: "border-orange-600/30",
        bg: "bg-orange-500/5",
        text: "text-orange-400",
        selectedBorder: "border-orange-500/60",
        selectedBg: "bg-orange-500/15",
        selectedText: "text-orange-300"
      },
      connected: {
        border: "border-green-500/30",
        bg: "bg-green-500/5",
        text: "text-green-400",
        selectedBorder: "border-green-500/60",
        selectedBg: "bg-green-500/15",
        selectedText: "text-green-300"
      }
    }
    const c = colors[category] || colors.roofing
    return isSelected
      ? { border: c.selectedBorder, bg: c.selectedBg, text: c.selectedText }
      : { border: c.border, bg: c.bg, text: c.text }
  }

  return (
    <div className="border-t border-blue-500/15 bg-gradient-to-r from-blue-500/5 to-purple-500/5 px-4 py-3 backdrop-blur-md">
      <div className="mx-auto max-w-4xl space-y-3">
        {/* Contextual suggestions based on conversation */}
        {contextualSuggestions.length > 0 && (
          <div className="rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-purple-400">
              <IconSparkles className="size-3.5" />
              Suggested based on your conversation
            </div>
            <div className="flex flex-wrap gap-2">
              {contextualSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => onSelectAction(suggestion, false)}
                  className="flex items-center gap-1.5 rounded-full bg-purple-500/20 px-3 py-1.5 text-sm text-purple-300 transition-colors hover:bg-purple-500/30 hover:text-white"
                >
                  <IconChevronRight className="size-3.5" />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-700">
          {Object.entries(categoryLabels).map(([key, { label, icon: Icon, color }]) => {
            const count = categories[key as keyof typeof categories]?.length || 0
            if (count === 0) return null

            const isSelected = selectedCategory === key
            const colors = getCategoryColors(key, isSelected)
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(isSelected ? null : key)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                  isSelected
                    ? `${colors.border} ${colors.bg} ${colors.text}`
                    : "border-blue-500/15 bg-gradient-to-br from-blue-500/5 to-purple-500/5 text-muted-foreground hover:border-blue-500/25 hover:text-foreground"
                )}
              >
                <Icon className="size-3.5" />
                {label}
                <span className={cn(
                  "rounded-full px-1.5 text-[10px]",
                  isSelected ? `${colors.bg}` : "bg-blue-500/10"
                )}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Featured Quick Actions - Show when no category selected */}
        {!selectedCategory && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {allActions.slice(0, 4).map((action, index) => {
              const needsInput = action.prompt.endsWith(" ")
              const colors = getCategoryColors(action.category, true)

              return (
                <button
                  key={`featured-${index}`}
                  onClick={() => onSelectAction(action.prompt, needsInput)}
                  className={cn(
                    "group flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all hover:scale-[1.02]",
                    colors.border,
                    colors.bg,
                    "hover:shadow-lg hover:shadow-black/20"
                  )}
                >
                  <div className={cn(
                    "flex size-10 items-center justify-center rounded-lg",
                    colors.bg,
                    "ring-1 ring-white/10"
                  )}>
                    <action.icon className={cn("size-5", colors.text)} />
                  </div>
                  <div>
                    <div className={cn("font-semibold", colors.text)}>
                      {action.label}
                    </div>
                    <div className="mt-0.5 text-[11px] text-gray-500">
                      {action.description}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Actions list - Show when category is selected or as additional options */}
        <div className={cn(
          "flex flex-wrap gap-2",
          !selectedCategory && "border-t border-blue-500/15 pt-3"
        )}>
          {(selectedCategory
            ? categories[selectedCategory as keyof typeof categories]
            : allActions.slice(4, 12)
          ).map((action, index) => {
            const needsInput = action.prompt.endsWith(" ")
            const colors = getCategoryColors(action.category, false)

            return (
              <button
                key={index}
                onClick={() => onSelectAction(action.prompt, needsInput)}
                className={cn(
                  "group flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all",
                  colors.border,
                  colors.bg,
                  "hover:border-opacity-70 hover:bg-opacity-20"
                )}
              >
                <action.icon className={cn("size-4", colors.text, "group-hover:scale-110 transition-transform")} />
                <div className="text-left">
                  <div className={cn("font-medium text-gray-300 group-hover:text-white")}>
                    {action.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {action.description}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Connected apps indicator */}
        {availableConnectedActions.length === 0 && !isLoadingApps && (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-purple-500/5 p-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
              <IconPlugConnected className="size-4 text-gray-400" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-400">Supercharge your workflow</div>
              <div className="text-[11px] text-gray-500">Connect Gmail, Calendar, Slack, or your CRM to unlock powerful automations</div>
            </div>
            <button className="shrink-0 rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:border-blue-500/30 hover:from-blue-500/15 hover:to-purple-500/15">
              Connect Apps
            </button>
          </div>
        )}

        {/* Connected apps count indicator */}
        {availableConnectedActions.length > 0 && !isLoadingApps && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="size-2 animate-pulse rounded-full bg-green-500" />
              <span>{availableConnectedActions.length} connected app{availableConnectedActions.length !== 1 ? 's' : ''} available</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Connected apps indicator component
interface ConnectedApp {
  name: string
  slug: string
  icon?: string
  connected: boolean
}

interface ConnectedAppsIndicatorProps {
  apps: ConnectedApp[]
  onManageApps?: () => void
}

export function ConnectedAppsIndicator({ apps, onManageApps }: ConnectedAppsIndicatorProps) {
  const connectedCount = apps.filter(a => a.connected).length

  if (apps.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex items-center gap-1">
        <div className={`size-2 rounded-full ${connectedCount > 0 ? 'bg-green-500 shadow-sm shadow-green-500/50' : 'bg-muted-foreground/50'}`} />
        <span className="text-gray-400">
          {connectedCount} app{connectedCount !== 1 ? 's' : ''} connected
        </span>
      </div>
      {onManageApps && (
        <button
          onClick={onManageApps}
          className="text-blue-400 hover:text-blue-300 hover:underline"
        >
          Manage
        </button>
      )}
    </div>
  )
}
