// @ts-nocheck
// app/api/stripe/portal/route.ts

import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { getSubscriptionByUserId } from "@/db/subscriptions"

export async function POST(req: NextRequest) {
  try {
    const profile = await getServerProfile()

    if (!profile?.user_id) {
      console.error("[Stripe Portal] Unauthorized - no user profile")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`[Stripe Portal] User ID: ${profile.user_id}`)

    // Get subscription to find Stripe customer ID
    const subscription = await getSubscriptionByUserId(profile.user_id)

    console.log(`[Stripe Portal] Subscription found:`, {
      hasSubscription: !!subscription,
      status: subscription?.status,
      customerId: subscription?.stripe_customer_id ? "present" : "missing"
    })

    if (!subscription) {
      return NextResponse.json(
        {
          error: "No subscription found",
          details:
            "You don't have an active subscription. Please subscribe first."
        },
        { status: 404 }
      )
    }

    if (!subscription.stripe_customer_id) {
      return NextResponse.json(
        {
          error: "No Stripe customer ID",
          details:
            "Subscription exists but is missing Stripe customer ID. Please contact support."
        },
        { status: 404 }
      )
    }

    // Determine the correct return URL
    // Priority: 1) NEXT_PUBLIC_URL env var, 2) request origin, 3) fallback to rooftops.ai
    let returnUrl = process.env.NEXT_PUBLIC_URL

    // If NEXT_PUBLIC_URL is localhost or not set properly, use request origin
    if (!returnUrl || returnUrl.includes("localhost")) {
      const origin = req.headers.get("origin") || req.headers.get("referer")
      if (origin) {
        returnUrl = new URL(origin).origin
      } else {
        returnUrl = "https://rooftops.ai"
      }
    }

    console.log(
      `[Stripe Portal] Creating portal session for customer ${subscription.stripe_customer_id}`
    )
    console.log(`[Stripe Portal] Return URL: ${returnUrl}`)

    // Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl
    })

    console.log(
      `[Stripe Portal] Portal session created: ${portalSession.id}`
    )

    return NextResponse.json({ url: portalSession.url })
  } catch (error: any) {
    console.error("[Stripe Portal] Error:", {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
      raw: error.raw
    })

    // Better error messages for common Stripe errors
    let userMessage = "Failed to create portal session"
    if (error.type === "StripeInvalidRequestError") {
      if (error.message.includes("No such customer")) {
        userMessage =
          "Customer not found in Stripe. Your subscription may be incomplete."
      } else if (error.message.includes("test mode")) {
        userMessage =
          "Stripe API key mismatch (test vs live mode). Please check your configuration."
      }
    }

    return NextResponse.json(
      {
        error: userMessage,
        details: error.message,
        type: error.type
      },
      { status: 500 }
    )
  }
}
