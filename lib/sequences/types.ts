// lib/sequences/types.ts
// Type definitions for follow-up sequences

export interface Sequence {
  id: string
  workspaceId: string
  name: string
  description?: string
  triggerType: SequenceTriggerType
  steps: SequenceStep[]
  active: boolean
  stopOnReply: boolean
  stopOnBooking: boolean
  totalEnrolled: number
  totalCompleted: number
  totalConverted: number
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export type SequenceTriggerType =
  | "new_lead"
  | "estimate_sent"
  | "estimate_viewed"
  | "no_response"
  | "job_scheduled"
  | "job_complete"
  | "invoice_sent"
  | "invoice_overdue"
  | "review_request"
  | "manual"

export interface SequenceStep {
  day: number // Days after enrollment (0 = immediately)
  channel: "sms" | "email" | "voice"
  template: string // Message template with variables like {{customer.name}}
  subject?: string // For email
  timeOfDay?: string // HH:MM format, when to send (default: 9:00 AM)
  condition?: StepCondition // Optional condition for this step
}

export interface StepCondition {
  type: "job_status" | "customer_status" | "tag" | "custom"
  operator: "equals" | "not_equals" | "contains" | "not_contains"
  value: string
}

export interface SequenceEnrollment {
  id: string
  sequenceId: string
  customerId: string
  jobId?: string
  currentStep: number
  status: EnrollmentStatus
  startedAt: Date
  nextStepAt?: Date
  completedAt?: Date
  stoppedAt?: Date
  stopReason?: string
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  // Joined data
  sequence?: Sequence
  customer?: any
  job?: any
}

export type EnrollmentStatus =
  | "active"
  | "paused"
  | "completed"
  | "stopped"
  | "unsubscribed"
  | "converted"

export interface CreateSequenceInput {
  workspaceId: string
  name: string
  description?: string
  triggerType: SequenceTriggerType
  steps: SequenceStep[]
  stopOnReply?: boolean
  stopOnBooking?: boolean
}

export interface UpdateSequenceInput {
  name?: string
  description?: string
  steps?: SequenceStep[]
  active?: boolean
  stopOnReply?: boolean
  stopOnBooking?: boolean
}

// Default templates for common sequence types
export const DEFAULT_TEMPLATES: Record<SequenceTriggerType, SequenceStep[]> = {
  new_lead: [
    {
      day: 0,
      channel: "sms",
      template:
        "Hi {{customer.name}}! Thanks for your interest in our roofing services. I'm here to help. When would be a good time to discuss your project?",
      timeOfDay: "09:00"
    },
    {
      day: 1,
      channel: "email",
      template:
        "Hi {{customer.name}},\n\nThank you for reaching out about your roofing needs. We'd love to schedule a free inspection and provide you with a no-obligation estimate.\n\nWould any of these times work for you?\n- Tomorrow morning\n- Tomorrow afternoon\n- This weekend\n\nJust reply to this email or text us at {{workspace.phone}}.\n\nBest regards,\n{{workspace.name}}",
      subject: "Your Free Roofing Estimate"
    },
    {
      day: 3,
      channel: "sms",
      template:
        "Hey {{customer.name}}, just checking in! We'd still love to help with your roofing project. Ready to schedule that free estimate?",
      timeOfDay: "14:00"
    },
    {
      day: 7,
      channel: "voice",
      template:
        "Call script: Introduce yourself, remind them of their inquiry, ask about their roofing concerns, and offer to schedule an estimate.",
      timeOfDay: "10:00"
    }
  ],
  estimate_sent: [
    {
      day: 1,
      channel: "sms",
      template:
        "Hi {{customer.name}}, I wanted to make sure you received the estimate we sent for your roofing project. Any questions I can answer?",
      timeOfDay: "10:00"
    },
    {
      day: 3,
      channel: "email",
      template:
        "Hi {{customer.name}},\n\nI hope you had a chance to review our estimate for your roofing project.\n\nAs a reminder, our estimate includes:\n- Premium materials with manufacturer warranty\n- Professional installation by our experienced crew\n- Complete cleanup and debris removal\n\nWe're currently booking jobs for the next 2-3 weeks. Would you like to secure your spot?\n\nFeel free to call or text with any questions.\n\nBest,\n{{workspace.name}}",
      subject: "Following up on your roofing estimate"
    },
    {
      day: 7,
      channel: "sms",
      template:
        "{{customer.name}}, quick question - is there anything holding you back from moving forward with your roof? I'm happy to address any concerns.",
      timeOfDay: "14:00"
    }
  ],
  estimate_viewed: [],
  no_response: [
    {
      day: 0,
      channel: "sms",
      template:
        "Hi {{customer.name}}, we haven't heard back from you. Still interested in getting your roof taken care of? Reply YES and I'll reach out!",
      timeOfDay: "10:00"
    }
  ],
  job_scheduled: [
    {
      day: -1, // Day before
      channel: "sms",
      template:
        "Hi {{customer.name}}! This is a reminder that your roofing project is scheduled for tomorrow. Our crew will arrive between 7-8 AM. See you then!",
      timeOfDay: "18:00"
    }
  ],
  job_complete: [
    {
      day: 1,
      channel: "sms",
      template:
        "Hi {{customer.name}}! We hope you're enjoying your new roof! Please don't hesitate to reach out if you have any questions.",
      timeOfDay: "10:00"
    },
    {
      day: 3,
      channel: "email",
      template:
        "Hi {{customer.name}},\n\nWe wanted to thank you again for choosing us for your roofing project!\n\nAs a reminder, your roof comes with a {{warranty_years}}-year workmanship warranty. Keep your warranty documents in a safe place.\n\nIf you're happy with our work, we'd really appreciate it if you could leave us a review. It helps our small business a lot!\n\n{{review_link}}\n\nThank you!\n{{workspace.name}}",
      subject: "Thank you for your business!"
    }
  ],
  invoice_sent: [
    {
      day: 3,
      channel: "sms",
      template:
        "Hi {{customer.name}}, this is a friendly reminder about your invoice of {{invoice.total}}. Let us know if you have any questions!",
      timeOfDay: "10:00"
    },
    {
      day: 7,
      channel: "email",
      template:
        "Hi {{customer.name}},\n\nThis is a reminder that your invoice #{{invoice.number}} for {{invoice.total}} is due on {{invoice.due_date}}.\n\nYou can pay online here: {{payment_link}}\n\nIf you've already paid, please disregard this message.\n\nQuestions? Just reply to this email.\n\nThank you!\n{{workspace.name}}",
      subject: "Invoice Reminder - #{{invoice.number}}"
    }
  ],
  invoice_overdue: [
    {
      day: 0,
      channel: "sms",
      template:
        "Hi {{customer.name}}, your invoice of {{invoice.total}} is now past due. Please contact us to discuss payment options.",
      timeOfDay: "10:00"
    }
  ],
  review_request: [
    {
      day: 0,
      channel: "sms",
      template:
        "Hi {{customer.name}}! Thank you for choosing us. If you're happy with your new roof, would you mind leaving us a quick review? It really helps! {{review_link}}",
      timeOfDay: "10:00"
    },
    {
      day: 7,
      channel: "email",
      template:
        "Hi {{customer.name}},\n\nWe hope you're loving your new roof!\n\nIf you have a moment, we'd be so grateful if you could share your experience with others. Your review helps other homeowners find quality roofing services.\n\n{{review_link}}\n\nThank you for your support!\n{{workspace.name}}",
      subject: "A quick favor?"
    }
  ],
  manual: []
}
