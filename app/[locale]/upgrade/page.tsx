"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { STRIPE_PRICE_IDS } from "@/lib/stripe-config"
import { toast } from "sonner"
import { useChatbotUI } from "@/context/context"

export default function UpgradePage() {
  const router = useRouter()
  const { profile } = useChatbotUI()
  const [activeTab, setActiveTab] = useState<"premium" | "business">("premium")
  const [loading, setLoading] = useState(false)

  const handleCheckout = async (priceId: string, planType: string) => {
    setLoading(true)

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          priceId,
          planType
        })
      })

      const data = await response.json()

      if (response.ok && data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || "Failed to create checkout session")
        setLoading(false)
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("An error occurred. Please try again.")
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    // Get home workspace and redirect to chat
    const { getHomeWorkspaceByUserId } = await import("@/db/workspaces")
    const { supabase } = await import("@/lib/supabase/browser-client")

    const session = (await supabase.auth.getSession()).data.session
    if (session) {
      const homeWorkspaceId = await getHomeWorkspaceByUserId(session.user.id)
      router.push(`/${homeWorkspaceId}/chat`)
    }
  }

  return (
    <div className="flex min-h-screen justify-start bg-white p-4 pt-12">
      <div className="mx-auto w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-3xl font-bold text-gray-900">
            Unlock Premium Features
          </h1>
          <p className="text-gray-600">
            Get access to exclusive agents and advanced features
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1">
          <button
            onClick={() => setActiveTab("premium")}
            className={`flex-1 rounded-md px-4 py-3 text-sm font-semibold transition-all ${
              activeTab === "premium"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Premium
          </button>
          <button
            onClick={() => setActiveTab("business")}
            className={`flex-1 rounded-md px-4 py-3 text-sm font-semibold transition-all ${
              activeTab === "business"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Business
          </button>
        </div>

        {/* Pricing Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          {activeTab === "premium" ? (
            <>
              {/* Premium Plan */}
              <div className="mb-6">
                <h2 className="mb-2 text-2xl font-bold text-gray-900">
                  Premium Agents
                </h2>
                <p className="text-sm text-gray-600">
                  Perfect for individual contractors
                </p>
              </div>

              {/* Features */}
              <div className="mb-6 space-y-3">
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
                  <span className="text-sm text-gray-700">
                    20 property reports per month
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

              {/* Pricing Options */}
              <div className="mb-6 space-y-3">
                <button
                  onClick={() =>
                    handleCheckout(
                      STRIPE_PRICE_IDS.premium_monthly,
                      "premium_monthly"
                    )
                  }
                  disabled={loading}
                  className="flex w-full items-center justify-between rounded-lg border-2 border-gray-300 bg-white px-6 py-4 text-base font-semibold text-gray-900 transition-all hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50"
                >
                  <span>Monthly</span>
                  <span>$29/month</span>
                </button>
                <button
                  onClick={() =>
                    handleCheckout(
                      STRIPE_PRICE_IDS.premium_annual,
                      "premium_annual"
                    )
                  }
                  disabled={loading}
                  className="relative flex w-full items-center justify-between rounded-lg bg-gradient-to-r from-cyan-500 to-green-500 px-6 py-4 text-base font-semibold text-white transition-all hover:from-cyan-600 hover:to-green-600 disabled:opacity-50"
                >
                  <div className="absolute -top-2.5 right-4 rounded-full bg-green-600 px-3 py-1 text-xs font-bold text-white">
                    Save $48
                  </div>
                  <span>Annual</span>
                  <span>$25/month</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Business Plan */}
              <div className="mb-6">
                <h2 className="mb-2 text-2xl font-bold text-gray-900">
                  Business Agents
                </h2>
                <p className="text-sm text-gray-600">
                  For growing roofing businesses
                </p>
              </div>

              {/* Features */}
              <div className="mb-6 space-y-3">
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
                  <span className="text-sm text-gray-700">
                    100 property reports per month
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
              </div>

              {/* Pricing Options */}
              <div className="mb-6 space-y-3">
                <button
                  onClick={() =>
                    handleCheckout(
                      STRIPE_PRICE_IDS.business_monthly,
                      "business_monthly"
                    )
                  }
                  disabled={loading}
                  className="flex w-full items-center justify-between rounded-lg border-2 border-gray-300 bg-white px-6 py-4 text-base font-semibold text-gray-900 transition-all hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50"
                >
                  <span>Monthly</span>
                  <span>$99/month</span>
                </button>
                <button
                  onClick={() =>
                    handleCheckout(
                      STRIPE_PRICE_IDS.business_annual,
                      "business_annual"
                    )
                  }
                  disabled={loading}
                  className="relative flex w-full items-center justify-between rounded-lg bg-gradient-to-r from-cyan-500 to-green-500 px-6 py-4 text-base font-semibold text-white transition-all hover:from-cyan-600 hover:to-green-600 disabled:opacity-50"
                >
                  <div className="absolute -top-2.5 right-4 rounded-full bg-green-600 px-3 py-1 text-xs font-bold text-white">
                    Save $180
                  </div>
                  <span>Annual</span>
                  <span>$84/month</span>
                </button>
              </div>
            </>
          )}

          {/* Skip Button */}
          <button
            onClick={handleSkip}
            disabled={loading}
            className="w-full py-3 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          >
            Continue with Free Plan
          </button>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-600">
          You can upgrade or downgrade at any time
        </p>
      </div>
    </div>
  )
}
