"use client"

import React, { useState } from "react"
import { AgentToolCard } from "./AgentToolCard"
import { AgentConfirmation } from "./AgentConfirmation"
import {
  IconLoader2,
  IconCheck,
  IconX,
  IconPlayerStop,
  IconCopy,
  IconShare,
  IconRefresh,
  IconClock,
  IconChevronDown,
  IconChevronUp,
  IconPlus
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { ExtendedAgentTask, ExtendedTaskStep } from "./useAgentV2"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

// Markdown components for consistent rendering
const markdownComponents = {
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
  ),
  h1: ({ children }: { children: React.ReactNode }) => (
    <h1 className="mb-4 mt-6 text-xl font-semibold first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children: React.ReactNode }) => (
    <h2 className="mb-3 mt-5 text-lg font-semibold first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children: React.ReactNode }) => (
    <h3 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h3>
  ),
  h4: ({ children }: { children: React.ReactNode }) => (
    <h4 className="mb-2 mt-3 text-sm font-semibold first:mt-0">{children}</h4>
  ),
  ul: ({ children }: { children: React.ReactNode }) => (
    <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>
  ),
  ol: ({ children }: { children: React.ReactNode }) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>
  ),
  li: ({ children }: { children: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  strong: ({ children }: { children: React.ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }: { children: React.ReactNode }) => (
    <em className="italic">{children}</em>
  ),
  code: ({ children, className }: { children: React.ReactNode; className?: string }) => {
    const isInline = !className
    return isInline ? (
      <code className="rounded border border-border bg-muted px-1.5 py-0.5 text-sm font-mono">
        {children}
      </code>
    ) : (
      <code className="block overflow-x-auto rounded-lg border border-border bg-muted p-3 text-sm font-mono">
        {children}
      </code>
    )
  },
  pre: ({ children }: { children: React.ReactNode }) => (
    <pre className="mb-3 overflow-x-auto rounded-lg border border-border bg-muted p-3">
      {children}
    </pre>
  ),
  a: ({ href, children }: { href?: string; children: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }: { children: React.ReactNode }) => (
    <blockquote className="mb-3 border-l-4 border-primary/30 pl-4 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-border" />,
  table: ({ children }: { children: React.ReactNode }) => (
    <div className="mb-3 overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full divide-y divide-border">{children}</table>
    </div>
  ),
  thead: ({ children }: { children: React.ReactNode }) => (
    <thead className="bg-muted">{children}</thead>
  ),
  th: ({ children }: { children: React.ReactNode }) => (
    <th className="px-3 py-2 text-left text-sm font-semibold">{children}</th>
  ),
  td: ({ children }: { children: React.ReactNode }) => (
    <td className="px-3 py-2 text-sm">{children}</td>
  ),
  tr: ({ children }: { children: React.ReactNode }) => (
    <tr className="border-b border-border last:border-0">{children}</tr>
  )
}

export interface TaskStep {
  id: string
  description: string
  toolName: string | null
  status: "pending" | "running" | "completed" | "failed" | "awaiting_confirmation"
  result?: any
  error?: string
  preview?: any
}

export interface AgentTask {
  id: string
  goal: string
  status: "running" | "awaiting_confirmation" | "completed" | "failed"
  steps: TaskStep[]
  response?: string
  error?: string
}

interface AgentTaskViewProps {
  task: ExtendedAgentTask
  onConfirm: (stepId: string) => void
  onCancel: (stepId: string) => void
  onCancelTask: () => void
  onCopy?: (result: any) => void
  onShare?: () => void
  onRetry?: (stepId: string) => void
  onNewTask?: () => void
}

export function AgentTaskView({
  task,
  onConfirm,
  onCancel,
  onCancelTask,
  onCopy,
  onShare,
  onRetry,
  onNewTask
}: AgentTaskViewProps) {
  const pendingConfirmation = task.steps.find(
    s => s.status === "awaiting_confirmation"
  )

  const isComplete = task.status === "completed" || task.status === "failed"

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      {/* Task Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <TaskStatusBadge status={task.status} />
              {task.totalDurationMs && isComplete && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <IconClock className="size-3" />
                  {formatDuration(task.totalDurationMs)}
                </span>
              )}
            </div>
            <h2 className="mt-2 text-lg font-medium text-foreground">
              {task.goal}
            </h2>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {task.status === "running" && (
              <button
                onClick={onCancelTask}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Stop task (Esc)"
              >
                <IconPlayerStop className="size-4" />
                <span className="hidden sm:inline">Stop</span>
              </button>
            )}

            {isComplete && (
              <>
                {onCopy && task.response && (
                  <button
                    onClick={() => onCopy(task.response)}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Copy result"
                  >
                    <IconCopy className="size-4" />
                    <span className="hidden sm:inline">Copy</span>
                  </button>
                )}
                {onShare && (
                  <button
                    onClick={onShare}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Share result"
                  >
                    <IconShare className="size-4" />
                    <span className="hidden sm:inline">Share</span>
                  </button>
                )}
                {onNewTask && (
                  <button
                    onClick={onNewTask}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    title="New task (Cmd+K)"
                  >
                    <IconPlus className="size-4" />
                    <span className="hidden sm:inline">New</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Steps Progress */}
      <div className="flex-1 p-6">
        <div className="space-y-3">
          {task.steps.map((step, index) => (
            <TaskStepItem
              key={step.id}
              step={step}
              isLast={index === task.steps.length - 1 && !task.streamingContent}
              onRetry={onRetry}
            />
          ))}

          {/* Streaming Content Display */}
          {task.streamingContent && task.status === "running" && (
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <IconLoader2 className="size-5 animate-spin text-primary" />
                <div className="mt-1 w-0.5 flex-1 bg-border" />
              </div>
              <div className="flex-1 pb-4">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {task.streamingContent}
                    </ReactMarkdown>
                    <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-primary" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Running indicator (when no steps yet) */}
          {task.status === "running" && task.steps.length === 0 && !task.streamingContent && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
              <IconLoader2 className="size-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Thinking...</span>
            </div>
          )}

          {/* Running indicator after steps */}
          {task.status === "running" && task.steps.length > 0 && !task.streamingContent && !pendingConfirmation && (
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <IconLoader2 className="size-5 animate-spin text-primary" />
              </div>
              <div className="flex-1">
                <span className="text-sm text-muted-foreground">Processing...</span>
              </div>
            </div>
          )}
        </div>

        {/* Confirmation Panel */}
        {pendingConfirmation && (
          <div className="mt-6">
            <AgentConfirmation
              step={pendingConfirmation}
              onConfirm={() => onConfirm(pendingConfirmation.id)}
              onCancel={() => onCancel(pendingConfirmation.id)}
            />
          </div>
        )}

        {/* Final Response */}
        {task.response && task.status === "completed" && (
          <div className="mt-6">
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="prose prose-sm dark:prose-invert max-w-none flex-1 text-foreground">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {task.response}
                  </ReactMarkdown>
                </div>
                {onCopy && (
                  <button
                    onClick={() => onCopy(task.response)}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-green-500/10 hover:text-foreground"
                    title="Copy response"
                  >
                    <IconCopy className="size-4" />
                  </button>
                )}
              </div>

              {/* Token count */}
              {task.tokenCount && (
                <div className="mt-3 flex items-center gap-4 border-t border-green-500/20 pt-3 text-xs text-muted-foreground">
                  <span>{task.tokenCount.total.toLocaleString()} tokens used</span>
                  {task.totalDurationMs && (
                    <span>Completed in {formatDuration(task.totalDurationMs)}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {task.error && task.status === "failed" && (
          <div className="mt-6">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-destructive">Task Failed</p>
                  <p className="mt-1 text-sm text-muted-foreground">{task.error}</p>
                </div>
                {onNewTask && (
                  <button
                    onClick={onNewTask}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/20"
                  >
                    <IconRefresh className="size-4" />
                    Try Again
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TaskStatusBadge({ status }: { status: AgentTask["status"] }) {
  const config = {
    running: {
      label: "Running",
      className: "bg-primary/10 text-primary",
      icon: IconLoader2,
      animate: true
    },
    awaiting_confirmation: {
      label: "Needs Approval",
      className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      icon: null,
      animate: false
    },
    completed: {
      label: "Completed",
      className: "bg-green-500/10 text-green-600 dark:text-green-400",
      icon: IconCheck,
      animate: false
    },
    failed: {
      label: "Failed",
      className: "bg-destructive/10 text-destructive",
      icon: IconX,
      animate: false
    }
  }

  const { label, className, icon: Icon, animate } = config[status]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        className
      )}
    >
      {Icon && (
        <Icon
          className={cn("size-3", animate && "animate-spin")}
        />
      )}
      {label}
    </span>
  )
}

function TaskStepItem({
  step,
  isLast,
  onRetry
}: {
  step: ExtendedTaskStep
  isLast: boolean
  onRetry?: (stepId: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const statusIcon = {
    pending: <div className="size-5 rounded-full border-2 border-muted" />,
    running: <IconLoader2 className="size-5 animate-spin text-primary" />,
    completed: (
      <div className="flex size-5 items-center justify-center rounded-full bg-green-500">
        <IconCheck className="size-3 text-white" />
      </div>
    ),
    failed: (
      <div className="flex size-5 items-center justify-center rounded-full bg-destructive">
        <IconX className="size-3 text-white" />
      </div>
    ),
    awaiting_confirmation: (
      <div className="size-5 rounded-full border-2 border-amber-500 bg-amber-500/20" />
    )
  }

  return (
    <div className="flex gap-3">
      {/* Status Icon */}
      <div className="flex flex-col items-center">
        {statusIcon[step.status]}
        {!isLast && (
          <div
            className={cn(
              "mt-1 w-0.5 flex-1",
              step.status === "completed" ? "bg-green-500/30" : "bg-border"
            )}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "text-sm",
              step.status === "pending"
                ? "text-muted-foreground"
                : "text-foreground"
            )}
          >
            {step.description}
          </p>

          {/* Duration badge */}
          {step.durationMs && step.status === "completed" && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDuration(step.durationMs)}
            </span>
          )}

          {/* Retry button for failed steps */}
          {step.status === "failed" && onRetry && (
            <button
              onClick={() => onRetry(step.id)}
              className="flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs text-destructive transition-colors hover:bg-destructive/10"
            >
              <IconRefresh className="size-3" />
              Retry
              {step.retryCount && step.retryCount > 0 && (
                <span className="text-muted-foreground">({step.retryCount})</span>
              )}
            </button>
          )}
        </div>

        {/* Tool Result Card - expandable for completed steps with results */}
        {step.toolName && step.result && step.status === "completed" && (
          <div className="mt-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
            >
              <span className="text-muted-foreground">
                {isExpanded ? "Hide result" : "Show result"}
              </span>
              {isExpanded ? (
                <IconChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <IconChevronDown className="size-4 text-muted-foreground" />
              )}
            </button>
            {isExpanded && (
              <div className="mt-2">
                <AgentToolCard
                  toolName={step.toolName}
                  result={step.result}
                  status="completed"
                />
              </div>
            )}
          </div>
        )}

        {/* Running tool indicator */}
        {step.status === "running" && (
          <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <div className="flex items-center gap-2">
              <IconLoader2 className="size-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Executing...</span>
            </div>
          </div>
        )}

        {/* Error */}
        {step.error && (
          <p className="mt-1 text-sm text-destructive">{step.error}</p>
        )}
      </div>
    </div>
  )
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`
  }
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}
