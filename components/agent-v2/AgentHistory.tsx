"use client"

import {
  IconX,
  IconCheck,
  IconAlertCircle,
  IconClock,
  IconSparkles
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

export interface TaskSummary {
  id: string
  goal: string
  status: "completed" | "failed" | "cancelled"
  completedAt: Date
  stepCount: number
}

interface AgentHistoryProps {
  tasks: TaskSummary[]
  onClose: () => void
}

export function AgentHistory({ tasks, onClose }: AgentHistoryProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-medium text-foreground">Recent Tasks</h2>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <IconX className="size-5" />
        </button>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
              <IconClock className="size-6 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              No recent tasks yet.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tasks you run will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tasks.map((task, index) => (
              <TaskHistoryItem key={`${task.id}-${index}`} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TaskHistoryItem({ task }: { task: TaskSummary }) {
  const statusConfig = getStatusConfig(task.status)
  const StatusIcon = statusConfig.icon

  return (
    <div className="p-4 transition-colors hover:bg-muted/50">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            statusConfig.bgClass
          )}
        >
          <StatusIcon className={cn("size-4", statusConfig.iconClass)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium text-foreground">
            {task.goal}
          </p>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className={statusConfig.textClass}>{statusConfig.label}</span>
            <span>·</span>
            <span>{task.stepCount} step{task.stepCount !== 1 ? "s" : ""}</span>
            <span>·</span>
            <span>{formatDistanceToNow(task.completedAt, { addSuffix: true })}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function getStatusConfig(status: TaskSummary["status"]) {
  switch (status) {
    case "completed":
      return {
        icon: IconCheck,
        label: "Completed",
        bgClass: "bg-green-500/10",
        iconClass: "text-green-500",
        textClass: "text-green-600 dark:text-green-400"
      }
    case "failed":
      return {
        icon: IconAlertCircle,
        label: "Failed",
        bgClass: "bg-destructive/10",
        iconClass: "text-destructive",
        textClass: "text-destructive"
      }
    case "cancelled":
      return {
        icon: IconX,
        label: "Cancelled",
        bgClass: "bg-muted",
        iconClass: "text-muted-foreground",
        textClass: "text-muted-foreground"
      }
  }
}
