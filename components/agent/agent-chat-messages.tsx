"use client"

import { useRef, useEffect } from "react"
import { useAgent } from "@/context/agent-context"
import { AgentMessage } from "./agent-message"
import {
  IconSparkles,
  IconLoader2,
  IconSearch,
  IconFileText,
  IconCloud,
  IconMail,
  IconHome
} from "@tabler/icons-react"

export function AgentChatMessages() {
  const {
    messages,
    isLoadingMessages,
    isGenerating,
    confirmToolCall,
    cancelToolCall
  } = useAgent()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (isLoadingMessages) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-3 backdrop-blur-md">
            <IconLoader2 className="size-6 animate-spin text-blue-500" />
          </div>
          <span className="text-sm font-light text-muted-foreground">Loading messages...</span>
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="flex size-20 items-center justify-center rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/15 to-blue-500/15 shadow-lg shadow-purple-500/10 backdrop-blur-md">
          <IconSparkles className="size-10 text-purple-400" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            Rooftops AI Agent
          </h2>
          <p className="mt-2 max-w-md font-light text-muted-foreground">
            Your intelligent assistant for roofing business tasks. I can help with
            research, reports, customer management, scheduling, and more.
          </p>
        </div>
        <div className="mt-4 grid max-w-2xl gap-3 sm:grid-cols-2">
          <SuggestionCard
            icon={IconSearch}
            title="Research Materials"
            description="Look up current prices for roofing materials"
          />
          <SuggestionCard
            icon={IconHome}
            title="Property Report"
            description="Generate a roof analysis for any address"
          />
          <SuggestionCard
            icon={IconCloud}
            title="Check Weather"
            description="Get the weather forecast for job scheduling"
          />
          <SuggestionCard
            icon={IconMail}
            title="Draft Email"
            description="Compose a professional email to a customer"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl py-4">
        {messages.map(message => (
          <AgentMessage
            key={message.id}
            message={message}
            onConfirmTool={confirmToolCall}
            onCancelTool={cancelToolCall}
          />
        ))}

        {/* Generating indicator */}
        {isGenerating && (
          <div className="mx-4 my-4 flex gap-4 rounded-xl border border-blue-500/15 bg-gradient-to-br from-blue-500/5 to-purple-500/5 px-4 py-4 backdrop-blur-md">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/15 to-blue-500/15">
              <IconSparkles className="size-5 text-purple-400" />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="size-2 animate-bounce rounded-full bg-blue-500 shadow-sm shadow-blue-500/50 [animation-delay:-0.3s]" />
                <span className="size-2 animate-bounce rounded-full bg-blue-500 shadow-sm shadow-blue-500/50 [animation-delay:-0.15s]" />
                <span className="size-2 animate-bounce rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
              </div>
              <span className="font-light text-muted-foreground">Processing your request...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}

interface SuggestionCardProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}

function SuggestionCard({ icon: Icon, title, description }: SuggestionCardProps) {
  const { sendMessage } = useAgent()

  return (
    <button
      onClick={() => sendMessage(description)}
      className="group flex items-start gap-3 rounded-xl border border-blue-500/15 bg-gradient-to-br from-blue-500/5 to-purple-500/5 p-4 text-left backdrop-blur-md transition-all hover:border-blue-500/25 hover:from-blue-500/10 hover:to-purple-500/10 hover:shadow-md hover:shadow-blue-500/5"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 transition-all group-hover:border-blue-500/30 group-hover:from-blue-500/15 group-hover:to-purple-500/15">
        <Icon className="size-5 text-blue-400" />
      </div>
      <div className="flex-1">
        <span className="font-medium text-foreground">{title}</span>
        <p className="mt-0.5 text-sm font-light text-muted-foreground">{description}</p>
      </div>
    </button>
  )
}
