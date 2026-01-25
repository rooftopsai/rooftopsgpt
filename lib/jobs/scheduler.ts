// lib/jobs/scheduler.ts
// Job scheduling utilities for the AI Employee platform
// Uses database-backed job queue (can be upgraded to pg-boss later)

import { createClient } from "@supabase/supabase-js"
import {
  JobType,
  JobData,
  ScheduleOptions,
  BackgroundJob,
  SequenceStepJobData,
  InvoiceReminderJobData,
  ReviewRequestJobData,
  SpeedToLeadJobData,
  StatusUpdateJobData,
  CrewNotificationJobData,
  MorningBriefingJobData
} from "./types"

// Initialize Supabase client with service role for background operations
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables")
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// Schedule a job to run at a specific time
export async function scheduleJob(
  jobType: JobType,
  data: JobData,
  options: ScheduleOptions = {}
): Promise<string | null> {
  const supabase = getServiceClient()

  const scheduledFor = options.runAt || new Date()
  const maxAttempts = options.retryLimit || 3

  const { data: job, error } = await supabase
    .from("background_jobs")
    .insert({
      workspace_id: data.workspaceId,
      job_type: jobType,
      customer_id: (data as any).customerId,
      job_id: (data as any).jobId,
      sequence_enrollment_id: (data as any).enrollmentId,
      scheduled_for: scheduledFor.toISOString(),
      status: "pending",
      max_attempts: maxAttempts,
      metadata: data
    })
    .select("id")
    .single()

  if (error) {
    console.error("Failed to schedule job:", error)
    return null
  }

  return job.id
}

// Schedule a sequence step
export async function scheduleSequenceStep(
  data: SequenceStepJobData,
  runAt: Date
): Promise<string | null> {
  return scheduleJob("sequence_step", data, { runAt })
}

// Schedule an invoice reminder
export async function scheduleInvoiceReminder(
  data: InvoiceReminderJobData,
  runAt: Date
): Promise<string | null> {
  return scheduleJob("invoice_reminder", data, { runAt })
}

// Schedule a review request
export async function scheduleReviewRequest(
  data: ReviewRequestJobData,
  runAt: Date
): Promise<string | null> {
  return scheduleJob("review_request", data, { runAt })
}

// Schedule speed-to-lead response
export async function scheduleSpeedToLead(
  data: SpeedToLeadJobData
): Promise<string | null> {
  // Speed to lead runs immediately (or within seconds)
  return scheduleJob("speed_to_lead", data, { runAt: new Date() })
}

// Schedule a status update notification
export async function scheduleStatusUpdate(
  data: StatusUpdateJobData
): Promise<string | null> {
  return scheduleJob("status_update", data, { runAt: new Date() })
}

// Schedule crew notification
export async function scheduleCrewNotification(
  data: CrewNotificationJobData,
  runAt?: Date
): Promise<string | null> {
  return scheduleJob("crew_notification", data, { runAt: runAt || new Date() })
}

// Schedule morning briefing
export async function scheduleMorningBriefing(
  data: MorningBriefingJobData,
  runAt: Date
): Promise<string | null> {
  return scheduleJob("morning_briefing", data, { runAt })
}

// Cancel a scheduled job
export async function cancelJob(jobId: string): Promise<boolean> {
  const supabase = getServiceClient()

  const { error } = await supabase
    .from("background_jobs")
    .update({ status: "cancelled" })
    .eq("id", jobId)
    .eq("status", "pending")

  return !error
}

// Get pending jobs that are ready to run
export async function getPendingJobs(limit: number = 10): Promise<BackgroundJob[]> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from("background_jobs")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(limit)

  if (error) {
    console.error("Failed to get pending jobs:", error)
    return []
  }

  return data.map(mapDbJobToBackgroundJob)
}

// Mark job as processing
export async function markJobProcessing(jobId: string): Promise<boolean> {
  const supabase = getServiceClient()

  const { error } = await supabase
    .from("background_jobs")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
      attempts: supabase.rpc("increment_attempts", { job_id: jobId })
    })
    .eq("id", jobId)

  // If rpc doesn't work, use a simpler approach
  if (error) {
    const { error: updateError } = await supabase
      .from("background_jobs")
      .update({
        status: "processing",
        started_at: new Date().toISOString()
      })
      .eq("id", jobId)

    // Increment attempts separately
    await supabase.rpc("increment_job_attempts", { job_id: jobId }).catch(() => {
      // Fallback: direct update
      return supabase
        .from("background_jobs")
        .update({ attempts: 1 })
        .eq("id", jobId)
    })

    return !updateError
  }

  return true
}

// Mark job as completed
export async function markJobCompleted(
  jobId: string,
  result?: Record<string, unknown>
): Promise<boolean> {
  const supabase = getServiceClient()

  const { error } = await supabase
    .from("background_jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      result
    })
    .eq("id", jobId)

  return !error
}

// Mark job as failed
export async function markJobFailed(
  jobId: string,
  errorMessage: string
): Promise<boolean> {
  const supabase = getServiceClient()

  // First check if we should retry
  const { data: job } = await supabase
    .from("background_jobs")
    .select("attempts, max_attempts")
    .eq("id", jobId)
    .single()

  if (job && job.attempts < job.max_attempts) {
    // Reschedule for retry with exponential backoff
    const retryDelay = Math.pow(2, job.attempts) * 60 * 1000 // 2^n minutes
    const nextRun = new Date(Date.now() + retryDelay)

    const { error } = await supabase
      .from("background_jobs")
      .update({
        status: "pending",
        scheduled_for: nextRun.toISOString(),
        error: errorMessage
      })
      .eq("id", jobId)

    return !error
  }

  // Max retries exceeded - mark as failed
  const { error } = await supabase
    .from("background_jobs")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error: errorMessage
    })
    .eq("id", jobId)

  return !error
}

// Enroll a customer in a sequence
export async function enrollInSequence(
  sequenceId: string,
  customerId: string,
  jobId?: string
): Promise<string | null> {
  const supabase = getServiceClient()

  // Get sequence details
  const { data: sequence, error: seqError } = await supabase
    .from("sequences")
    .select("*, workspaces!inner(user_id)")
    .eq("id", sequenceId)
    .single()

  if (seqError || !sequence) {
    console.error("Failed to get sequence:", seqError)
    return null
  }

  // Create enrollment
  const { data: enrollment, error: enrollError } = await supabase
    .from("sequence_enrollments")
    .insert({
      sequence_id: sequenceId,
      customer_id: customerId,
      job_id: jobId,
      status: "active",
      current_step: 0,
      next_step_at: new Date().toISOString()
    })
    .select("id")
    .single()

  if (enrollError) {
    console.error("Failed to create enrollment:", enrollError)
    return null
  }

  // Schedule first step
  const steps = sequence.steps as any[]
  if (steps.length > 0) {
    const firstStep = steps[0]
    const runAt = new Date(Date.now() + (firstStep.day || 0) * 24 * 60 * 60 * 1000)

    await scheduleSequenceStep(
      {
        workspaceId: sequence.workspace_id,
        enrollmentId: enrollment.id,
        stepIndex: 0,
        customerId,
        channel: firstStep.channel,
        template: firstStep.template,
        subject: firstStep.subject
      },
      runAt
    )
  }

  return enrollment.id
}

// Helper to map database job to BackgroundJob type
function mapDbJobToBackgroundJob(dbJob: any): BackgroundJob {
  return {
    id: dbJob.id,
    workspaceId: dbJob.workspace_id,
    jobType: dbJob.job_type,
    customerId: dbJob.customer_id,
    jobId: dbJob.job_id,
    sequenceEnrollmentId: dbJob.sequence_enrollment_id,
    scheduledFor: new Date(dbJob.scheduled_for),
    status: dbJob.status,
    attempts: dbJob.attempts,
    maxAttempts: dbJob.max_attempts,
    result: dbJob.result,
    error: dbJob.error,
    startedAt: dbJob.started_at ? new Date(dbJob.started_at) : undefined,
    completedAt: dbJob.completed_at ? new Date(dbJob.completed_at) : undefined,
    pgbossJobId: dbJob.pgboss_job_id,
    metadata: dbJob.metadata,
    createdAt: new Date(dbJob.created_at)
  }
}
