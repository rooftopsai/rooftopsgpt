import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { createClient as createServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// Admin emails that can access this endpoint
const ADMIN_EMAILS = [
  "sb@rooftops.ai",
  "steele@rooftops.ai",
  "admin@rooftops.ai"
]

// Service role client for accessing auth.users
const getServiceClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin access using server client
    const serverClient = await createServerClient()
    const { data: { user } } = await serverClient.auth.getUser()

    if (!user || !ADMIN_EMAILS.includes(user.email || "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const supabase = getServiceClient()

    // Fetch all auth users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    })

    if (authError) {
      console.error("Error fetching auth users:", authError)
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
    }

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError)
    }

    // Fetch all subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from("subscriptions")
      .select("*")

    if (subsError) {
      console.error("Error fetching subscriptions:", subsError)
    }

    // Fetch user usage data
    const { data: userUsage, error: usageError } = await supabase
      .from("user_usage")
      .select("*")

    if (usageError) {
      console.error("Error fetching user usage:", usageError)
    }

    // Fetch property reports per user
    const { data: reports, error: reportsError } = await supabase
      .from("property_reports")
      .select("user_id, created_at")

    if (reportsError) {
      console.error("Error fetching reports:", reportsError)
    }

    // Fetch chats per user
    const { data: chats, error: chatsError } = await supabase
      .from("chats")
      .select("user_id, created_at")

    if (chatsError) {
      console.error("Error fetching chats:", chatsError)
    }

    // Fetch messages count
    const { count: totalMessages } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })

    // Fetch total chats count
    const { count: totalChats } = await supabase
      .from("chats")
      .select("*", { count: "exact", head: true })

    // Fetch total reports count
    const { count: totalReports } = await supabase
      .from("property_reports")
      .select("*", { count: "exact", head: true })

    // Build user list with all data
    const users = authData.users.map(authUser => {
      const profile = profiles?.find(p => p.user_id === authUser.id)
      const subscription = subscriptions?.find(s => s.user_id === authUser.id)
      const usage = userUsage?.filter(u => u.user_id === authUser.id) || []
      const userReports = reports?.filter(r => r.user_id === authUser.id) || []
      const userChats = chats?.filter(c => c.user_id === authUser.id) || []

      // Calculate total usage
      const totalChatMessages = usage.reduce((sum, u) =>
        sum + (u.chat_messages_free || 0) + (u.chat_messages_premium || 0), 0
      )
      const totalUserReports = usage.reduce((sum, u) =>
        sum + (u.reports_generated || 0), 0
      )
      const totalWebSearches = usage.reduce((sum, u) =>
        sum + (u.web_searches || 0), 0
      )

      return {
        id: authUser.id,
        email: authUser.email || "Unknown",
        display_name: profile?.display_name || authUser.user_metadata?.display_name || "No name",
        created_at: authUser.created_at,
        last_sign_in: authUser.last_sign_in_at,
        email_confirmed: !!authUser.email_confirmed_at,
        plan_type: subscription?.plan_type || "free",
        subscription_status: subscription?.status || "none",
        stripe_customer_id: subscription?.stripe_customer_id,
        stripe_subscription_id: subscription?.stripe_subscription_id,
        trial_end: subscription?.current_period_end,
        chat_messages: totalChatMessages,
        reports_generated: totalUserReports,
        reports_count: userReports.length,
        chats_count: userChats.length,
        web_searches: totalWebSearches,
        profile_updated_at: profile?.updated_at,
        has_onboarded: profile?.has_onboarded || false
      }
    })

    // Sort by created_at descending (newest first)
    users.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    // Calculate stats
    const now = new Date()
    const today = now.toISOString().split("T")[0]
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

    const activeSubscriptions = subscriptions?.filter(s =>
      s.status === "active" || s.status === "trialing"
    ) || []

    const trialingSubscriptions = subscriptions?.filter(s =>
      s.status === "trialing"
    ) || []

    const premiumSubs = activeSubscriptions.filter(s => s.plan_type === "premium")
    const businessSubs = activeSubscriptions.filter(s => s.plan_type === "business")

    // Usage this month
    const thisMonthUsage = userUsage?.filter(u => u.month === thisMonth) || []

    const stats = {
      totalUsers: users.length,
      activeUsersLast7Days: users.filter(u =>
        u.last_sign_in && new Date(u.last_sign_in) > weekAgo
      ).length,
      activeUsersLast30Days: users.filter(u =>
        u.last_sign_in && new Date(u.last_sign_in) > monthAgo
      ).length,
      newUsersToday: users.filter(u =>
        u.created_at.startsWith(today)
      ).length,
      newUsersThisWeek: users.filter(u =>
        new Date(u.created_at) > weekAgo
      ).length,
      newUsersThisMonth: users.filter(u =>
        new Date(u.created_at) > monthAgo
      ).length,
      freeUsers: users.length - activeSubscriptions.length,
      premiumUsers: premiumSubs.length,
      businessUsers: businessSubs.length,
      trialingUsers: trialingSubscriptions.length,
      canceledUsers: subscriptions?.filter(s => s.status === "canceled").length || 0,
      estimatedMRR: (premiumSubs.length * 29) + (businessSubs.length * 99),
      totalChats: totalChats || 0,
      totalMessages: totalMessages || 0,
      totalReports: totalReports || 0,
      totalWebSearches: userUsage?.reduce((sum, u) => sum + (u.web_searches || 0), 0) || 0,
      chatsThisMonth: thisMonthUsage.reduce((sum, u) =>
        sum + (u.chat_messages_free || 0) + (u.chat_messages_premium || 0), 0
      ),
      reportsThisMonth: thisMonthUsage.reduce((sum, u) =>
        sum + (u.reports_generated || 0), 0
      ),
      webSearchesThisMonth: thisMonthUsage.reduce((sum, u) =>
        sum + (u.web_searches || 0), 0
      )
    }

    return NextResponse.json({ users, stats })
  } catch (error) {
    console.error("Admin users API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
