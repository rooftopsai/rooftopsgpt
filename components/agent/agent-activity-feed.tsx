"use client"

import { useEffect } from "react"
import { useAgent } from "@/context/agent-context"
import { AgentActivityActionType } from "@/types/agent-types"
import { cn } from "@/lib/utils"
import {
  IconLoader2,
  IconMessageCircle,
  IconSend,
  IconChecklist,
  IconTool,
  IconAlertTriangle,
  IconInfoCircle,
  IconPlayerPlay,
  IconPlayerStop,
  IconCircleCheck,
  IconX
} from "@tabler/icons-react"
import { formatDistanceToNow } from "date-fns"

export function AgentActivityFeed() {
  const { activities, isLoadingActivities, loadActivities, currentSession } =
    useAgent()

  useEffect(() => {
    loadActivities(currentSession?.id)
  }, [currentSession?.id, loadActivities])

  const getActivityIcon = (actionType: AgentActivityActionType) => {
    const icons: Record<AgentActivityActionType, React.ReactNode> = {
      session_created: <IconPlayerPlay className="size-4 text-green-400" />,
      session_resumed: <IconPlayerPlay className="size-4 text-blue-400" />,
      session_paused: <IconPlayerStop className="size-4 text-yellow-400" />,
      session_completed: <IconCircleCheck className="size-4 text-green-400" />,
      message_sent: <IconSend className="size-4 text-blue-400" />,
      message_received: <IconMessageCircle className="size-4 text-purple-400" />,
      task_created: <IconChecklist className="size-4 text-blue-400" />,
      task_started: <IconPlayerPlay className="size-4 text-yellow-400" />,
      task_completed: <IconCircleCheck className="size-4 text-green-400" />,
      task_failed: <IconX className="size-4 text-red-400" />,
      task_cancelled: <IconX className="size-4 text-gray-400" />,
      tool_called: <IconTool className="size-4 text-blue-400" />,
      tool_completed: <IconTool className="size-4 text-green-400" />,
      tool_failed: <IconTool className="size-4 text-red-400" />,
      tool_confirmed: <IconCircleCheck className="size-4 text-green-400" />,
      error: <IconAlertTriangle className="size-4 text-red-400" />,
      warning: <IconAlertTriangle className="size-4 text-yellow-400" />,
      info: <IconInfoCircle className="size-4 text-blue-400" />
    }
    return icons[actionType] || <IconInfoCircle className="size-4 text-gray-400" />
  }

  const getActivityColor = (actionType: AgentActivityActionType) => {
    const colors: Record<AgentActivityActionType, string> = {
      session_created: "border-l-green-400",
      session_resumed: "border-l-blue-400",
      session_paused: "border-l-yellow-400",
      session_completed: "border-l-green-400",
      message_sent: "border-l-blue-400",
      message_received: "border-l-purple-400",
      task_created: "border-l-blue-400",
      task_started: "border-l-yellow-400",
      task_completed: "border-l-green-400",
      task_failed: "border-l-red-400",
      task_cancelled: "border-l-gray-400",
      tool_called: "border-l-blue-400",
      tool_completed: "border-l-green-400",
      tool_failed: "border-l-red-400",
      tool_confirmed: "border-l-green-400",
      error: "border-l-red-400",
      warning: "border-l-yellow-400",
      info: "border-l-blue-400"
    }
    return colors[actionType] || "border-l-gray-400"
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <h3 className="font-semibold text-white">Activity</h3>
        {currentSession && (
          <p className="text-xs text-gray-500 mt-1">
            Session: {currentSession.name}
          </p>
        )}
      </div>

      {/* Activity list */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoadingActivities ? (
          <div className="flex items-center justify-center py-8">
            <IconLoader2 className="size-6 animate-spin text-gray-400" />
          </div>
        ) : activities.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            {currentSession
              ? "No activity yet"
              : "Select a session to view activity"}
          </div>
        ) : (
          <div className="space-y-1">
            {activities.map(activity => (
              <div
                key={activity.id}
                className={cn(
                  "border-l-2 pl-3 py-2 rounded-r-lg hover:bg-gray-800/30",
                  getActivityColor(activity.action_type)
                )}
              >
                <div className="flex items-start gap-2">
                  {getActivityIcon(activity.action_type)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-200">
                      {activity.title}
                    </div>
                    {activity.description && (
                      <div className="text-xs text-gray-500 truncate">
                        {activity.description}
                      </div>
                    )}
                    <div className="text-xs text-gray-600 mt-1">
                      {formatDistanceToNow(new Date(activity.created_at), {
                        addSuffix: true
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
