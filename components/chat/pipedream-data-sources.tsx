"use client"

import { useChatbotUI } from "@/context/context"
import {
  IconPlug,
  IconPlugConnected,
  IconChevronDown,
  IconLoader,
  IconSearch,
  IconX
} from "@tabler/icons-react"
import { FC, useEffect, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "../ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "../ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "../ui/dialog"
import { Switch } from "../ui/switch"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { toast } from "sonner"
import {
  createFrontendClient,
  type ConnectResult
} from "@pipedream/sdk/browser"

interface DataSource {
  id: string
  app_slug: string
  app_name: string
  app_icon_url: string | null
  enabled: boolean
}

interface PipedreamApp {
  id: string
  name_slug: string
  name: string
  description?: string
  img_src?: string
}

interface ConnectedAccount {
  id: string
  name?: string
  appSlug: string
  appName: string
  iconUrl?: string
}

interface PipedreamDataSourcesProps {
  className?: string
  chatId?: string
}

export const PipedreamDataSources: FC<PipedreamDataSourcesProps> = ({
  className,
  chatId
}) => {
  const { profile, setPipedreamDataSources, setPipedreamConnected } =
    useChatbotUI()
  const [mounted, setMounted] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [connectedAccounts, setConnectedAccounts] = useState<
    ConnectedAccount[]
  >([])
  const [isLoading, setIsLoading] = useState(true)

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])
  const [isOpen, setIsOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState<string | null>(null)

  // App browser state
  const [browseOpen, setBrowseOpen] = useState(false)
  const [apps, setApps] = useState<PipedreamApp[]>([])
  const [search, setSearch] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)

  // File browser state (disabled - requires Pipedream paid plan)
  // Users interact with connected apps through chat instead

  // Check connection status, sync accounts, and fetch data sources
  useEffect(() => {
    const fetchAndSync = async () => {
      if (!profile) return

      setIsLoading(true)
      try {
        // First, sync accounts from Pipedream (this also updates our database)
        const accountsRes = await fetch("/api/pipedream/accounts")
        const accountsData = await accountsRes.json()

        if (accountsData.accounts && accountsData.accounts.length > 0) {
          setIsConnected(true)
          setPipedreamConnected?.(true)
          setConnectedAccounts(accountsData.accounts)

          // Now fetch the data sources from our database
          const sourcesRes = await fetch(
            `/api/pipedream/data-sources${chatId ? `?chat_id=${chatId}` : ""}`
          )
          const sourcesData = await sourcesRes.json()
          const sources = sourcesData.dataSources || []
          setDataSources(sources)
          setPipedreamDataSources?.(sources)
        } else {
          // Check if we have any existing data sources even if no accounts synced
          const sourcesRes = await fetch(
            `/api/pipedream/data-sources${chatId ? `?chat_id=${chatId}` : ""}`
          )
          const sourcesData = await sourcesRes.json()
          if (sourcesData.dataSources && sourcesData.dataSources.length > 0) {
            setIsConnected(true)
            setPipedreamConnected?.(true)
            setDataSources(sourcesData.dataSources)
            setPipedreamDataSources?.(sourcesData.dataSources)
          } else {
            setIsConnected(false)
            setPipedreamConnected?.(false)
            setPipedreamDataSources?.([])
          }
        }
      } catch (error) {
        console.error("Error fetching Pipedream status:", error)
        setIsConnected(false)
        setPipedreamConnected?.(false)
        setPipedreamDataSources?.([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchAndSync()
  }, [profile, chatId, setPipedreamConnected, setPipedreamDataSources])

  // Search apps when dialog opens or search changes
  useEffect(() => {
    if (!browseOpen) return

    const searchApps = async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(
          `/api/pipedream/apps${search ? `?search=${encodeURIComponent(search)}` : ""}`
        )
        if (res.ok) {
          const data = await res.json()
          setApps(data.apps || [])
        }
      } catch (error) {
        console.error("Error searching apps:", error)
      } finally {
        setSearchLoading(false)
      }
    }

    const timer = setTimeout(searchApps, 300)
    return () => clearTimeout(timer)
  }, [browseOpen, search])

  const handleToggle = async (sourceId: string, enabled: boolean) => {
    try {
      const res = await fetch("/api/pipedream/data-sources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sourceId, enabled })
      })

      if (!res.ok) {
        throw new Error("Failed to update data source")
      }

      const updatedSources = dataSources.map(ds =>
        ds.id === sourceId ? { ...ds, enabled } : ds
      )
      setDataSources(updatedSources)
      setPipedreamDataSources?.(updatedSources)

      toast.success(`${enabled ? "Enabled" : "Disabled"} data source`)
    } catch (error) {
      console.error("Error toggling data source:", error)
      toast.error("Failed to update data source")
    }
  }

  // Token callback for Pipedream SDK - fetches tokens from our server
  const tokenCallback = useCallback(async () => {
    const res = await fetch("/api/pipedream/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appSlug: "refresh" })
    })

    if (!res.ok) {
      throw new Error("Failed to get connect token")
    }

    const data = await res.json()
    return {
      token: data.token,
      expiresAt: new Date(data.expiresAt),
      connectLinkUrl: data.connectLinkUrl
    }
  }, [])

  const handleConnectApp = useCallback(
    async (app: PipedreamApp) => {
      if (!profile) {
        toast.error("Please sign in first")
        return
      }

      setIsConnecting(app.name_slug)

      try {
        // Get a connect token from our backend
        const res = await fetch("/api/pipedream/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appSlug: app.name_slug })
        })

        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || "Failed to get connect token")
        }

        const { token, externalUserId } = await res.json()

        // Use Pipedream's frontend SDK for the OAuth flow
        const pd = createFrontendClient({
          externalUserId,
          tokenCallback,
          token
        })

        // Close the browse dialog before opening Pipedream modal
        setBrowseOpen(false)

        // This opens Pipedream's modal for connecting the specific app
        pd.connectAccount({
          app: app.name_slug,
          onSuccess: async (result: ConnectResult) => {
            console.log("Pipedream connection successful:", result)
            toast.success(`${app.name} connected successfully!`)

            // Sync accounts and refresh data sources
            try {
              const accountsRes = await fetch("/api/pipedream/accounts")
              const accountsData = await accountsRes.json()
              setConnectedAccounts(accountsData.accounts || [])

              const sourcesRes = await fetch(
                `/api/pipedream/data-sources${chatId ? `?chat_id=${chatId}` : ""}`
              )
              const sourcesData = await sourcesRes.json()
              const sources = sourcesData.dataSources || []
              setDataSources(sources)
              setPipedreamDataSources?.(sources)
              setIsConnected(true)
              setPipedreamConnected?.(true)
            } catch (error) {
              console.error("Error syncing accounts:", error)
            }

            setIsConnecting(null)
          },
          onError: error => {
            console.error("Pipedream connection error:", error)
            toast.error(`Failed to connect ${app.name}`)
            setIsConnecting(null)
          }
        })
      } catch (error: any) {
        console.error("Error connecting to Pipedream:", error)
        toast.error(error.message || "Failed to connect")
        setIsConnecting(null)
      }
    },
    [
      profile,
      tokenCallback,
      chatId,
      setPipedreamDataSources,
      setPipedreamConnected
    ]
  )

  const openAppBrowser = () => {
    setSearch("")
    setBrowseOpen(true)
  }

  const enabledCount = dataSources.filter(ds => ds.enabled).length

  // Prevent hydration mismatch - don't render until mounted on client
  if (!mounted) return null

  if (!profile) return null

  // Loading state
  if (isLoading) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className={cn("flex items-center gap-1 px-2", className)}
      >
        <IconLoader size={20} className="text-muted-foreground animate-spin" />
      </Button>
    )
  }

  // Not connected state
  if (!isConnected) {
    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={openAppBrowser}
                className={cn("flex items-center gap-1 px-2", className)}
              >
                <IconPlug size={20} className="text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Connect apps (Gmail, Slack, etc.)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <AppBrowserDialog
          open={browseOpen}
          onOpenChange={setBrowseOpen}
          apps={apps}
          search={search}
          onSearchChange={setSearch}
          searchLoading={searchLoading}
          connectingApp={isConnecting}
          onConnectApp={handleConnectApp}
        />
      </>
    )
  }

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("flex items-center gap-1 px-2", className)}
                >
                  <IconPlugConnected
                    size={20}
                    className={cn(
                      "transition-colors",
                      enabledCount > 0
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  />
                  {enabledCount > 0 && (
                    <span className="bg-primary text-primary-foreground ml-1 rounded-full px-1.5 text-xs font-medium">
                      {enabledCount}
                    </span>
                  )}
                  <IconChevronDown
                    size={14}
                    className="text-muted-foreground"
                  />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Connected apps ({enabledCount} active)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Connected Apps</span>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => {
                setIsOpen(false)
                openAppBrowser()
              }}
            >
              + Add App
            </Button>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {connectedAccounts.length === 0 ? (
            <div className="text-muted-foreground p-3 text-center text-sm">
              No apps connected yet.
              <br />
              <Button
                variant="link"
                size="sm"
                className="mt-1 h-auto p-0"
                onClick={() => {
                  setIsOpen(false)
                  openAppBrowser()
                }}
              >
                Connect an app
              </Button>
            </div>
          ) : (
            <>
              <div className="text-muted-foreground px-2 py-1.5 text-xs">
                Chat with your connected apps - just ask!
              </div>
              {connectedAccounts.map(account => (
                <DropdownMenuItem
                  key={account.id}
                  className="flex cursor-default items-center gap-2"
                  onSelect={e => e.preventDefault()}
                >
                  {account.iconUrl ? (
                    <img
                      src={account.iconUrl}
                      alt={account.appName}
                      className="size-5 rounded"
                    />
                  ) : (
                    <IconPlug size={20} className="text-muted-foreground" />
                  )}
                  <div className="flex-1">
                    <span className="text-sm font-medium">
                      {account.appName}
                    </span>
                    {account.name && (
                      <span className="text-muted-foreground ml-1 text-xs">
                        ({account.name})
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-green-600">Connected</span>
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AppBrowserDialog
        open={browseOpen}
        onOpenChange={setBrowseOpen}
        apps={apps}
        search={search}
        onSearchChange={setSearch}
        searchLoading={searchLoading}
        connectingApp={isConnecting}
        onConnectApp={handleConnectApp}
      />
    </>
  )
}

// App Browser Dialog Component
interface AppBrowserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  apps: PipedreamApp[]
  search: string
  onSearchChange: (search: string) => void
  searchLoading: boolean
  connectingApp: string | null
  onConnectApp: (app: PipedreamApp) => void
}

function AppBrowserDialog({
  open,
  onOpenChange,
  apps,
  search,
  onSearchChange,
  searchLoading,
  connectingApp,
  onConnectApp
}: AppBrowserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Connect an App</DialogTitle>
          <DialogDescription>
            Connect your apps to use them in chat. Search from 2,500+ available
            integrations.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mt-2">
          <IconSearch
            size={16}
            className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2"
          />
          <Input
            placeholder="Search apps..."
            className="px-9"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
              onClick={() => onSearchChange("")}
            >
              <IconX size={16} />
            </button>
          )}
        </div>

        <div className="mt-4 flex-1 overflow-y-auto pr-2">
          {searchLoading ? (
            <div className="flex items-center justify-center py-12">
              <IconLoader
                size={24}
                className="text-muted-foreground animate-spin"
              />
            </div>
          ) : apps.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center">
              <p>No apps found. Try a different search term.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {apps.map(app => (
                <button
                  key={app.id || app.name_slug}
                  onClick={() => onConnectApp(app)}
                  disabled={connectingApp === app.name_slug}
                  className="hover:bg-muted flex items-center gap-3 rounded-lg border p-3 text-left transition-colors disabled:opacity-50"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded bg-white p-1">
                    {app.img_src ? (
                      <img
                        src={app.img_src}
                        alt={app.name}
                        className="size-8 rounded object-contain"
                      />
                    ) : (
                      <div className="bg-muted flex size-8 items-center justify-center rounded text-sm font-medium">
                        {app.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{app.name}</span>
                      {connectingApp === app.name_slug && (
                        <IconLoader size={14} className="animate-spin" />
                      )}
                    </div>
                    {app.description && (
                      <p className="text-muted-foreground line-clamp-1 text-sm">
                        {app.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
