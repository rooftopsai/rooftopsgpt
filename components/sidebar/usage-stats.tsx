"use client"

import { FC, useEffect, useState } from "react"
import {
  IconSparkles,
  IconMessageCircle,
  IconCloudStorm,
  IconFileText,
  IconArrowUp
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface UsageData {
  chat_messages: { used: number; limit: number | string }
  property_reports: { used: number; limit: number | string }
  weather_lookups: { used: number; limit: number | string }
  document_creation: { used: number; limit: number | string }
}

interface UsageStatsProps {
  className?: string
}

export const UsageStats: FC<UsageStatsProps> = ({ className }) => {
  const router = useRouter()
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsage()
  }, [])

  const fetchUsage = async () => {
    try {
      const response = await fetch("/api/usage")
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

  const getProgressPercentage = (used: number, limit: number | string) => {
    if (limit === "unlimited") return 0
    return Math.min((used / (limit as number)) * 100, 100)
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500"
    if (percentage >= 75) return "bg-amber-500"
    return "bg-emerald-500"
  }

  const formatLimit = (limit: number | string) => {
    return limit === "unlimited" ? "" : limit
  }

  if (loading || !usage) {
    return (
      <div className={cn("border-t p-3", className)}>
        <div className="text-muted-foreground text-xs">Loading usage...</div>
      </div>
    )
  }

  const features = [
    {
      icon: IconMessageCircle,
      label: "Chat Messages",
      key: "chat_messages" as keyof UsageData
    },
    {
      icon: IconSparkles,
      label: "Property Reports",
      key: "property_reports" as keyof UsageData
    }
  ]

  return (
    <div className={cn("border-t p-3", className)}>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide opacity-70">
          Usage This Month
        </div>
      </div>

      <div className="space-y-3">
        {features.map(({ icon: Icon, label, key }) => {
          const data = usage[key]
          const percentage = getProgressPercentage(data.used, data.limit)
          const isNearLimit = percentage >= 75
          const isAtLimit =
            data.limit !== "unlimited" && data.used >= (data.limit as number)

          return (
            <div key={key} className="space-y-1.5">
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
                  {data.used}/{formatLimit(data.limit)}
                </span>
              </div>
              {data.limit !== "unlimited" && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className={cn(
                      "h-full transition-all duration-300",
                      getProgressColor(percentage)
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              )}
              {isAtLimit && (
                <div className="text-xs text-red-500">Limit reached</div>
              )}
            </div>
          )
        })}
      </div>

      <Button
        onClick={() => router.push("/pricing")}
        className="mt-4 w-full"
        size="sm"
        variant="default"
      >
        <IconArrowUp size={16} className="mr-1.5" />
        Upgrade Plan
      </Button>
    </div>
  )
}
