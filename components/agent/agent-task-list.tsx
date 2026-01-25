"use client"

import { useEffect, useState } from "react"
import { useAgent } from "@/context/agent-context"
import { AgentTask } from "@/types/agent-types"
import { cn } from "@/lib/utils"
import {
  IconLoader2,
  IconPlus,
  IconCircleCheck,
  IconCircle,
  IconClock,
  IconX,
  IconAlertCircle
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatDistanceToNow } from "date-fns"

export function AgentTaskList() {
  const {
    tasks,
    isLoadingTasks,
    loadTasks,
    createTask,
    updateTaskStatus,
    currentSession
  } = useAgent()

  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    loadTasks(currentSession?.id)
  }, [currentSession?.id, loadTasks])

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return

    setIsCreating(true)
    await createTask(newTaskTitle.trim())
    setNewTaskTitle("")
    setIsCreating(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleCreateTask()
    }
  }

  const tasksByStatus = {
    pending: tasks.filter(t => t.status === "pending"),
    in_progress: tasks.filter(t => t.status === "in_progress"),
    completed: tasks.filter(t => t.status === "completed"),
    failed: tasks.filter(t => t.status === "failed")
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <h3 className="font-semibold text-white">Tasks</h3>
        {currentSession && (
          <p className="text-xs text-gray-500 mt-1">
            Session: {currentSession.name}
          </p>
        )}
      </div>

      {/* New task input */}
      {currentSession && (
        <div className="border-b border-gray-800 p-3">
          <div className="flex gap-2">
            <Input
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a task..."
              className="h-9 bg-gray-800 border-gray-700"
            />
            <Button
              onClick={handleCreateTask}
              disabled={!newTaskTitle.trim() || isCreating}
              size="sm"
              className="h-9 px-3 bg-blue-600 hover:bg-blue-700"
            >
              {isCreating ? (
                <IconLoader2 className="size-4 animate-spin" />
              ) : (
                <IconPlus className="size-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoadingTasks ? (
          <div className="flex items-center justify-center py-8">
            <IconLoader2 className="size-6 animate-spin text-gray-400" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            {currentSession
              ? "No tasks yet. Add one above or ask the agent!"
              : "Select a session to view tasks"}
          </div>
        ) : (
          <div className="space-y-4">
            {/* In Progress */}
            {tasksByStatus.in_progress.length > 0 && (
              <TaskSection
                title="In Progress"
                tasks={tasksByStatus.in_progress}
                icon={<IconClock className="size-4 text-blue-400" />}
                onStatusChange={updateTaskStatus}
              />
            )}

            {/* Pending */}
            {tasksByStatus.pending.length > 0 && (
              <TaskSection
                title="Pending"
                tasks={tasksByStatus.pending}
                icon={<IconCircle className="size-4 text-gray-400" />}
                onStatusChange={updateTaskStatus}
              />
            )}

            {/* Completed */}
            {tasksByStatus.completed.length > 0 && (
              <TaskSection
                title="Completed"
                tasks={tasksByStatus.completed}
                icon={<IconCircleCheck className="size-4 text-green-400" />}
                onStatusChange={updateTaskStatus}
                collapsed
              />
            )}

            {/* Failed */}
            {tasksByStatus.failed.length > 0 && (
              <TaskSection
                title="Failed"
                tasks={tasksByStatus.failed}
                icon={<IconAlertCircle className="size-4 text-red-400" />}
                onStatusChange={updateTaskStatus}
                collapsed
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface TaskSectionProps {
  title: string
  tasks: AgentTask[]
  icon: React.ReactNode
  onStatusChange: (taskId: string, status: string) => void
  collapsed?: boolean
}

function TaskSection({
  title,
  tasks,
  icon,
  onStatusChange,
  collapsed = false
}: TaskSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed)

  return (
    <div>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex w-full items-center gap-2 text-xs font-medium text-gray-400 mb-2 hover:text-gray-300"
      >
        {icon}
        <span>{title}</span>
        <span className="ml-auto text-gray-500">({tasks.length})</span>
      </button>

      {!isCollapsed && (
        <div className="space-y-1">
          {tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface TaskItemProps {
  task: AgentTask
  onStatusChange: (taskId: string, status: string) => void
}

function TaskItem({ task, onStatusChange }: TaskItemProps) {
  const statusColors = {
    pending: "text-gray-400",
    in_progress: "text-blue-400",
    completed: "text-green-400",
    failed: "text-red-400",
    cancelled: "text-gray-500"
  }

  const statusIcons = {
    pending: <IconCircle className="size-4" />,
    in_progress: <IconClock className="size-4" />,
    completed: <IconCircleCheck className="size-4" />,
    failed: <IconAlertCircle className="size-4" />,
    cancelled: <IconX className="size-4" />
  }

  const nextStatus = {
    pending: "in_progress",
    in_progress: "completed",
    completed: "pending",
    failed: "pending",
    cancelled: "pending"
  }

  return (
    <div className="group flex items-start gap-2 rounded-lg p-2 hover:bg-gray-800/50">
      <button
        onClick={() =>
          onStatusChange(
            task.id,
            nextStatus[task.status as keyof typeof nextStatus]
          )
        }
        className={cn("mt-0.5 shrink-0", statusColors[task.status as keyof typeof statusColors])}
      >
        {statusIcons[task.status as keyof typeof statusIcons]}
      </button>

      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "text-sm",
            task.status === "completed"
              ? "text-gray-500 line-through"
              : "text-gray-200"
          )}
        >
          {task.title}
        </div>
        {task.description && (
          <div className="text-xs text-gray-500 truncate">
            {task.description}
          </div>
        )}
        <div className="text-xs text-gray-600 mt-1">
          {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
        </div>
      </div>
    </div>
  )
}
