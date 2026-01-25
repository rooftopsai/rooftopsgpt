"use client"

import { useState, useMemo } from "react"
import { useAgent } from "@/context/agent-context"
import { cn } from "@/lib/utils"
import {
  IconPlus,
  IconMessageCircle,
  IconTrash,
  IconLoader2,
  IconDotsVertical,
  IconSearch,
  IconClock,
  IconCoins,
  IconEdit,
  IconX,
  IconCheck
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { formatDistanceToNow, format } from "date-fns"

export function AgentSessionList() {
  const {
    sessions,
    currentSession,
    isLoadingSessions,
    createSession,
    selectSession,
    deleteSession
  } = useAgent()

  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"recent" | "tokens" | "name">("recent")

  const handleNewSession = async () => {
    await createSession("New Session")
  }

  // Filter and sort sessions
  const filteredSessions = useMemo(() => {
    let filtered = sessions

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        s =>
          s.name.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "tokens":
          return b.total_tokens_used - a.total_tokens_used
        case "name":
          return a.name.localeCompare(b.name)
        case "recent":
        default:
          return (
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          )
      }
    })
  }, [sessions, searchQuery, sortBy])

  // Group sessions by date
  const groupedSessions = useMemo(() => {
    const groups: { label: string; sessions: typeof sessions }[] = []
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    const todaySessions = filteredSessions.filter(s => {
      const date = new Date(s.updated_at)
      return date.toDateString() === today.toDateString()
    })

    const yesterdaySessions = filteredSessions.filter(s => {
      const date = new Date(s.updated_at)
      return date.toDateString() === yesterday.toDateString()
    })

    const thisWeekSessions = filteredSessions.filter(s => {
      const date = new Date(s.updated_at)
      return (
        date > weekAgo &&
        date.toDateString() !== today.toDateString() &&
        date.toDateString() !== yesterday.toDateString()
      )
    })

    const olderSessions = filteredSessions.filter(s => {
      const date = new Date(s.updated_at)
      return date <= weekAgo
    })

    if (todaySessions.length > 0) {
      groups.push({ label: "Today", sessions: todaySessions })
    }
    if (yesterdaySessions.length > 0) {
      groups.push({ label: "Yesterday", sessions: yesterdaySessions })
    }
    if (thisWeekSessions.length > 0) {
      groups.push({ label: "This Week", sessions: thisWeekSessions })
    }
    if (olderSessions.length > 0) {
      groups.push({ label: "Older", sessions: olderSessions })
    }

    return groups
  }, [filteredSessions])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-blue-500/15 p-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Sessions</h3>
          <Button
            onClick={handleNewSession}
            size="sm"
            className="h-8 gap-1"
          >
            <IconPlus className="size-4" />
            New
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <IconSearch className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <IconX className="size-4" />
            </button>
          )}
        </div>

        {/* Sort options */}
        <div className="mt-2 flex gap-1">
          <SortButton
            active={sortBy === "recent"}
            onClick={() => setSortBy("recent")}
            icon={<IconClock className="size-3" />}
            label="Recent"
          />
          <SortButton
            active={sortBy === "tokens"}
            onClick={() => setSortBy("tokens")}
            icon={<IconCoins className="size-3" />}
            label="Tokens"
          />
          <SortButton
            active={sortBy === "name"}
            onClick={() => setSortBy("name")}
            icon={<IconEdit className="size-3" />}
            label="Name"
          />
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingSessions ? (
          <div className="flex items-center justify-center py-8">
            <IconLoader2 className="size-6 animate-spin text-blue-500" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="py-8 text-center text-sm font-light text-muted-foreground">
            {searchQuery
              ? "No sessions match your search"
              : "No sessions yet. Start a new one!"}
          </div>
        ) : (
          <div className="p-2">
            {groupedSessions.map(group => (
              <div key={group.label} className="mb-4">
                <div className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </div>
                <div className="space-y-1">
                  {group.sessions.map(session => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      isActive={currentSession?.id === session.id}
                      onClick={() => selectSession(session.id)}
                      onDelete={() => deleteSession(session.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats footer */}
      {sessions.length > 0 && (
        <div className="border-t border-blue-500/15 px-4 py-2 text-xs font-light text-muted-foreground">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""} •{" "}
          {sessions.reduce((sum, s) => sum + s.total_tokens_used, 0).toLocaleString()} total tokens
        </div>
      )}
    </div>
  )
}

interface SortButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}

function SortButton({ active, onClick, icon, label }: SortButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-light transition-all",
        active
          ? "border border-blue-500/30 bg-gradient-to-br from-blue-500/15 to-purple-500/15 text-blue-400"
          : "text-muted-foreground hover:bg-blue-500/10 hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  )
}

interface SessionItemProps {
  session: {
    id: string
    name: string
    description?: string | null
    status: string
    total_tokens_used: number
    total_tasks_completed: number
    updated_at: string
    created_at: string
  }
  isActive: boolean
  onClick: () => void
  onDelete: () => void
}

function SessionItem({
  session,
  isActive,
  onClick,
  onDelete
}: SessionItemProps) {
  const statusColors = {
    active: "bg-green-500",
    paused: "bg-yellow-500",
    completed: "bg-blue-500",
    failed: "bg-red-500"
  }

  const statusColor = statusColors[session.status as keyof typeof statusColors] || "bg-muted-foreground"

  return (
    <div
      className={cn(
        "group flex cursor-pointer items-center gap-2 rounded-xl p-2.5 transition-all",
        isActive
          ? "border border-blue-500/30 bg-gradient-to-br from-blue-500/15 to-purple-500/15 shadow-lg shadow-blue-500/5"
          : "border border-transparent hover:border-blue-500/15 hover:bg-blue-500/5"
      )}
      onClick={onClick}
    >
      <div className="relative">
        <div className={cn(
          "flex size-8 items-center justify-center rounded-lg",
          isActive
            ? "bg-gradient-to-br from-blue-500/20 to-purple-500/20"
            : "bg-blue-500/10"
        )}>
          <IconMessageCircle
            className={cn(
              "size-4",
              isActive ? "text-blue-400" : "text-muted-foreground"
            )}
          />
        </div>
        <div
          className={cn(
            "absolute -bottom-0.5 -right-0.5 size-2 rounded-full border-2 border-background shadow-sm",
            statusColor
          )}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "truncate text-sm font-medium",
            isActive ? "text-foreground" : "text-foreground/80"
          )}
        >
          {session.name}
        </div>
        <div className="flex items-center gap-2 text-xs font-light text-muted-foreground">
          <span title={format(new Date(session.updated_at), "PPpp")}>
            {formatDistanceToNow(new Date(session.updated_at), {
              addSuffix: true
            })}
          </span>
          {session.total_tokens_used > 0 && (
            <>
              <span className="text-blue-500/30">•</span>
              <span className="flex items-center gap-0.5">
                <IconCoins className="size-3" />
                {session.total_tokens_used.toLocaleString()}
              </span>
            </>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="rounded-lg p-1 opacity-0 transition-all hover:bg-blue-500/10 group-hover:opacity-100"
            onClick={e => e.stopPropagation()}
          >
            <IconDotsVertical className="size-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={e => {
              e.stopPropagation()
              // Could implement rename here
            }}
          >
            <IconEdit className="mr-2 size-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-400 focus:text-red-400"
            onClick={e => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <IconTrash className="mr-2 size-4" />
            Delete Session
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
