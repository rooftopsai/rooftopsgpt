import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface UsageStats {
  tier: string
  usage: {
    reports: {
      used: number
      limit: number
      remaining: number
    }
    chatMessages: {
      usedPremium: number
      usedFree: number
      usedDaily: number
      limitDaily: number
      limitMonthly: number
      remainingDaily: number
      remainingMonthly: number
    }
    webSearches: {
      used: number
      limit: number
      remaining: number
    }
  }
}

const STORAGE_KEY = "usage_warnings_shown"
const SESSION_START = Date.now()

export function useUsageWarnings(usage: UsageStats | null) {
  const router = useRouter()
  const warningsShown = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!usage) return

    // Load shown warnings from sessionStorage
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        warningsShown.current = new Set(parsed)
      } catch (e) {
        // Ignore parse errors
      }
    }

    checkUsageLimits(usage)
  }, [usage])

  const showWarning = (key: string, message: string) => {
    if (warningsShown.current.has(key)) return

    warningsShown.current.add(key)
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Array.from(warningsShown.current))
    )

    toast.warning(message, {
      duration: 8000,
      action: {
        label: "Upgrade",
        onClick: () => router.push("/pricing")
      }
    })
  }

  const checkUsageLimits = (stats: UsageStats) => {
    // Check report usage (80% threshold)
    if (stats.usage.reports.limit > 0) {
      const reportPercentage =
        (stats.usage.reports.used / stats.usage.reports.limit) * 100

      if (reportPercentage >= 80 && reportPercentage < 100) {
        showWarning(
          "reports_80",
          `You've used ${stats.usage.reports.used}/${stats.usage.reports.limit} reports. Upgrade for more!`
        )
      } else if (reportPercentage >= 100) {
        showWarning(
          "reports_100",
          `You've reached your report limit (${stats.usage.reports.limit}/${stats.usage.reports.limit}). Upgrade for more!`
        )
      }
    }

    // Check chat message usage (90% threshold for premium/business, 80% for free)
    const chatUsed =
      stats.tier === "free"
        ? stats.usage.chatMessages.usedDaily
        : stats.usage.chatMessages.usedPremium
    const chatLimit =
      stats.tier === "free"
        ? stats.usage.chatMessages.limitDaily
        : stats.usage.chatMessages.limitMonthly

    if (chatLimit > 0) {
      const chatPercentage = (chatUsed / chatLimit) * 100
      const threshold = stats.tier === "free" ? 80 : 90

      if (chatPercentage >= threshold && chatPercentage < 100) {
        const period = stats.tier === "free" ? "today" : "this month"
        showWarning(
          `chat_${threshold}`,
          `You've used ${chatUsed}/${chatLimit} ${stats.tier === "free" ? "messages" : "premium messages"} ${period}. ${stats.tier === "free" ? "Upgrade for unlimited chat!" : "Consider upgrading!"}`
        )
      } else if (chatPercentage >= 100) {
        const period = stats.tier === "free" ? "today" : "this month"
        showWarning(
          "chat_100",
          `You've reached your ${stats.tier === "free" ? "daily" : "monthly"} chat limit. ${stats.tier === "free" ? "Upgrade for unlimited messages!" : "Upgrade for higher limits!"}`
        )
      }
    }

    // Check web search usage (80% threshold)
    if (stats.usage.webSearches.limit > 0) {
      const searchPercentage =
        (stats.usage.webSearches.used / stats.usage.webSearches.limit) * 100

      if (searchPercentage >= 80 && searchPercentage < 100) {
        showWarning(
          "searches_80",
          `You've used ${stats.usage.webSearches.used}/${stats.usage.webSearches.limit} web searches. Upgrade for more!`
        )
      } else if (searchPercentage >= 100) {
        showWarning(
          "searches_100",
          `You've reached your web search limit (${stats.usage.webSearches.limit}/${stats.usage.webSearches.limit}). Upgrade for more!`
        )
      }
    }
  }
}
