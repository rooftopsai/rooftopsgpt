"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { IconMessageCircle, IconSparkles, IconX } from "@tabler/icons-react"
import { useChatbotUI } from "@/context/context"
import Link from "next/link"

interface EmptyStateChatProps {
  onPromptClick?: (prompt: string) => void
}

const examplePrompts = [
  {
    title: "Property Analysis",
    prompt: "What are the key factors to look for when inspecting a roof?",
    icon: "🏠"
  },
  {
    title: "Cost Estimation",
    prompt: "How do I estimate the cost of a roof replacement?",
    icon: "💰"
  },
  {
    title: "Material Selection",
    prompt: "What are the pros and cons of different roofing materials?",
    icon: "🔨"
  },
  {
    title: "Solar Assessment",
    prompt: "How do I determine if a roof is suitable for solar panels?",
    icon: "☀️"
  }
]

const BANNER_DISMISSED_KEY = "premium_banner_dismissed"

export function EmptyStateChat({ onPromptClick }: EmptyStateChatProps) {
  const { userSubscription } = useChatbotUI()
  const [bannerDismissed, setBannerDismissed] = useState(true) // default hidden to avoid flash

  const isFreeUser =
    !userSubscription ||
    userSubscription.plan_type === "free" ||
    (!userSubscription.plan_type && !userSubscription.tier)

  useEffect(() => {
    const dismissed = sessionStorage.getItem(BANNER_DISMISSED_KEY)
    setBannerDismissed(dismissed === "true")
  }, [])

  const handleDismissBanner = () => {
    setBannerDismissed(true)
    sessionStorage.setItem(BANNER_DISMISSED_KEY, "true")
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
        <IconMessageCircle className="size-10 text-blue-600 dark:text-blue-400" />
      </div>

      <h2 className="mb-3 text-2xl font-bold">Ask Anything About Roofing</h2>

      <p className="text-muted-foreground mb-8 max-w-md text-lg">
        Get expert answers about property analysis, cost estimates, materials,
        and more. Try one of these examples:
      </p>

      <div className="mb-8 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
        {examplePrompts.map((example, index) => (
          <button
            key={index}
            onClick={() => onPromptClick?.(example.prompt)}
            className="border-border hover:border-primary/50 hover:bg-accent group flex items-start gap-3 rounded-lg border p-4 text-left transition-colors"
          >
            <span className="text-2xl">{example.icon}</span>
            <div className="flex-1">
              <div className="group-hover:text-primary mb-1 font-semibold transition-colors">
                {example.title}
              </div>
              <div className="text-muted-foreground text-sm">
                {example.prompt}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Premium Features Banner for Free Users */}
      {isFreeUser && !bannerDismissed && (
        <div className="relative mb-8 w-full max-w-2xl overflow-hidden rounded-xl border border-cyan-200 bg-gradient-to-r from-cyan-50 via-white to-green-50 p-5">
          <button
            onClick={handleDismissBanner}
            className="absolute right-3 top-3 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Dismiss"
          >
            <IconX size={16} />
          </button>

          <div className="mb-3 text-base font-bold text-gray-900">
            Unlock Premium AI Features
          </div>

          <div className="mb-4 flex flex-wrap justify-center gap-2">
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">
              GPT-5 Powered
            </span>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              Web Search
            </span>
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
              20 Reports/mo
            </span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              AI Agents
            </span>
          </div>

          <Link href="/pricing">
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-600 transition-colors hover:text-cyan-700">
              Start 3-Day Free Trial
              <svg
                className="size-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </span>
          </Link>
        </div>
      )}

      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <IconSparkles className="size-4" />
        <span>Powered by advanced AI technology</span>
      </div>
    </div>
  )
}
