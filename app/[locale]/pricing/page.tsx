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

  const getPriceId = (plan: "premium" | "business" | "ai_employee") => {
    if (billingPeriod === "annual") {
      if (plan === "premium") return STRIPE_PRICE_IDS.premium_annual
      if (plan === "business") return STRIPE_PRICE_IDS.business_annual
      return STRIPE_PRICE_IDS.ai_employee_annual
    }
    if (plan === "premium") return STRIPE_PRICE_IDS.premium_monthly
    if (plan === "business") return STRIPE_PRICE_IDS.business_monthly
    return STRIPE_PRICE_IDS.ai_employee_monthly
  }

  const getPlanType = (plan: "premium" | "business" | "ai_employee") => {
    return billingPeriod === "annual" ? `${plan}_annual` : `${plan}_monthly`
  }

  const handleDowngradeToFree = async () => {
    setLoadingPlan("free")
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      })

      const data = await response.json()

      if (response.ok && data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || "Failed to open subscription portal")
        setLoadingPlan(null)
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("An error occurred. Please try again.")
      setLoadingPlan(null)
    }
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
            Invest in Winning More Jobs
          </h1>
          <p className="text-lg text-gray-600">
            Most roofers make back their subscription cost in the first week.
          </p>
        </div>

        {/* ROI Calculator Banner */}
        <div className="mx-auto mb-10 max-w-3xl rounded-xl bg-gradient-to-r from-cyan-50 via-green-50 to-purple-50 p-6 text-center">
          <p className="mb-2 text-sm font-medium text-gray-600">
            Average ROI for AI Employee Pro users:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
            <div>
              <div className="text-3xl font-bold text-cyan-600">20+ hrs</div>
              <div className="text-xs text-gray-500">saved per week</div>
            </div>
            <div className="hidden h-10 w-px bg-gray-200 sm:block"></div>
            <div>
              <div className="text-3xl font-bold text-green-600">+45%</div>
              <div className="text-xs text-gray-500">more jobs closed</div>
            </div>
            <div className="hidden h-10 w-px bg-gray-200 sm:block"></div>
            <div>
              <div className="text-3xl font-bold text-purple-600">24/7</div>
              <div className="text-xs text-gray-500">call answering</div>
            </div>
            <div className="hidden h-10 w-px bg-gray-200 sm:block"></div>
            <div>
              <div className="text-3xl font-bold text-cyan-600">60 sec</div>
              <div className="text-xs text-gray-500">lead response</div>
            </div>
          </div>
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
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Free Plan */}
          <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h3 className="mb-1 text-2xl font-bold text-gray-900">Starter</h3>
              <p className="mb-2 text-sm text-gray-500">Try before you buy</p>
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
                <span className="text-sm text-gray-700">
                  1 roof report to test
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <Check className="size-3 text-green-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-700">
                  5 AI chat messages/day
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <X className="size-3 text-gray-400" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-400">No cost estimates</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <X className="size-3 text-gray-400" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-400">
                  No proposal generation
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <X className="size-3 text-gray-400" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-400">Basic AI only</span>
              </div>
            </div>

            <button
              onClick={
                currentTier !== "free" ? handleDowngradeToFree : undefined
              }
              className="w-full rounded-lg border-2 border-gray-300 bg-white px-6 py-4 text-base font-semibold text-gray-900 transition-all hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={currentTier === "free" || loadingPlan === "free"}
            >
              {!userSubscription
                ? "Get Started Free"
                : currentTier === "free"
                  ? "Current Plan"
                  : loadingPlan === "free"
                    ? "Opening Portal..."
                    : "Manage Subscription"}
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
              <h3 className="mb-1 text-2xl font-bold text-gray-900">Pro</h3>
              <p className="mb-2 text-sm text-gray-500">
                For solo roofers & small crews
              </p>
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
                  <strong>20 roof reports</strong> per month
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <Check className="size-3 text-green-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-700">
                  AI cost estimates included
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <Check className="size-3 text-green-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-700">
                  1,000 AI chat messages
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <Check className="size-3 text-green-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-700">
                  GPT-5 powered analysis
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
              <h3 className="mb-1 text-2xl font-bold text-gray-900">
                Business
              </h3>
              <p className="mb-2 text-sm text-gray-500">
                For growing roofing companies
              </p>
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
                  <strong>100 roof reports</strong> per month
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <Check className="size-3 text-green-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-700">
                  AI proposals & follow-ups
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <Check className="size-3 text-green-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-700">
                  5,000 AI chat messages
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <Check className="size-3 text-green-600" strokeWidth={3} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-900">
                    Full AI Agent Suite
                  </span>
                  <span className="text-xs text-gray-500">
                    Estimates, proposals, lead nurturing
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <Check className="size-3 text-green-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-700">
                  Solar analysis included
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

          {/* AI Employee Pro Plan */}
          <div
            className={`relative flex flex-col rounded-xl border-2 bg-gradient-to-b from-purple-50 to-white p-8 shadow-sm ${
              suggestedPlan === "ai_employee"
                ? "border-purple-500 ring-2 ring-purple-500/20"
                : "border-purple-400"
            }`}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 text-xs font-bold text-white">
                COMING SOON
              </span>
            </div>

            <div className="mb-6">
              <h3 className="mb-1 text-2xl font-bold text-gray-900">
                AI Employee Pro
              </h3>
              <p className="mb-2 text-sm text-gray-500">
                Your AI office admin that never sleeps
              </p>
              <p className="text-4xl font-bold text-gray-900">
                {billingPeriod === "annual" ? "$169" : "$199"}
                <span className="text-base font-normal text-gray-500">
                  /month
                </span>
              </p>
              <p className="mt-1 text-sm font-medium text-purple-600">
                3 days free, then {billingPeriod === "annual" ? "$169" : "$199"}
                /mo
              </p>
              {billingPeriod === "annual" && (
                <p className="mt-1 text-sm text-gray-500">
                  Billed annually ($2,028/year)
                </p>
              )}
            </div>

            <div className="mb-8 grow space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-purple-100">
                  <Check className="size-3 text-purple-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-700">
                  <strong>Everything in Business</strong>, plus:
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-purple-100">
                  <Check className="size-3 text-purple-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-700">
                  <strong>500 voice minutes</strong> - AI answers calls 24/7
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-purple-100">
                  <Check className="size-3 text-purple-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-700">
                  <strong>1,000 SMS messages</strong> - Auto follow-ups
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-purple-100">
                  <Check className="size-3 text-purple-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-700">
                  Speed-to-lead response in 60 seconds
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-purple-100">
                  <Check className="size-3 text-purple-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-700">
                  Unlimited follow-up sequences
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-purple-100">
                  <Check className="size-3 text-purple-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-700">
                  Crew scheduling & production management
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-purple-100">
                  <Check className="size-3 text-purple-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-700">
                  Invoice generation & payment reminders
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-purple-100">
                  <Check className="size-3 text-purple-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-700">
                  Review requests & reputation management
                </span>
              </div>
            </div>

            <button
              disabled={true}
              className="w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 text-base font-semibold text-white transition-all opacity-60 cursor-not-allowed"
            >
              Coming Soon
            </button>
            {billingPeriod === "annual" && (
              <p className="mt-2 text-center text-xs font-medium text-purple-600">
                Save $360/year
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
              <details className="group rounded-lg border border-gray-200 p-4">
                <summary className="cursor-pointer font-semibold text-gray-900">
                  What is the AI Employee Pro plan?
                </summary>
                <p className="mt-2 text-gray-600">
                  AI Employee Pro gives you a 24/7 AI assistant that answers
                  phone calls, responds to leads within 60 seconds, sends
                  automated follow-ups, schedules crews, generates invoices, and
                  requests reviews. It&apos;s like having a full-time office
                  admin that never takes a day off—for less than the cost of a
                  part-time employee.
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
