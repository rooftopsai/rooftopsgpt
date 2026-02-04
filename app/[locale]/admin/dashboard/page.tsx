"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import {
  IconUsers,
  IconCash,
  IconMessage,
  IconFileAnalytics,
  IconWorld,
  IconTrendingUp,
  IconUserPlus,
  IconCrown,
  IconBriefcase,
  IconRefresh,
  IconChevronDown,
  IconChevronUp,
  IconSearch
} from "@tabler/icons-react"

// Admin emails that can access this dashboard
const ADMIN_EMAILS = [
  "sb@rooftops.ai",
  "steele@rooftops.ai",
  "admin@rooftops.ai"
]

interface DashboardStats {
  // User metrics
  totalUsers: number
  activeUsersLast7Days: number
  activeUsersLast30Days: number
  newUsersToday: number
  newUsersThisWeek: number
  newUsersThisMonth: number

  // Subscription metrics
  freeUsers: number
  premiumUsers: number
  businessUsers: number
  trialingUsers: number
  canceledUsers: number

  // Estimated revenue
  estimatedMRR: number

  // Usage metrics
  totalChats: number
  totalMessages: number
  totalReports: number
  totalWebSearches: number

  // This month usage
  chatsThisMonth: number
  reportsThisMonth: number
  webSearchesThisMonth: number
}

interface UserDetails {
  id: string
  email: string
  display_name: string
  created_at: string
  plan_type: string
  status: string
  chat_messages: number
  reports_generated: number
  last_active: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [users, setUsers] = useState<UserDetails[]>([])
  const [showUsers, setShowUsers] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [refreshing, setRefreshing] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    checkAuthAndFetchData()
  }, [])

  const checkAuthAndFetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user || !ADMIN_EMAILS.includes(user.email || "")) {
        router.push("/")
        return
      }

      setAuthorized(true)
      await fetchDashboardData()
    } catch (error) {
      console.error("Auth check failed:", error)
      router.push("/")
    }
  }

  const fetchDashboardData = async () => {
    setRefreshing(true)
    try {
      // Get current date info
      const now = new Date()
      const today = now.toISOString().split("T")[0]
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, display_name, created_at, updated_at")

      if (profilesError) throw profilesError

      // Fetch all subscriptions
      const { data: subscriptions, error: subsError } = await supabase
        .from("subscriptions")
        .select("*")

      if (subsError) throw subsError

      // Fetch user usage data
      const { data: userUsage, error: usageError } = await supabase
        .from("user_usage")
        .select("*")

      if (usageError) throw usageError

      // Fetch messages count
      const { count: totalMessages } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })

      // Fetch chats count
      const { count: totalChats } = await supabase
        .from("chats")
        .select("*", { count: "exact", head: true })

      // Fetch property reports count
      const { count: totalReports } = await supabase
        .from("property_reports")
        .select("*", { count: "exact", head: true })

      // Calculate metrics
      const totalUsers = profiles?.length || 0

      // Active users (updated in last 7/30 days)
      const activeUsersLast7Days = profiles?.filter(p =>
        p.updated_at && new Date(p.updated_at) > new Date(weekAgo)
      ).length || 0

      const activeUsersLast30Days = profiles?.filter(p =>
        p.updated_at && new Date(p.updated_at) > new Date(monthAgo)
      ).length || 0

      // New users
      const newUsersToday = profiles?.filter(p =>
        p.created_at?.startsWith(today)
      ).length || 0

      const newUsersThisWeek = profiles?.filter(p =>
        new Date(p.created_at) > new Date(weekAgo)
      ).length || 0

      const newUsersThisMonth = profiles?.filter(p =>
        new Date(p.created_at) > new Date(monthAgo)
      ).length || 0

      // Subscription breakdown
      const activeSubscriptions = subscriptions?.filter(s =>
        s.status === "active" || s.status === "trialing"
      ) || []

      const freeUsers = totalUsers - activeSubscriptions.length
      const premiumUsers = activeSubscriptions.filter(s => s.plan_type === "premium").length
      const businessUsers = activeSubscriptions.filter(s => s.plan_type === "business").length
      const trialingUsers = subscriptions?.filter(s => s.status === "trialing").length || 0
      const canceledUsers = subscriptions?.filter(s => s.status === "canceled").length || 0

      // Estimated MRR (Premium = $29, Business = $99)
      const estimatedMRR = (premiumUsers * 29) + (businessUsers * 99)

      // Usage this month
      const thisMonthUsage = userUsage?.filter(u => u.month === thisMonth) || []
      const chatsThisMonth = thisMonthUsage.reduce((sum, u) =>
        sum + (u.chat_messages_free || 0) + (u.chat_messages_premium || 0), 0
      )
      const reportsThisMonth = thisMonthUsage.reduce((sum, u) =>
        sum + (u.reports_generated || 0), 0
      )
      const webSearchesThisMonth = thisMonthUsage.reduce((sum, u) =>
        sum + (u.web_searches || 0), 0
      )

      // Total usage across all time
      const totalWebSearches = userUsage?.reduce((sum, u) =>
        sum + (u.web_searches || 0), 0
      ) || 0

      setStats({
        totalUsers,
        activeUsersLast7Days,
        activeUsersLast30Days,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth,
        freeUsers,
        premiumUsers,
        businessUsers,
        trialingUsers,
        canceledUsers,
        estimatedMRR,
        totalChats: totalChats || 0,
        totalMessages: totalMessages || 0,
        totalReports: totalReports || 0,
        totalWebSearches,
        chatsThisMonth,
        reportsThisMonth,
        webSearchesThisMonth
      })

      // Fetch detailed user list with auth.users email
      const { data: authUsers } = await supabase.auth.admin.listUsers()

      // Create user details list
      const userDetails: UserDetails[] = profiles?.map(profile => {
        const authUser = authUsers?.users?.find(u => u.id === profile.user_id)
        const subscription = subscriptions?.find(s => s.user_id === profile.user_id)
        const usage = userUsage?.filter(u => u.user_id === profile.user_id)

        const totalChats = usage?.reduce((sum, u) =>
          sum + (u.chat_messages_free || 0) + (u.chat_messages_premium || 0), 0
        ) || 0
        const totalReports = usage?.reduce((sum, u) =>
          sum + (u.reports_generated || 0), 0
        ) || 0

        return {
          id: profile.user_id,
          email: authUser?.email || "Unknown",
          display_name: profile.display_name || "No name",
          created_at: profile.created_at,
          plan_type: subscription?.plan_type || "free",
          status: subscription?.status || "free",
          chat_messages: totalChats,
          reports_generated: totalReports,
          last_active: profile.updated_at || profile.created_at
        }
      }) || []

      // Sort by created_at descending
      userDetails.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setUsers(userDetails)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.display_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!authorized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="size-8 animate-spin rounded-full border-4 border-gray-300 border-t-cyan-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 dark:bg-gray-900 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Admin Dashboard
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              Rooftops AI Platform Analytics
            </p>
          </div>
          <button
            onClick={() => fetchDashboardData()}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-white transition hover:bg-cyan-700 disabled:opacity-50"
          >
            <IconRefresh className={`size-5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* User Stats */}
        <div className="mb-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-200">
            Users
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={IconUsers}
              label="Total Users"
              value={stats?.totalUsers || 0}
              color="blue"
            />
            <StatCard
              icon={IconTrendingUp}
              label="Active (7 days)"
              value={stats?.activeUsersLast7Days || 0}
              color="green"
              subtext={`${Math.round(((stats?.activeUsersLast7Days || 0) / (stats?.totalUsers || 1)) * 100)}% of total`}
            />
            <StatCard
              icon={IconUserPlus}
              label="New Today"
              value={stats?.newUsersToday || 0}
              color="cyan"
              subtext={`${stats?.newUsersThisWeek || 0} this week`}
            />
            <StatCard
              icon={IconUserPlus}
              label="New This Month"
              value={stats?.newUsersThisMonth || 0}
              color="purple"
            />
          </div>
        </div>

        {/* Subscription Stats */}
        <div className="mb-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-200">
            Subscriptions & Revenue
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              icon={IconUsers}
              label="Free Users"
              value={stats?.freeUsers || 0}
              color="gray"
            />
            <StatCard
              icon={IconCrown}
              label="Premium"
              value={stats?.premiumUsers || 0}
              color="yellow"
              subtext="$29/mo"
            />
            <StatCard
              icon={IconBriefcase}
              label="Business"
              value={stats?.businessUsers || 0}
              color="purple"
              subtext="$99/mo"
            />
            <StatCard
              icon={IconTrendingUp}
              label="Trialing"
              value={stats?.trialingUsers || 0}
              color="cyan"
            />
            <StatCard
              icon={IconCash}
              label="Est. MRR"
              value={`$${stats?.estimatedMRR || 0}`}
              color="green"
              isLarge
            />
          </div>
        </div>

        {/* Usage Stats */}
        <div className="mb-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-200">
            Platform Usage
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={IconMessage}
              label="Total Chats"
              value={stats?.totalChats || 0}
              color="blue"
              subtext={`${stats?.chatsThisMonth || 0} this month`}
            />
            <StatCard
              icon={IconMessage}
              label="Total Messages"
              value={stats?.totalMessages || 0}
              color="cyan"
            />
            <StatCard
              icon={IconFileAnalytics}
              label="Roof Reports"
              value={stats?.totalReports || 0}
              color="green"
              subtext={`${stats?.reportsThisMonth || 0} this month`}
            />
            <StatCard
              icon={IconWorld}
              label="Web Searches"
              value={stats?.totalWebSearches || 0}
              color="purple"
              subtext={`${stats?.webSearchesThisMonth || 0} this month`}
            />
          </div>
        </div>

        {/* User List */}
        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
          <div
            className="flex cursor-pointer items-center justify-between"
            onClick={() => setShowUsers(!showUsers)}
          >
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              All Users ({users.length})
            </h2>
            {showUsers ? (
              <IconChevronUp className="size-5 text-gray-500" />
            ) : (
              <IconChevronDown className="size-5 text-gray-500" />
            )}
          </div>

          {showUsers && (
            <div className="mt-4">
              {/* Search */}
              <div className="mb-4 flex items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                <IconSearch className="size-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none dark:text-white"
                />
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Chats</th>
                      <th className="px-4 py-3">Reports</th>
                      <th className="px-4 py-3">Joined</th>
                      <th className="px-4 py-3">Last Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {user.display_name}
                            </div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <PlanBadge plan={user.plan_type} status={user.status} />
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                          {user.chat_messages}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                          {user.reports_generated}
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                          {new Date(user.last_active).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  subtext,
  isLarge
}: {
  icon: React.ElementType
  label: string
  value: number | string
  color: "blue" | "yellow" | "purple" | "green" | "cyan" | "gray"
  subtext?: string
  isLarge?: boolean
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    yellow: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    cyan: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-800">
      <div className={`mb-3 inline-flex rounded-lg p-2 ${colors[color]}`}>
        <Icon className="size-5" />
      </div>
      <div className={`font-bold text-gray-900 dark:text-white ${isLarge ? "text-3xl" : "text-2xl"}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      {subtext && (
        <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">{subtext}</div>
      )}
    </div>
  )
}

function PlanBadge({ plan, status }: { plan: string; status: string }) {
  const getStyles = () => {
    if (status === "trialing") {
      return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
    }
    if (status === "canceled") {
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    }
    switch (plan) {
      case "business":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
      case "premium":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
    }
  }

  const getLabel = () => {
    if (status === "trialing") return "Trial"
    if (status === "canceled") return "Canceled"
    return plan.charAt(0).toUpperCase() + plan.slice(1)
  }

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStyles()}`}>
      {getLabel()}
    </span>
  )
}
