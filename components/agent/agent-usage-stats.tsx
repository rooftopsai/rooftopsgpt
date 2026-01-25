"use client"

import { useEffect } from "react"
import { useAgent } from "@/context/agent-context"
import { cn } from "@/lib/utils"
import {
  IconLoader2,
  IconCoins,
  IconMessageCircle,
  IconChecklist,
  IconTool
} from "@tabler/icons-react"

export function AgentUsageStats() {
  const { usage, loadUsage } = useAgent()

  useEffect(() => {
    loadUsage()
  }, [loadUsage])

  if (!usage) {
    return (
      <div className="flex h-full items-center justify-center">
        <IconLoader2 className="size-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <h3 className="font-semibold text-white">Usage This Month</h3>
        <p className="text-xs text-gray-500 mt-1">
          Estimated cost: ${(usage.estimatedCostCents / 100).toFixed(2)}
        </p>
      </div>

      {/* Stats */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <StatCard
          icon={<IconCoins className="size-5 text-yellow-400" />}
          label="Tokens Used"
          value={usage.totalTokensUsed.toLocaleString()}
          subtext="Total input + output tokens"
        />

        <StatCard
          icon={<IconMessageCircle className="size-5 text-blue-400" />}
          label="Sessions"
          value={usage.totalSessions.toString()}
          subtext="Agent conversations"
        />

        <StatCard
          icon={<IconChecklist className="size-5 text-green-400" />}
          label="Tasks Completed"
          value={usage.totalTasksCompleted.toString()}
          subtext="Goals achieved"
        />

        <StatCard
          icon={<IconTool className="size-5 text-purple-400" />}
          label="Tool Calls"
          value={usage.totalToolCalls.toString()}
          subtext="Actions executed"
        />

        {/* Period info */}
        <div className="pt-4 border-t border-gray-800">
          <div className="text-xs text-gray-500 text-center">
            Usage resets monthly
          </div>
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  subtext: string
  percentage?: number
}

function StatCard({ icon, label, value, subtext, percentage }: StatCardProps) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-800/30 p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-gray-800">
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-sm text-gray-400">{label}</div>
          <div className="text-xl font-semibold text-white">{value}</div>
        </div>
      </div>

      {percentage !== undefined && (
        <div className="mt-3">
          <div className="h-2 rounded-full bg-gray-700">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                percentage > 80
                  ? "bg-red-500"
                  : percentage > 50
                    ? "bg-yellow-500"
                    : "bg-green-500"
              )}
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {percentage.toFixed(0)}% used
          </div>
        </div>
      )}

      <div className="mt-2 text-xs text-gray-500">{subtext}</div>
    </div>
  )
}
