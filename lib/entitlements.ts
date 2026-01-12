// lib/entitlements.ts
// Tier management and entitlement checks for the subscription system

import { getSubscriptionByUserId } from "@/db/subscriptions"
import {
  getCurrentMonth,
  getOrCreateUserUsage,
  getUserUsage
} from "@/db/user-usage"

export type Tier = "free" | "premium" | "business"

// Tier limits as defined in PRD
export const TIER_LIMITS = {
  free: {
    reports: 1,
    chatMessagesDaily: 5, // 5 per day on GPT-4o
    chatMessagesMonthly: -1, // Not applicable for free tier
    webSearches: 0,
    agents: false
  },
  premium: {
    reports: 20,
    chatMessagesDaily: -1, // Not applicable for premium tier
    chatMessagesMonthly: 1000, // 1000 per month on GPT-4.5-mini
    webSearches: 50,
    agents: true
  },
  business: {
    reports: 100,
    chatMessagesDaily: -1, // Not applicable for business tier
    chatMessagesMonthly: 5000, // 5000 per month on GPT-4.5-mini
    webSearches: 250,
    agents: true
  }
} as const

export interface LimitCheckResult {
  allowed: boolean
  remaining: number
  limit: number
}

export interface ChatLimitCheckResult extends LimitCheckResult {
  model: "gpt-4o" | "gpt-4.5-mini"
  switchedToFreeModel?: boolean
}

/**
 * Grace period for past_due subscriptions (in days)
 */
const GRACE_PERIOD_DAYS = 7

/**
 * Get user's current tier
 * Returns 'free' if no subscription exists
 * Handles grace period for past_due subscriptions
 */
export async function getUserTier(userId: string): Promise<Tier> {
  try {
    const subscription = await getSubscriptionByUserId(userId)

    // No subscription = free tier
    if (!subscription) {
      return "free"
    }

    // Check tier (or fall back to plan_type for backward compatibility)
    const tier = (subscription.tier || subscription.plan_type || "free") as Tier

    // Validate that it's a valid tier
    if (!["free", "premium", "business"].includes(tier)) {
      console.warn(
        `Invalid tier "${tier}" for user ${userId}, defaulting to free`
      )
      return "free"
    }

    // Handle past_due status with grace period
    if (subscription.status === "past_due") {
      const gracePeriodExpired = isGracePeriodExpired(subscription.updated_at)

      if (gracePeriodExpired) {
        // Grace period expired - downgrade to free
        return "free"
      }

      // Still within grace period - allow tier access
      return tier
    }

    // Only allow tier access if status is 'active'
    if (subscription.status !== "active") {
      return "free"
    }

    return tier
  } catch (error) {
    console.error(`Error fetching user tier for ${userId}:`, error)
    return "free" // Default to free on error
  }
}

/**
 * Check if grace period has expired for a past_due subscription
 */
function isGracePeriodExpired(updatedAt: string | null): boolean {
  if (!updatedAt) return true

  const updated = new Date(updatedAt)
  const now = new Date()
  const daysSinceUpdate = Math.floor(
    (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24)
  )

  return daysSinceUpdate >= GRACE_PERIOD_DAYS
}

/**
 * Get grace period info for a past_due subscription
 */
export async function getGracePeriodInfo(userId: string): Promise<{
  inGracePeriod: boolean
  daysRemaining: number
} | null> {
  try {
    const subscription = await getSubscriptionByUserId(userId)

    if (!subscription || subscription.status !== "past_due") {
      return null
    }

    const updated = new Date(subscription.updated_at || new Date())
    const now = new Date()
    const daysSinceUpdate = Math.floor(
      (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24)
    )

    const daysRemaining = Math.max(0, GRACE_PERIOD_DAYS - daysSinceUpdate)
    const inGracePeriod = daysRemaining > 0

    return {
      inGracePeriod,
      daysRemaining
    }
  } catch (error) {
    console.error(`Error getting grace period info for ${userId}:`, error)
    return null
  }
}

/**
 * Check if user can generate another report
 */
export async function checkReportLimit(
  userId: string
): Promise<LimitCheckResult> {
  const tier = await getUserTier(userId)
  const limits = TIER_LIMITS[tier]
  const usage = await getOrCreateUserUsage(userId)

  const used = usage.reports_generated
  const limit = limits.reports

  return {
    allowed: used < limit,
    remaining: Math.max(0, limit - used),
    limit
  }
}

/**
 * Check if user can send chat message
 * Returns which model to use and if they're allowed
 */
export async function checkChatLimit(
  userId: string
): Promise<ChatLimitCheckResult> {
  const tier = await getUserTier(userId)
  const limits = TIER_LIMITS[tier]
  const usage = await getOrCreateUserUsage(userId)

  // Free tier: 5 messages per day on GPT-4o
  if (tier === "free") {
    const today = new Date().toISOString().split("T")[0]
    const dailyCount =
      usage.last_chat_date === today ? usage.daily_chat_count : 0

    return {
      allowed: dailyCount < limits.chatMessagesDaily,
      remaining: Math.max(0, limits.chatMessagesDaily - dailyCount),
      limit: limits.chatMessagesDaily,
      model: "gpt-4o"
    }
  }

  // Premium tier: 1000 messages on GPT-4.5-mini, then unlimited GPT-4o
  if (tier === "premium") {
    const used = usage.chat_messages_premium
    const limit = limits.chatMessagesMonthly

    // If under limit, use premium model
    if (used < limit) {
      return {
        allowed: true,
        remaining: limit - used,
        limit,
        model: "gpt-4.5-mini"
      }
    }

    // Over limit: switch to free model (unlimited)
    return {
      allowed: true,
      remaining: 0,
      limit,
      model: "gpt-4o",
      switchedToFreeModel: true
    }
  }

  // Business tier: 5000 messages on GPT-4.5-mini, then unlimited GPT-4o
  if (tier === "business") {
    const used = usage.chat_messages_premium
    const limit = limits.chatMessagesMonthly

    // If under limit, use premium model
    if (used < limit) {
      return {
        allowed: true,
        remaining: limit - used,
        limit,
        model: "gpt-4.5-mini"
      }
    }

    // Over limit: switch to free model (unlimited)
    return {
      allowed: true,
      remaining: 0,
      limit,
      model: "gpt-4o",
      switchedToFreeModel: true
    }
  }

  // Fallback (should never reach here)
  return {
    allowed: false,
    remaining: 0,
    limit: 0,
    model: "gpt-4o"
  }
}

/**
 * Check if user can use web search
 */
export async function checkWebSearchLimit(
  userId: string
): Promise<LimitCheckResult> {
  const tier = await getUserTier(userId)
  const limits = TIER_LIMITS[tier]

  // Free tier: no web search
  if (tier === "free") {
    return {
      allowed: false,
      remaining: 0,
      limit: 0
    }
  }

  const usage = await getOrCreateUserUsage(userId)
  const used = usage.web_searches
  const limit = limits.webSearches

  return {
    allowed: used < limit,
    remaining: Math.max(0, limit - used),
    limit
  }
}

/**
 * Check if user can access agents
 */
export async function checkAgentAccess(userId: string): Promise<boolean> {
  const tier = await getUserTier(userId)
  const limits = TIER_LIMITS[tier]
  return limits.agents
}

/**
 * Get user's current usage stats
 */
export async function getUserUsageStats(userId: string) {
  const tier = await getUserTier(userId)
  const usage = await getUserUsage(userId, getCurrentMonth())
  const limits = TIER_LIMITS[tier]

  // Calculate daily chat count for free tier
  const today = new Date().toISOString().split("T")[0]
  const dailyChatCount =
    usage && usage.last_chat_date === today ? usage.daily_chat_count : 0

  return {
    tier,
    usage: usage || {
      reports_generated: 0,
      chat_messages_premium: 0,
      chat_messages_free: 0,
      web_searches: 0,
      daily_chat_count: dailyChatCount
    },
    limits: {
      reports: limits.reports,
      chatMessagesDaily: limits.chatMessagesDaily,
      chatMessagesMonthly: limits.chatMessagesMonthly,
      webSearches: limits.webSearches,
      agents: limits.agents
    }
  }
}
