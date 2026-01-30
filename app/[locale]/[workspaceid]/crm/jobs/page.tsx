"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import {
  IconPlus,
  IconList,
  IconLayoutKanban,
  IconSearch,
  IconFilter,
  IconLoader2,
  IconUser,
  IconCalendar,
  IconCurrencyDollar,
  IconMapPin,
  IconChevronRight,
  IconDotsVertical
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { JobModal } from "@/components/crm/job-modal"

export interface Job {
  id: string
  workspaceId: string
  customerId?: string
  title: string
  jobNumber?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  status: JobStatus
  jobType?: string
  roofAreaSqft?: number
  estimatedCost?: number
  actualCost?: number
  scheduledDate?: string
  scheduledTime?: string
  crewId?: string
  customer?: {
    id: string
    name: string
    phone?: string
    email?: string
  }
  crew?: {
    id: string
    name: string
    phone?: string
  }
  createdAt: string
  updatedAt: string
}

export type JobStatus =
  | "lead"
  | "estimate_scheduled"
  | "estimate_sent"
  | "negotiating"
  | "sold"
  | "materials_ordered"
  | "scheduled"
  | "in_progress"
  | "complete"
  | "invoiced"
  | "paid"
  | "cancelled"
  | "on_hold"

const pipelineStages: { status: JobStatus; label: string; color: string }[] = [
  { status: "lead", label: "Leads", color: "bg-gray-500" },
  {
    status: "estimate_scheduled",
    label: "Est. Scheduled",
    color: "bg-blue-500"
  },
  { status: "estimate_sent", label: "Est. Sent", color: "bg-yellow-500" },
  { status: "sold", label: "Sold", color: "bg-green-500" },
  { status: "scheduled", label: "Scheduled", color: "bg-purple-500" },
  { status: "in_progress", label: "In Progress", color: "bg-indigo-500" },
  { status: "complete", label: "Complete", color: "bg-emerald-500" }
]

const allStatuses: { value: JobStatus; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "estimate_scheduled", label: "Estimate Scheduled" },
  { value: "estimate_sent", label: "Estimate Sent" },
  { value: "negotiating", label: "Negotiating" },
  { value: "sold", label: "Sold" },
  { value: "materials_ordered", label: "Materials Ordered" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "complete", label: "Complete" },
  { value: "invoiced", label: "Invoiced" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
  { value: "on_hold", label: "On Hold" }
]

const statusColors: Record<JobStatus, string> = {
  lead: "bg-gray-100 text-gray-700",
  estimate_scheduled: "bg-blue-100 text-blue-700",
  estimate_sent: "bg-yellow-100 text-yellow-700",
  negotiating: "bg-orange-100 text-orange-700",
  sold: "bg-green-100 text-green-700",
  materials_ordered: "bg-cyan-100 text-cyan-700",
  scheduled: "bg-purple-100 text-purple-700",
  in_progress: "bg-indigo-100 text-indigo-700",
  complete: "bg-emerald-100 text-emerald-700",
  invoiced: "bg-teal-100 text-teal-700",
  paid: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  on_hold: "bg-gray-100 text-gray-700"
}

export default function JobsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const workspaceId = params.workspaceid as string

  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"pipeline" | "list">("pipeline")
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams({
        workspaceId,
        pageSize: "100"
      })

      if (search) queryParams.set("search", search)

      const response = await fetch(`/api/crm/jobs?${queryParams}`)
      if (response.ok) {
        const data = await response.json()
        setJobs(data.jobs || [])
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error)
    } finally {
      setLoading(false)
    }
  }, [workspaceId, search])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setShowModal(true)
      setEditingJob(null)
    }
  }, [searchParams])

  const handleCreateJob = () => {
    setEditingJob(null)
    setShowModal(true)
  }

  const handleEditJob = (job: Job) => {
    setEditingJob(job)
    setShowModal(true)
  }

  const handleSaveJob = async (jobData: Partial<Job>) => {
    try {
      const url = editingJob
        ? `/api/crm/jobs/${editingJob.id}`
        : "/api/crm/jobs"

      const response = await fetch(url, {
        method: editingJob ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...jobData, workspaceId })
      })

      if (response.ok) {
        setShowModal(false)
        fetchJobs()
        router.replace(`/${workspaceId}/crm/jobs`)
      }
    } catch (error) {
      console.error("Failed to save job:", error)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingJob(null)
    router.replace(`/${workspaceId}/crm/jobs`)
  }

  const handleStatusChange = async (jobId: string, newStatus: JobStatus) => {
    try {
      const response = await fetch(`/api/crm/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        setJobs(prev =>
          prev.map(job =>
            job.id === jobId ? { ...job, status: newStatus } : job
          )
        )
      }
    } catch (error) {
      console.error("Failed to update job status:", error)
    }
  }

  const getJobsByStatus = (status: JobStatus) => {
    return jobs.filter(job => job.status === status)
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return "-"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    })
  }

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Jobs Pipeline</h2>
          <p className="text-sm text-gray-500">{jobs.length} total jobs</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={() => setView("pipeline")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                view === "pipeline"
                  ? "bg-purple-100 text-purple-700"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <IconLayoutKanban size={18} className="mr-1 inline" />
              Pipeline
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                view === "list"
                  ? "bg-purple-100 text-purple-700"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <IconList size={18} className="mr-1 inline" />
              List
            </button>
          </div>

          <button
            onClick={handleCreateJob}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
          >
            <IconPlus size={18} />
            New Job
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <IconSearch
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search jobs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <IconLoader2 size={32} className="animate-spin text-purple-600" />
        </div>
      ) : view === "pipeline" ? (
        /* Pipeline View */
        <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
          {pipelineStages.map(stage => {
            const stageJobs = getJobsByStatus(stage.status)
            const stageTotal = stageJobs.reduce(
              (sum, job) => sum + (job.estimatedCost || 0),
              0
            )

            return (
              <div
                key={stage.status}
                className="flex w-[300px] shrink-0 flex-col rounded-lg bg-gray-100"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-2">
                    <div className={cn("size-2 rounded-full", stage.color)} />
                    <span className="font-medium text-gray-900">
                      {stage.label}
                    </span>
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {stageJobs.length}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-500">
                    {formatCurrency(stageTotal)}
                  </span>
                </div>

                {/* Stage Jobs */}
                <div className="flex-1 space-y-2 overflow-y-auto p-2">
                  {stageJobs.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-400">
                      No jobs
                    </div>
                  ) : (
                    stageJobs.map(job => (
                      <div
                        key={job.id}
                        onClick={() => handleEditJob(job)}
                        className="cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <div className="mb-2 flex items-start justify-between">
                          <h4 className="line-clamp-1 font-medium text-gray-900">
                            {job.title}
                          </h4>
                          {job.jobNumber && (
                            <span className="shrink-0 text-xs text-gray-400">
                              #{job.jobNumber}
                            </span>
                          )}
                        </div>

                        {job.customer && (
                          <div className="mb-2 flex items-center gap-1 text-sm text-gray-600">
                            <IconUser size={14} />
                            <span className="truncate">
                              {job.customer.name}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-3">
                            {job.scheduledDate && (
                              <div className="flex items-center gap-1">
                                <IconCalendar size={12} />
                                {formatDate(job.scheduledDate)}
                              </div>
                            )}
                            {job.address && (
                              <div className="flex items-center gap-1">
                                <IconMapPin size={12} />
                                {job.city || "Address"}
                              </div>
                            )}
                          </div>
                          {job.estimatedCost && (
                            <span className="font-medium text-gray-700">
                              {formatCurrency(job.estimatedCost)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List View */
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Job
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Scheduled
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Crew
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No jobs found
                  </td>
                </tr>
              ) : (
                jobs.map(job => (
                  <tr
                    key={job.id}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                    onClick={() => handleEditJob(job)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {job.title}
                      </div>
                      {job.jobNumber && (
                        <div className="text-xs text-gray-400">
                          #{job.jobNumber}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {job.customer ? (
                        <div>
                          <div className="text-sm text-gray-900">
                            {job.customer.name}
                          </div>
                          {job.city && (
                            <div className="text-xs text-gray-500">
                              {job.city}, {job.state}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={job.status}
                        onChange={e => {
                          e.stopPropagation()
                          handleStatusChange(
                            job.id,
                            e.target.value as JobStatus
                          )
                        }}
                        onClick={e => e.stopPropagation()}
                        className={cn(
                          "cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs font-medium",
                          statusColors[job.status]
                        )}
                      >
                        {allStatuses.map(s => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(job.scheduledDate)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(job.estimatedCost)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {job.crew?.name || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <IconChevronRight size={16} className="text-gray-400" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Job Modal */}
      {showModal && (
        <JobModal
          job={editingJob}
          workspaceId={workspaceId}
          onSave={handleSaveJob}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
