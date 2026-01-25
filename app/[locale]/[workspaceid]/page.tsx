"use client"

import { useChatbotUI } from "@/context/context"
import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  IconMap,
  IconMessageCircle,
  IconRobot,
  IconFileText,
  IconPlus,
  IconArrowRight,
  IconClock,
  IconChartBar,
  IconHome,
  IconCalendar,
  IconTrendingUp,
  IconChecklist,
  IconLoader2
} from "@tabler/icons-react"

interface PropertyReport {
  id: string
  address: string
  created_at: string
  facet_count: number | null
  roof_area: number | null
  complexity: string | null
}

interface AgentSession {
  id: string
  name: string
  updated_at: string
  total_tokens_used: number
  status: string
}

interface UsageStats {
  reports_generated: number
  messages_sent: number
  reports_limit: number
  messages_limit: number
}

export default function WorkspacePage() {
  const { selectedWorkspace, profile, userSubscription } = useChatbotUI()
  const router = useRouter()
  const params = useParams()
  const workspaceId = params.workspaceid as string

  const [recentReports, setRecentReports] = useState<PropertyReport[]>([])
  const [recentSessions, setRecentSessions] = useState<AgentSession[]>([])
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!workspaceId) return

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      setIsLoading(true)

      try {
        // Fetch recent property reports
        const reportsResponse = await fetch(`/api/property-reports?workspace_id=${workspaceId}`)
        if (reportsResponse.ok) {
          const reports = await reportsResponse.json()
          setRecentReports(reports.slice(0, 5))
        }

        // Fetch recent agent sessions
        const { data: sessions } = await supabase
          .from("agent_sessions")
          .select("id, name, updated_at, total_tokens_used, status")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(5)

        if (sessions) {
          setRecentSessions(sessions as AgentSession[])
        }

        // Fetch usage stats
        const usageResponse = await fetch("/api/usage")
        if (usageResponse.ok) {
          const usage = await usageResponse.json()
          setUsageStats(usage)
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [workspaceId])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const tier = userSubscription?.tier || "free"
  const tierName = tier === "free" ? "Starter" : tier === "premium" ? "Pro" : "Business"

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-gray-50 dark:bg-zinc-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-6 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome back{profile?.display_name ? `, ${profile.display_name.split(" ")[0]}` : ""}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {selectedWorkspace?.name || "Your workspace"} · {tierName} Plan
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/${workspaceId}/explore`)}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#24BDEB] to-[#4FEBBC] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
            >
              <IconPlus className="size-4" />
              New Roof Report
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Quick Actions */}
          <div>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <button
                onClick={() => router.push(`/${workspaceId}/explore`)}
                className="group flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-[#24BDEB] hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-[#24BDEB]"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-[#24BDEB]/10 text-[#24BDEB] transition-colors group-hover:bg-[#24BDEB]/20">
                  <IconMap className="size-6" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900 dark:text-white">Roof Report</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Analyze any address</div>
                </div>
              </button>

              <button
                onClick={() => router.push(`/${workspaceId}/chat`)}
                className="group flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-[#4FEBBC] hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-[#4FEBBC]"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-[#4FEBBC]/10 text-[#4FEBBC] transition-colors group-hover:bg-[#4FEBBC]/20">
                  <IconMessageCircle className="size-6" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900 dark:text-white">AI Chat</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Ask anything</div>
                </div>
              </button>

              <button
                onClick={() => router.push(`/${workspaceId}/agent`)}
                className="group flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-[#24BDEB] hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-[#24BDEB]"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-[#24BDEB]/10 text-[#24BDEB] transition-colors group-hover:bg-[#24BDEB]/20">
                  <IconRobot className="size-6" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900 dark:text-white">AI Agent</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Automate tasks</div>
                </div>
              </button>

              <button
                onClick={() => router.push(`/${workspaceId}/documents`)}
                className="group flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-[#4FEBBC] hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-[#4FEBBC]"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-[#4FEBBC]/10 text-[#4FEBBC] transition-colors group-hover:bg-[#4FEBBC]/20">
                  <IconFileText className="size-6" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900 dark:text-white">Documents</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Your files</div>
                </div>
              </button>
            </div>
          </div>

          {/* Stats & Usage */}
          {usageStats && (
            <div>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                This Month
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-[#24BDEB]/10">
                      <IconHome className="size-5 text-[#24BDEB]" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {usageStats.reports_generated}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        of {usageStats.reports_limit} reports
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-700">
                    <div
                      className="h-full rounded-full bg-[#24BDEB] transition-all"
                      style={{ width: `${Math.min(100, (usageStats.reports_generated / usageStats.reports_limit) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-[#4FEBBC]/10">
                      <IconMessageCircle className="size-5 text-[#4FEBBC]" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {usageStats.messages_sent}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        of {usageStats.messages_limit} messages
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-700">
                    <div
                      className="h-full rounded-full bg-[#4FEBBC] transition-all"
                      style={{ width: `${Math.min(100, (usageStats.messages_sent / usageStats.messages_limit) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10">
                      <IconTrendingUp className="size-5 text-amber-500" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {recentReports.length > 0 ? Math.round(recentReports.reduce((acc, r) => acc + (r.roof_area || 0), 0)).toLocaleString() : 0}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        sq ft analyzed
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-purple-500/10">
                      <IconChecklist className="size-5 text-purple-500" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {recentSessions.length}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        agent sessions
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Reports */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-zinc-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Recent Roof Reports</h3>
                <button
                  onClick={() => router.push(`/${workspaceId}/explore`)}
                  className="flex items-center gap-1 text-sm font-medium text-[#24BDEB] hover:underline"
                >
                  View all
                  <IconArrowRight className="size-4" />
                </button>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-zinc-700">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <IconLoader2 className="size-6 animate-spin text-gray-400" />
                  </div>
                ) : recentReports.length === 0 ? (
                  <div className="py-8 text-center">
                    <IconMap className="mx-auto size-8 text-gray-300 dark:text-zinc-600" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No reports yet</p>
                    <button
                      onClick={() => router.push(`/${workspaceId}/explore`)}
                      className="mt-3 text-sm font-medium text-[#24BDEB] hover:underline"
                    >
                      Generate your first report
                    </button>
                  </div>
                ) : (
                  recentReports.map(report => (
                    <button
                      key={report.id}
                      onClick={() => router.push(`/${workspaceId}/explore?report=${report.id}`)}
                      className="flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-zinc-700/50"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#24BDEB]/10">
                        <IconHome className="size-5 text-[#24BDEB]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-gray-900 dark:text-white">
                          {report.address}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{formatDate(report.created_at)}</span>
                          {report.roof_area && (
                            <>
                              <span>·</span>
                              <span>{Math.round(report.roof_area).toLocaleString()} sq ft</span>
                            </>
                          )}
                          {report.facet_count && (
                            <>
                              <span>·</span>
                              <span>{report.facet_count} facets</span>
                            </>
                          )}
                        </div>
                      </div>
                      <IconArrowRight className="size-4 shrink-0 text-gray-400" />
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Recent Agent Sessions */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-zinc-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Recent Agent Sessions</h3>
                <button
                  onClick={() => router.push(`/${workspaceId}/agent`)}
                  className="flex items-center gap-1 text-sm font-medium text-[#4FEBBC] hover:underline"
                >
                  View all
                  <IconArrowRight className="size-4" />
                </button>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-zinc-700">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <IconLoader2 className="size-6 animate-spin text-gray-400" />
                  </div>
                ) : recentSessions.length === 0 ? (
                  <div className="py-8 text-center">
                    <IconRobot className="mx-auto size-8 text-gray-300 dark:text-zinc-600" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No agent sessions yet</p>
                    <button
                      onClick={() => router.push(`/${workspaceId}/agent`)}
                      className="mt-3 text-sm font-medium text-[#4FEBBC] hover:underline"
                    >
                      Start your first session
                    </button>
                  </div>
                ) : (
                  recentSessions.map(session => (
                    <button
                      key={session.id}
                      onClick={() => router.push(`/${workspaceId}/agent?session=${session.id}`)}
                      className="flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-zinc-700/50"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#4FEBBC]/10">
                        <IconRobot className="size-5 text-[#4FEBBC]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-gray-900 dark:text-white">
                          {session.name || "Untitled Session"}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{formatDate(session.updated_at)}</span>
                          <span>·</span>
                          <span className={`capitalize ${session.status === "active" ? "text-green-500" : ""}`}>
                            {session.status}
                          </span>
                          {session.total_tokens_used > 0 && (
                            <>
                              <span>·</span>
                              <span>{session.total_tokens_used.toLocaleString()} tokens</span>
                            </>
                          )}
                        </div>
                      </div>
                      <IconArrowRight className="size-4 shrink-0 text-gray-400" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Upgrade Banner - only show for free users */}
          {tier === "free" && (
            <div className="rounded-xl bg-gradient-to-r from-[#1A1A1A] to-[#333] p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Unlock More Reports</h3>
                  <p className="mt-1 text-sm text-gray-300">
                    Upgrade to Pro for 20 roof reports/month, AI estimates, and more.
                  </p>
                </div>
                <button
                  onClick={() => router.push("/pricing")}
                  className="shrink-0 rounded-lg bg-gradient-to-r from-[#24BDEB] to-[#4FEBBC] px-5 py-2.5 font-semibold text-white shadow-lg transition-all hover:shadow-xl"
                >
                  Upgrade Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
