"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Check, Loader2 } from "lucide-react"
import confetti from "canvas-confetti"
import { RooftopsSVG } from "@/components/icons/rooftops-svg"

function CheckoutSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")

  const [tierDetails, setTierDetails] = useState<{
    tier: "premium" | "business"
    features: string[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  // Fire confetti on mount
  useEffect(() => {
    if (!loading && tierDetails) {
      // Fire confetti from multiple angles
      const duration = 3000
      const end = Date.now() + duration

      const colors = ["#24BDEB", "#4FEBBC", "#03A7FF", "#50EBBC"]

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: colors
        })
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: colors
        })

        if (Date.now() < end) {
          requestAnimationFrame(frame)
        }
      }

      // Initial burst
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.6 },
        colors: colors
      })

      // Continuous confetti
      frame()
    }
  }, [loading, tierDetails])

  useEffect(() => {
    const fetchSessionDetails = async () => {
      if (!sessionId) {
        // If no session ID, redirect to homepage
        router.push("/")
        return
      }

      try {
        // Wait a moment for webhook to process
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Get plan from URL or default to premium
        const plan = searchParams.get("plan") || "premium"

        // Clean up the plan name (remove _monthly or _annual suffix)
        const cleanPlan = plan.replace(/_monthly|_annual/g, "")

        setTierDetails({
          tier: cleanPlan as "premium" | "business",
          features:
            cleanPlan === "business"
              ? [
                  "100 property reports per month",
                  "5,000 chat messages per month",
                  "Unlimited web searches",
                  "Exclusive Business Agent Library",
                  "Priority support"
                ]
              : [
                  "20 property reports per month",
                  "1,000 chat messages per month",
                  "50 web searches per month",
                  "Premium Agent Library",
                  "Advanced AI models"
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

  const handleGetStarted = async () => {
    // Get home workspace and redirect to chat
    const { getHomeWorkspaceByUserId } = await import("@/db/workspaces")
    const { supabase } = await import("@/lib/supabase/browser-client")

    const session = (await supabase.auth.getSession()).data.session
    if (session) {
      const homeWorkspaceId = await getHomeWorkspaceByUserId(session.user.id)
      router.push(`/${homeWorkspaceId}/chat`)
    } else {
      router.push("/")
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 size-12 animate-spin text-cyan-500" />
          <p className="text-gray-600">Setting up your subscription...</p>
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
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        {/* Rooftops Icon */}
        <div className="mb-6 inline-flex size-24 items-center justify-center">
          <RooftopsSVG className="size-24" />
        </div>

        {/* Welcome Message */}
        <h1 className="mb-4 text-4xl font-bold text-gray-900">
          Welcome to Rooftops AI {tierName}!
        </h1>
        <p className="mb-12 text-xl text-gray-600">
          Your subscription is now active. Here&apos;s what you can do:
        </p>

        {/* Features List */}
        <div className="mb-12 rounded-xl border border-gray-200 bg-white p-8 text-left shadow-sm">
          <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">
            Your {tierName} Features
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {tierDetails.features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <Check className="size-3 text-green-600" strokeWidth={3} />
                </div>
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Single CTA Button */}
        <button
          onClick={handleGetStarted}
          className="rounded-lg bg-gradient-to-r from-cyan-500 to-green-500 px-12 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:from-cyan-600 hover:to-green-600 hover:shadow-xl"
        >
          Let&apos;s get to work
        </button>

        {/* Additional Info */}
        <div className="mt-12 space-y-2 text-sm text-gray-500">
          <p>
            You can manage your subscription anytime from your account settings.
          </p>
          <p>
            Need help getting started?{" "}
            <a
              href="mailto:team@rooftops.ai"
              className="font-medium text-cyan-600 hover:underline"
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
        <div className="flex min-h-screen items-center justify-center bg-white">
          <Loader2 className="size-12 animate-spin text-cyan-500" />
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  )
}
