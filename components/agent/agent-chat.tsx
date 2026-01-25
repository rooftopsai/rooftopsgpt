"use client"

import { useEffect } from "react"
import { useAgent } from "@/context/agent-context"
import { AgentChatMessages } from "./agent-chat-messages"
import { AgentChatInput } from "./agent-chat-input"
import { AgentSidebar } from "./agent-sidebar"
import { AgentUpgradePrompt } from "./agent-upgrade-prompt"
import { AgentChatHeader } from "./agent-chat-header"
import { IconLoader2 } from "@tabler/icons-react"

export function AgentChat() {
  const { hasAccess, isCheckingAccess, checkAccess } = useAgent()

  // Debug: Log access state
  useEffect(() => {
    console.log("[AgentChat] Access state:", { hasAccess, isCheckingAccess })
  }, [hasAccess, isCheckingAccess])

  if (isCheckingAccess) {
    return (
      <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-500/5 to-purple-500/5 backdrop-blur-md">
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-4 backdrop-blur-md">
            <IconLoader2 className="size-8 animate-spin text-blue-500" />
          </div>
          <span className="text-sm font-light text-foreground/70">Loading AI Agent...</span>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return <AgentUpgradePrompt />
  }

  return (
    <div className="flex h-full bg-gradient-to-br from-blue-500/5 to-purple-500/5">
      {/* Sidebar */}
      <AgentSidebar />

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        <AgentChatHeader />
        <AgentChatMessages />
        <AgentChatInput />
      </div>
    </div>
  )
}
