"use client"

import { useState, useRef, KeyboardEvent, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  IconSend,
  IconLoader2,
  IconBolt,
  IconChevronUp,
  IconChevronDown
} from "@tabler/icons-react"
import { useAgent } from "@/context/agent-context"
import { AgentQuickActions } from "./agent-quick-actions"
import { cn } from "@/lib/utils"

interface AgentChatInputProps {
  disabled?: boolean
}

export function AgentChatInput({ disabled }: AgentChatInputProps) {
  const [input, setInput] = useState("")
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [cursorAtEnd, setCursorAtEnd] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { sendMessage, isGenerating, currentSession, hasAccess, messages } = useAgent()

  // Show quick actions when chat is empty and no messages yet
  const shouldShowQuickActionsHint = messages.length === 0 && !input

  // Get conversation context for smart suggestions (last 3 messages)
  const conversationContext = messages
    .slice(-3)
    .map(m => m.content)
    .join(" ")

  const handleSend = async () => {
    if (!input.trim() || isGenerating || disabled) return

    const message = input.trim()
    setInput("")
    setShowQuickActions(false)
    await sendMessage(message)

    // Focus back on input
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    // Toggle quick actions with Ctrl+Space or Cmd+Space
    if (e.key === " " && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      setShowQuickActions(!showQuickActions)
    }
  }

  const handleQuickAction = (prompt: string, needsInput: boolean) => {
    setInput(prompt)
    setShowQuickActions(false)
    textareaRef.current?.focus()

    // If the prompt needs additional input, place cursor at end
    if (needsInput) {
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = prompt.length
          textareaRef.current.selectionEnd = prompt.length
        }
      }, 0)
    }
  }

  const isDisabled = disabled || isGenerating || !hasAccess

  return (
    <div className="border-t border-blue-500/15 bg-gradient-to-r from-blue-500/5 to-purple-500/5 backdrop-blur-md">
      {/* Quick Actions Panel */}
      <AgentQuickActions
        onSelectAction={handleQuickAction}
        visible={showQuickActions}
        conversationContext={conversationContext}
      />

      {/* Main Input Area */}
      <div className="p-4">
        <div className="mx-auto max-w-4xl">
          <div className="relative flex items-end gap-3">
            {/* Quick Actions Toggle */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowQuickActions(!showQuickActions)}
              className={cn(
                "h-[56px] w-12 shrink-0",
                showQuickActions && "border-blue-500/30 bg-blue-500/10"
              )}
              title="Quick Actions (Ctrl+Space)"
            >
              <IconBolt className="size-5" />
            </Button>

            <div className="relative flex-1">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  !hasAccess
                    ? "Upgrade to Premium to use the AI Agent..."
                    : isGenerating
                      ? "Waiting for response..."
                      : shouldShowQuickActionsHint
                        ? "Tell your agent what you need, or click the lightning bolt for quick actions..."
                        : "Tell your agent what you need help with..."
                }
                disabled={isDisabled}
                className="min-h-[56px] max-h-[200px] resize-none pr-4"
                rows={1}
              />
            </div>

            <Button
              onClick={handleSend}
              disabled={isDisabled || !input.trim()}
              size="icon"
              className="h-[56px] w-[56px] shrink-0"
            >
              {isGenerating ? (
                <IconLoader2 className="size-5 animate-spin" />
              ) : (
                <IconSend className="size-5" />
              )}
            </Button>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs font-light text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>Enter to send • Shift+Enter for new line</span>
              <span className="text-blue-500/30">•</span>
              <button
                onClick={() => setShowQuickActions(!showQuickActions)}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {showQuickActions ? (
                  <span className="flex items-center gap-1">
                    <IconChevronDown className="size-3" />
                    Hide quick actions
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <IconChevronUp className="size-3" />
                    Quick actions
                  </span>
                )}
              </button>
            </div>
            {currentSession && (
              <span className="text-muted-foreground/60">{currentSession.name}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
