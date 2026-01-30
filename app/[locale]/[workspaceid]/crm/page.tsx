"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import {
  IconUsers,
  IconBriefcase,
  IconPhone,
  IconMessage,
  IconMail,
  IconTrendingUp,
  IconClock,
  IconCalendar,
  IconArrowUpRight,
  IconArrowDownRight
} from "@tabler/icons-react"
import Link from "next/link"

interface DashboardStats {
  totalCustomers: number
  newLeadsToday: number
  activeJobs: number
  completedThisMonth: number
  voiceMinutesUsed: number
  voiceMinutesLimit: number
  smsUsed: number
  smsLimit: number
  recentActivity: Activity[]
}

interface Activity {
  id: string
  type: "call" | "sms" | "email" | "job_update" | "new_lead"
  description: string
  timestamp: string
  customerName?: string
}

export default function CRMDashboardPage() {
  const params = useParams()
  const workspaceId = params.workspaceid as string
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data for now - will connect to real API
    const mockStats: DashboardStats = {
      totalCustomers: 127,
      newLeadsToday: 5,
      activeJobs: 18,
      completedThisMonth: 12,
      voiceMinutesUsed: 142,
      voiceMinutesLimit: 500,
      smsUsed: 387,
      smsLimit: 1000,
      recentActivity: [
        {
          id: "1",
          type: "call",
          description: "Inbound call answered - Roof inspection inquiry",
          timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
          customerName: "John Smith"
        },
        {
          id: "2",
          type: "sms",
          description: "Estimate follow-up sent",
          timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
          customerName: "Sarah Johnson"
        },
        {
          id: "3",
          type: "new_lead",
          description: "New lead from web form",
          timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
          customerName: "Mike Williams"
        },
        {
          id: "4",
          type: "job_update",
          description: "Job marked as complete",
          timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
          customerName: "Emily Davis"
        },
        {
          id: "5",
          type: "email",
          description: "Invoice sent",
          timestamp: new Date(Date.now() - 6 * 3600000).toISOString(),
          customerName: "Robert Brown"
        }
      ]
    }

    setTimeout(() => {
      setStats(mockStats)
      setLoading(false)
    }, 500)
  }, [workspaceId])

  const getActivityIcon = (type: Activity["type"]) => {
    switch (type) {
      case "call":
        return <IconPhone size={16} className="text-green-600" />
      case "sms":
        return <IconMessage size={16} className="text-blue-600" />
      case "email":
        return <IconMail size={16} className="text-purple-600" />
      case "job_update":
        return <IconBriefcase size={16} className="text-orange-600" />
      case "new_lead":
        return <IconUsers size={16} className="text-emerald-600" />
      default:
        return <IconClock size={16} className="text-gray-600" />
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return new Date(timestamp).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Customers */}
        <Link
          href={`/${workspaceId}/crm/customers`}
          className="rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Customers
              </p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {stats?.totalCustomers}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <IconUsers size={24} className="text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-green-600">
            <IconArrowUpRight size={16} />
            <span className="ml-1">+{stats?.newLeadsToday} today</span>
          </div>
        </Link>

        {/* Active Jobs */}
        <Link
          href={`/${workspaceId}/crm/jobs`}
          className="rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Jobs</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {stats?.activeJobs}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <IconBriefcase size={24} className="text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <IconCalendar size={16} />
            <span className="ml-1">
              {stats?.completedThisMonth} completed this month
            </span>
          </div>
        </Link>

        {/* Voice Minutes */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Voice Minutes</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {stats?.voiceMinutesUsed}
                <span className="text-lg font-normal text-gray-400">
                  /{stats?.voiceMinutesLimit}
                </span>
              </p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <IconPhone size={24} className="text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{
                  width: `${((stats?.voiceMinutesUsed || 0) / (stats?.voiceMinutesLimit || 1)) * 100}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* SMS Messages */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">SMS Messages</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {stats?.smsUsed}
                <span className="text-lg font-normal text-gray-400">
                  /{stats?.smsLimit}
                </span>
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <IconMessage size={24} className="text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{
                  width: `${((stats?.smsUsed || 0) / (stats?.smsLimit || 1)) * 100}%`
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Recent Activity
          </h2>
          <div className="space-y-4">
            {stats?.recentActivity.map(activity => (
              <div
                key={activity.id}
                className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50"
              >
                <div className="mt-0.5 rounded-full bg-gray-100 p-2">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.customerName}
                  </p>
                  <p className="truncate text-sm text-gray-500">
                    {activity.description}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-gray-400">
                  {formatTimeAgo(activity.timestamp)}
                </span>
              </div>
            ))}
          </div>
          <Link
            href={`/${workspaceId}/crm/inbox`}
            className="mt-4 block text-center text-sm font-medium text-purple-600 hover:text-purple-700"
          >
            View all activity
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href={`/${workspaceId}/crm/customers?action=new`}
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-4 text-center transition-colors hover:border-purple-300 hover:bg-purple-50"
            >
              <IconUsers size={24} className="mb-2 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">
                Add Customer
              </span>
            </Link>
            <Link
              href={`/${workspaceId}/crm/jobs?action=new`}
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-4 text-center transition-colors hover:border-blue-300 hover:bg-blue-50"
            >
              <IconBriefcase size={24} className="mb-2 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                Create Job
              </span>
            </Link>
            <Link
              href={`/${workspaceId}/crm/sequences?action=new`}
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-4 text-center transition-colors hover:border-green-300 hover:bg-green-50"
            >
              <IconMailForward size={24} className="mb-2 text-green-600" />
              <span className="text-sm font-medium text-gray-700">
                Create Sequence
              </span>
            </Link>
            <Link
              href={`/${workspaceId}/crm/inbox`}
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-4 text-center transition-colors hover:border-orange-300 hover:bg-orange-50"
            >
              <IconMessage size={24} className="mb-2 text-orange-600" />
              <span className="text-sm font-medium text-gray-700">
                View Inbox
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function IconMailForward({
  size,
  className
}: {
  size: number
  className?: string
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 18H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7.5" />
      <path d="m3 6 9 6 9-6" />
      <path d="M15 18h6" />
      <path d="m18 15 3 3-3 3" />
    </svg>
  )
}
