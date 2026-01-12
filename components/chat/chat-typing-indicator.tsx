"use client"

import { FC } from "react"
import { cn } from "@/lib/utils"

interface ChatTypingIndicatorProps {
  className?: string
}

export const ChatTypingIndicator: FC<ChatTypingIndicatorProps> = ({
  className
}) => {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      {/* Avatar placeholder for assistant */}
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5 text-white"
        >
          <path d="M12 8V4H8" />
          <rect width="16" height="12" x="4" y="8" rx="2" />
          <path d="M2 14h2" />
          <path d="M20 14h2" />
          <path d="M15 13v2" />
          <path d="M9 13v2" />
        </svg>
      </div>

      {/* Typing indicator */}
      <div className="bg-secondary mt-1 flex items-center gap-1 rounded-2xl px-4 py-3">
        <div className="flex space-x-1">
          <div
            className="bg-foreground/40 size-2 animate-bounce rounded-full"
            style={{
              animationDelay: "0ms",
              animationDuration: "1.4s"
            }}
          />
          <div
            className="bg-foreground/40 size-2 animate-bounce rounded-full"
            style={{
              animationDelay: "200ms",
              animationDuration: "1.4s"
            }}
          />
          <div
            className="bg-foreground/40 size-2 animate-bounce rounded-full"
            style={{
              animationDelay: "400ms",
              animationDuration: "1.4s"
            }}
          />
        </div>
      </div>
    </div>
  )
}
