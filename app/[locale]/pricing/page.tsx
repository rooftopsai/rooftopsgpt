"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(
    "annual"
  )

  // Get user subscription to show current plan
  const { userSubscription } = useChatbotUI()
  const currentTier =
    userSubscription?.tier || userSubscription?.plan_type || "free"

  // Track if cancellation toast has been shown (prevents double toast in StrictMode)
  const cancelToastShown = useRef(false)

  // Show cancellation message if user canceled checkout
  useEffect(() => {
    if (canceled && !cancelToastShown.current) {
      cancelToastShown.current = true
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

  const getPriceId = (plan: "premium" | "business") => {
    if (billingPeriod === "annual") {
      return plan === "premium"
        ? STRIPE_PRICE_IDS.premium_annual
        : STRIPE_PRICE_IDS.business_annual
    }
    return plan === "premium"
      ? STRIPE_PRICE_IDS.premium_monthly
      : STRIPE_PRICE_IDS.business_monthly
  }

  const getPlanType = (plan: "premium" | "business") => {
    return billingPeriod === "annual" ? `${plan}_annual` : `${plan}_monthly`
  }

  return (
    <div className="relative min-h-screen bg-white">
      {/* Close Button */}
      <button
        onClick={() => router.push("/")}
        className="absolute right-4 top-4 z-10 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 sm:right-6 sm:top-6"
        aria-label="Close"
      >
        <X className="size-8" strokeWidth={2} />
      </button>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-green-500/10 px-4 py-2">
            <span className="text-sm font-semibold text-cyan-700">
              🎉 Start with a 3-day free trial
            </span>
          </div>
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-gray-900">
            Choose Your Plan
          </h1>
          <p className="text-lg text-gray-600">
            Try any paid plan free for 3 days. Cancel anytime.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="mb-10 flex justify-center">
          <div className="flex gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`rounded-md px-6 py-3 text-sm font-semibold transition-all ${
                billingPeriod === "monthly"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className={`relative rounded-md px-6 py-3 text-sm font-semibold transition-all ${
                billingPeriod === "annual"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Annual
              <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                Save up to 15%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {/* Free Plan */}
          <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h3 className="mb-2 text-2xl font-bold text-gray-900">Free</h3>
              <p className="text-4xl font-bold text-gray-900">
                $0
                <span className="text-base font-normal text-gray-500">
                  /month
                </span>
              </p>
            </div>

            <div className="mb-8 grow space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <Check className="size-3 text-green-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-700">1 property report</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <Check className="size-3 text-green-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-700">
                  5 chat messages per day
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <X className="size-3 text-gray-400" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-400">No web searches</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <X className="size-3 text-gray-400" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-400">
                  Advanced AI models
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <X className="size-3 text-gray-400" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-400">Agent Library</span>
              </div>
            </div>

            <button
              className="w-full rounded-lg border-2 border-gray-300 bg-white px-6 py-4 text-base font-semibold text-gray-900 transition-all hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={currentTier === "free"}
            >
              {currentTier === "free" ? "Current Plan" : "Downgrade"}
            </button>
          </div>

          {/* Premium Plan */}
          <div
            className={`relative flex flex-col rounded-xl border bg-white p-8 shadow-sm ${
              suggestedPlan === "premium"
                ? "border-2 border-cyan-500 ring-2 ring-cyan-500/20"
                : "border-gray-200"
            }`}
          >
            {suggestedPlan === "premium" && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-cyan-500 px-3 py-1 text-xs font-bold text-white">
                  RECOMMENDED
                </span>
              </div>
            )}

            <div className="mb-6">
              <h3 className="mb-2 text-2xl font-bold text-gray-900">Premium</h3>
              <p className="text-4xl font-bold text-gray-900">
                {billingPeriod === "annual" ? "$25" : "$29"}
                <span className="text-base font-normal text-gray-500">
                  /month
                </span>
              </p>
              <p className="mt-1 text-sm font-medium text-cyan-600">
                3 days free, then {billingPeriod === "annual" ? "$25" : "$29"}
                /mo
              </p>
              {billingPeriod === "annual" && (
                <p className="mt-1 text-sm text-gray-500">
                  Billed annually ($300/year)
                </p>
              )}
            </div>

            <div className="mb-8 grow space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <Check className="size-3 text-green-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-700">
                  20 property reports per month
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <Check className="size-3 text-green-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-700">
                  1,000 chat messages per month
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <Check className="size-3 text-green-600" strokeWidth={3} />
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  Premium Agent Library
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <Check className="size-3 text-green-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-700">
                  Advanced AI models
                </span>
              </div>
            </div>

            <button
              onClick={() =>
                handleSubscribe(getPlanType("premium"), getPriceId("premium"))
              }
              disabled={loadingPlan !== null || currentTier === "premium"}
              className={`w-full rounded-lg px-6 py-4 text-base font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                billingPeriod === "annual"
                  ? "bg-gradient-to-r from-cyan-500 to-green-500 text-white hover:from-cyan-600 hover:to-green-600"
                  : "border-2 border-gray-300 bg-white text-gray-900 hover:border-gray-400 hover:bg-gray-50"
              }`}
            >
              {currentTier === "premium"
                ? "Current Plan"
                : loadingPlan?.includes("premium")
                  ? "Redirecting..."
                  : "Start Free Trial"}
            </button>
            {billingPeriod === "annual" && (
              <p className="mt-2 text-center text-xs font-medium text-green-600">
                Save $48/year
              </p>
            )}
          </div>

          {/* Business Plan */}
          <div
            className={`relative flex flex-col rounded-xl border-2 bg-white p-8 shadow-sm ${
              suggestedPlan === "business"
                ? "border-green-500 ring-2 ring-green-500/20"
                : "border-green-500"
            }`}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white">
                MOST POPULAR
              </span>
            </div>

            <div className="mb-6">
              <h3 className="mb-2 text-2xl font-bold text-gray-900">
                Business
              </h3>
              <p className="text-4xl font-bold text-gray-900">
                {billingPeriod === "annual" ? "$84" : "$99"}
                <span className="text-base font-normal text-gray-500">
                  /month
                </span>
              </p>
              <p className="mt-1 text-sm font-medium text-cyan-600">
                3 days free, then {billingPeriod === "annual" ? "$84" : "$99"}
                /mo
              </p>
              {billingPeriod === "annual" && (
                <p className="mt-1 text-sm text-gray-500">
                  Billed annually ($1,008/year)
                </p>
              )}
            </div>

            <div className="mb-8 grow space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <Check className="size-3 text-green-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-700">
                  100 property reports per month
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <Check className="size-3 text-green-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-700">
                  5,000 chat messages per month
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <Check className="size-3 text-green-600" strokeWidth={3} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-900">
                    Exclusive Business Agents
                  </span>
                  <span className="text-xs text-gray-500">
                    all premium agents included
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <Check className="size-3 text-green-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-700">
                  Advanced AI models
                </span>
              </div>
            </div>

            <button
              onClick={() =>
                handleSubscribe(getPlanType("business"), getPriceId("business"))
              }
              disabled={loadingPlan !== null || currentTier === "business"}
              className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-green-500 px-6 py-4 text-base font-semibold text-white transition-all hover:from-cyan-600 hover:to-green-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {currentTier === "business"
                ? "Current Plan"
                : loadingPlan?.includes("business")
                  ? "Redirecting..."
                  : "Start Free Trial"}
            </button>
            {billingPeriod === "annual" && (
              <p className="mt-2 text-center text-xs font-medium text-green-600">
                Save $180/year
              </p>
            )}
          </div>
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 space-y-8">
          <div className="text-center">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">
              Frequently Asked Questions
            </h2>
            <div className="mx-auto max-w-3xl space-y-4 text-left">
              <details className="group rounded-lg border border-gray-200 p-4">
                <summary className="cursor-pointer font-semibold text-gray-900">
                  Can I change plans anytime?
                </summary>
                <p className="mt-2 text-gray-600">
                  Yes! You can upgrade or downgrade your plan at any time.
                  Upgrades take effect immediately with prorated billing.
                  Downgrades take effect at the end of your current billing
                  period.
                </p>
              </details>
              <details className="group rounded-lg border border-gray-200 p-4">
                <summary className="cursor-pointer font-semibold text-gray-900">
                  What happens when I reach my limits?
                </summary>
                <p className="mt-2 text-gray-600">
                  When you reach your monthly limits, you&apos;ll see a prompt
                  to upgrade. You can continue using the platform with your
                  available features or upgrade to increase your limits.
                </p>
              </details>
              <details className="group rounded-lg border border-gray-200 p-4">
                <summary className="cursor-pointer font-semibold text-gray-900">
                  Do unused limits roll over?
                </summary>
                <p className="mt-2 text-gray-600">
                  No, limits reset on the 1st of each month. We recommend
                  choosing a plan that fits your typical monthly usage.
                </p>
              </details>
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-600">Cancel anytime. No hidden fees.</p>
            <p className="mt-2 text-gray-600">
              Need a custom enterprise plan?{" "}
              <a
                href="mailto:team@rooftops.ai"
                className="font-medium text-cyan-600 hover:underline"
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
        <div className="flex min-h-screen items-center justify-center bg-white">
          <div className="text-center">
            <div className="mx-auto mb-4 size-12 animate-spin rounded-full border-b-2 border-cyan-500"></div>
            <p className="text-gray-600">Loading pricing plans...</p>
          </div>
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  )
}
