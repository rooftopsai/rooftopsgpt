"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { CreditCard, Calendar, TrendingUp, AlertCircle } from "lucide-react"

interface SubscriptionData {
  planType: string
  status: string
  currentPeriodEnd?: string
  stripeCustomerId?: string
}

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
    agents: {
      enabled: boolean
    }
  }
}

export default function BillingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null
  )
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  useEffect(() => {
    // Check for success/cancel query params
    const success = searchParams.get("success")
    const canceled = searchParams.get("canceled")

    if (success) {
      toast.success("Subscription activated successfully!")
    } else if (canceled) {
      toast.error("Subscription canceled. Please try again.")
    }

    // Fetch subscription and usage data
    fetchBillingData()
  }, [searchParams])

  const fetchBillingData = async () => {
    try {
      // Fetch subscription data
      const subResponse = await fetch("/api/subscription")
      const subData = await subResponse.json()
      setSubscription(subData)

      // Fetch usage data
      const usageResponse = await fetch("/api/usage/stats")
      const usageData = await usageResponse.json()
      setUsage(usageData)
    } catch (error) {
      console.error("Error fetching billing data:", error)
      toast.error("Failed to load billing information")
    } finally {
      setLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST"
      })

      const data = await response.json()

      if (response.ok && data.url) {
        window.location.href = data.url
      } else {
        toast.error("Failed to open billing portal")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("An error occurred. Please try again.")
    }
  }

  const getUsagePercentage = (used: number, limit: number): number => {
    if (limit === 0) return 0
    return Math.min((used / limit) * 100, 100)
  }

  const handleCancelSubscription = async () => {
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST"
      })

      const data = await response.json()

      if (response.ok && data.url) {
        // Stripe portal handles cancellation
        window.location.href = data.url
      } else {
        toast.error("Failed to open billing portal")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("An error occurred. Please try again.")
    }
  }

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case "free":
        return "secondary"
      case "premium":
        return "default"
      case "business":
        return "destructive"
      default:
        return "secondary"
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto size-12 animate-spin rounded-full border-b-2"></div>
          <p className="text-muted-foreground mt-4">
            Loading billing information...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="mb-2 text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription and view your usage statistics
        </p>
      </div>

      {/* Subscription Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-5" />
                Current Plan
              </CardTitle>
              <CardDescription>Your active subscription plan</CardDescription>
            </div>
            <Badge
              variant={getPlanBadgeColor(subscription?.planType || "free")}
            >
              {subscription?.planType?.toUpperCase() || "FREE"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Status</p>
              <p className="font-medium capitalize">
                {subscription?.status || "Active"}
              </p>
            </div>
            {subscription?.currentPeriodEnd && (
              <div className="space-y-1 text-right">
                <p className="text-muted-foreground flex items-center gap-1 text-sm">
                  <Calendar className="size-4" />
                  Next billing date
                </p>
                <p className="font-medium">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {subscription?.planType !== "free" && (
              <>
                <Button onClick={handleManageSubscription} variant="outline">
                  Update Payment Method
                </Button>
                <Button onClick={handleManageSubscription} variant="outline">
                  View Billing History
                </Button>
                <Button
                  onClick={handleCancelSubscription}
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                >
                  Cancel Subscription
                </Button>
              </>
            )}
            <Button onClick={() => router.push("/pricing")}>
              {subscription?.planType === "free"
                ? "Upgrade Plan"
                : "Change Plan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-5" />
            Usage This Month
          </CardTitle>
          <CardDescription>
            Monitor your feature usage and limits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {usage && (
            <>
              {/* Property Reports */}
              {usage.usage.reports.limit > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Property Reports</span>
                      {getUsagePercentage(
                        usage.usage.reports.used,
                        usage.usage.reports.limit
                      ) > 80 && (
                        <AlertCircle className="size-4 text-yellow-500" />
                      )}
                    </div>
                    <span className="text-muted-foreground text-sm">
                      {usage.usage.reports.used} / {usage.usage.reports.limit}
                    </span>
                  </div>
                  <Progress
                    value={getUsagePercentage(
                      usage.usage.reports.used,
                      usage.usage.reports.limit
                    )}
                  />
                  {getUsagePercentage(
                    usage.usage.reports.used,
                    usage.usage.reports.limit
                  ) > 80 && (
                    <p className="text-xs text-yellow-600">
                      You&apos;re approaching your monthly limit. Consider
                      upgrading your plan.
                    </p>
                  )}
                </div>
              )}

              {/* Chat Messages */}
              {(usage.tier === "free"
                ? usage.usage.chatMessages.limitDaily
                : usage.usage.chatMessages.limitMonthly) > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {usage.tier === "free"
                          ? "Chat Messages (Daily)"
                          : "Premium Chat Messages"}
                      </span>
                      {getUsagePercentage(
                        usage.tier === "free"
                          ? usage.usage.chatMessages.usedDaily
                          : usage.usage.chatMessages.usedPremium,
                        usage.tier === "free"
                          ? usage.usage.chatMessages.limitDaily
                          : usage.usage.chatMessages.limitMonthly
                      ) > 80 && (
                        <AlertCircle className="size-4 text-yellow-500" />
                      )}
                    </div>
                    <span className="text-muted-foreground text-sm">
                      {usage.tier === "free"
                        ? usage.usage.chatMessages.usedDaily
                        : usage.usage.chatMessages.usedPremium}{" "}
                      /{" "}
                      {usage.tier === "free"
                        ? usage.usage.chatMessages.limitDaily
                        : usage.usage.chatMessages.limitMonthly}
                    </span>
                  </div>
                  <Progress
                    value={getUsagePercentage(
                      usage.tier === "free"
                        ? usage.usage.chatMessages.usedDaily
                        : usage.usage.chatMessages.usedPremium,
                      usage.tier === "free"
                        ? usage.usage.chatMessages.limitDaily
                        : usage.usage.chatMessages.limitMonthly
                    )}
                  />
                </div>
              )}

              {/* Web Searches */}
              {usage.usage.webSearches.limit > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Web Searches</span>
                      {getUsagePercentage(
                        usage.usage.webSearches.used,
                        usage.usage.webSearches.limit
                      ) > 80 && (
                        <AlertCircle className="size-4 text-yellow-500" />
                      )}
                    </div>
                    <span className="text-muted-foreground text-sm">
                      {usage.usage.webSearches.used} /{" "}
                      {usage.usage.webSearches.limit}
                    </span>
                  </div>
                  <Progress
                    value={getUsagePercentage(
                      usage.usage.webSearches.used,
                      usage.usage.webSearches.limit
                    )}
                  />
                </div>
              )}

              {/* Agent Access */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Agent Library Access</span>
                  <Badge
                    variant={
                      usage.usage.agents.enabled ? "default" : "secondary"
                    }
                  >
                    {usage.usage.agents.enabled ? "Enabled" : "Locked"}
                  </Badge>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground text-sm">
            Have questions about billing or your subscription?
          </p>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" asChild>
              <a href="mailto:support@rooftopsgpt.com">Contact Support</a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/pricing")}
            >
              View All Plans
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
