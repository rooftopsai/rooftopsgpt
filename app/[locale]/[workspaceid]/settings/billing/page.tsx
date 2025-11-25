"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

interface UsageData {
  chat_messages: { used: number; limit: number | string }
  property_reports: { used: number; limit: number | string }
  weather_lookups: { used: number; limit: number | string }
  document_creation: { used: number; limit: number | string }
}

export default function BillingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [usage, setUsage] = useState<UsageData | null>(null)

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
      const usageResponse = await fetch("/api/usage")
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
        method: "POST",
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

  const getUsagePercentage = (used: number, limit: number | string): number => {
    if (limit === "unlimited") return 0
    return Math.min((used / (limit as number)) * 100, 100)
  }

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case "free":
        return "secondary"
      case "pro":
        return "default"
      case "team":
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
          <p className="text-muted-foreground mt-4">Loading billing information...</p>
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
            <Badge variant={getPlanBadgeColor(subscription?.planType || "free")}>
              {subscription?.planType?.toUpperCase() || "FREE"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Status</p>
              <p className="font-medium capitalize">{subscription?.status || "Active"}</p>
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

          <div className="flex gap-3">
            {subscription?.planType !== "free" && (
              <Button onClick={handleManageSubscription} variant="outline">
                Manage Subscription
              </Button>
            )}
            <Button onClick={() => router.push("/pricing")}>
              {subscription?.planType === "free" ? "Upgrade Plan" : "View Plans"}
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
          <CardDescription>Monitor your feature usage and limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {usage && Object.entries(usage).map(([feature, data]) => {
            const percentage = getUsagePercentage(data.used, data.limit)
            const isNearLimit = percentage > 80 && data.limit !== "unlimited"

            return (
              <div key={feature} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">
                      {feature.replace(/_/g, " ")}
                    </span>
                    {isNearLimit && (
                      <AlertCircle className="size-4 text-yellow-500" />
                    )}
                  </div>
                  <span className="text-muted-foreground text-sm">
                    {data.used} / {data.limit === "unlimited" ? "∞" : data.limit}
                  </span>
                </div>
                {data.limit !== "unlimited" && (
                  <Progress
                    value={percentage}
                    className={isNearLimit ? "bg-yellow-100" : ""}
                  />
                )}
                {isNearLimit && (
                  <p className="text-xs text-yellow-600">
                    You&apos;re approaching your monthly limit. Consider upgrading your plan.
                  </p>
                )}
              </div>
            )
          })}
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
            <Button variant="outline" size="sm" onClick={() => router.push("/pricing")}>
              View All Plans
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
