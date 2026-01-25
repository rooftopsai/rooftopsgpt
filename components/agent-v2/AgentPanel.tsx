"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { AgentInput } from "./AgentInput"
import { AgentTaskView } from "./AgentTaskView"
import { AgentHistory } from "./AgentHistory"
import { useAgentV2, ExtendedAgentTask, AIEmployeePersona } from "./useAgentV2"
import {
  IconSparkles,
  IconPlugConnected,
  IconSettings,
  IconHistory,
  IconX,
  IconRefresh,
  IconBrandGmail,
  IconCalendar,
  IconBrandSlack,
  IconBrandGoogle,
  IconMail,
  IconCloud,
  IconHome,
  IconSearch,
  IconCurrencyDollar,
  IconPlus,
  IconKeyboard,
  IconExternalLink
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface AgentPanelProps {
  workspaceId: string
}

export function AgentPanel({ workspaceId }: AgentPanelProps) {
  const params = useParams()
  const locale = (params.locale as string) || "en"

  const {
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
  } = useAgentV2(workspaceId)

  const [showHistory, setShowHistory] = useState(false)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)

  // Handle keyboard shortcuts display
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setShowKeyboardShortcuts(prev => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleShare = useCallback(() => {
    if (currentTask) {
      shareResult(currentTask)
    }
  }, [currentTask, shareResult])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex size-10 items-center justify-center rounded-lg">
            <IconSparkles className="text-primary size-5" />
          </div>
          <div>
            <h1 className="text-foreground text-lg font-semibold">AI Agent</h1>
            <p className="text-muted-foreground text-sm">
              Your roofing business assistant
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Connected Apps Indicator */}
          <ConnectedAppsIndicator
            apps={connectedApps}
            isLoading={isLoadingApps}
            onClick={() => setShowConnectModal(true)}
          />

          {/* Keyboard shortcuts */}
          <button
            onClick={() => setShowKeyboardShortcuts(true)}
            className="border-border text-muted-foreground hover:bg-muted hover:text-foreground hidden rounded-lg border p-2 transition-colors sm:block"
            title="Keyboard shortcuts (Cmd+/)"
          >
            <IconKeyboard className="size-5" />
          </button>

          {/* History Toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={cn(
              "rounded-lg border p-2 transition-colors",
              showHistory
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:bg-muted"
            )}
            title="Task history"
          >
            <IconHistory className="size-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Task Area */}
        <div className="flex flex-1 flex-col">
          {/* Empty State or Current Task */}
          {!currentTask ? (
            <EmptyState
              onSendTask={sendTask}
              onActivateEmployee={activateEmployee}
              connectedApps={connectedApps}
              onConnectApps={() => setShowConnectModal(true)}
            />
          ) : (
            <AgentTaskView
              task={currentTask}
              onConfirm={confirmAction}
              onCancel={cancelAction}
              onCancelTask={cancelTask}
              onCopy={copyResult}
              onShare={handleShare}
              onRetry={retryStep}
              onNewTask={clearTask}
            />
          )}

          {/* Input (always visible at bottom) */}
          <div className="border-border border-t p-4">
            <AgentInput
              onSubmit={sendTask}
              isDisabled={currentTask?.status === "running"}
              connectedApps={connectedApps}
              placeholder={
                currentTask?.status === "running"
                  ? "Task in progress..."
                  : "What would you like to do?"
              }
            />
            {/* Keyboard hint */}
            <div className="text-muted-foreground mt-2 flex items-center justify-center gap-4 text-xs">
              <span>
                <kbd className="border-border bg-muted rounded border px-1.5 py-0.5 font-mono">Enter</kbd>
                {" "}to send
              </span>
              <span>
                <kbd className="border-border bg-muted rounded border px-1.5 py-0.5 font-mono">Esc</kbd>
                {" "}to cancel
              </span>
              <span className="hidden sm:inline">
                <kbd className="border-border bg-muted rounded border px-1.5 py-0.5 font-mono">Cmd+K</kbd>
                {" "}new task
              </span>
            </div>
          </div>
        </div>

        {/* History Sidebar */}
        {showHistory && (
          <div className="border-border w-80 border-l">
            <AgentHistory
              tasks={recentTasks}
              onClose={() => setShowHistory(false)}
            />
          </div>
        )}
      </div>

      {/* Connect Apps Modal */}
      {showConnectModal && (
        <ConnectAppsModal
          connectedApps={connectedAppsDetails}
          isConnecting={isConnecting}
          onConnect={connectApp}
          onRefresh={refreshApps}
          onClose={() => setShowConnectModal(false)}
          workspaceId={workspaceId}
          locale={locale}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      {showKeyboardShortcuts && (
        <KeyboardShortcutsModal onClose={() => setShowKeyboardShortcuts(false)} />
      )}
    </div>
  )
}

interface ConnectedAppsIndicatorProps {
  apps: string[]
  isLoading: boolean
  onClick: () => void
}

function ConnectedAppsIndicator({ apps, isLoading, onClick }: ConnectedAppsIndicatorProps) {
  if (isLoading) {
    return (
      <div className="border-border bg-background flex items-center gap-2 rounded-lg border px-3 py-2">
        <div className="bg-muted-foreground size-2 animate-pulse rounded-full" />
        <span className="text-muted-foreground text-sm">Loading...</span>
      </div>
    )
  }

  return (
    <button
      onClick={onClick}
      className="border-border bg-background hover:bg-muted flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
    >
      {apps.length === 0 ? (
        <>
          <IconPlugConnected className="text-muted-foreground size-4" />
          <span className="text-muted-foreground">Connect apps</span>
        </>
      ) : (
        <>
          <div className="size-2 rounded-full bg-green-500" />
          <span className="text-muted-foreground">
            {apps.length} app{apps.length !== 1 ? "s" : ""}
          </span>
        </>
      )}
    </button>
  )
}

interface EmptyStateProps {
  onSendTask: (goal: string) => void
  onActivateEmployee: (persona: AIEmployeePersona) => void
  connectedApps: string[]
  onConnectApps: () => void
}

// AI Employee definitions - these are personas with specific capabilities
interface AIEmployee {
  id: string
  name: string
  role: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  capabilities: string[]
  activationPrompt: string
  requiredApps?: string[]
  comingSoon?: boolean
}

const SALES_CONSULTANT_PROMPT = `You are Alex, an AI Sales Consultant for a roofing company. You are a proactive, autonomous sales professional who TAKES ACTION immediately using your tools.

## CRITICAL: BE PROACTIVE - USE YOUR TOOLS!
- When given a task, IMMEDIATELY use your tools to complete it
- Don't just describe what you could do - DO IT
- Execute tools in sequence to complete multi-step tasks
- Only ask clarifying questions if you truly cannot proceed without specific information

## YOUR TOOLS (USE THEM!)
- **web_search**: Search the internet for leads, storm damage news, competitor info
- **get_weather_forecast**: Check weather for job planning and storm damage opportunities
- **generate_property_report**: Analyze any address - roof size, facets, pitch, solar potential
- **draft_email**: Create professional outreach emails
- **generate_artifact**: CREATE ACTUAL DESIGNS - business cards, flyers, door hangers, postcards with real HTML/CSS

## WORKFLOWS - EXECUTE DON'T DESCRIBE

### "Find leads in [area]" or "Identify prospects":
1. IMMEDIATELY use get_weather_forecast to check for storms/bad weather
2. Use web_search for "[area] storm damage" or "[area] roofing"
3. Present findings with specific action items
4. Offer to research specific addresses or create marketing materials

### "Research [address]":
1. IMMEDIATELY use generate_property_report for that address
2. Present the findings with selling points and talking points
3. Offer to draft outreach or create a proposal

### "Create a flyer" or "Make me a business card" or "Design a door hanger":
1. IMMEDIATELY use generate_artifact with:
   - artifact_type: "flyer", "business_card", "door_hanger", or "postcard"
   - company_name: Ask if not provided, or use placeholder "Your Roofing Company"
   - Include reasonable defaults for services (Roof Repairs, Replacements, Inspections)
   - Include a compelling offer like "FREE Inspection" or "10% Off First Service"
2. The tool generates REAL HTML that they can preview, download, and print!

### "Draft email to [customer]" or "Write outreach":
1. IMMEDIATELY use draft_email with professional content
2. Reference property data if you've gathered it

## RESPONSE FORMAT

Use clean markdown:
- **Bold** for key data points
- ## Headers for sections
- Bullet points for lists

After completing a task, offer 2-3 specific next actions.

## INTRODUCTION

When activated, briefly introduce yourself:

"Hey, I'm Alex - your AI sales assistant. I can:
- **Find leads** and research storm damage opportunities
- **Analyze properties** with detailed roof reports
- **Create marketing materials** like flyers and business cards
- **Draft outreach emails** for prospects

What would you like me to work on?"

Then WAIT for their task and EXECUTE IT using your tools.`

const AI_EMPLOYEES: AIEmployee[] = [
  {
    id: "sales-consultant",
    name: "Alex",
    role: "Sales Consultant",
    icon: IconCurrencyDollar,
    description: "Your AI sales rep that identifies leads, sends follow-ups, and helps close deals.",
    capabilities: [
      "Identify leads from property data",
      "Send personalized outreach emails",
      "Track customer interactions",
      "Check weather for scheduling",
      "Generate property reports"
    ],
    activationPrompt: SALES_CONSULTANT_PROMPT
  },
  {
    id: "project-coordinator",
    name: "Jordan",
    role: "Project Coordinator",
    icon: IconCalendar,
    description: "Manages job scheduling, crew assignments, and project timelines.",
    capabilities: [
      "Schedule jobs based on weather",
      "Coordinate crew availability",
      "Send appointment confirmations",
      "Track project progress"
    ],
    activationPrompt: "You are Jordan, an AI Project Coordinator helping manage roofing projects...",
    requiredApps: ["google_calendar"],
    comingSoon: true
  },
  {
    id: "estimator",
    name: "Sam",
    role: "Estimator",
    icon: IconHome,
    description: "Creates accurate roof estimates using satellite imagery and material pricing.",
    capabilities: [
      "Analyze roof from address",
      "Calculate material needs",
      "Generate detailed estimates",
      "Compare material options"
    ],
    activationPrompt: "You are Sam, an AI Estimator that creates accurate roofing estimates...",
    comingSoon: true
  },
  {
    id: "customer-service",
    name: "Riley",
    role: "Customer Service Rep",
    icon: IconMail,
    description: "Handles customer inquiries, scheduling requests, and service follow-ups.",
    capabilities: [
      "Respond to customer emails",
      "Schedule inspections",
      "Handle warranty inquiries",
      "Collect customer feedback"
    ],
    activationPrompt: "You are Riley, an AI Customer Service Representative...",
    requiredApps: ["gmail"],
    comingSoon: true
  }
]

function EmptyState({ onSendTask, onActivateEmployee, connectedApps, onConnectApps }: EmptyStateProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<AIEmployee | null>(null)

  const handleActivateEmployee = (employee: AIEmployee) => {
    if (employee.comingSoon) return

    // Check if required apps are connected (only check if requiredApps is specified)
    if (employee.requiredApps && employee.requiredApps.length > 0) {
      const hasRequiredApps = employee.requiredApps.some(required =>
        connectedApps.some(app => app.toLowerCase().includes(required.toLowerCase()))
      )
      if (!hasRequiredApps) {
        setSelectedEmployee(employee)
        return
      }
    }

    // Activate the employee with their persona (system prompt)
    onActivateEmployee({
      id: employee.id,
      name: employee.name,
      role: employee.role,
      systemPrompt: employee.activationPrompt
    })
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-foreground text-2xl font-semibold">
            Your AI Team
          </h2>
          <p className="text-muted-foreground mt-2">
            Choose an AI employee to help with your roofing business. They work 24/7 and learn your preferences.
          </p>
        </div>

        {/* AI Employee Cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {AI_EMPLOYEES.map((employee) => {
            const Icon = employee.icon
            const hasRequiredApps = !employee.requiredApps || employee.requiredApps.some(required =>
              connectedApps.some(app => app.toLowerCase().includes(required.toLowerCase()))
            )

            return (
              <div
                key={employee.id}
                className={cn(
                  "relative rounded-xl border p-5 transition-all",
                  employee.comingSoon
                    ? "border-border bg-muted/30 opacity-60"
                    : "border-border bg-background hover:border-primary/50 cursor-pointer hover:shadow-md"
                )}
                onClick={() => !employee.comingSoon && handleActivateEmployee(employee)}
              >
                {employee.comingSoon && (
                  <div className="bg-muted text-muted-foreground absolute right-3 top-3 rounded-full px-2 py-0.5 text-xs font-medium">
                    Coming Soon
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-xl",
                    employee.comingSoon ? "bg-muted" : "bg-primary/10"
                  )}>
                    <Icon className={cn(
                      "size-6",
                      employee.comingSoon ? "text-muted-foreground" : "text-primary"
                    )} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-foreground font-semibold">{employee.name}</h3>
                      <span className="text-muted-foreground text-sm">• {employee.role}</span>
                    </div>
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                      {employee.description}
                    </p>

                    {/* Capabilities preview */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {employee.capabilities.slice(0, 3).map((cap, i) => (
                        <span
                          key={i}
                          className="bg-muted text-muted-foreground inline-flex items-center rounded-md px-2 py-0.5 text-xs"
                        >
                          {cap.length > 25 ? cap.substring(0, 25) + "..." : cap}
                        </span>
                      ))}
                      {employee.capabilities.length > 3 && (
                        <span className="bg-muted text-muted-foreground inline-flex items-center rounded-md px-2 py-0.5 text-xs">
                          +{employee.capabilities.length - 3} more
                        </span>
                      )}
                    </div>

                    {/* Required apps warning */}
                    {!employee.comingSoon && employee.requiredApps && !hasRequiredApps && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                        <IconPlugConnected className="size-3.5" />
                        <span>Works best with {employee.requiredApps.join(", ")}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Activate button */}
                {!employee.comingSoon && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleActivateEmployee(employee)
                      }}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                    >
                      <IconSparkles className="size-4" />
                      Activate {employee.name}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Connect apps prompt */}
        {connectedApps.length === 0 && (
          <div className="mt-8 rounded-xl border border-dashed border-amber-500/50 bg-amber-50/50 p-5 text-center dark:bg-amber-500/5">
            <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-amber-500/10">
              <IconPlugConnected className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-foreground mt-3 font-medium">Connect Your Apps</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Your AI employees work better with Gmail, Calendar, and other apps connected.
            </p>
            <button
              onClick={onConnectApps}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700"
            >
              <IconPlugConnected className="size-4" />
              Connect Apps
            </button>
          </div>
        )}

        {/* Selected employee requires app connection modal */}
        {selectedEmployee && selectedEmployee.requiredApps && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="border-border bg-background w-full max-w-md rounded-xl border p-6 shadow-xl">
              <h3 className="text-foreground text-lg font-semibold">
                Connect Apps for {selectedEmployee.name}
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                {selectedEmployee.name} works best with {selectedEmployee.requiredApps.join(" and ")} connected.
                You can still activate without these apps, but some features won&apos;t be available.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    // Activate anyway without required apps
                    onActivateEmployee({
                      id: selectedEmployee.id,
                      name: selectedEmployee.name,
                      role: selectedEmployee.role,
                      systemPrompt: selectedEmployee.activationPrompt
                    })
                    setSelectedEmployee(null)
                  }}
                  className="border-border text-foreground hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
                >
                  Continue Anyway
                </button>
                <button
                  onClick={() => {
                    setSelectedEmployee(null)
                    onConnectApps()
                  }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                >
                  Connect Apps
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface ConnectAppsModalProps {
  connectedApps: { slug: string; name: string; enabled: boolean }[]
  isConnecting: boolean
  onConnect: (appSlug: string) => void
  onRefresh: () => void
  onClose: () => void
  workspaceId: string
  locale: string
}

const AVAILABLE_APPS = [
  { slug: "gmail", name: "Gmail", icon: IconBrandGmail, description: "Send and read emails" },
  { slug: "google_calendar", name: "Google Calendar", icon: IconCalendar, description: "Manage events and schedules" },
  { slug: "slack", name: "Slack", icon: IconBrandSlack, description: "Send messages to channels" },
  { slug: "google_docs", name: "Google Docs", icon: IconBrandGoogle, description: "Create and edit documents" },
  { slug: "google_sheets", name: "Google Sheets", icon: IconBrandGoogle, description: "Work with spreadsheets" }
]

function ConnectAppsModal({ connectedApps, isConnecting, onConnect, onRefresh, onClose, workspaceId, locale }: ConnectAppsModalProps) {
  const connectedSlugs = new Set(connectedApps.filter(a => a.enabled).map(a => a.slug))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="border-border bg-background w-full max-w-lg rounded-xl border shadow-xl">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-foreground text-lg font-semibold">Connect Apps</h2>
            <p className="text-muted-foreground text-sm">
              Enable integrations to unlock more capabilities
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-2 transition-colors"
          >
            <IconX className="size-5" />
          </button>
        </div>

        {/* App List */}
        <div className="max-h-96 overflow-y-auto p-4">
          <div className="space-y-3">
            {AVAILABLE_APPS.map(app => {
              const isConnected = connectedSlugs.has(app.slug)
              const Icon = app.icon
              return (
                <div
                  key={app.slug}
                  className="border-border flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
                      <Icon className="text-muted-foreground size-5" />
                    </div>
                    <div>
                      <p className="text-foreground font-medium">{app.name}</p>
                      <p className="text-muted-foreground text-sm">{app.description}</p>
                    </div>
                  </div>
                  {isConnected ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-sm text-green-600 dark:text-green-400">
                      <div className="size-2 rounded-full bg-green-500" />
                      Connected
                    </span>
                  ) : (
                    <button
                      onClick={() => onConnect(app.slug)}
                      disabled={isConnecting}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <IconPlus className="size-4" />
                      Connect
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-border flex items-center justify-between border-t px-6 py-4">
          <button
            onClick={onRefresh}
            className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
          >
            <IconRefresh className="size-4" />
            Refresh
          </button>
          <a
            href={`/${locale}/${workspaceId}/settings/integrations`}
            className="text-primary flex items-center gap-1 text-sm hover:underline"
          >
            Manage in settings
            <IconExternalLink className="size-3" />
          </a>
        </div>
      </div>
    </div>
  )
}

function KeyboardShortcutsModal({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { keys: ["Enter"], description: "Send message" },
    { keys: ["Shift", "Enter"], description: "New line" },
    { keys: ["Esc"], description: "Cancel running task" },
    { keys: ["Cmd", "K"], description: "Clear and start new task" },
    { keys: ["Cmd", "/"], description: "Toggle this menu" }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="border-border bg-background w-full max-w-sm rounded-xl border shadow-xl">
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-foreground text-lg font-semibold">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-2 transition-colors"
          >
            <IconX className="size-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="space-y-3">
            {shortcuts.map((shortcut, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{shortcut.description}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, j) => (
                    <span key={j}>
                      <kbd className="border-border bg-muted rounded border px-2 py-1 font-mono text-xs">
                        {key}
                      </kbd>
                      {j < shortcut.keys.length - 1 && (
                        <span className="text-muted-foreground mx-1 text-xs">+</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
