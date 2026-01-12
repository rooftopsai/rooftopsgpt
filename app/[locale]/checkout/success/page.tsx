"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Check, Loader2 } from "lucide-react"

function CheckoutSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")

  const [tierDetails, setTierDetails] = useState<{
    tier: "premium" | "business"
    features: string[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSessionDetails = async () => {
      if (!sessionId) {
        // If no session ID, redirect to homepage
        router.push("/")
        return
      }

      try {
        // In a real implementation, you'd fetch from your API
        // For now, we'll derive from the URL or use a placeholder
        // The webhook should have already created the subscription

        // Wait a moment for webhook to process
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Get plan from URL or default to premium
        const plan = searchParams.get("plan") || "premium"

        setTierDetails({
          tier: plan as "premium" | "business",
          features:
            plan === "business"
              ? [
                  "100 property reports per month",
                  "5,000 GPT-4.5-mini messages + unlimited GPT-4o",
                  "250 web searches per month",
                  "Full agent library access",
                  "Priority support"
                ]
              : [
                  "20 property reports per month",
                  "1,000 GPT-4.5-mini messages + unlimited GPT-4o",
                  "50 web searches per month",
                  "Full agent library access"
                ]
        })
      } catch (error) {
        console.error("Error fetching session details:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSessionDetails()
  }, [sessionId, router, searchParams])

  if (loading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="text-primary mx-auto mb-4 size-12 animate-spin" />
          <p className="text-muted-foreground">
            Setting up your subscription...
          </p>
        </div>
      </div>
    )
  }

  if (!tierDetails) {
    return null
  }

  const tierName =
    tierDetails.tier.charAt(0).toUpperCase() + tierDetails.tier.slice(1)

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        {/* Success Icon */}
        <div className="mb-6 inline-flex size-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <Check className="size-12 text-green-600 dark:text-green-400" />
        </div>

        {/* Welcome Message */}
        <h1 className="mb-4 text-4xl font-bold">
          Welcome to Rooftops AI {tierName}!
        </h1>
        <p className="text-muted-foreground mb-12 text-xl">
          Your subscription is now active. Here&apos;s what you can do:
        </p>

        {/* Features List */}
        <div className="bg-card mb-12 rounded-lg border p-8 text-left">
          <h2 className="mb-6 text-center text-2xl font-bold">
            Your {tierName} Features
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {tierDetails.features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <Check className="mt-0.5 size-5 shrink-0 text-green-500" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button
            size="lg"
            onClick={() => router.push("/explore")}
            className="px-8"
          >
            Start Analyzing Properties
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => router.push("/chat")}
            className="px-8"
          >
            Try AI Chat
          </Button>
        </div>

        {/* Additional Info */}
        <div className="text-muted-foreground mt-12 space-y-2 text-sm">
          <p>
            You can manage your subscription anytime from your account settings.
          </p>
          <p>
            Need help getting started?{" "}
            <a
              href="mailto:support@rooftopsgpt.com"
              className="text-primary hover:underline"
            >
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background flex min-h-screen items-center justify-center">
          <Loader2 className="text-primary size-12 animate-spin" />
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  )
}
