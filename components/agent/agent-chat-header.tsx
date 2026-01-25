"use client"

import { useState, useEffect } from "react"
import { useAgent } from "@/context/agent-context"
import {
  IconSparkles,
  IconSettings,
  IconTrash,
  IconPlus,
  IconPlugConnected,
  IconMail,
  IconCalendar,
  IconBrandSlack,
  IconDatabase,
  IconRefresh,
  IconChevronDown,
  IconBrandGoogle
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface ConnectedApp {
  slug?: string
  app_slug?: string
  name?: string
  app_name?: string
  enabled?: boolean
}

export function AgentChatHeader() {
  const { currentSession, createSession, clearMessages, usage } = useAgent()
  const [connectedApps, setConnectedApps] = useState<ConnectedApp[]>([])
  const [isLoadingApps, setIsLoadingApps] = useState(false)
  const [showAppsDropdown, setShowAppsDropdown] = useState(false)

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
        setConnectedApps(data.dataSources || [])
      }
    } catch (error) {
      console.error("Error loading connected apps:", error)
    } finally {
      setIsLoadingApps(false)
    }
  }

  // Normalize app data - API might return different field names
  const normalizedApps = connectedApps.map(app => ({
    slug: app.slug || app.app_slug || "unknown",
    name: app.name || app.app_name || "Unknown App",
    enabled: app.enabled !== false
  }))

  const enabledApps = normalizedApps.filter(app => app.enabled)

  const getAppIcon = (slug: string | undefined | null) => {
    if (!slug) return IconPlugConnected
    const lowerSlug = slug.toLowerCase()
    if (lowerSlug.includes("gmail") || lowerSlug.includes("email") || lowerSlug.includes("outlook")) {
      return IconMail
    }
    if (lowerSlug.includes("calendar")) {
      return IconCalendar
    }
    if (lowerSlug.includes("slack")) {
      return IconBrandSlack
    }
    if (lowerSlug.includes("google")) {
      return IconBrandGoogle
    }
    if (lowerSlug.includes("salesforce") || lowerSlug.includes("hubspot") || lowerSlug.includes("crm")) {
      return IconDatabase
    }
    return IconPlugConnected
  }

  return (
    <div className="flex items-center justify-between border-b border-blue-500/15 bg-gradient-to-r from-blue-500/5 to-purple-500/5 px-4 py-3 backdrop-blur-md">
      {/* Left: Agent Info */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-blue-500/20 shadow-sm shadow-purple-500/10">
          <IconSparkles className="size-5 text-purple-400" />
        </div>
        <div>
          <h1 className="font-semibold text-foreground">Rooftops AI Agent</h1>
          <div className="flex items-center gap-2 text-xs font-light text-muted-foreground">
            {currentSession ? (
              <span>{currentSession.name}</span>
            ) : (
              <span>No active session</span>
            )}
            {usage && (
              <>
                <span className="text-blue-500/30">•</span>
                <span>{usage.totalTokensUsed.toLocaleString()} tokens</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: Connected Apps & Actions */}
      <div className="flex items-center gap-3">
        {/* Connected Apps Indicator */}
        <div className="relative">
          <button
            onClick={() => setShowAppsDropdown(!showAppsDropdown)}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-light backdrop-blur-md transition-all",
              enabledApps.length > 0
                ? "border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/10 text-green-400 hover:border-green-500/40 hover:from-green-500/15 hover:to-emerald-500/15"
                : "border-blue-500/15 bg-gradient-to-br from-blue-500/5 to-purple-500/5 text-muted-foreground hover:border-blue-500/25 hover:from-blue-500/10 hover:to-purple-500/10"
            )}
          >
            <div className={cn(
              "size-2 rounded-full",
              enabledApps.length > 0 ? "bg-green-500 shadow-sm shadow-green-500/50" : "bg-muted-foreground/50"
            )} />
            <span>
              {enabledApps.length > 0
                ? `${enabledApps.length} app${enabledApps.length > 1 ? "s" : ""} connected`
                : "No apps connected"
              }
            </span>
            <IconChevronDown className={cn(
              "size-4 transition-transform",
              showAppsDropdown && "rotate-180"
            )} />
          </button>

          {/* Dropdown */}
          {showAppsDropdown && (
            <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-purple-500/5 p-4 shadow-lg shadow-blue-500/10 backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-medium text-foreground">Connected Apps</span>
                <button
                  onClick={loadConnectedApps}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-blue-500/10 hover:text-foreground"
                  title="Refresh"
                >
                  <IconRefresh className={cn("size-4", isLoadingApps && "animate-spin")} />
                </button>
              </div>

              {enabledApps.length === 0 ? (
                <div className="py-6 text-center">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                    <IconPlugConnected className="size-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground">No apps connected</p>
                  <p className="mt-1 text-xs font-light text-muted-foreground">
                    Connect apps to enable AI-powered automations
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {enabledApps.map(app => {
                    const AppIcon = getAppIcon(app.slug)
                    return (
                      <div
                        key={app.slug}
                        className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/5 to-emerald-500/5 px-3 py-2"
                      >
                        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20">
                          <AppIcon className="size-4 text-green-400" />
                        </div>
                        <span className="flex-1 text-sm font-light text-foreground">{app.name}</span>
                        <div className="size-2 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="mt-4 border-t border-blue-500/15 pt-4">
                <a
                  href="/settings"
                  className="flex items-center justify-center gap-2 rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 px-4 py-2.5 text-sm font-light text-foreground transition-all hover:border-blue-500/30 hover:from-blue-500/15 hover:to-purple-500/15"
                >
                  <IconSettings className="size-4" />
                  Manage Connections
                </a>
              </div>
            </div>
          )}
        </div>

        {/* New Session Button */}
        <Button
          onClick={() => createSession()}
          size="sm"
          className="gap-1.5"
        >
          <IconPlus className="size-4" />
          New Session
        </Button>
      </div>
    </div>
  )
}
