// db/user-usage.ts
import { supabase } from "@/lib/supabase/service-role"

export interface UserUsage {
  id: string
  user_id: string
  month: string // Format: YYYY-MM
  reports_generated: number
  chat_messages_premium: number
  chat_messages_free: number
  web_searches: number
  last_chat_date: string | null
  daily_chat_count: number
  created_at: string
  updated_at: string
}

export interface UserUsageInsert {
  user_id: string
  month: string
  reports_generated?: number
  chat_messages_premium?: number
  chat_messages_free?: number
  web_searches?: number
  last_chat_date?: string | null
  daily_chat_count?: number
}

export interface UserUsageUpdate {
  reports_generated?: number
  chat_messages_premium?: number
  chat_messages_free?: number
  web_searches?: number
  last_chat_date?: string | null
  daily_chat_count?: number
}

/**
 * Get current month in YYYY-MM format
 */
export function getCurrentMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

/**
 * Get user usage for a specific month
 */
export async function getUserUsage(
  userId: string,
  month: string = getCurrentMonth()
): Promise<UserUsage | null> {
  const { data, error } = await supabase
    .from("user_usage")
    .select("*")
    .eq("user_id", userId)
    .eq("month", month)
    .single()

  if (error && error.code !== "PGRST116") {
    throw new Error(`Error fetching user usage: ${error.message}`)
  }

  return data
}

/**
 * Get or create user usage for current month
 */
export async function getOrCreateUserUsage(
  userId: string,
  month: string = getCurrentMonth()
): Promise<UserUsage> {
  const existing = await getUserUsage(userId, month)
  if (existing) {
    return existing
  }

  // Create new usage record for this month
  const { data, error } = await supabase
    .from("user_usage")
    .insert({
      user_id: userId,
      month,
      reports_generated: 0,
      chat_messages_premium: 0,
      chat_messages_free: 0,
      web_searches: 0,
      daily_chat_count: 0,
      last_chat_date: null
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Error creating user usage: ${error.message}`)
  }

  return data
}

/**
 * Increment report usage
 */
export async function incrementReportUsage(userId: string): Promise<UserUsage> {
  const month = getCurrentMonth()
  const usage = await getOrCreateUserUsage(userId, month)

  const { data, error } = await supabase
    .from("user_usage")
    .update({
      reports_generated: usage.reports_generated + 1
    })
    .eq("user_id", userId)
    .eq("month", month)
    .select()
    .single()

  if (error) {
    throw new Error(`Error incrementing report usage: ${error.message}`)
  }

  return data
}

/**
 * Increment chat usage
 */
export async function incrementChatUsage(
  userId: string,
  model: "gpt-4o" | "gpt-4.5-mini"
): Promise<UserUsage> {
  const month = getCurrentMonth()
  const today = new Date().toISOString().split("T")[0]
  const usage = await getOrCreateUserUsage(userId, month)

  // Check if we need to reset daily count
  const needsDailyReset =
    !usage.last_chat_date || usage.last_chat_date !== today

  const updates: UserUsageUpdate = {
    last_chat_date: today
  }

  // Increment the appropriate counter
  if (model === "gpt-4.5-mini") {
    updates.chat_messages_premium = usage.chat_messages_premium + 1
  } else {
    updates.chat_messages_free = usage.chat_messages_free + 1
  }

  // Handle daily count (for free tier daily limit)
  if (needsDailyReset) {
    updates.daily_chat_count = 1
  } else {
    updates.daily_chat_count = usage.daily_chat_count + 1
  }

  const { data, error } = await supabase
    .from("user_usage")
    .update(updates)
    .eq("user_id", userId)
    .eq("month", month)
    .select()
    .single()

  if (error) {
    throw new Error(`Error incrementing chat usage: ${error.message}`)
  }

  return data
}

/**
 * Increment web search usage
 */
export async function incrementWebSearchUsage(
  userId: string
): Promise<UserUsage> {
  const month = getCurrentMonth()
  const usage = await getOrCreateUserUsage(userId, month)

  const { data, error } = await supabase
    .from("user_usage")
    .update({
      web_searches: usage.web_searches + 1
    })
    .eq("user_id", userId)
    .eq("month", month)
    .select()
    .single()

  if (error) {
    throw new Error(`Error incrementing web search usage: ${error.message}`)
  }

  return data
}

/**
 * Reset daily chat count (called at midnight)
 */
export async function resetDailyChatCount(userId: string): Promise<UserUsage> {
  const month = getCurrentMonth()
  const usage = await getOrCreateUserUsage(userId, month)

  const { data, error } = await supabase
    .from("user_usage")
    .update({
      daily_chat_count: 0
    })
    .eq("user_id", userId)
    .eq("month", month)
    .select()
    .single()

  if (error) {
    throw new Error(`Error resetting daily chat count: ${error.message}`)
  }

  return data
}
