"use client"

import { useState, useEffect } from "react"
import {
  IconX,
  IconPhone,
  IconMail,
  IconMapPin,
  IconEdit,
  IconMessage,
  IconBriefcase,
  IconClock,
  IconUser,
  IconTag,
  IconCalendar,
  IconSend
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  secondaryPhone?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  status: string
  source?: string
  notes?: string
  tags?: string[]
  propertyType?: string
  preferredContactMethod?: string
  createdAt: string
  updatedAt: string
}

interface Job {
  id: string
  title: string
  status: string
  estimatedCost?: number
  scheduledDate?: string
}

interface Activity {
  id: string
  type: "call" | "sms" | "email" | "note" | "job"
  description: string
  timestamp: string
}

interface CustomerDetailPanelProps {
  customer: Customer
  onClose: () => void
  onEdit: () => void
  workspaceId: string
}

const statusColors: Record<string, string> = {
  lead: "bg-blue-100 text-blue-700",
  prospect: "bg-yellow-100 text-yellow-700",
  customer: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-700",
  do_not_contact: "bg-red-100 text-red-700"
}

const statusLabels: Record<string, string> = {
  lead: "Lead",
  prospect: "Prospect",
  customer: "Customer",
  inactive: "Inactive",
  do_not_contact: "Do Not Contact"
}

const jobStatusColors: Record<string, string> = {
  lead: "bg-gray-100 text-gray-700",
  estimate_scheduled: "bg-blue-100 text-blue-700",
  estimate_sent: "bg-yellow-100 text-yellow-700",
  negotiating: "bg-orange-100 text-orange-700",
  sold: "bg-green-100 text-green-700",
  scheduled: "bg-purple-100 text-purple-700",
  in_progress: "bg-indigo-100 text-indigo-700",
  complete: "bg-emerald-100 text-emerald-700",
  invoiced: "bg-teal-100 text-teal-700",
  paid: "bg-green-100 text-green-700"
}

export function CustomerDetailPanel({
  customer,
  onClose,
  onEdit,
  workspaceId
}: CustomerDetailPanelProps) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [activeTab, setActiveTab] = useState<"details" | "jobs" | "activity">(
    "details"
  )
  const [smsMessage, setSmsMessage] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    // Fetch customer jobs
    const fetchJobs = async () => {
      try {
        const response = await fetch(
          `/api/crm/jobs?workspaceId=${workspaceId}&customerId=${customer.id}`
        )
        if (response.ok) {
          const data = await response.json()
          setJobs(data.jobs || [])
        }
      } catch (error) {
        console.error("Failed to fetch jobs:", error)
      }
    }

    // Mock activities for now
    setActivities([
      {
        id: "1",
        type: "sms",
        description: "Sent estimate follow-up",
        timestamp: new Date(Date.now() - 2 * 3600000).toISOString()
      },
      {
        id: "2",
        type: "call",
        description: "Inbound call - 3 min 24 sec",
        timestamp: new Date(Date.now() - 24 * 3600000).toISOString()
      },
      {
        id: "3",
        type: "note",
        description: "Customer interested in metal roofing",
        timestamp: new Date(Date.now() - 48 * 3600000).toISOString()
      }
    ])

    fetchJobs()
  }, [customer.id, workspaceId])

  const handleSendSMS = async () => {
    if (!smsMessage.trim() || !customer.phone) return

    setSending(true)
    try {
      // This would connect to the messaging gateway
      console.log("Sending SMS to", customer.phone, ":", smsMessage)
      setSmsMessage("")
    } finally {
      setSending(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    })
  }

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime()
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (hours < 1) return "Just now"
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return formatDate(timestamp)
  }

  const getActivityIcon = (type: Activity["type"]) => {
    switch (type) {
      case "call":
        return <IconPhone size={14} className="text-green-600" />
      case "sms":
        return <IconMessage size={14} className="text-blue-600" />
      case "email":
        return <IconMail size={14} className="text-purple-600" />
      case "note":
        return <IconEdit size={14} className="text-gray-600" />
      case "job":
        return <IconBriefcase size={14} className="text-orange-600" />
      default:
        return <IconClock size={14} className="text-gray-600" />
    }
  }

  return (
    <div className="flex h-full w-[400px] flex-col border-l bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold text-gray-900">Customer Details</h3>
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <IconEdit size={18} />
          </button>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <IconX size={18} />
          </button>
        </div>
      </div>

      {/* Customer Header */}
      <div className="border-b p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {customer.name}
            </h2>
            <span
              className={cn(
                "mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                statusColors[customer.status]
              )}
            >
              {statusLabels[customer.status]}
            </span>
          </div>
          <div className="rounded-full bg-purple-100 p-2">
            <IconUser size={24} className="text-purple-600" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-4 flex gap-2">
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <IconPhone size={16} />
              Call
            </a>
          )}
          {customer.phone && (
            <button
              onClick={() => setActiveTab("details")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <IconMessage size={16} />
              Text
            </button>
          )}
          {customer.email && (
            <a
              href={`mailto:${customer.email}`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <IconMail size={16} />
              Email
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {(["details", "jobs", "activity"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2.5 text-center text-sm font-medium transition-colors",
              activeTab === tab
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === "jobs" && jobs.length > 0 && (
              <span className="ml-1 rounded-full bg-gray-100 px-1.5 text-xs">
                {jobs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "details" && (
          <div className="space-y-4">
            {/* Contact Info */}
            <div>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                Contact Information
              </h4>
              <div className="space-y-2">
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <IconPhone size={16} className="text-gray-400" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <IconMail size={16} className="text-gray-400" />
                    <span>{customer.email}</span>
                  </div>
                )}
                {(customer.address || customer.city) && (
                  <div className="flex items-start gap-2 text-sm">
                    <IconMapPin size={16} className="mt-0.5 text-gray-400" />
                    <span>
                      {[
                        customer.address,
                        [customer.city, customer.state, customer.zip]
                          .filter(Boolean)
                          .join(", ")
                      ]
                        .filter(Boolean)
                        .join("\n")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            {customer.tags && customer.tags.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Tags
                </h4>
                <div className="flex flex-wrap gap-1">
                  {customer.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700"
                    >
                      <IconTag size={12} />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {customer.notes && (
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Notes
                </h4>
                <p className="text-sm text-gray-600">{customer.notes}</p>
              </div>
            )}

            {/* Quick SMS */}
            {customer.phone && (
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Send SMS
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={smsMessage}
                    onChange={e => setSmsMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    onKeyPress={e =>
                      e.key === "Enter" && !e.shiftKey && handleSendSMS()
                    }
                  />
                  <button
                    onClick={handleSendSMS}
                    disabled={!smsMessage.trim() || sending}
                    className="rounded-lg bg-purple-600 p-2 text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
                  >
                    <IconSend size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                Record Info
              </h4>
              <div className="space-y-1 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <IconCalendar size={14} />
                  Created: {formatDate(customer.createdAt)}
                </div>
                <div className="flex items-center gap-2">
                  <IconClock size={14} />
                  Updated: {formatDate(customer.updatedAt)}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "jobs" && (
          <div className="space-y-3">
            {jobs.length === 0 ? (
              <div className="py-8 text-center">
                <IconBriefcase
                  size={32}
                  className="mx-auto mb-2 text-gray-300"
                />
                <p className="text-sm text-gray-500">No jobs yet</p>
                <Link
                  href={`/${workspaceId}/crm/jobs?action=new&customerId=${customer.id}`}
                  className="mt-2 inline-block text-sm font-medium text-purple-600 hover:text-purple-700"
                >
                  Create a job
                </Link>
              </div>
            ) : (
              jobs.map(job => (
                <Link
                  key={job.id}
                  href={`/${workspaceId}/crm/jobs/${job.id}`}
                  className="block rounded-lg border p-3 transition-colors hover:border-purple-200 hover:bg-purple-50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="font-medium text-gray-900">{job.title}</h5>
                      {job.scheduledDate && (
                        <p className="mt-1 text-xs text-gray-500">
                          Scheduled: {formatDate(job.scheduledDate)}
                        </p>
                      )}
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        jobStatusColors[job.status] ||
                          "bg-gray-100 text-gray-700"
                      )}
                    >
                      {job.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  {job.estimatedCost && (
                    <p className="mt-2 text-sm font-medium text-gray-700">
                      ${job.estimatedCost.toLocaleString()}
                    </p>
                  )}
                </Link>
              ))
            )}
          </div>
        )}

        {activeTab === "activity" && (
          <div className="space-y-3">
            {activities.length === 0 ? (
              <div className="py-8 text-center">
                <IconClock size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">No activity yet</p>
              </div>
            ) : (
              activities.map(activity => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50"
                >
                  <div className="mt-0.5 rounded-full bg-gray-100 p-1.5">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700">
                      {activity.description}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {formatTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
