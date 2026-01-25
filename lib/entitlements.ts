// lib/entitlements.ts
// Tier management and entitlement checks for the subscription system

import { getSubscriptionByUserId } from "@/db/subscriptions"
import {
  getCurrentMonth,
  getOrCreateUserUsage,
  getUserUsage
} from "@/db/user-usage"

// Simple in-memory cache for entitlement checks (5-minute TTL)
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes in milliseconds

interface CacheEntry<T> {
  value: T
  timestamp: number
}

const cache = new Map<string, CacheEntry<any>>()

function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null

  const now = Date.now()
  if (now - entry.timestamp > CACHE_TTL) {
    cache.delete(key)
    return null
  }

  return entry.value
}

function setCache<T>(key: string, value: T): void {
  cache.set(key, {
    value,
    timestamp: Date.now()
  })
}

function clearUserCache(userId: string): void {
  // Clear all cache entries for a specific user
  const keysToDelete: string[] = []
  for (const key of cache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      keysToDelete.push(key)
    }
  }
  keysToDelete.forEach(key => cache.delete(key))
}

// Export cache clearing function for use after mutations
export function invalidateUserCache(userId: string): void {
  clearUserCache(userId)
}

export type Tier = "free" | "premium" | "business" | "ai_employee"

/**
 * Normalize tier/plan_type to base tier (remove _monthly/_annual suffix)
 * e.g., "premium_monthly" -> "premium", "business_annual" -> "business"
 */
function normalizeTier(tier: string | null | undefined): Tier {
  if (!tier) return "free"

  const normalized = tier.toLowerCase()

  if (normalized.startsWith("ai_employee") || normalized.startsWith("ai-employee")) return "ai_employee"
  if (normalized.startsWith("business")) return "business"
  if (normalized.startsWith("premium")) return "premium"

  // Check if it's already a valid base tier
  if (
    normalized === "free" ||
    normalized === "premium" ||
    normalized === "business" ||
    normalized === "ai_employee"
  ) {
    return normalized as Tier
  }

  return "free"
}

// Tier limits as defined in PRD
export const TIER_LIMITS = {
  free: {
    reports: 1,
    chatMessagesDaily: 5, // 5 per day on GPT-4o
    chatMessagesMonthly: -1, // Not applicable for free tier
    webSearches: 0,
    agents: false,
    // AI Employee features (not available)
    voiceMinutes: 0,
    smsMessages: 0,
    followUpSequences: 0,
    crmContacts: 0,
    activeJobs: 0,
    crewManagement: false,
    invoicePayments: false,
    reviewManagement: false,
    twoWayConversations: false,
    speedToLead: false,
    knowledgeBaseItems: 0
  },
  premium: {
    reports: 20,
    chatMessagesDaily: -1, // Not applicable for premium tier
    chatMessagesMonthly: 1000, // 1000 per month on GPT-5-mini
    webSearches: 50,
    agents: true,
    // AI Employee features (limited)
    voiceMinutes: 0,
    smsMessages: 0,
    followUpSequences: 1,
    crmContacts: 100,
    activeJobs: 20,
    crewManagement: false,
    invoicePayments: false,
    reviewManagement: false,
    twoWayConversations: false,
    speedToLead: false,
    knowledgeBaseItems: 50
  },
  business: {
    reports: 100,
    chatMessagesDaily: -1, // Not applicable for business tier
    chatMessagesMonthly: 5000, // 5000 per month on GPT-5-mini
    webSearches: 250,
    agents: true,
    // AI Employee features (limited)
    voiceMinutes: 0,
    smsMessages: 0,
    followUpSequences: 1,
    crmContacts: 100,
    activeJobs: 20,
    crewManagement: false,
    invoicePayments: false,
    reviewManagement: false,
    twoWayConversations: false,
    speedToLead: false,
    knowledgeBaseItems: 50
  },
  ai_employee: {
    reports: -1, // Unlimited
    chatMessagesDaily: -1, // Not applicable
    chatMessagesMonthly: -1, // Unlimited
    webSearches: -1, // Unlimited
    agents: true,
    // AI Employee features (full access)
    voiceMinutes: 500, // 500 minutes per month
    smsMessages: 1000, // 1000 SMS per month
    followUpSequences: -1, // Unlimited
    crmContacts: -1, // Unlimited
    activeJobs: -1, // Unlimited
    crewManagement: true,
    invoicePayments: true,
    reviewManagement: true,
    twoWayConversations: true,
    speedToLead: true,
    knowledgeBaseItems: -1 // Unlimited
  }
} as const

export interface LimitCheckResult {
  allowed: boolean
  remaining: number
  limit: number
}

export interface ChatLimitCheckResult extends LimitCheckResult {
  model: "gpt-4o" | "gpt-5-mini"
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
 * Handles cancelled subscriptions (active until current_period_end)
 */
export async function getUserTier(userId: string): Promise<Tier> {
  // Check cache first
  const cacheKey = `${userId}:tier`
  const cached = getCached<Tier>(cacheKey)
  if (cached) {
    console.log("[getUserTier] Returning cached tier for", userId, ":", cached)
    return cached
  }

  try {
    console.log("[getUserTier] Fetching subscription for user:", userId)
    const subscription = await getSubscriptionByUserId(userId)

    // No subscription = free tier
    if (!subscription) {
      console.log("[getUserTier] No subscription found for user:", userId)
      const tier = "free"
      setCache(cacheKey, tier)
      return tier
    }

    console.log("[getUserTier] Subscription found:", {
      tier: subscription.tier,
      plan_type: subscription.plan_type,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end
    })

    // Check tier (or fall back to plan_type for backward compatibility)
    // Normalize the tier/plan_type (e.g., "premium_monthly" -> "premium")
    const rawTier = subscription.tier || subscription.plan_type || "free"
    const tier = normalizeTier(rawTier)
    console.log("[getUserTier] Normalized tier:", rawTier, "->", tier)

    // Handle past_due status with grace period
    if (subscription.status === "past_due") {
      const gracePeriodExpired = isGracePeriodExpired(subscription.updated_at)

      if (gracePeriodExpired) {
        // Grace period expired - downgrade to free
        const freeTier = "free"
        setCache(cacheKey, freeTier)
        return freeTier
      }

      // Still within grace period - allow tier access
      setCache(cacheKey, tier)
      return tier
    }

    // Only allow tier access if status is 'active' or 'trialing'
    if (
      subscription.status !== "active" &&
      subscription.status !== "trialing"
    ) {
      const freeTier = "free"
      setCache(cacheKey, freeTier)
      return freeTier
    }

    // Handle cancelled subscriptions (cancel_at_period_end = true)
    // These remain active until current_period_end
    if (subscription.cancel_at_period_end && subscription.current_period_end) {
      const periodEnd = new Date(subscription.current_period_end)
      const now = new Date()

      if (now > periodEnd) {
        // Period has ended - downgrade to free
        const freeTier = "free"
        setCache(cacheKey, freeTier)
        return freeTier
      }

      // Still within period - allow tier access
      setCache(cacheKey, tier)
      return tier
    }

    setCache(cacheKey, tier)
    return tier
  } catch (error) {
    console.error(`Error fetching user tier for ${userId}:`, error)
    return "free" // Default to free on error (don't cache errors)
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
 * Get cancellation info for a subscription that's been cancelled
 */
export async function getCancellationInfo(userId: string): Promise<{
  isCancelled: boolean
  tier: string
  endDate: string
} | null> {
  try {
    const subscription = await getSubscriptionByUserId(userId)

    if (
      !subscription ||
      !subscription.cancel_at_period_end ||
      !subscription.current_period_end
    ) {
      return null
    }

    const periodEnd = new Date(subscription.current_period_end)
    const now = new Date()

    // Only show cancellation notice if still within the period
    if (now > periodEnd) {
      return null
    }

    const tier = (subscription.tier || subscription.plan_type || "free") as Tier

    return {
      isCancelled: true,
      tier: tier.charAt(0).toUpperCase() + tier.slice(1), // Capitalize
      endDate: subscription.current_period_end
    }
  } catch (error) {
    console.error(`Error getting cancellation info for ${userId}:`, error)
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

  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      remaining: -1,
      limit: -1
    }
  }

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

  // Premium tier: 1000 messages on GPT-5-mini, then unlimited GPT-4o
  if (tier === "premium") {
    const used = usage.chat_messages_premium
    const limit = limits.chatMessagesMonthly

    // If under limit, use premium model
    if (used < limit) {
      return {
        allowed: true,
        remaining: limit - used,
        limit,
        model: "gpt-5-mini"
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

  // Business tier: 5000 messages on GPT-5-mini, then unlimited GPT-4o
  if (tier === "business") {
    const used = usage.chat_messages_premium
    const limit = limits.chatMessagesMonthly

    // If under limit, use premium model
    if (used < limit) {
      return {
        allowed: true,
        remaining: limit - used,
        limit,
        model: "gpt-5-mini"
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

  // AI Employee tier: Unlimited messages on GPT-5-mini
  if (tier === "ai_employee") {
    return {
      allowed: true,
      remaining: -1, // Unlimited
      limit: -1,
      model: "gpt-5-mini"
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

  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      remaining: -1,
      limit: -1
    }
  }

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
  try {
    const tier = await getUserTier(userId)
    const limits = TIER_LIMITS[tier]
    console.log("[checkAgentAccess] User:", userId, "Tier:", tier, "agents:", limits.agents)
    return limits.agents
  } catch (error) {
    console.error("[checkAgentAccess] Error checking access:", error)
    return false
  }
}

/**
 * Get user's current usage stats
 * Note: Usage stats are cached briefly (30s) for performance while staying relatively fresh
 */
export async function getUserUsageStats(userId: string) {
  // Note: getUserTier is already cached with 5-minute TTL
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
      daily_chat_count: dailyChatCount,
      voice_minutes_used: 0,
      sms_messages_sent: 0
    },
    limits: {
      reports: limits.reports,
      chatMessagesDaily: limits.chatMessagesDaily,
      chatMessagesMonthly: limits.chatMessagesMonthly,
      webSearches: limits.webSearches,
      agents: limits.agents,
      // AI Employee limits
      voiceMinutes: limits.voiceMinutes,
      smsMessages: limits.smsMessages,
      followUpSequences: limits.followUpSequences,
      crmContacts: limits.crmContacts,
      activeJobs: limits.activeJobs,
      crewManagement: limits.crewManagement,
      invoicePayments: limits.invoicePayments,
      reviewManagement: limits.reviewManagement,
      twoWayConversations: limits.twoWayConversations,
      speedToLead: limits.speedToLead,
      knowledgeBaseItems: limits.knowledgeBaseItems
    }
  }
}

/**
 * Get information about scheduled downgrade
 */
export async function getScheduledDowngradeInfo(userId: string): Promise<{
  hasScheduledDowngrade: boolean
  currentTier: string
  scheduledTier: string
  effectiveDate: string
} | null> {
  const subscription = await getSubscriptionByUserId(userId)

  if (
    !subscription ||
    !subscription.scheduled_plan_type ||
    !subscription.current_period_end
  ) {
    return null
  }

  const currentTier = (subscription.plan_type || "free") as Tier
  const scheduledTier = subscription.scheduled_plan_type as Tier

  return {
    hasScheduledDowngrade: true,
    currentTier: currentTier.charAt(0).toUpperCase() + currentTier.slice(1),
    scheduledTier:
      scheduledTier.charAt(0).toUpperCase() + scheduledTier.slice(1),
    effectiveDate: subscription.current_period_end
  }
}

// ============================================================================
// AI EMPLOYEE FEATURE CHECKS
// ============================================================================

/**
 * Check if user has AI Employee tier
 */
export async function hasAIEmployeeTier(userId: string): Promise<boolean> {
  const tier = await getUserTier(userId)
  return tier === "ai_employee"
}

/**
 * Check voice minutes limit
 */
export async function checkVoiceMinutesLimit(
  userId: string
): Promise<LimitCheckResult> {
  const tier = await getUserTier(userId)
  const limits = TIER_LIMITS[tier]

  if (limits.voiceMinutes === 0) {
    return {
      allowed: false,
      remaining: 0,
      limit: 0
    }
  }

  const usage = await getOrCreateUserUsage(userId)
  const used = (usage as any).voice_minutes_used || 0
  const limit = limits.voiceMinutes

  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      remaining: -1,
      limit: -1
    }
  }

  return {
    allowed: used < limit,
    remaining: Math.max(0, limit - used),
    limit
  }
}

/**
 * Check SMS messages limit
 */
export async function checkSmsLimit(
  userId: string
): Promise<LimitCheckResult> {
  const tier = await getUserTier(userId)
  const limits = TIER_LIMITS[tier]

  if (limits.smsMessages === 0) {
    return {
      allowed: false,
      remaining: 0,
      limit: 0
    }
  }

  const usage = await getOrCreateUserUsage(userId)
  const used = (usage as any).sms_messages_sent || 0
  const limit = limits.smsMessages

  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      remaining: -1,
      limit: -1
    }
  }

  return {
    allowed: used < limit,
    remaining: Math.max(0, limit - used),
    limit
  }
}

/**
 * Check if user can create more sequences
 */
export async function checkSequenceLimit(
  userId: string,
  currentSequenceCount: number
): Promise<LimitCheckResult> {
  const tier = await getUserTier(userId)
  const limits = TIER_LIMITS[tier]
  const limit = limits.followUpSequences

  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      remaining: -1,
      limit: -1
    }
  }

  if (limit === 0) {
    return {
      allowed: false,
      remaining: 0,
      limit: 0
    }
  }

  return {
    allowed: currentSequenceCount < limit,
    remaining: Math.max(0, limit - currentSequenceCount),
    limit
  }
}

/**
 * Check if user can add more CRM contacts
 */
export async function checkCrmContactLimit(
  userId: string,
  currentContactCount: number
): Promise<LimitCheckResult> {
  const tier = await getUserTier(userId)
  const limits = TIER_LIMITS[tier]
  const limit = limits.crmContacts

  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      remaining: -1,
      limit: -1
    }
  }

  if (limit === 0) {
    return {
      allowed: false,
      remaining: 0,
      limit: 0
    }
  }

  return {
    allowed: currentContactCount < limit,
    remaining: Math.max(0, limit - currentContactCount),
    limit
  }
}

/**
 * Check if user can create more active jobs
 */
export async function checkActiveJobLimit(
  userId: string,
  currentActiveJobCount: number
): Promise<LimitCheckResult> {
  const tier = await getUserTier(userId)
  const limits = TIER_LIMITS[tier]
  const limit = limits.activeJobs

  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      remaining: -1,
      limit: -1
    }
  }

  if (limit === 0) {
    return {
      allowed: false,
      remaining: 0,
      limit: 0
    }
  }

  return {
    allowed: currentActiveJobCount < limit,
    remaining: Math.max(0, limit - currentActiveJobCount),
    limit
  }
}

/**
 * Check if user has access to crew management
 */
export async function checkCrewManagementAccess(userId: string): Promise<boolean> {
  const tier = await getUserTier(userId)
  return TIER_LIMITS[tier].crewManagement
}

/**
 * Check if user has access to invoice/payments
 */
export async function checkInvoiceAccess(userId: string): Promise<boolean> {
  const tier = await getUserTier(userId)
  return TIER_LIMITS[tier].invoicePayments
}

/**
 * Check if user has access to review management
 */
export async function checkReviewManagementAccess(userId: string): Promise<boolean> {
  const tier = await getUserTier(userId)
  return TIER_LIMITS[tier].reviewManagement
}

/**
 * Check if user has access to two-way conversations
 */
export async function checkTwoWayConversationsAccess(userId: string): Promise<boolean> {
  const tier = await getUserTier(userId)
  return TIER_LIMITS[tier].twoWayConversations
}

/**
 * Check if user has access to speed-to-lead
 */
export async function checkSpeedToLeadAccess(userId: string): Promise<boolean> {
  const tier = await getUserTier(userId)
  return TIER_LIMITS[tier].speedToLead
}

/**
 * Check knowledge base items limit
 */
export async function checkKnowledgeBaseLimit(
  userId: string,
  currentItemCount: number
): Promise<LimitCheckResult> {
  const tier = await getUserTier(userId)
  const limits = TIER_LIMITS[tier]
  const limit = limits.knowledgeBaseItems

  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      remaining: -1,
      limit: -1
    }
  }

  if (limit === 0) {
    return {
      allowed: false,
      remaining: 0,
      limit: 0
    }
  }

  return {
    allowed: currentItemCount < limit,
    remaining: Math.max(0, limit - currentItemCount),
    limit
  }
}

/**
 * Get all AI Employee feature access for a user
 */
export async function getAIEmployeeFeatureAccess(userId: string): Promise<{
  tier: Tier
  voiceMinutes: { limit: number; hasAccess: boolean }
  smsMessages: { limit: number; hasAccess: boolean }
  followUpSequences: { limit: number; hasAccess: boolean }
  crmContacts: { limit: number; hasAccess: boolean }
  activeJobs: { limit: number; hasAccess: boolean }
  crewManagement: boolean
  invoicePayments: boolean
  reviewManagement: boolean
  twoWayConversations: boolean
  speedToLead: boolean
  knowledgeBaseItems: { limit: number; hasAccess: boolean }
}> {
  const tier = await getUserTier(userId)
  const limits = TIER_LIMITS[tier]

  return {
    tier,
    voiceMinutes: {
      limit: limits.voiceMinutes,
      hasAccess: limits.voiceMinutes !== 0
    },
    smsMessages: {
      limit: limits.smsMessages,
      hasAccess: limits.smsMessages !== 0
    },
    followUpSequences: {
      limit: limits.followUpSequences,
      hasAccess: limits.followUpSequences !== 0
    },
    crmContacts: {
      limit: limits.crmContacts,
      hasAccess: limits.crmContacts !== 0
    },
    activeJobs: {
      limit: limits.activeJobs,
      hasAccess: limits.activeJobs !== 0
    },
    crewManagement: limits.crewManagement,
    invoicePayments: limits.invoicePayments,
    reviewManagement: limits.reviewManagement,
    twoWayConversations: limits.twoWayConversations,
    speedToLead: limits.speedToLead,
    knowledgeBaseItems: {
      limit: limits.knowledgeBaseItems,
      hasAccess: limits.knowledgeBaseItems !== 0
    }
  }
}
