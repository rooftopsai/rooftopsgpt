"use client"

import { FC, useEffect, useState } from "react"
import {
  IconSparkles,
  IconMessageCircle,
  IconSearch,
  IconArrowUp
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

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

interface UsageStatsProps {
  className?: string
}

export const UsageStats: FC<UsageStatsProps> = ({ className }) => {
  const router = useRouter()
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsage()
  }, [])

  const fetchUsage = async () => {
    try {
      const response = await fetch("/api/usage/stats")
      if (response.ok) {
        const data = await response.json()
        setUsage(data)
      }
    } catch (error) {
      console.error("Error fetching usage:", error)
    } finally {
      setLoading(false)
    }
  }

  const getProgressPercentage = (used: number, limit: number) => {
    if (limit === 0) return 0
    return Math.min((used / limit) * 100, 100)
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500"
    if (percentage >= 75) return "bg-amber-500"
    return "bg-emerald-500"
  }

  if (loading || !usage) {
    return (
      <div className={cn("border-t p-3", className)}>
        <div className="text-muted-foreground text-xs">Loading usage...</div>
      </div>
    )
  }

  // Determine which chat limit to show (daily for free, monthly for premium/business)
  const chatUsed =
    usage.tier === "free"
      ? usage.usage.chatMessages.usedDaily
      : usage.usage.chatMessages.usedPremium
  const chatLimit =
    usage.tier === "free"
      ? usage.usage.chatMessages.limitDaily
      : usage.usage.chatMessages.limitMonthly

  const features = [
    {
      icon: IconSparkles,
      label: "Reports",
      used: usage.usage.reports.used,
      limit: usage.usage.reports.limit,
      show: usage.usage.reports.limit > 0
    },
    {
      icon: IconMessageCircle,
      label: usage.tier === "free" ? "Chat (Daily)" : "Chat Messages",
      used: chatUsed,
      limit: chatLimit,
      show: chatLimit > 0
    },
    {
      icon: IconSearch,
      label: "Web Searches",
      used: usage.usage.webSearches.used,
      limit: usage.usage.webSearches.limit,
      show: usage.usage.webSearches.limit > 0
    }
  ]

  // Only show features that have limits
  const visibleFeatures = features.filter(f => f.show)

  return (
    <div className={cn("border-t p-3", className)}>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide opacity-70">
          {usage.tier === "free" ? "Usage" : "Usage This Month"}
        </div>
      </div>

      <div className="space-y-3">
        {visibleFeatures.map(({ icon: Icon, label, used, limit }) => {
          const percentage = getProgressPercentage(used, limit)
          const isNearLimit = percentage >= 75
          const isAtLimit = used >= limit

          return (
            <div key={label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Icon size={14} className="opacity-70" />
                  <span className="font-medium">{label}</span>
                </div>
                <span
                  className={cn(
                    "font-semibold",
                    isAtLimit && "text-red-500",
                    isNearLimit && !isAtLimit && "text-amber-500"
                  )}
                >
                  {used}/{limit}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    getProgressColor(percentage)
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              {isAtLimit && (
                <div className="text-sm font-medium text-red-500">
                  Limit reached
                </div>
              )}
            </div>
          )
        })}
      </div>

      {usage.tier === "free" && (
        <Button
          onClick={() => router.push("/pricing")}
          className="mt-4 w-full"
          size="sm"
          variant="default"
        >
          <IconArrowUp size={16} className="mr-1.5" />
          Upgrade Plan
        </Button>
      )}
    </div>
  )
}
