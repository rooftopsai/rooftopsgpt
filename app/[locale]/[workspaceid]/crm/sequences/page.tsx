"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import {
  IconPlus,
  IconMessage,
  IconMail,
  IconPhone,
  IconEdit,
  IconTrash,
  IconLoader2,
  IconPlayerPlay,
  IconPlayerPause,
  IconClock,
  IconUsers,
  IconArrowRight,
  IconX,
  IconGripVertical
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface Sequence {
  id: string
  workspaceId: string
  name: string
  description?: string
  trigger: SequenceTrigger
  isActive: boolean
  steps: SequenceStep[]
  enrolledCount: number
  completedCount: number
  createdAt: string
}

type SequenceTrigger =
  | "new_lead"
  | "estimate_sent"
  | "job_completed"
  | "invoice_sent"
  | "manual"

interface SequenceStep {
  id: string
  order: number
  channel: "sms" | "email" | "voice"
  delayDays: number
  delayHours: number
  template: string
  subject?: string
}

const triggerLabels: Record<SequenceTrigger, string> = {
  new_lead: "New Lead Created",
  estimate_sent: "Estimate Sent",
  job_completed: "Job Completed",
  invoice_sent: "Invoice Sent",
  manual: "Manual Enrollment"
}

const triggerColors: Record<SequenceTrigger, string> = {
  new_lead: "bg-blue-100 text-blue-700",
  estimate_sent: "bg-yellow-100 text-yellow-700",
  job_completed: "bg-green-100 text-green-700",
  invoice_sent: "bg-purple-100 text-purple-700",
  manual: "bg-gray-100 text-gray-700"
}

export default function SequencesPage() {
  const params = useParams()
  const workspaceId = params.workspaceid as string

  const [sequences, setSequences] = useState<Sequence[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSequence, setEditingSequence] = useState<Sequence | null>(null)

  // Mock data
  useEffect(() => {
    const mockSequences: Sequence[] = [
      {
        id: "1",
        workspaceId,
        name: "New Lead Follow-Up",
        description:
          "Automated follow-up sequence for new leads who haven't scheduled an estimate",
        trigger: "new_lead",
        isActive: true,
        steps: [
          {
            id: "s1",
            order: 1,
            channel: "sms",
            delayDays: 0,
            delayHours: 0,
            template:
              "Hi {{customer.first_name}}! Thanks for contacting ABC Roofing. We received your inquiry and will reach out within 24 hours. Reply STOP to opt out."
          },
          {
            id: "s2",
            order: 2,
            channel: "sms",
            delayDays: 1,
            delayHours: 0,
            template:
              "Hi {{customer.first_name}}, just following up on your roofing inquiry. Would you like to schedule a free inspection? Reply with a good time!"
          },
          {
            id: "s3",
            order: 3,
            channel: "email",
            delayDays: 3,
            delayHours: 0,
            subject: "Your Free Roof Inspection",
            template:
              "Hi {{customer.first_name}},\n\nI wanted to follow up on your recent inquiry about roofing services..."
          }
        ],
        enrolledCount: 45,
        completedCount: 32,
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
      },
      {
        id: "2",
        workspaceId,
        name: "Estimate Follow-Up",
        description: "Follow up with customers after sending an estimate",
        trigger: "estimate_sent",
        isActive: true,
        steps: [
          {
            id: "s1",
            order: 1,
            channel: "sms",
            delayDays: 2,
            delayHours: 0,
            template:
              "Hi {{customer.first_name}}, just checking in on the estimate we sent. Any questions I can answer?"
          },
          {
            id: "s2",
            order: 2,
            channel: "voice",
            delayDays: 5,
            delayHours: 0,
            template: "Follow up call about estimate"
          },
          {
            id: "s3",
            order: 3,
            channel: "sms",
            delayDays: 10,
            delayHours: 0,
            template:
              "Hi {{customer.first_name}}, your estimate from ABC Roofing is still valid. Ready to move forward when you are!"
          }
        ],
        enrolledCount: 28,
        completedCount: 15,
        createdAt: new Date(Date.now() - 20 * 86400000).toISOString()
      },
      {
        id: "3",
        workspaceId,
        name: "Review Request",
        description: "Request reviews from satisfied customers",
        trigger: "job_completed",
        isActive: false,
        steps: [
          {
            id: "s1",
            order: 1,
            channel: "sms",
            delayDays: 1,
            delayHours: 0,
            template:
              "Hi {{customer.first_name}}! We hope you're happy with your new roof. Would you mind leaving us a review? {{review_link}}"
          },
          {
            id: "s2",
            order: 2,
            channel: "email",
            delayDays: 7,
            delayHours: 0,
            subject: "How did we do?",
            template:
              "Hi {{customer.first_name}},\n\nThank you for choosing ABC Roofing! We'd love to hear about your experience..."
          }
        ],
        enrolledCount: 12,
        completedCount: 12,
        createdAt: new Date(Date.now() - 15 * 86400000).toISOString()
      }
    ]

    setTimeout(() => {
      setSequences(mockSequences)
      setLoading(false)
    }, 500)
  }, [workspaceId])

  const handleToggleActive = (sequenceId: string) => {
    setSequences(prev =>
      prev.map(s => (s.id === sequenceId ? { ...s, isActive: !s.isActive } : s))
    )
  }

  const handleCreateSequence = () => {
    setEditingSequence(null)
    setShowModal(true)
  }

  const handleEditSequence = (sequence: Sequence) => {
    setEditingSequence(sequence)
    setShowModal(true)
  }

  const handleDeleteSequence = (sequenceId: string) => {
    if (!confirm("Are you sure you want to delete this sequence?")) return
    setSequences(prev => prev.filter(s => s.id !== sequenceId))
  }

  const getChannelIcon = (channel: "sms" | "email" | "voice") => {
    switch (channel) {
      case "sms":
        return <IconMessage size={16} className="text-blue-500" />
      case "email":
        return <IconMail size={16} className="text-purple-500" />
      case "voice":
        return <IconPhone size={16} className="text-green-500" />
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Follow-Up Sequences
          </h2>
          <p className="text-sm text-gray-500">
            Automated multi-touch campaigns to nurture leads and customers
          </p>
        </div>
        <button
          onClick={handleCreateSequence}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
        >
          <IconPlus size={18} />
          Create Sequence
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <IconLoader2 size={32} className="animate-spin text-purple-600" />
        </div>
      ) : sequences.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
          <IconMail size={48} className="mb-4 text-gray-300" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            No sequences yet
          </h3>
          <p className="mb-4 text-sm text-gray-500">
            Create automated follow-up sequences to engage your leads
          </p>
          <button
            onClick={handleCreateSequence}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
          >
            <IconPlus size={18} />
            Create Your First Sequence
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sequences.map(sequence => (
            <div
              key={sequence.id}
              className="rounded-xl border bg-white shadow-sm"
            >
              {/* Sequence Header */}
              <div className="flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleToggleActive(sequence.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                      sequence.isActive
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {sequence.isActive ? (
                      <>
                        <IconPlayerPlay size={14} />
                        Active
                      </>
                    ) : (
                      <>
                        <IconPlayerPause size={14} />
                        Paused
                      </>
                    )}
                  </button>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {sequence.name}
                    </h3>
                    {sequence.description && (
                      <p className="text-sm text-gray-500">
                        {sequence.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium",
                      triggerColors[sequence.trigger]
                    )}
                  >
                    {triggerLabels[sequence.trigger]}
                  </span>
                  <button
                    onClick={() => handleEditSequence(sequence)}
                    className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  >
                    <IconEdit size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteSequence(sequence.id)}
                    className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600"
                  >
                    <IconTrash size={18} />
                  </button>
                </div>
              </div>

              {/* Sequence Steps */}
              <div className="p-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  <div className="flex shrink-0 items-center justify-center rounded-lg bg-purple-100 px-3 py-2 text-sm font-medium text-purple-700">
                    Trigger
                  </div>
                  {sequence.steps.map((step, index) => (
                    <div key={step.id} className="flex items-center gap-2">
                      <IconArrowRight
                        size={16}
                        className="shrink-0 text-gray-300"
                      />
                      <div className="flex shrink-0 items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2">
                        {getChannelIcon(step.channel)}
                        <span className="text-sm text-gray-700">
                          {step.channel.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-400">
                          {step.delayDays > 0
                            ? `+${step.delayDays}d`
                            : step.delayHours > 0
                              ? `+${step.delayHours}h`
                              : "Immediate"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sequence Stats */}
              <div className="flex items-center gap-6 border-t bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <IconUsers size={16} />
                  <span>{sequence.enrolledCount} enrolled</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <IconCheck size={16} />
                  <span>{sequence.completedCount} completed</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <IconClock size={16} />
                  <span>{sequence.steps.length} steps</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sequence Modal */}
      {showModal && (
        <SequenceModal
          sequence={editingSequence}
          onSave={() => setShowModal(false)}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

function IconCheck({ size, className }: { size: number; className?: string }) {
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
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

// Sequence Modal Component
function SequenceModal({
  sequence,
  onSave,
  onClose
}: {
  sequence: Sequence | null
  onSave: () => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    name: sequence?.name || "",
    description: sequence?.description || "",
    trigger: sequence?.trigger || ("new_lead" as SequenceTrigger),
    steps: sequence?.steps || [
      {
        id: "new-1",
        order: 1,
        channel: "sms" as const,
        delayDays: 0,
        delayHours: 0,
        template: ""
      }
    ]
  })
  const [saving, setSaving] = useState(false)

  const handleAddStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          id: `new-${Date.now()}`,
          order: prev.steps.length + 1,
          channel: "sms" as const,
          delayDays: 1,
          delayHours: 0,
          template: ""
        }
      ]
    }))
  }

  const handleRemoveStep = (stepId: string) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter(s => s.id !== stepId)
    }))
  }

  const handleStepChange = (
    stepId: string,
    field: keyof SequenceStep,
    value: any
  ) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map(s =>
        s.id === stepId ? { ...s, [field]: value } : s
      )
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    // API call would go here
    setTimeout(() => {
      setSaving(false)
      onSave()
    }, 500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {sequence ? "Edit Sequence" : "Create Sequence"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="max-h-[calc(90vh-130px)] overflow-y-auto p-6"
        >
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-gray-600">
                  Sequence Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, name: e.target.value }))
                  }
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="New Lead Follow-Up"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      description: e.target.value
                    }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="Automated follow-up for new leads"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">
                  Trigger
                </label>
                <select
                  value={formData.trigger}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      trigger: e.target.value as SequenceTrigger
                    }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  {Object.entries(triggerLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Steps */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Sequence Steps
                </label>
                <button
                  type="button"
                  onClick={handleAddStep}
                  className="flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-700"
                >
                  <IconPlus size={16} />
                  Add Step
                </button>
              </div>
              <div className="space-y-3">
                {formData.steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="rounded-lg border bg-gray-50 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconGripVertical
                          size={16}
                          className="cursor-move text-gray-400"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Step {index + 1}
                        </span>
                      </div>
                      {formData.steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(step.id)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <IconTrash size={16} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">
                          Channel
                        </label>
                        <select
                          value={step.channel}
                          onChange={e =>
                            handleStepChange(step.id, "channel", e.target.value)
                          }
                          className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-purple-500 focus:outline-none"
                        >
                          <option value="sms">SMS</option>
                          <option value="email">Email</option>
                          <option value="voice">Voice</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">
                          Delay (days)
                        </label>
                        <input
                          type="number"
                          value={step.delayDays}
                          onChange={e =>
                            handleStepChange(
                              step.id,
                              "delayDays",
                              parseInt(e.target.value) || 0
                            )
                          }
                          min="0"
                          className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="mb-1 block text-xs text-gray-500">
                          {step.channel === "email" ? "Subject" : "Preview"}
                        </label>
                        <input
                          type="text"
                          value={step.subject || ""}
                          onChange={e =>
                            handleStepChange(step.id, "subject", e.target.value)
                          }
                          className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-purple-500 focus:outline-none"
                          placeholder={
                            step.channel === "email"
                              ? "Email subject"
                              : "Message preview"
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="mb-1 block text-xs text-gray-500">
                        Message Template
                      </label>
                      <textarea
                        value={step.template}
                        onChange={e =>
                          handleStepChange(step.id, "template", e.target.value)
                        }
                        rows={2}
                        className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-purple-500 focus:outline-none"
                        placeholder="Hi {{customer.first_name}}, ..."
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Available variables: {"{{customer.name}}"},{" "}
                {"{{customer.first_name}}"}, {"{{job.title}}"},{" "}
                {"{{review_link}}"}, {"{{payment_link}}"}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <IconLoader2 size={16} className="animate-spin" />}
              {sequence ? "Save Changes" : "Create Sequence"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
