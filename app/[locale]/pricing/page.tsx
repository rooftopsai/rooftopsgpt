"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"
import { toast } from "sonner"
import { STRIPE_PRICE_IDS } from "@/lib/stripe-config"
import { useChatbotUI } from "@/context/context"

function PricingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const suggestedPlan = searchParams.get("plan")
  const canceled = searchParams.get("canceled") === "true"

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  // Get user subscription to show current plan
  const { userSubscription } = useChatbotUI()
  const currentTier =
    userSubscription?.tier || userSubscription?.plan_type || "free"

  // Show cancellation message if user canceled checkout
  useEffect(() => {
    if (canceled) {
      toast.info("Checkout canceled. You can subscribe anytime!")
      // Clean up URL
      router.replace(window.location.pathname)
    }
  }, [canceled, router])

  const handleSubscribe = async (plan: string, priceId: string) => {
    setLoadingPlan(plan)

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          priceId,
          planType: plan
        })
      })

      const data = await response.json()

      if (response.ok && data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || "Failed to create checkout session")
        setLoadingPlan(null)
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("An error occurred. Please try again.")
      setLoadingPlan(null)
    }
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground text-xl">
            Select the perfect plan for your roofing business
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {/* Free Plan */}
          <div className="flex flex-col rounded-lg border p-8">
            <div className="mb-4">
              <h3 className="mb-2 text-2xl font-bold">Free</h3>
              <p className="text-4xl font-bold">
                $0
                <span className="text-muted-foreground text-base font-normal">
                  /month
                </span>
              </p>
            </div>

            <ul className="mb-8 grow space-y-3">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-5 text-green-500" />
                <span>1 property report</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-5 text-green-500" />
                <span>5 chat messages per day (GPT-4o)</span>
              </li>
              <li className="flex items-start gap-2">
                <X className="mt-0.5 size-5 text-gray-400" />
                <span className="text-muted-foreground">No web searches</span>
              </li>
              <li className="flex items-start gap-2">
                <X className="mt-0.5 size-5 text-gray-400" />
                <span className="text-muted-foreground">
                  View agents only (locked)
                </span>
              </li>
            </ul>

            <Button
              variant="outline"
              className="w-full"
              disabled={currentTier === "free"}
            >
              {currentTier === "free" ? "Current Plan" : "Downgrade"}
            </Button>
          </div>

          {/* Premium Plan */}
          <div
            className={`relative flex flex-col rounded-lg border p-8 ${suggestedPlan === "premium" ? "border-primary ring-primary/20 border-2 ring-2" : ""}`}
          >
            {suggestedPlan === "premium" && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs font-semibold">
                  RECOMMENDED
                </span>
              </div>
            )}

            <div className="mb-4">
              <h3 className="mb-2 text-2xl font-bold">Premium</h3>
              <p className="text-4xl font-bold">
                $29
                <span className="text-muted-foreground text-base font-normal">
                  /month
                </span>
              </p>
            </div>

            <ul className="mb-8 grow space-y-3">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-5 text-green-500" />
                <span>20 property reports per month</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-5 text-green-500" />
                <span className="font-semibold">
                  1,000 GPT-4.5-mini messages per month
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-5 text-green-500" />
                <span>+ Unlimited GPT-4o messages</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-5 text-green-500" />
                <span>50 web searches per month</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-5 text-green-500" />
                <span>Full agent library access</span>
              </li>
            </ul>

            <Button
              className="w-full"
              onClick={() =>
                handleSubscribe("premium", STRIPE_PRICE_IDS.premium)
              }
              disabled={loadingPlan !== null || currentTier === "premium"}
            >
              {currentTier === "premium"
                ? "Current Plan"
                : loadingPlan === "premium"
                  ? "Loading..."
                  : "Upgrade to Premium"}
            </Button>
          </div>

          {/* Business Plan */}
          <div
            className={`relative flex flex-col rounded-lg border p-8 ${suggestedPlan === "business" ? "border-primary ring-primary/20 border-2 ring-2" : "border-primary border-2"}`}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs font-semibold">
                MOST POPULAR
              </span>
            </div>

            <div className="mb-4">
              <h3 className="mb-2 text-2xl font-bold">Business</h3>
              <p className="text-4xl font-bold">
                $99
                <span className="text-muted-foreground text-base font-normal">
                  /month
                </span>
              </p>
            </div>

            <ul className="mb-8 grow space-y-3">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-5 text-green-500" />
                <span>100 property reports per month</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-5 text-green-500" />
                <span className="font-semibold">
                  5,000 GPT-4.5-mini messages per month
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-5 text-green-500" />
                <span>+ Unlimited GPT-4o messages</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-5 text-green-500" />
                <span>250 web searches per month</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-5 text-green-500" />
                <span>Full agent library access</span>
              </li>
            </ul>

            <Button
              className="w-full"
              onClick={() =>
                handleSubscribe("business", STRIPE_PRICE_IDS.business)
              }
              disabled={loadingPlan !== null || currentTier === "business"}
            >
              {currentTier === "business"
                ? "Current Plan"
                : loadingPlan === "business"
                  ? "Loading..."
                  : "Upgrade to Business"}
            </Button>
          </div>
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 space-y-8">
          <div className="text-center">
            <h2 className="mb-6 text-2xl font-bold">
              Frequently Asked Questions
            </h2>
            <div className="mx-auto max-w-3xl space-y-4 text-left">
              <details className="group rounded-lg border p-4">
                <summary className="cursor-pointer font-semibold">
                  Can I change plans anytime?
                </summary>
                <p className="text-muted-foreground mt-2">
                  Yes! You can upgrade or downgrade your plan at any time.
                  Upgrades take effect immediately with prorated billing.
                  Downgrades take effect at the end of your current billing
                  period.
                </p>
              </details>
              <details className="group rounded-lg border p-4">
                <summary className="cursor-pointer font-semibold">
                  What happens when I reach my limits?
                </summary>
                <p className="text-muted-foreground mt-2">
                  When you reach your monthly limits, you&apos;ll see a prompt
                  to upgrade. For chat messages, Premium and Business users
                  automatically switch to GPT-4o (unlimited) when premium
                  messages are used.
                </p>
              </details>
              <details className="group rounded-lg border p-4">
                <summary className="cursor-pointer font-semibold">
                  Do unused limits roll over?
                </summary>
                <p className="text-muted-foreground mt-2">
                  No, limits reset on the 1st of each month. We recommend
                  choosing a plan that fits your typical monthly usage.
                </p>
              </details>
            </div>
          </div>

          <div className="text-center">
            <p className="text-muted-foreground">
              Cancel anytime. No hidden fees.
            </p>
            <p className="text-muted-foreground mt-2">
              Need a custom enterprise plan?{" "}
              <a
                href="mailto:support@rooftopsgpt.com"
                className="text-primary hover:underline"
              >
                Contact us
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="border-primary mx-auto mb-4 size-12 animate-spin rounded-full border-b-2"></div>
            <p className="text-muted-foreground">Loading pricing plans...</p>
          </div>
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  )
}
