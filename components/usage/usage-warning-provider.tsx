"use client"

import { useEffect, useState } from "react"
import { useUsageWarnings } from "@/lib/hooks/use-usage-warnings"

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

export function UsageWarningProvider() {
  const [usage, setUsage] = useState<UsageStats | null>(null)

  useEffect(() => {
    // Fetch usage stats on mount
    fetchUsage()

    // Refresh every 30 seconds
    const interval = setInterval(fetchUsage, 30000)

    return () => clearInterval(interval)
  }, [])

  const fetchUsage = async () => {
    try {
      const response = await fetch("/api/usage/stats")
      if (response.ok) {
        const data = await response.json()
        setUsage(data)
      }
    } catch (error) {
      console.error("Error fetching usage for warnings:", error)
    }
  }

  // Use the hook to show warnings
  useUsageWarnings(usage)

  // This component doesn't render anything
  return null
}
