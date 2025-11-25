// lib/chat-with-subscription.ts
// Wrapper for chat routes to handle subscription checking and usage tracking

import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { requireFeatureAccess, trackAndCheckFeature } from "@/lib/subscription-helpers"
import { NextResponse } from "next/server"

/**
 * Wrapper function for chat routes that adds subscription checking
 * Call this at the start of each chat route
 */
export async function withSubscriptionCheck() {
  const profile = await getServerProfile()

  // Check subscription limits before processing
  const accessCheck = await requireFeatureAccess(profile.user_id, 'chat_messages')

  if (!accessCheck.allowed) {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: accessCheck.error,
          limit: accessCheck.limit,
          currentUsage: accessCheck.currentUsage,
          upgradeRequired: true
        },
        { status: 402 }
      ),
      profile: null
    }
  }

  return {
    allowed: true,
    response: null,
    profile
  }
}

/**
 * Call this after successfully creating a chat response
 * It tracks usage without blocking the response
 */
export function trackChatUsage(userId: string) {
  trackAndCheckFeature(userId, 'chat_messages', 1).catch(err =>
    console.error('Failed to track chat usage:', err)
  )
}
