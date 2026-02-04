"use client"

import { useState, useEffect, useMemo } from "react"
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
  IconSearch,
  IconMail,
  IconDownload,
  IconCheck,
  IconX,
  IconExternalLink,
  IconSend,
  IconGift,
  IconEye
} from "@tabler/icons-react"
import { toast } from "sonner"

// Admin emails that can access this dashboard
const ADMIN_EMAILS = [
  "sb@rooftops.ai",
  "steele@rooftops.ai",
  "admin@rooftops.ai"
]

interface DashboardStats {
  totalUsers: number
  activeUsersLast7Days: number
  activeUsersLast30Days: number
  newUsersToday: number
  newUsersThisWeek: number
  newUsersThisMonth: number
  freeUsers: number
  premiumUsers: number
  businessUsers: number
  trialingUsers: number
  canceledUsers: number
  estimatedMRR: number
  totalChats: number
  totalMessages: number
  totalReports: number
  totalWebSearches: number
  chatsThisMonth: number
  reportsThisMonth: number
  webSearchesThisMonth: number
}

interface UserDetails {
  id: string
  email: string
  display_name: string
  created_at: string
  last_sign_in: string | null
  email_confirmed: boolean
  plan_type: string
  subscription_status: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  trial_end: string | null
  chat_messages: number
  reports_generated: number
  reports_count: number
  chats_count: number
  web_searches: number
  profile_updated_at: string | null
  has_onboarded: boolean
}

type FilterType = "all" | "free" | "premium" | "business" | "trialing" | "canceled"
type SortField = "created_at" | "last_sign_in" | "email" | "chat_messages" | "reports_generated"
type SortOrder = "asc" | "desc"

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = createClient()

  // State
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [users, setUsers] = useState<UserDetails[]>([])
  const [refreshing, setRefreshing] = useState(false)

  // User list state
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<FilterType>("all")
  const [sortField, setSortField] = useState<SortField>("created_at")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  // Modal state
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailSubject, setEmailSubject] = useState("")
  const [emailMessage, setEmailMessage] = useState("")
  const [sendingEmail, setSendingEmail] = useState(false)

  // Action state
  const [actionLoading, setActionLoading] = useState(false)

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
      const response = await fetch("/api/admin/users")
      if (!response.ok) {
        throw new Error("Failed to fetch data")
      }

      const data = await response.json()
      setUsers(data.users || [])
      setStats(data.stats || null)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      toast.error("Failed to fetch dashboard data")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let result = users.filter(user => {
      // Search filter
      const matchesSearch =
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.display_name.toLowerCase().includes(searchTerm.toLowerCase())

      // Plan filter
      let matchesFilter = true
      if (filterType === "free") {
        matchesFilter = user.subscription_status === "none" || user.plan_type === "free"
      } else if (filterType === "premium") {
        matchesFilter = user.plan_type === "premium" && user.subscription_status !== "canceled"
      } else if (filterType === "business") {
        matchesFilter = user.plan_type === "business" && user.subscription_status !== "canceled"
      } else if (filterType === "trialing") {
        matchesFilter = user.subscription_status === "trialing"
      } else if (filterType === "canceled") {
        matchesFilter = user.subscription_status === "canceled"
      }

      return matchesSearch && matchesFilter
    })

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      if (sortField === "created_at" || sortField === "last_sign_in") {
        aVal = aVal ? new Date(aVal).getTime() : 0
        bVal = bVal ? new Date(bVal).getTime() : 0
      } else if (typeof aVal === "string") {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1
      }
      return aVal < bVal ? 1 : -1
    })

    return result
  }, [users, searchTerm, filterType, sortField, sortOrder])

  // Actions
  const handleSendEmail = async (targetUserIds?: string[]) => {
    if (!emailSubject || !emailMessage) {
      toast.error("Please enter subject and message")
      return
    }

    setSendingEmail(true)
    try {
      const userIds = targetUserIds || selectedUsers
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_email",
          userIds,
          data: { subject: emailSubject, message: emailMessage }
        })
      })

      const result = await response.json()
      if (result.success) {
        toast.success(`Email sent to ${result.sent} user(s)`)
        setShowEmailModal(false)
        setEmailSubject("")
        setEmailMessage("")
        setSelectedUsers([])
      } else {
        toast.error(result.error || "Failed to send email")
      }
    } catch (error) {
      toast.error("Failed to send email")
    } finally {
      setSendingEmail(false)
    }
  }

  const handleExtendTrial = async (userId: string, days: number) => {
    setActionLoading(true)
    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "extend_trial",
          userId,
          data: { days }
        })
      })

      const result = await response.json()
      if (result.success) {
        toast.success(result.message)
        fetchDashboardData()
      } else {
        toast.error(result.error || "Failed to extend trial")
      }
    } catch (error) {
      toast.error("Failed to extend trial")
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpgradeUser = async (userId: string, planType: string) => {
    setActionLoading(true)
    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upgrade_user",
          userId,
          data: { plan_type: planType, status: "active" }
        })
      })

      const result = await response.json()
      if (result.success) {
        toast.success(result.message)
        fetchDashboardData()
        setShowUserModal(false)
      } else {
        toast.error(result.error || "Failed to upgrade user")
      }
    } catch (error) {
      toast.error("Failed to upgrade user")
    } finally {
      setActionLoading(false)
    }
  }

  const handleExportUsers = async () => {
    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export_users" })
      })

      const result = await response.json()
      if (result.success) {
        const blob = new Blob([result.csv], { type: "text/csv" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `rooftops-users-${new Date().toISOString().split("T")[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
        toast.success(`Exported ${result.count} users`)
      }
    } catch (error) {
      toast.error("Failed to export users")
    }
  }

  const toggleSelectUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const selectAllFiltered = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id))
    }
  }

  // Helper functions
  const formatDate = (date: string | null) => {
    if (!date) return "Never"
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    })
  }

  const formatDateTime = (date: string | null) => {
    if (!date) return "Never"
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    })
  }

  const getTimeAgo = (date: string | null) => {
    if (!date) return "Never"
    const now = new Date()
    const then = new Date(date)
    const diffMs = now.getTime() - then.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  }

  if (!authorized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto mb-4 size-12 animate-spin rounded-full border-4 border-gray-300 border-t-cyan-500"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Rooftops AI Platform Analytics & User Management
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportUsers}
                className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                <IconDownload className="size-4" />
                Export CSV
              </button>
              <button
                onClick={() => fetchDashboardData()}
                disabled={refreshing}
                className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
              >
                <IconRefresh className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={IconUsers}
            label="Total Users"
            value={stats?.totalUsers || 0}
            color="blue"
            trend={`+${stats?.newUsersThisMonth || 0} this month`}
          />
          <StatCard
            icon={IconTrendingUp}
            label="Active (7d)"
            value={stats?.activeUsersLast7Days || 0}
            color="green"
            trend={`${Math.round(((stats?.activeUsersLast7Days || 0) / (stats?.totalUsers || 1)) * 100)}% of total`}
          />
          <StatCard
            icon={IconCash}
            label="Est. MRR"
            value={`$${(stats?.estimatedMRR || 0).toLocaleString()}`}
            color="emerald"
            isLarge
          />
          <StatCard
            icon={IconUserPlus}
            label="New Today"
            value={stats?.newUsersToday || 0}
            color="purple"
            trend={`${stats?.newUsersThisWeek || 0} this week`}
          />
        </div>

        {/* Subscription Breakdown */}
        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
            Subscription Breakdown
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <MiniStat label="Free" value={stats?.freeUsers || 0} color="gray" />
            <MiniStat label="Premium" value={stats?.premiumUsers || 0} color="yellow" subtext="$29/mo" />
            <MiniStat label="Business" value={stats?.businessUsers || 0} color="purple" subtext="$99/mo" />
            <MiniStat label="Trialing" value={stats?.trialingUsers || 0} color="cyan" />
            <MiniStat label="Canceled" value={stats?.canceledUsers || 0} color="red" />
            <MiniStat
              label="Conversion"
              value={`${Math.round((((stats?.premiumUsers || 0) + (stats?.businessUsers || 0)) / (stats?.totalUsers || 1)) * 100)}%`}
              color="green"
            />
          </div>
        </div>

        {/* Usage Stats */}
        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
            Platform Usage
          </h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <UsageStat
              icon={IconMessage}
              label="Total Chats"
              value={stats?.totalChats || 0}
              thisMonth={stats?.chatsThisMonth || 0}
            />
            <UsageStat
              icon={IconMessage}
              label="Messages"
              value={stats?.totalMessages || 0}
            />
            <UsageStat
              icon={IconFileAnalytics}
              label="Roof Reports"
              value={stats?.totalReports || 0}
              thisMonth={stats?.reportsThisMonth || 0}
            />
            <UsageStat
              icon={IconWorld}
              label="Web Searches"
              value={stats?.totalWebSearches || 0}
              thisMonth={stats?.webSearchesThisMonth || 0}
            />
          </div>
        </div>

        {/* User Management */}
        <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
          {/* Toolbar */}
          <div className="border-b p-4 dark:border-gray-700">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-3">
                {/* Search */}
                <div className="relative max-w-md flex-1">
                  <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by email or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border bg-gray-50 py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-cyan-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Filter dropdown */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as FilterType)}
                  className="rounded-lg border bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Plans</option>
                  <option value="free">Free</option>
                  <option value="premium">Premium</option>
                  <option value="business">Business</option>
                  <option value="trialing">Trialing</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>

              {/* Bulk actions */}
              {selectedUsers.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedUsers.length} selected
                  </span>
                  <button
                    onClick={() => setShowEmailModal(true)}
                    className="flex items-center gap-1 rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-700"
                  >
                    <IconMail className="size-4" />
                    Email
                  </button>
                  <button
                    onClick={() => setSelectedUsers([])}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* User Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700/50 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                      onChange={selectAllFiltered}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                  </th>
                  <th className="cursor-pointer px-4 py-3 text-left hover:text-gray-700 dark:hover:text-gray-200"
                    onClick={() => {
                      if (sortField === "email") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                      } else {
                        setSortField("email")
                        setSortOrder("asc")
                      }
                    }}
                  >
                    User {sortField === "email" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-4 py-3 text-left">Plan</th>
                  <th className="cursor-pointer px-4 py-3 text-left hover:text-gray-700 dark:hover:text-gray-200"
                    onClick={() => {
                      if (sortField === "chat_messages") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                      } else {
                        setSortField("chat_messages")
                        setSortOrder("desc")
                      }
                    }}
                  >
                    Usage {sortField === "chat_messages" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="cursor-pointer px-4 py-3 text-left hover:text-gray-700 dark:hover:text-gray-200"
                    onClick={() => {
                      if (sortField === "created_at") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                      } else {
                        setSortField("created_at")
                        setSortOrder("desc")
                      }
                    }}
                  >
                    Joined {sortField === "created_at" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="cursor-pointer px-4 py-3 text-left hover:text-gray-700 dark:hover:text-gray-200"
                    onClick={() => {
                      if (sortField === "last_sign_in") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                      } else {
                        setSortField("last_sign_in")
                        setSortOrder("desc")
                      }
                    }}
                  >
                    Last Active {sortField === "last_sign_in" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="transition hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleSelectUser(user.id)}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-xs font-bold text-white">
                          {user.display_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.display_name}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            {user.email}
                            {user.email_confirmed && (
                              <IconCheck className="size-3 text-green-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <PlanBadge plan={user.plan_type} status={user.subscription_status} />
                      {user.subscription_status === "trialing" && user.trial_end && (
                        <div className="mt-1 text-xs text-gray-500">
                          Ends {formatDate(user.trial_end)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <div className="text-gray-900 dark:text-white">{user.chat_messages} chats</div>
                        <div className="text-xs text-gray-500">{user.reports_count} reports</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {getTimeAgo(user.last_sign_in)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedUser(user)
                            setShowUserModal(true)
                          }}
                          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                          title="View Details"
                        >
                          <IconEye className="size-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUsers([user.id])
                            setShowEmailModal(true)
                          }}
                          className="rounded p-1.5 text-gray-500 hover:bg-cyan-50 hover:text-cyan-600 dark:hover:bg-cyan-900/20"
                          title="Send Email"
                        >
                          <IconMail className="size-4" />
                        </button>
                        {user.subscription_status === "trialing" && (
                          <button
                            onClick={() => handleExtendTrial(user.id, 7)}
                            disabled={actionLoading}
                            className="rounded p-1.5 text-gray-500 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/20"
                            title="Extend Trial +7 Days"
                          >
                            <IconGift className="size-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="border-t p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </div>
      </div>

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white dark:bg-gray-800">
            <div className="border-b p-6 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-lg font-bold text-white">
                    {selectedUser.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedUser.display_name}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">{selectedUser.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <IconX className="size-5" />
                </button>
              </div>
            </div>

            <div className="space-y-6 p-6">
              {/* Subscription Info */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Subscription
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Plan</div>
                    <PlanBadge plan={selectedUser.plan_type} status={selectedUser.subscription_status} />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Status</div>
                    <div className="font-medium capitalize text-gray-900 dark:text-white">
                      {selectedUser.subscription_status}
                    </div>
                  </div>
                  {selectedUser.trial_end && (
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Trial Ends</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {formatDateTime(selectedUser.trial_end)}
                      </div>
                    </div>
                  )}
                  {selectedUser.stripe_customer_id && (
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Stripe Customer</div>
                      <a
                        href={`https://dashboard.stripe.com/customers/${selectedUser.stripe_customer_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-700"
                      >
                        View in Stripe <IconExternalLink className="size-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Usage Stats */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Usage Statistics
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-700/50">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedUser.chat_messages}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Chat Messages</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-700/50">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedUser.reports_count}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Reports</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-700/50">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedUser.web_searches}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Web Searches</div>
                  </div>
                </div>
              </div>

              {/* Activity */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Activity
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Joined</span>
                    <span className="text-gray-900 dark:text-white">{formatDateTime(selectedUser.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Last Sign In</span>
                    <span className="text-gray-900 dark:text-white">{formatDateTime(selectedUser.last_sign_in)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Email Confirmed</span>
                    <span className="text-gray-900 dark:text-white">
                      {selectedUser.email_confirmed ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Onboarded</span>
                    <span className="text-gray-900 dark:text-white">
                      {selectedUser.has_onboarded ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Quick Actions
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setSelectedUsers([selectedUser.id])
                      setShowUserModal(false)
                      setShowEmailModal(true)
                    }}
                    className="flex items-center gap-2 rounded-lg bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-900/20 dark:text-cyan-400 dark:hover:bg-cyan-900/40"
                  >
                    <IconMail className="size-4" />
                    Send Email
                  </button>
                  {selectedUser.subscription_status === "trialing" && (
                    <>
                      <button
                        onClick={() => handleExtendTrial(selectedUser.id, 7)}
                        disabled={actionLoading}
                        className="flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/40"
                      >
                        <IconGift className="size-4" />
                        +7 Days Trial
                      </button>
                      <button
                        onClick={() => handleExtendTrial(selectedUser.id, 14)}
                        disabled={actionLoading}
                        className="flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/40"
                      >
                        <IconGift className="size-4" />
                        +14 Days Trial
                      </button>
                    </>
                  )}
                  {(selectedUser.plan_type === "free" || selectedUser.subscription_status === "none") && (
                    <button
                      onClick={() => handleUpgradeUser(selectedUser.id, "premium")}
                      disabled={actionLoading}
                      className="flex items-center gap-2 rounded-lg bg-yellow-50 px-3 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-100 disabled:opacity-50 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/40"
                    >
                      <IconCrown className="size-4" />
                      Gift Premium
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-800">
            <div className="border-b p-6 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Send Email
                </h2>
                <button
                  onClick={() => {
                    setShowEmailModal(false)
                    setEmailSubject("")
                    setEmailMessage("")
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <IconX className="size-5" />
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Sending to {selectedUsers.length} user{selectedUsers.length > 1 ? "s" : ""}
              </p>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Subject
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject..."
                  className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Message
                </label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="Write your message..."
                  rows={6}
                  className="w-full resize-none rounded-lg border bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t p-6 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowEmailModal(false)
                  setEmailSubject("")
                  setEmailMessage("")
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSendEmail()}
                disabled={sendingEmail || !emailSubject || !emailMessage}
                className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                {sendingEmail ? (
                  <>
                    <IconRefresh className="size-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <IconSend className="size-4" />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Components
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  trend,
  isLarge
}: {
  icon: React.ElementType
  label: string
  value: number | string
  color: string
  trend?: string
  isLarge?: boolean
}) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    cyan: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400"
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-800">
      <div className={`mb-3 inline-flex rounded-lg p-2 ${colorClasses[color]}`}>
        <Icon className="size-5" />
      </div>
      <div className={`font-bold text-gray-900 dark:text-white ${isLarge ? "text-3xl" : "text-2xl"}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      {trend && (
        <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">{trend}</div>
      )}
    </div>
  )
}

function MiniStat({
  label,
  value,
  color,
  subtext
}: {
  label: string
  value: number | string
  color: string
  subtext?: string
}) {
  const dotColors: Record<string, string> = {
    gray: "bg-gray-400",
    yellow: "bg-yellow-400",
    purple: "bg-purple-500",
    cyan: "bg-cyan-500",
    red: "bg-red-500",
    green: "bg-green-500"
  }

  return (
    <div className="text-center">
      <div className="mb-1 flex items-center justify-center gap-2">
        <span className={`size-2 rounded-full ${dotColors[color]}`}></span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <div className="text-xl font-bold text-gray-900 dark:text-white">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {subtext && (
        <div className="text-xs text-gray-400">{subtext}</div>
      )}
    </div>
  )
}

function UsageStat({
  icon: Icon,
  label,
  value,
  thisMonth
}: {
  icon: React.ElementType
  label: string
  value: number
  thisMonth?: number
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
      <div className="rounded-lg bg-gray-200 p-2 dark:bg-gray-600">
        <Icon className="size-5 text-gray-600 dark:text-gray-300" />
      </div>
      <div>
        <div className="text-lg font-bold text-gray-900 dark:text-white">
          {value.toLocaleString()}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {label}
          {thisMonth !== undefined && (
            <span className="ml-1 text-cyan-600 dark:text-cyan-400">
              (+{thisMonth} this mo)
            </span>
          )}
        </div>
      </div>
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
    if (status === "trialing") return `Trial (${plan})`
    if (status === "canceled") return "Canceled"
    if (status === "none" || !plan || plan === "free") return "Free"
    return plan.charAt(0).toUpperCase() + plan.slice(1)
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStyles()}`}>
      {getLabel()}
    </span>
  )
}
