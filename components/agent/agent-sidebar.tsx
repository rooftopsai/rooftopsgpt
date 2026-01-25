"use client"

import { useState } from "react"
import { useAgent } from "@/context/agent-context"
import { AgentSessionList } from "./agent-session-list"
import { AgentTaskList } from "./agent-task-list"
import { AgentActivityFeed } from "./agent-activity-feed"
import { AgentUsageStats } from "./agent-usage-stats"
import { cn } from "@/lib/utils"
import {
  IconMessageCircle,
  IconChecklist,
  IconActivity,
  IconChartBar
} from "@tabler/icons-react"

type SidebarTab = "sessions" | "tasks" | "activity" | "usage"

export function AgentSidebar() {
  const [activeTab, setActiveTab] = useState<SidebarTab>("sessions")
  const { hasAccess } = useAgent()

  if (!hasAccess) {
    return null
  }

  return (
    <div className="flex h-full w-72 flex-col border-r border-blue-500/15 bg-gradient-to-b from-blue-500/5 to-purple-500/5 backdrop-blur-md">
      {/* Tab navigation */}
      <div className="flex border-b border-blue-500/15">
        <TabButton
          active={activeTab === "sessions"}
          onClick={() => setActiveTab("sessions")}
          icon={<IconMessageCircle className="size-4" />}
          label="Sessions"
        />
        <TabButton
          active={activeTab === "tasks"}
          onClick={() => setActiveTab("tasks")}
          icon={<IconChecklist className="size-4" />}
          label="Tasks"
        />
        <TabButton
          active={activeTab === "activity"}
          onClick={() => setActiveTab("activity")}
          icon={<IconActivity className="size-4" />}
          label="Activity"
        />
        <TabButton
          active={activeTab === "usage"}
          onClick={() => setActiveTab("usage")}
          icon={<IconChartBar className="size-4" />}
          label="Usage"
        />
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "sessions" && <AgentSessionList />}
        {activeTab === "tasks" && <AgentTaskList />}
        {activeTab === "activity" && <AgentActivityFeed />}
        {activeTab === "usage" && <AgentUsageStats />}
      </div>
    </div>
  )
}

interface TabButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-light transition-all",
        active
          ? "border-b-2 border-blue-500 text-blue-400"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
