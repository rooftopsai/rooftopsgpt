// lib/sequences/executor.ts
// Sequence enrollment and execution functions

import { createClient, SupabaseClient } from "@supabase/supabase-js"
import {
  Sequence,
  SequenceEnrollment,
  SequenceStep,
  CreateSequenceInput,
  UpdateSequenceInput,
  EnrollmentStatus
} from "./types"
import { scheduleSequenceStep } from "@/lib/jobs/scheduler"
import { sendMessage } from "@/lib/messaging/gateway"

// Get Supabase client
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Map database row to Sequence
function mapDbToSequence(row: any): Sequence {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    triggerType: row.trigger_type,
    steps: row.steps || [],
    active: row.active,
    stopOnReply: row.stop_on_reply,
    stopOnBooking: row.stop_on_booking,
    totalEnrolled: row.total_enrolled || 0,
    totalCompleted: row.total_completed || 0,
    totalConverted: row.total_converted || 0,
    metadata: row.metadata,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}

// Map database row to SequenceEnrollment
function mapDbToEnrollment(row: any): SequenceEnrollment {
  return {
    id: row.id,
    sequenceId: row.sequence_id,
    customerId: row.customer_id,
    jobId: row.job_id,
    currentStep: row.current_step,
    status: row.status,
    startedAt: new Date(row.started_at),
    nextStepAt: row.next_step_at ? new Date(row.next_step_at) : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    stoppedAt: row.stopped_at ? new Date(row.stopped_at) : undefined,
    stopReason: row.stop_reason,
    metadata: row.metadata,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    sequence: row.sequence ? mapDbToSequence(row.sequence) : undefined,
    customer: row.customer,
    job: row.job
  }
}

// ============================================================================
// SEQUENCE CRUD
// ============================================================================

// Create a new sequence
export async function createSequence(
  input: CreateSequenceInput,
  supabase?: SupabaseClient
): Promise<Sequence | null> {
  const client = supabase || getServiceClient()

  const { data, error } = await client
    .from("sequences")
    .insert({
      workspace_id: input.workspaceId,
      name: input.name,
      description: input.description,
      trigger_type: input.triggerType,
      steps: input.steps,
      stop_on_reply: input.stopOnReply ?? true,
      stop_on_booking: input.stopOnBooking ?? true
    })
    .select()
    .single()

  if (error) {
    console.error("Failed to create sequence:", error)
    return null
  }

  return mapDbToSequence(data)
}

// Get sequence by ID
export async function getSequence(
  sequenceId: string,
  supabase?: SupabaseClient
): Promise<Sequence | null> {
  const client = supabase || getServiceClient()

  const { data, error } = await client
    .from("sequences")
    .select()
    .eq("id", sequenceId)
    .single()

  if (error) {
    console.error("Failed to get sequence:", error)
    return null
  }

  return mapDbToSequence(data)
}

// Update sequence
export async function updateSequence(
  sequenceId: string,
  input: UpdateSequenceInput,
  supabase?: SupabaseClient
): Promise<Sequence | null> {
  const client = supabase || getServiceClient()

  const updateData: Record<string, any> = {}

  if (input.name !== undefined) updateData.name = input.name
  if (input.description !== undefined)
    updateData.description = input.description
  if (input.steps !== undefined) updateData.steps = input.steps
  if (input.active !== undefined) updateData.active = input.active
  if (input.stopOnReply !== undefined)
    updateData.stop_on_reply = input.stopOnReply
  if (input.stopOnBooking !== undefined)
    updateData.stop_on_booking = input.stopOnBooking

  const { data, error } = await client
    .from("sequences")
    .update(updateData)
    .eq("id", sequenceId)
    .select()
    .single()

  if (error) {
    console.error("Failed to update sequence:", error)
    return null
  }

  return mapDbToSequence(data)
}

// List sequences for workspace
export async function listSequences(
  workspaceId: string,
  triggerType?: string,
  supabase?: SupabaseClient
): Promise<Sequence[]> {
  const client = supabase || getServiceClient()

  let query = client.from("sequences").select().eq("workspace_id", workspaceId)

  if (triggerType) {
    query = query.eq("trigger_type", triggerType)
  }

  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to list sequences:", error)
    return []
  }

  return data.map(mapDbToSequence)
}

// ============================================================================
// ENROLLMENT FUNCTIONS
// ============================================================================

// Enroll a customer in a sequence
export async function enrollCustomer(
  sequenceId: string,
  customerId: string,
  jobId?: string,
  supabase?: SupabaseClient
): Promise<SequenceEnrollment | null> {
  const client = supabase || getServiceClient()

  // Get sequence details
  const sequence = await getSequence(sequenceId, client)
  if (!sequence) {
    console.error("Sequence not found")
    return null
  }

  if (!sequence.active) {
    console.error("Sequence is not active")
    return null
  }

  if (sequence.steps.length === 0) {
    console.error("Sequence has no steps")
    return null
  }

  // Check if already enrolled in this sequence
  const { data: existing } = await client
    .from("sequence_enrollments")
    .select("id")
    .eq("sequence_id", sequenceId)
    .eq("customer_id", customerId)
    .eq("status", "active")
    .single()

  if (existing) {
    console.log("Customer already enrolled in this sequence")
    return null
  }

  // Create enrollment
  const firstStep = sequence.steps[0]
  const nextStepAt = calculateNextStepTime(firstStep, new Date())

  const { data: enrollment, error } = await client
    .from("sequence_enrollments")
    .insert({
      sequence_id: sequenceId,
      customer_id: customerId,
      job_id: jobId,
      status: "active",
      current_step: 0,
      next_step_at: nextStepAt.toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error("Failed to create enrollment:", error)
    return null
  }

  // Update sequence stats
  await client
    .rpc("increment_sequence_enrolled", { seq_id: sequenceId })
    .catch(() => {
      // Fallback if RPC doesn't exist
      client
        .from("sequences")
        .update({ total_enrolled: sequence.totalEnrolled + 1 })
        .eq("id", sequenceId)
    })

  // Schedule first step
  await scheduleSequenceStep(
    {
      workspaceId: sequence.workspaceId,
      enrollmentId: enrollment.id,
      stepIndex: 0,
      customerId,
      channel: firstStep.channel,
      template: firstStep.template,
      subject: firstStep.subject
    },
    nextStepAt
  )

  return mapDbToEnrollment(enrollment)
}

// Stop an enrollment
export async function stopEnrollment(
  enrollmentId: string,
  reason: string,
  newStatus: EnrollmentStatus = "stopped",
  supabase?: SupabaseClient
): Promise<boolean> {
  const client = supabase || getServiceClient()

  const { error } = await client
    .from("sequence_enrollments")
    .update({
      status: newStatus,
      stopped_at: new Date().toISOString(),
      stop_reason: reason
    })
    .eq("id", enrollmentId)

  return !error
}

// Complete an enrollment
export async function completeEnrollment(
  enrollmentId: string,
  supabase?: SupabaseClient
): Promise<boolean> {
  const client = supabase || getServiceClient()

  // Get enrollment to update sequence stats
  const { data: enrollment } = await client
    .from("sequence_enrollments")
    .select("sequence_id")
    .eq("id", enrollmentId)
    .single()

  const { error } = await client
    .from("sequence_enrollments")
    .update({
      status: "completed",
      completed_at: new Date().toISOString()
    })
    .eq("id", enrollmentId)

  if (!error && enrollment) {
    // Update sequence stats
    await client
      .from("sequences")
      .update({
        total_completed: client.sql`total_completed + 1`
      })
      .eq("id", enrollment.sequence_id)
      .catch(() => {})
  }

  return !error
}

// Mark enrollment as converted
export async function markAsConverted(
  enrollmentId: string,
  supabase?: SupabaseClient
): Promise<boolean> {
  const client = supabase || getServiceClient()

  const { data: enrollment } = await client
    .from("sequence_enrollments")
    .select("sequence_id")
    .eq("id", enrollmentId)
    .single()

  const { error } = await client
    .from("sequence_enrollments")
    .update({
      status: "converted",
      completed_at: new Date().toISOString()
    })
    .eq("id", enrollmentId)

  if (!error && enrollment) {
    await client
      .from("sequences")
      .update({
        total_converted: client.sql`total_converted + 1`
      })
      .eq("id", enrollment.sequence_id)
      .catch(() => {})
  }

  return !error
}

// Get enrollments for a customer
export async function getCustomerEnrollments(
  customerId: string,
  activeOnly: boolean = false,
  supabase?: SupabaseClient
): Promise<SequenceEnrollment[]> {
  const client = supabase || getServiceClient()

  let query = client
    .from("sequence_enrollments")
    .select(
      `
      *,
      sequence:sequences(*)
    `
    )
    .eq("customer_id", customerId)

  if (activeOnly) {
    query = query.eq("status", "active")
  }

  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to get customer enrollments:", error)
    return []
  }

  return data.map(mapDbToEnrollment)
}

// Get active enrollments that need processing
export async function getPendingEnrollments(
  limit: number = 50,
  supabase?: SupabaseClient
): Promise<SequenceEnrollment[]> {
  const client = supabase || getServiceClient()

  const { data, error } = await client
    .from("sequence_enrollments")
    .select(
      `
      *,
      sequence:sequences(*),
      customer:customers(*)
    `
    )
    .eq("status", "active")
    .lte("next_step_at", new Date().toISOString())
    .order("next_step_at", { ascending: true })
    .limit(limit)

  if (error) {
    console.error("Failed to get pending enrollments:", error)
    return []
  }

  return data.map(mapDbToEnrollment)
}

// ============================================================================
// TRIGGER FUNCTIONS
// ============================================================================

// Auto-enroll based on trigger type
export async function triggerSequences(
  workspaceId: string,
  triggerType: string,
  customerId: string,
  jobId?: string,
  supabase?: SupabaseClient
): Promise<number> {
  const client = supabase || getServiceClient()

  // Get active sequences for this trigger
  const sequences = await listSequences(workspaceId, triggerType, client)
  const activeSequences = sequences.filter(s => s.active)

  let enrolledCount = 0

  for (const sequence of activeSequences) {
    const enrollment = await enrollCustomer(
      sequence.id,
      customerId,
      jobId,
      client
    )
    if (enrollment) {
      enrolledCount++
    }
  }

  return enrolledCount
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Calculate when the next step should run
function calculateNextStepTime(step: SequenceStep, baseTime: Date): Date {
  const result = new Date(baseTime)

  // Add days
  result.setDate(result.getDate() + step.day)

  // Set time of day if specified
  if (step.timeOfDay) {
    const [hours, minutes] = step.timeOfDay.split(":").map(Number)
    result.setHours(hours, minutes, 0, 0)
  } else {
    // Default to 9 AM
    result.setHours(9, 0, 0, 0)
  }

  // If the calculated time is in the past, move to next available slot
  const now = new Date()
  if (result < now) {
    // If same day, send immediately
    if (step.day === 0) {
      return now
    }
    // Otherwise, move to tomorrow at the specified time
    result.setDate(result.getDate() + 1)
  }

  return result
}

// Render template with customer/job data
export function renderTemplate(
  template: string,
  data: {
    customer: any
    job?: any
    workspace?: any
    invoice?: any
    reviewLink?: string
    paymentLink?: string
  }
): string {
  let result = template

  // Customer variables
  if (data.customer) {
    result = result.replace(
      /\{\{customer\.name\}\}/g,
      data.customer.name || "there"
    )
    result = result.replace(
      /\{\{customer\.first_name\}\}/g,
      getFirstName(data.customer.name)
    )
    result = result.replace(
      /\{\{customer\.phone\}\}/g,
      data.customer.phone || ""
    )
    result = result.replace(
      /\{\{customer\.email\}\}/g,
      data.customer.email || ""
    )
    result = result.replace(
      /\{\{customer\.address\}\}/g,
      data.customer.address || ""
    )
  }

  // Job variables
  if (data.job) {
    result = result.replace(/\{\{job\.title\}\}/g, data.job.title || "")
    result = result.replace(/\{\{job\.address\}\}/g, data.job.address || "")
    result = result.replace(/\{\{job\.status\}\}/g, data.job.status || "")
    result = result.replace(
      /\{\{job\.scheduled_date\}\}/g,
      formatDate(data.job.scheduled_date)
    )
  }

  // Workspace variables
  if (data.workspace) {
    result = result.replace(
      /\{\{workspace\.name\}\}/g,
      data.workspace.name || ""
    )
    result = result.replace(
      /\{\{workspace\.phone\}\}/g,
      data.workspace.phone || ""
    )
  }

  // Invoice variables
  if (data.invoice) {
    result = result.replace(
      /\{\{invoice\.number\}\}/g,
      data.invoice.invoice_number || ""
    )
    result = result.replace(
      /\{\{invoice\.total\}\}/g,
      formatCurrency(data.invoice.total)
    )
    result = result.replace(
      /\{\{invoice\.due_date\}\}/g,
      formatDate(data.invoice.due_date)
    )
  }

  // Links
  if (data.reviewLink) {
    result = result.replace(/\{\{review_link\}\}/g, data.reviewLink)
  }
  if (data.paymentLink) {
    result = result.replace(/\{\{payment_link\}\}/g, data.paymentLink)
  }

  return result
}

function getFirstName(fullName: string | null): string {
  if (!fullName) return "there"
  return fullName.split(" ")[0]
}

function formatDate(date: string | Date | null): string {
  if (!date) return ""
  const d = new Date(date)
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  })
}

function formatCurrency(amount: number | string | null): string {
  if (amount === null || amount === undefined) return "$0.00"
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(num)
}
