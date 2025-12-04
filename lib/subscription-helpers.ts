// lib/subscription-helpers.ts
import { createClient } from "@/lib/supabase/server"
import { FeatureType, checkFeatureLimit, trackFeatureUsage } from "@/db/usage"
import { getSubscriptionByUserId } from "@/db/subscriptions"
import { PLANS } from "./stripe"

export type PlanType = "free" | "premium" | "business"

// Define feature limits for each plan
export const PLAN_LIMITS: Record<
  PlanType,
  Record<FeatureType, number | "unlimited">
> = {
  free: {
    chat_messages: 20,
    property_reports: 1, // 1 free report
    weather_lookups: 5,
    document_creation: 0
  },
  premium: {
    chat_messages: 1000,
    property_reports: 10, // 10 reports per month on $29 plan
    weather_lookups: "unlimited",
    document_creation: 50
  },
  business: {
    chat_messages: 5000,
    property_reports: "unlimited", // Unlimited reports on $99 plan
    weather_lookups: "unlimited",
    document_creation: "unlimited"
  }
}

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
  if (subscription && subscription.status === "active") {
    planType = (subscription.plan_type as PlanType) || "free"
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
    planType: (subscription.plan_type as PlanType) || "free",
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

/**
 * Get allowed AI models based on user's subscription plan
 * Free plan: gpt-4o only (most affordable model with vision)
 * Premium ($29/mo): gpt-4o only
 * Business ($99/mo): All models including GPT-5.1, Claude, Grok, etc.
 */
export function getAllowedModels(planType: PlanType): string[] {
  switch (planType) {
    case "free":
    case "premium":
      return ["gpt-4o"] // Both free and $29 plan get only gpt-4o
    case "business":
      return [
        "gpt-5.1",
        "claude-sonnet-4-5-20250929",
        "grok-2-vision-1212",
        "gpt-4o",
        "o4-mini-2025-04-16",
        "gpt-4.1-2025-04-14"
      ] // $99 plan gets all models
    default:
      return ["gpt-4o"]
  }
}

/**
 * Check if a model is allowed for a given plan type
 */
export function isModelAllowed(planType: PlanType, model: string): boolean {
  const allowedModels = getAllowedModels(planType)
  return allowedModels.includes(model)
}
