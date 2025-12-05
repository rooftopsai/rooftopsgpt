// lib/subscription-utils.ts
// Client-safe utility functions for subscription features
// These functions don't require database access and can be used in client components

export type PlanType = "free" | "premium" | "business"

export type FeatureType =
  | "chat_messages"
  | "property_reports"
  | "weather_lookups"
  | "document_creation"

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

/**
 * Get allowed AI models based on user's subscription plan
 * Free plan: gpt-4o only (most affordable model with vision)
 * Premium ($29/mo): gpt-4o and gpt-5-mini
 * Business ($99/mo): All models including GPT-5, Claude, Grok, etc.
 */
export function getAllowedModels(planType: PlanType): string[] {
  switch (planType) {
    case "free":
      return ["gpt-4o"] // Free plan gets only gpt-4o
    case "premium":
      return ["gpt-4o", "gpt-5-mini"] // Premium gets gpt-4o and gpt-5-mini
    case "business":
      return [
        "gpt-5",
        "gpt-5-mini",
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
