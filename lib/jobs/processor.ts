// lib/jobs/processor.ts
// Job processor - handles execution of background jobs

import {
  JobType,
  JobResult,
  BackgroundJob,
  SequenceStepJobData,
  InvoiceReminderJobData,
  ReviewRequestJobData,
  SpeedToLeadJobData,
  StatusUpdateJobData,
  CrewNotificationJobData,
  MorningBriefingJobData,
  WeatherCheckJobData
} from "./types"
import {
  getPendingJobs,
  markJobProcessing,
  markJobCompleted,
  markJobFailed,
  scheduleSequenceStep
} from "./scheduler"
import { createClient } from "@supabase/supabase-js"

// Initialize Supabase client with service role
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Process a batch of pending jobs
export async function processJobs(batchSize: number = 10): Promise<number> {
  const jobs = await getPendingJobs(batchSize)
  let processedCount = 0

  for (const job of jobs) {
    try {
      await processJob(job)
      processedCount++
    } catch (error) {
      console.error(`Error processing job ${job.id}:`, error)
    }
  }

  return processedCount
}

// Process a single job
async function processJob(job: BackgroundJob): Promise<void> {
  // Mark as processing
  const claimed = await markJobProcessing(job.id)
  if (!claimed) {
    console.log(`Job ${job.id} already claimed by another worker`)
    return
  }

  try {
    const result = await executeJob(job)

    if (result.success) {
      await markJobCompleted(job.id, result.data)
    } else {
      await markJobFailed(job.id, result.error || "Unknown error")
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"
    await markJobFailed(job.id, errorMessage)
  }
}

// Execute job based on type
async function executeJob(job: BackgroundJob): Promise<JobResult> {
  const data = job.metadata as any

  switch (job.jobType) {
    case "sequence_step":
      return handleSequenceStep(data as SequenceStepJobData)

    case "invoice_reminder":
      return handleInvoiceReminder(data as InvoiceReminderJobData)

    case "review_request":
      return handleReviewRequest(data as ReviewRequestJobData)

    case "speed_to_lead":
      return handleSpeedToLead(data as SpeedToLeadJobData)

    case "status_update":
      return handleStatusUpdate(data as StatusUpdateJobData)

    case "crew_notification":
      return handleCrewNotification(data as CrewNotificationJobData)

    case "morning_briefing":
      return handleMorningBriefing(data as MorningBriefingJobData)

    case "weather_check":
      return handleWeatherCheck(data as WeatherCheckJobData)

    default:
      return {
        success: false,
        error: `Unknown job type: ${job.jobType}`
      }
  }
}

// =============================================================================
// JOB HANDLERS
// =============================================================================

// Handle sequence step execution
async function handleSequenceStep(
  data: SequenceStepJobData
): Promise<JobResult> {
  const supabase = getServiceClient()

  try {
    // Get enrollment and sequence details
    const { data: enrollment, error: enrollError } = await supabase
      .from("sequence_enrollments")
      .select(
        `
        *,
        sequence:sequences(*),
        customer:customers(*)
      `
      )
      .eq("id", data.enrollmentId)
      .single()

    if (enrollError || !enrollment) {
      return { success: false, error: "Enrollment not found" }
    }

    // Check if enrollment is still active
    if (enrollment.status !== "active") {
      return {
        success: true,
        message: `Enrollment no longer active (${enrollment.status})`
      }
    }

    const customer = enrollment.customer
    const sequence = enrollment.sequence
    const steps = sequence.steps as any[]
    const currentStep = steps[data.stepIndex]

    if (!currentStep) {
      return { success: false, error: "Step not found" }
    }

    // Send the communication
    let sendResult: JobResult

    switch (data.channel) {
      case "sms":
        sendResult = await sendSms(
          data.workspaceId,
          customer.phone,
          data.template,
          customer,
          enrollment.job_id
        )
        break

      case "email":
        sendResult = await sendEmail(
          data.workspaceId,
          customer.email,
          data.subject || "Follow up",
          data.template,
          customer,
          enrollment.job_id
        )
        break

      case "voice":
        sendResult = await initiateVoiceCall(
          data.workspaceId,
          customer.phone,
          data.template,
          customer,
          enrollment.job_id
        )
        break

      default:
        return { success: false, error: `Unknown channel: ${data.channel}` }
    }

    if (!sendResult.success) {
      return sendResult
    }

    // Update enrollment
    const nextStepIndex = data.stepIndex + 1

    if (nextStepIndex >= steps.length) {
      // Sequence complete
      await supabase
        .from("sequence_enrollments")
        .update({
          status: "completed",
          current_step: nextStepIndex,
          completed_at: new Date().toISOString()
        })
        .eq("id", data.enrollmentId)
    } else {
      // Schedule next step
      const nextStep = steps[nextStepIndex]
      const daysUntilNext = (nextStep.day || 0) - (currentStep.day || 0)
      const nextRunAt = new Date(
        Date.now() + daysUntilNext * 24 * 60 * 60 * 1000
      )

      await supabase
        .from("sequence_enrollments")
        .update({
          current_step: nextStepIndex,
          next_step_at: nextRunAt.toISOString()
        })
        .eq("id", data.enrollmentId)

      await scheduleSequenceStep(
        {
          ...data,
          stepIndex: nextStepIndex,
          channel: nextStep.channel,
          template: nextStep.template,
          subject: nextStep.subject
        },
        nextRunAt
      )
    }

    return {
      success: true,
      message: `Sent ${data.channel} for step ${data.stepIndex + 1}`
    }
  } catch (error) {
    console.error("Sequence step error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

// Handle invoice reminder
async function handleInvoiceReminder(
  data: InvoiceReminderJobData
): Promise<JobResult> {
  const supabase = getServiceClient()

  try {
    // Get invoice and customer details
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select(
        `
        *,
        customer:customers(*)
      `
      )
      .eq("id", data.invoiceId)
      .single()

    if (error || !invoice) {
      return { success: false, error: "Invoice not found" }
    }

    // Skip if already paid
    if (invoice.status === "paid") {
      return { success: true, message: "Invoice already paid" }
    }

    const customer = invoice.customer
    const template = getInvoiceReminderTemplate(
      data.reminderNumber,
      invoice.total,
      invoice.due_date
    )

    let sendResult: JobResult

    if (data.channel === "sms" && customer.phone) {
      sendResult = await sendSms(
        data.workspaceId,
        customer.phone,
        template,
        customer
      )
    } else if (data.channel === "email" && customer.email) {
      sendResult = await sendEmail(
        data.workspaceId,
        customer.email,
        `Payment Reminder - Invoice #${invoice.invoice_number}`,
        template,
        customer
      )
    } else {
      return { success: false, error: "No valid contact method" }
    }

    if (sendResult.success) {
      // Update invoice reminder count
      await supabase
        .from("invoices")
        .update({
          reminder_count: data.reminderNumber,
          last_reminder_sent_at: new Date().toISOString()
        })
        .eq("id", data.invoiceId)
    }

    return sendResult
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

// Handle review request
async function handleReviewRequest(
  data: ReviewRequestJobData
): Promise<JobResult> {
  const supabase = getServiceClient()

  try {
    // Get customer and job details
    const { data: job, error } = await supabase
      .from("jobs")
      .select(
        `
        *,
        customer:customers(*)
      `
      )
      .eq("id", data.jobId)
      .single()

    if (error || !job) {
      return { success: false, error: "Job not found" }
    }

    const customer = job.customer
    const reviewUrl = getReviewUrl(data.platform, data.workspaceId)
    const template = getReviewRequestTemplate(customer.name, data.platform, reviewUrl)

    // Send SMS review request
    if (customer.phone) {
      const sendResult = await sendSms(
        data.workspaceId,
        customer.phone,
        template,
        customer,
        data.jobId
      )

      if (sendResult.success) {
        // Log review request
        await supabase.from("reviews").insert({
          workspace_id: data.workspaceId,
          customer_id: data.customerId,
          job_id: data.jobId,
          platform: data.platform,
          request_sent_at: new Date().toISOString()
        })
      }

      return sendResult
    }

    return { success: false, error: "Customer has no phone number" }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

// Handle speed-to-lead response
async function handleSpeedToLead(
  data: SpeedToLeadJobData
): Promise<JobResult> {
  const supabase = getServiceClient()

  try {
    // Get customer details
    const { data: customer, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", data.customerId)
      .single()

    if (error || !customer) {
      return { success: false, error: "Customer not found" }
    }

    const template = getSpeedToLeadTemplate(customer.name, data.leadSource)

    // Try SMS first
    if (data.channels.includes("sms") && customer.phone && !customer.do_not_text) {
      const result = await sendSms(
        data.workspaceId,
        customer.phone,
        template,
        customer
      )

      if (result.success) {
        // Update customer status
        await supabase
          .from("customers")
          .update({ status: "prospect" })
          .eq("id", data.customerId)

        return result
      }
    }

    // Fallback to email
    if (data.channels.includes("email") && customer.email && !customer.do_not_email) {
      const result = await sendEmail(
        data.workspaceId,
        customer.email,
        "Thanks for your interest!",
        template,
        customer
      )

      if (result.success) {
        await supabase
          .from("customers")
          .update({ status: "prospect" })
          .eq("id", data.customerId)

        return result
      }
    }

    return { success: false, error: "Could not reach customer" }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

// Handle status update notification
async function handleStatusUpdate(
  data: StatusUpdateJobData
): Promise<JobResult> {
  const supabase = getServiceClient()

  try {
    const { data: job, error } = await supabase
      .from("jobs")
      .select(
        `
        *,
        customer:customers(*)
      `
      )
      .eq("id", data.jobId)
      .single()

    if (error || !job) {
      return { success: false, error: "Job not found" }
    }

    const customer = job.customer
    const template = getStatusUpdateTemplate(
      customer.name,
      data.oldStatus,
      data.newStatus
    )

    if (data.channel === "sms" && customer.phone) {
      return sendSms(data.workspaceId, customer.phone, template, customer, data.jobId)
    } else if (data.channel === "email" && customer.email) {
      return sendEmail(
        data.workspaceId,
        customer.email,
        `Job Status Update`,
        template,
        customer,
        data.jobId
      )
    }

    return { success: false, error: "No valid contact method" }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

// Handle crew notification
async function handleCrewNotification(
  data: CrewNotificationJobData
): Promise<JobResult> {
  const supabase = getServiceClient()

  try {
    const { data: crew, error: crewError } = await supabase
      .from("crews")
      .select("*")
      .eq("id", data.crewId)
      .single()

    if (crewError || !crew) {
      return { success: false, error: "Crew not found" }
    }

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select(
        `
        *,
        customer:customers(name, phone)
      `
      )
      .eq("id", data.jobId)
      .single()

    if (jobError || !job) {
      return { success: false, error: "Job not found" }
    }

    const template = getCrewNotificationTemplate(
      data.notificationType,
      crew.name,
      job
    )

    if (crew.phone) {
      return sendSms(data.workspaceId, crew.phone, template, { name: crew.name }, data.jobId)
    }

    return { success: false, error: "Crew has no phone number" }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

// Handle morning briefing
async function handleMorningBriefing(
  data: MorningBriefingJobData
): Promise<JobResult> {
  // TODO: Implement morning briefing generation
  // This will gather stats, weather, schedule, etc. and send a summary
  return {
    success: true,
    message: "Morning briefing not yet implemented"
  }
}

// Handle weather check
async function handleWeatherCheck(
  data: WeatherCheckJobData
): Promise<JobResult> {
  // TODO: Implement weather monitoring
  // This will check for severe weather and trigger alerts/rescheduling
  return {
    success: true,
    message: "Weather check not yet implemented"
  }
}

// =============================================================================
// COMMUNICATION HELPERS (Placeholders - will be replaced with actual implementations)
// =============================================================================

async function sendSms(
  workspaceId: string,
  to: string,
  body: string,
  customer: any,
  jobId?: string
): Promise<JobResult> {
  const supabase = getServiceClient()

  // Log the communication
  await supabase.from("communications").insert({
    workspace_id: workspaceId,
    customer_id: customer.id,
    job_id: jobId,
    channel: "sms",
    direction: "outbound",
    to_number: to,
    body,
    status: "pending"
  })

  // TODO: Integrate with Twilio SMS
  console.log(`[SMS] To: ${to}, Body: ${body}`)

  return {
    success: true,
    message: "SMS queued (Twilio integration pending)"
  }
}

async function sendEmail(
  workspaceId: string,
  to: string,
  subject: string,
  body: string,
  customer: any,
  jobId?: string
): Promise<JobResult> {
  const supabase = getServiceClient()

  // Log the communication
  await supabase.from("communications").insert({
    workspace_id: workspaceId,
    customer_id: customer.id,
    job_id: jobId,
    channel: "email",
    direction: "outbound",
    to_email: to,
    subject,
    body,
    status: "pending"
  })

  // TODO: Integrate with Resend
  console.log(`[Email] To: ${to}, Subject: ${subject}`)

  return {
    success: true,
    message: "Email queued (Resend integration pending)"
  }
}

async function initiateVoiceCall(
  workspaceId: string,
  to: string,
  script: string,
  customer: any,
  jobId?: string
): Promise<JobResult> {
  const supabase = getServiceClient()

  // Log the communication
  await supabase.from("communications").insert({
    workspace_id: workspaceId,
    customer_id: customer.id,
    job_id: jobId,
    channel: "voice",
    direction: "outbound",
    to_number: to,
    body: script,
    status: "pending"
  })

  // TODO: Integrate with Twilio Voice
  console.log(`[Voice] To: ${to}, Script: ${script}`)

  return {
    success: true,
    message: "Voice call queued (Twilio Voice integration pending)"
  }
}

// =============================================================================
// TEMPLATE HELPERS
// =============================================================================

function getInvoiceReminderTemplate(
  reminderNumber: number,
  amount: number,
  dueDate: string
): string {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amount)

  if (reminderNumber === 1) {
    return `Hi! This is a friendly reminder that your invoice of ${formattedAmount} is due on ${dueDate}. Reply PAID if you've already sent payment. Questions? Just reply to this message.`
  } else if (reminderNumber === 2) {
    return `Hi! Your invoice of ${formattedAmount} was due on ${dueDate}. Please let us know if you have any questions about your bill. We're happy to help!`
  } else {
    return `Your invoice of ${formattedAmount} is now overdue. Please contact us to discuss payment options. We want to work with you to resolve this.`
  }
}

function getReviewRequestTemplate(
  customerName: string,
  platform: string,
  url: string
): string {
  return `Hi ${customerName}! Thank you for choosing us for your roofing project. If you were happy with our work, would you mind leaving us a review on ${platform}? It really helps our small business. ${url}`
}

function getReviewUrl(platform: string, workspaceId: string): string {
  // TODO: Get actual review URLs from workspace settings
  return `https://example.com/review/${platform}`
}

function getSpeedToLeadTemplate(name: string, source: string): string {
  return `Hi ${name}! Thanks for reaching out about your roofing needs. I'm your dedicated assistant and I'd love to help. When would be a good time to discuss your project? Reply anytime - I'm here to help!`
}

function getStatusUpdateTemplate(
  name: string,
  oldStatus: string,
  newStatus: string
): string {
  const statusMessages: Record<string, string> = {
    scheduled: "Great news! Your job has been scheduled.",
    in_progress: "Your roofing project has started! Our crew is on site.",
    complete:
      "Your roofing project is complete! Thank you for choosing us. Please let us know if you have any questions."
  }

  return (
    statusMessages[newStatus] ||
    `Hi ${name}! Your job status has been updated to: ${newStatus}`
  )
}

function getCrewNotificationTemplate(
  type: string,
  crewName: string,
  job: any
): string {
  switch (type) {
    case "assignment":
      return `${crewName}: New job assigned at ${job.address} on ${job.scheduled_date}. Customer: ${job.customer?.name}. Check app for details.`
    case "reminder":
      return `${crewName}: Reminder - You have a job tomorrow at ${job.address}. Please confirm you're ready.`
    case "reschedule":
      return `${crewName}: Job at ${job.address} has been rescheduled. Check app for new date.`
    case "weather":
      return `${crewName}: Weather alert! Job at ${job.address} may need to be rescheduled. Stand by for updates.`
    default:
      return `${crewName}: Job update for ${job.address}. Check app for details.`
  }
}

// Export a function to run the job processor (can be called from a cron endpoint)
export async function runJobProcessor(): Promise<{ processed: number }> {
  const processed = await processJobs(10)
  return { processed }
}
