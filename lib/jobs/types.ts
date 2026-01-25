// lib/jobs/types.ts
// Type definitions for the background job system

export type JobType =
  | "sequence_step"
  | "invoice_reminder"
  | "review_request"
  | "weather_check"
  | "speed_to_lead"
  | "morning_briefing"
  | "status_update"
  | "crew_notification"

export type JobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"

// Base job data interface
export interface BaseJobData {
  workspaceId: string
  metadata?: Record<string, unknown>
}

// Sequence step job - execute a follow-up sequence step
export interface SequenceStepJobData extends BaseJobData {
  enrollmentId: string
  stepIndex: number
  customerId: string
  channel: "sms" | "email" | "voice"
  template: string
  subject?: string
}

// Invoice reminder job
export interface InvoiceReminderJobData extends BaseJobData {
  invoiceId: string
  customerId: string
  reminderNumber: number // 1, 2, 3, etc.
  channel: "sms" | "email"
}

// Review request job
export interface ReviewRequestJobData extends BaseJobData {
  customerId: string
  jobId: string
  platform: "google" | "facebook" | "yelp"
}

// Weather check job
export interface WeatherCheckJobData extends BaseJobData {
  locationId?: string
  latitude?: number
  longitude?: number
  checkType: "daily" | "storm_alert"
}

// Speed to lead job - immediate outreach to new lead
export interface SpeedToLeadJobData extends BaseJobData {
  customerId: string
  leadSource: string
  channels: ("sms" | "email" | "voice")[]
  attempt: number
}

// Morning briefing job
export interface MorningBriefingJobData extends BaseJobData {
  userId: string
  channels: ("sms" | "email" | "push")[]
}

// Status update notification
export interface StatusUpdateJobData extends BaseJobData {
  customerId: string
  jobId: string
  oldStatus: string
  newStatus: string
  channel: "sms" | "email"
}

// Crew notification
export interface CrewNotificationJobData extends BaseJobData {
  crewId: string
  jobId: string
  notificationType: "assignment" | "reminder" | "reschedule" | "weather"
  scheduledDate?: string
}

// Union type of all job data types
export type JobData =
  | SequenceStepJobData
  | InvoiceReminderJobData
  | ReviewRequestJobData
  | WeatherCheckJobData
  | SpeedToLeadJobData
  | MorningBriefingJobData
  | StatusUpdateJobData
  | CrewNotificationJobData

// Job result interface
export interface JobResult {
  success: boolean
  message?: string
  data?: Record<string, unknown>
  error?: string
}

// Job record as stored in database
export interface BackgroundJob {
  id: string
  workspaceId: string | null
  jobType: JobType
  customerId?: string
  jobId?: string
  sequenceEnrollmentId?: string
  scheduledFor: Date
  status: JobStatus
  attempts: number
  maxAttempts: number
  result?: Record<string, unknown>
  error?: string
  startedAt?: Date
  completedAt?: Date
  pgbossJobId?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

// Job handler function type
export type JobHandler<T extends JobData> = (data: T) => Promise<JobResult>

// Job configuration
export interface JobConfig {
  type: JobType
  retryLimit?: number
  retryDelay?: number // in seconds
  expireInSeconds?: number
}

// Scheduled job options
export interface ScheduleOptions {
  runAt?: Date
  retryLimit?: number
  expireInMinutes?: number
}
