"use client"

import { FC, useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  IconSearch,
  IconPlug,
  IconPlugConnected,
  IconLoader2,
  IconCheck,
  IconX
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface PipedreamApp {
  slug: string
  name: string
  description: string
  icon_url: string | null
  category: string
  connected: boolean
}

interface Category {
  id: string
  name: string
}

interface AppsBrowserProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const AppsBrowser: FC<AppsBrowserProps> = ({ open, onOpenChange }) => {
  const [apps, setApps] = useState<PipedreamApp[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [connectingApp, setConnectingApp] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    const fetchApps = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        if (selectedCategory !== "all") {
          params.set("category", selectedCategory)
        }
        if (searchQuery) {
          params.set("search", searchQuery)
        }

        const res = await fetch(`/api/pipedream/apps?${params}`)
        const data = await res.json()

        setApps(data.apps || [])
        if (data.categories && categories.length === 0) {
          setCategories(data.categories)
        }
      } catch (error) {
        console.error("Error fetching apps:", error)
        toast.error("Failed to load apps")
      } finally {
        setIsLoading(false)
      }
    }

    fetchApps()
  }, [open, selectedCategory, searchQuery])

  const handleToggleApp = async (app: PipedreamApp) => {
    setConnectingApp(app.slug)
    try {
      const res = await fetch("/api/pipedream/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_slug: app.slug,
          action: app.connected ? "disconnect" : "connect"
        })
      })

      if (!res.ok) {
        throw new Error("Failed to update app connection")
      }

      // Update local state
      setApps(prev =>
        prev.map(a =>
          a.slug === app.slug ? { ...a, connected: !a.connected } : a
        )
      )

      toast.success(
        app.connected ? `Disconnected ${app.name}` : `Connected ${app.name}`
      )
    } catch (error) {
      console.error("Error toggling app:", error)
      toast.error("Failed to update app connection")
    } finally {
      setConnectingApp(null)
    }
  }

  // Listen for open event
  useEffect(() => {
    const handleOpen = () => onOpenChange(true)
    window.addEventListener("open-pipedream-apps", handleOpen)
    return () => window.removeEventListener("open-pipedream-apps", handleOpen)
  }, [onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconPlug className="size-5" />
            Connect Apps
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <IconSearch className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search apps..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Categories */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
              {categories.slice(0, 8).map(cat => (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  className="bg-background data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full border px-3 py-1 text-xs"
                >
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Apps Grid */}
          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <IconLoader2 className="text-muted-foreground size-8 animate-spin" />
              </div>
            ) : apps.length === 0 ? (
              <div className="text-muted-foreground py-12 text-center">
                No apps found
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {apps.map(app => (
                  <div
                    key={app.slug}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                      app.connected
                        ? "border-primary/50 bg-primary/5"
                        : "hover:border-primary/30"
                    )}
                  >
                    <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
                      {app.icon_url ? (
                        <img
                          src={app.icon_url}
                          alt={app.name}
                          className="size-6 rounded"
                        />
                      ) : (
                        <IconPlug className="text-muted-foreground size-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="truncate font-medium">{app.name}</span>
                        {app.connected && (
                          <IconCheck className="text-primary size-4 shrink-0" />
                        )}
                      </div>
                      <p className="text-muted-foreground truncate text-xs">
                        {app.description}
                      </p>
                    </div>

                    <Button
                      variant={app.connected ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleToggleApp(app)}
                      disabled={connectingApp === app.slug}
                      className="shrink-0"
                    >
                      {connectingApp === app.slug ? (
                        <IconLoader2 className="size-4 animate-spin" />
                      ) : app.connected ? (
                        <IconX className="size-4" />
                      ) : (
                        <IconPlugConnected className="size-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <p className="text-muted-foreground text-center text-xs">
            Connected apps can be used by the AI to read and write data on your
            behalf.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
