// app/api/agent/usage/route.ts
// API routes for agent usage tracking and billing

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { checkAgentAccess, getUserTier, TIER_LIMITS } from "@/lib/entitlements"

export const runtime = "nodejs"

// Agent usage limits by tier
const AGENT_LIMITS = {
  free: {
    maxTokensPerMonth: 0,
    maxSessionsPerMonth: 0,
    maxTasksPerMonth: 0
  },
  premium: {
    maxTokensPerMonth: 500000, // ~$10 worth of tokens
    maxSessionsPerMonth: 50,
    maxTasksPerMonth: 200
  },
  business: {
    maxTokensPerMonth: 2000000, // ~$40 worth of tokens
    maxSessionsPerMonth: 200,
    maxTasksPerMonth: 1000
  }
}

// GET: Get usage stats for the current user
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Check agent access
    console.log("[Agent Usage API] Checking access for user:", user.id)
    const hasAccess = await checkAgentAccess(user.id)
    console.log("[Agent Usage API] checkAgentAccess result:", hasAccess)
    if (!hasAccess) {
      console.log("[Agent Usage API] Access denied - returning 403")
      return NextResponse.json(
        {
          error: "Agent feature requires Premium or Business subscription",
          hasAccess: false
        },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7)

    // Get user's tier
    const tier = await getUserTier(user.id)
    const limits = AGENT_LIMITS[tier as keyof typeof AGENT_LIMITS] || AGENT_LIMITS.free

    // Get usage for the month
    const { data: usage, error } = await supabase
      .from("agent_usage")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", month)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Error fetching agent usage:", error)
      return NextResponse.json(
        { error: "Failed to fetch usage" },
        { status: 500 }
      )
    }

    const currentUsage = usage || {
      total_tokens_input: 0,
      total_tokens_output: 0,
      total_tasks_executed: 0,
      total_tool_calls: 0,
      total_sessions: 0,
      estimated_cost_cents: 0
    }

    const totalTokens = currentUsage.total_tokens_input + currentUsage.total_tokens_output

    // Calculate remaining
    const tokensRemaining = Math.max(0, limits.maxTokensPerMonth - totalTokens)
    const sessionsRemaining = Math.max(0, limits.maxSessionsPerMonth - currentUsage.total_sessions)
    const tasksRemaining = Math.max(0, limits.maxTasksPerMonth - currentUsage.total_tasks_executed)

    // Calculate percentages
    const tokensPercentUsed = limits.maxTokensPerMonth > 0
      ? Math.round((totalTokens / limits.maxTokensPerMonth) * 100)
      : 0
    const sessionsPercentUsed = limits.maxSessionsPerMonth > 0
      ? Math.round((currentUsage.total_sessions / limits.maxSessionsPerMonth) * 100)
      : 0
    const tasksPercentUsed = limits.maxTasksPerMonth > 0
      ? Math.round((currentUsage.total_tasks_executed / limits.maxTasksPerMonth) * 100)
      : 0

    return NextResponse.json({
      hasAccess: true,
      tier,
      month,
      usage: {
        tokens: {
          input: currentUsage.total_tokens_input,
          output: currentUsage.total_tokens_output,
          total: totalTokens,
          limit: limits.maxTokensPerMonth,
          remaining: tokensRemaining,
          percentUsed: tokensPercentUsed
        },
        sessions: {
          total: currentUsage.total_sessions,
          limit: limits.maxSessionsPerMonth,
          remaining: sessionsRemaining,
          percentUsed: sessionsPercentUsed
        },
        tasks: {
          total: currentUsage.total_tasks_executed,
          limit: limits.maxTasksPerMonth,
          remaining: tasksRemaining,
          percentUsed: tasksPercentUsed
        },
        toolCalls: currentUsage.total_tool_calls,
        estimatedCostCents: currentUsage.estimated_cost_cents,
        estimatedCostDollars: (currentUsage.estimated_cost_cents / 100).toFixed(2)
      },
      limits: {
        maxTokensPerMonth: limits.maxTokensPerMonth,
        maxSessionsPerMonth: limits.maxSessionsPerMonth,
        maxTasksPerMonth: limits.maxTasksPerMonth
      },
      withinLimits: {
        tokens: totalTokens < limits.maxTokensPerMonth,
        sessions: currentUsage.total_sessions < limits.maxSessionsPerMonth,
        tasks: currentUsage.total_tasks_executed < limits.maxTasksPerMonth
      }
    })
  } catch (error) {
    console.error("Agent usage GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST: Check if user can perform an action (pre-check)
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Check agent access
    const hasAccess = await checkAgentAccess(user.id)
    if (!hasAccess) {
      return NextResponse.json(
        {
          allowed: false,
          reason: "Agent feature requires Premium or Business subscription"
        },
        { status: 200 }
      )
    }

    const body = await request.json()
    const { action, estimatedTokens } = body

    // Get user's tier
    const tier = await getUserTier(user.id)
    const limits = AGENT_LIMITS[tier as keyof typeof AGENT_LIMITS] || AGENT_LIMITS.free

    // Get current usage
    const currentMonth = new Date().toISOString().slice(0, 7)
    const { data: usage } = await supabase
      .from("agent_usage")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", currentMonth)
      .single()

    const currentUsage = usage || {
      total_tokens_input: 0,
      total_tokens_output: 0,
      total_tasks_executed: 0,
      total_sessions: 0
    }

    const totalTokens = currentUsage.total_tokens_input + currentUsage.total_tokens_output

    // Check limits based on action
    let allowed = true
    let reason = ""

    switch (action) {
      case "create_session":
        if (currentUsage.total_sessions >= limits.maxSessionsPerMonth) {
          allowed = false
          reason = `Monthly session limit (${limits.maxSessionsPerMonth}) reached`
        }
        break

      case "execute_task":
        if (currentUsage.total_tasks_executed >= limits.maxTasksPerMonth) {
          allowed = false
          reason = `Monthly task limit (${limits.maxTasksPerMonth}) reached`
        }
        break

      case "send_message":
        const projectedTokens = totalTokens + (estimatedTokens || 2000)
        if (projectedTokens > limits.maxTokensPerMonth) {
          allowed = false
          reason = `Monthly token limit (${limits.maxTokensPerMonth.toLocaleString()}) would be exceeded`
        }
        break

      default:
        // General check
        if (totalTokens >= limits.maxTokensPerMonth) {
          allowed = false
          reason = `Monthly token limit (${limits.maxTokensPerMonth.toLocaleString()}) reached`
        }
    }

    return NextResponse.json({
      allowed,
      reason: allowed ? undefined : reason,
      tier,
      currentUsage: {
        tokens: totalTokens,
        sessions: currentUsage.total_sessions,
        tasks: currentUsage.total_tasks_executed
      },
      limits
    })
  } catch (error) {
    console.error("Agent usage POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
