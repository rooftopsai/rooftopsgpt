// lib/subscription-helpers.ts
// Server-side subscription helpers that use database access
import { createClient } from "@/lib/supabase/server"
import { FeatureType, checkFeatureLimit, trackFeatureUsage } from "@/db/usage"
import { getSubscriptionByUserId } from "@/db/subscriptions"
import { PLANS } from "./stripe"

// Re-export client-safe utilities
export {
  type PlanType,
  type FeatureType,
  PLAN_LIMITS,
  getAllowedModels,
  isModelAllowed,
  normalizePlanType
} from "./subscription-utils"

import type { PlanType } from "./subscription-utils"
import { PLAN_LIMITS, normalizePlanType } from "./subscription-utils"

export interface SubscriptionCheck {
  canUse: boolean
  currentUsage: number
  limit: number | "unlimited"
  remainingUsage: number | "unlimited"
  planType: PlanType
  needsUpgrade: boolean
}

/**
 * Get user's current subscription and check if they can use a feature
 */
export async function checkUserFeatureAccess(
  userId: string,
  feature: FeatureType
): Promise<SubscriptionCheck> {
  // Get user's subscription
  const subscription = await getSubscriptionByUserId(userId)

  let planType: PlanType = "free"
  if (
    subscription &&
    (subscription.status === "active" || subscription.status === "trialing")
  ) {
    // Normalize plan type (e.g., "premium_monthly" -> "premium")
    planType = normalizePlanType(subscription.plan_type)
  }

  // Get limits for the plan
  const planLimits = PLAN_LIMITS[planType]

  // Check feature limit
  const limitCheck = await checkFeatureLimit(userId, feature, planLimits)

  return {
    ...limitCheck,
    planType,
    needsUpgrade: !limitCheck.canUse
  }
}

/**
 * Track feature usage and return updated usage info
 */
export async function trackAndCheckFeature(
  userId: string,
  feature: FeatureType,
  quantity: number = 1
): Promise<SubscriptionCheck> {
  // Check if user can use the feature
  const check = await checkUserFeatureAccess(userId, feature)

  if (!check.canUse) {
    return check
  }

  // Track the usage
  await trackFeatureUsage(userId, feature, quantity)

  // Return updated check
  return checkUserFeatureAccess(userId, feature)
}

/**
 * Get user's subscription status for displaying in UI
 */
export async function getUserSubscriptionStatus(userId: string) {
  const subscription = await getSubscriptionByUserId(userId)

  if (!subscription || subscription.status !== "active") {
    return {
      planType: "free" as PlanType,
      status: "free",
      isActive: false,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false
    }
  }

  return {
    // Normalize plan type (e.g., "premium_monthly" -> "premium")
    planType: normalizePlanType(subscription.plan_type),
    status: subscription.status,
    isActive: subscription.status === "active",
    currentPeriodEnd: subscription.current_period_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end
  }
}

/**
 * Middleware function to check subscription before API calls
 */
export async function requireFeatureAccess(
  userId: string,
  feature: FeatureType
): Promise<
  | { allowed: true }
  | {
      allowed: false
      error: string
      limit: number | "unlimited"
      currentUsage: number
    }
> {
  const check = await checkUserFeatureAccess(userId, feature)

  if (!check.canUse) {
    return {
      allowed: false,
      error: `You've reached your ${feature.replace("_", " ")} limit for this month. Please upgrade your plan to continue.`,
      limit: check.limit,
      currentUsage: check.currentUsage
    }
  }

  return { allowed: true }
}
