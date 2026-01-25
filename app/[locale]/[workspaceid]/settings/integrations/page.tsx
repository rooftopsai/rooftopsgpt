"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  IconPlugConnected,
  IconBrandGmail,
  IconCalendar,
  IconBrandSlack,
  IconBrandGoogle,
  IconRefresh,
  IconTrash,
  IconPlus,
  IconArrowLeft,
  IconExternalLink,
  IconCheck,
  IconAlertCircle
} from "@tabler/icons-react"

interface ConnectedAccount {
  id: string
  name?: string
  appSlug: string
  appName: string
  iconUrl?: string
  createdAt?: string
}

interface DataSource {
  id: string
  app_slug: string
  app_name: string
  app_icon_url?: string
  enabled: boolean
  created_at: string
}

const APP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  gmail: IconBrandGmail,
  google_calendar: IconCalendar,
  slack: IconBrandSlack,
  google_docs: IconBrandGoogle,
  google_sheets: IconBrandGoogle
}

const AVAILABLE_APPS = [
  { slug: "gmail", name: "Gmail", description: "Send and read emails" },
  { slug: "google_calendar", name: "Google Calendar", description: "Manage events and schedules" },
  { slug: "slack", name: "Slack", description: "Send messages to channels" },
  { slug: "google_docs", name: "Google Docs", description: "Create and edit documents" },
  { slug: "google_sheets", name: "Google Sheets", description: "Work with spreadsheets" }
]

export default function IntegrationsPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceid as string

  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [pipedreamConfigured, setPipedreamConfigured] = useState(true)

  useEffect(() => {
    fetchIntegrations()
  }, [])

  const fetchIntegrations = async () => {
    setLoading(true)
    try {
      // Fetch connected accounts from Pipedream
      const accountsResponse = await fetch("/api/pipedream/accounts")
      const accountsData = await accountsResponse.json()

      if (accountsData.error) {
        if (accountsData.error === "Pipedream not configured") {
          setPipedreamConfigured(false)
        }
      } else if (accountsData.accounts) {
        setAccounts(accountsData.accounts)
      }

      // Also fetch data sources for enabled status
      const sourcesResponse = await fetch("/api/pipedream/data-sources")
      const sourcesData = await sourcesResponse.json()

      if (sourcesData.dataSources) {
        setDataSources(sourcesData.dataSources)
      }
    } catch (error) {
      console.error("Error fetching integrations:", error)
      toast.error("Failed to load integrations")
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = useCallback(async (appSlug: string) => {
    setConnecting(true)
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

      const connectUrl = data.connectLinkUrl
      if (connectUrl) {
        // URL already includes app param from server
        const popup = window.open(connectUrl, "_blank", "width=600,height=700,scrollbars=yes")

        if (popup) {
          toast.info("Complete the connection in the popup window")

          // Poll for popup close to refresh
          const pollInterval = setInterval(() => {
            if (popup.closed) {
              clearInterval(pollInterval)
              setTimeout(() => {
                fetchIntegrations()
                toast.success("Checking for new connections...")
              }, 1000)
            }
          }, 500)

          setTimeout(() => clearInterval(pollInterval), 300000)
        } else {
          toast.error("Popup blocked. Please allow popups for this site.")
        }
      }
    } catch (error) {
      console.error("Connect error:", error)
      toast.error("Failed to start connection")
    } finally {
      setConnecting(false)
    }
  }, [])

  const handleToggleEnabled = async (sourceId: string, enabled: boolean) => {
    try {
      const response = await fetch("/api/pipedream/data-sources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sourceId, enabled })
      })

      if (response.ok) {
        setDataSources(prev =>
          prev.map(s => (s.id === sourceId ? { ...s, enabled } : s))
        )
        toast.success(enabled ? "Integration enabled" : "Integration disabled")
      } else {
        toast.error("Failed to update integration")
      }
    } catch (error) {
      console.error("Toggle error:", error)
      toast.error("Failed to update integration")
    }
  }

  const handleDisconnect = async (appSlug: string) => {
    // For now, just disable the data source
    const source = dataSources.find(s => s.app_slug === appSlug)
    if (source) {
      await handleToggleEnabled(source.id, false)
    }
    toast.info("To fully disconnect, visit the app's settings directly")
  }

  const connectedSlugs = new Set(accounts.map(a => a.appSlug))

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto size-12 animate-spin rounded-full border-b-2" />
          <p className="text-muted-foreground mt-4">Loading integrations...</p>
        </div>
      </div>
    )
  }

  if (!pipedreamConfigured) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4 gap-2"
        >
          <IconArrowLeft className="size-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <IconAlertCircle className="size-5" />
              Integrations Not Configured
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Pipedream integration is not configured for this instance. Please contact
              your administrator to set up the required environment variables:
            </p>
            <ul className="text-muted-foreground mt-4 list-inside list-disc space-y-1 text-sm">
              <li>PIPEDREAM_CLIENT_ID</li>
              <li>PIPEDREAM_CLIENT_SECRET</li>
              <li>PIPEDREAM_PROJECT_ID</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <IconArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-muted-foreground">
            Connect your apps to unlock AI agent capabilities
          </p>
        </div>
      </div>

      {/* Connected Apps */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IconPlugConnected className="size-5" />
                Connected Apps
              </CardTitle>
              <CardDescription>
                Apps you&apos;ve connected to the AI agent
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchIntegrations}
              className="gap-2"
            >
              <IconRefresh className="size-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="border-border rounded-lg border border-dashed py-8 text-center">
              <IconPlugConnected className="text-muted-foreground/50 mx-auto size-12" />
              <p className="text-muted-foreground mt-4">
                No apps connected yet. Connect an app below to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map(account => {
                const Icon = APP_ICONS[account.appSlug] || IconPlugConnected
                const source = dataSources.find(s => s.app_slug === account.appSlug)
                const isEnabled = source?.enabled ?? true

                return (
                  <div
                    key={account.id}
                    className="border-border flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-muted flex size-12 items-center justify-center rounded-lg">
                        {account.iconUrl ? (
                          <img
                            src={account.iconUrl}
                            alt={account.appName}
                            className="size-8 rounded"
                          />
                        ) : (
                          <Icon className="text-muted-foreground size-6" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{account.appName}</p>
                          <Badge
                            variant={isEnabled ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {isEnabled ? "Active" : "Disabled"}
                          </Badge>
                        </div>
                        {account.name && (
                          <p className="text-muted-foreground text-sm">
                            {account.name}
                          </p>
                        )}
                        {account.createdAt && (
                          <p className="text-muted-foreground text-xs">
                            Connected {new Date(account.createdAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {source && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleEnabled(source.id, !isEnabled)}
                        >
                          {isEnabled ? "Disable" : "Enable"}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisconnect(account.appSlug)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <IconTrash className="size-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Apps */}
      <Card>
        <CardHeader>
          <CardTitle>Available Integrations</CardTitle>
          <CardDescription>
            Connect more apps to expand your AI agent&apos;s capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {AVAILABLE_APPS.map(app => {
              const Icon = APP_ICONS[app.slug] || IconPlugConnected
              const isConnected = connectedSlugs.has(app.slug)

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
                      <p className="font-medium">{app.name}</p>
                      <p className="text-muted-foreground text-sm">
                        {app.description}
                      </p>
                    </div>
                  </div>
                  {isConnected ? (
                    <Badge variant="secondary" className="gap-1">
                      <IconCheck className="size-3" />
                      Connected
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleConnect(app.slug)}
                      disabled={connecting}
                      className="gap-1"
                    >
                      <IconPlus className="size-4" />
                      Connect
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Help */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground text-sm">
            Having trouble connecting an app? Here are some common solutions:
          </p>
          <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
            <li>Make sure popups are allowed for this site</li>
            <li>Complete the authorization in the popup window</li>
            <li>If the popup closes without connecting, try again</li>
            <li>Some apps require admin approval in your organization</li>
          </ul>
          <div className="pt-4">
            <Button variant="outline" size="sm" asChild>
              <a href="mailto:support@rooftopsgpt.com">Contact Support</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
