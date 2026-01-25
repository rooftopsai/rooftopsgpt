"use client"

import { useState, useRef, KeyboardEvent } from "react"
import { IconSend, IconLoader2 } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface AgentInputProps {
  onSubmit: (goal: string) => void
  isDisabled?: boolean
  connectedApps?: string[]
  placeholder?: string
}

export function AgentInput({
  onSubmit,
  isDisabled = false,
  connectedApps = [],
  placeholder = "What would you like to do?"
}: AgentInputProps) {
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed || isDisabled) return

    onSubmit(trimmed)
    setValue("")
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    if (inputRef.current) {
      inputRef.current.style.height = "auto"
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={inputRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isDisabled}
        rows={1}
        className={cn(
          "w-full resize-none rounded-lg border border-input bg-background px-4 py-3 pr-12 font-light text-foreground",
          "placeholder:text-muted-foreground",
          "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      />

      <button
        onClick={handleSubmit}
        disabled={!value.trim() || isDisabled}
        className={cn(
          "absolute bottom-2 right-2 rounded-lg p-2 transition-colors",
          value.trim() && !isDisabled
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-muted text-muted-foreground"
        )}
      >
        {isDisabled ? (
          <IconLoader2 className="size-5 animate-spin" />
        ) : (
          <IconSend className="size-5" />
        )}
      </button>
    </div>
  )
}
