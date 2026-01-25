// lib/messaging/types.ts
// Type definitions for the messaging system

export type MessageChannel = "sms" | "voice" | "email" | "whatsapp"

export type MessageDirection = "inbound" | "outbound"

export type MessageStatus =
  | "pending"
  | "queued"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "answered"
  | "no_answer"
  | "busy"
  | "voicemail"

export interface SendSmsOptions {
  to: string
  body: string
  workspaceId: string
  customerId?: string
  jobId?: string
  sequenceEnrollmentId?: string
  mediaUrls?: string[]
}

export interface SendSmsResult {
  success: boolean
  messageId?: string
  twilioSid?: string
  error?: string
}

export interface SendEmailOptions {
  to: string
  subject: string
  body: string
  html?: string
  workspaceId: string
  customerId?: string
  jobId?: string
  from?: string
  replyTo?: string
  attachments?: EmailAttachment[]
}

export interface EmailAttachment {
  filename: string
  content: string | Buffer
  contentType?: string
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface InitiateCallOptions {
  to: string
  workspaceId: string
  customerId?: string
  jobId?: string
  script?: string
  voiceUrl?: string
  recordCall?: boolean
  timeout?: number
}

export interface InitiateCallResult {
  success: boolean
  callSid?: string
  error?: string
}

export interface InboundSmsWebhook {
  MessageSid: string
  SmsSid: string
  AccountSid: string
  MessagingServiceSid?: string
  From: string
  To: string
  Body: string
  NumMedia: string
  MediaContentType0?: string
  MediaUrl0?: string
  FromCity?: string
  FromState?: string
  FromZip?: string
  FromCountry?: string
  ToCity?: string
  ToState?: string
  ToZip?: string
  ToCountry?: string
}

export interface InboundVoiceWebhook {
  CallSid: string
  AccountSid: string
  From: string
  To: string
  CallStatus: string
  Direction: string
  CallerName?: string
  FromCity?: string
  FromState?: string
  FromZip?: string
  FromCountry?: string
}

export interface VoiceStatusWebhook {
  CallSid: string
  CallStatus: string
  CallDuration?: string
  RecordingUrl?: string
  RecordingSid?: string
  Timestamp?: string
}

export interface SmsStatusWebhook {
  MessageSid: string
  MessageStatus: string
  ErrorCode?: string
  ErrorMessage?: string
}

// Workspace phone configuration
export interface PhoneConfig {
  phoneNumber: string
  twilioSid: string
  voiceEnabled: boolean
  smsEnabled: boolean
  greeting?: string
  voicemailGreeting?: string
  forwardTo?: string
  businessHoursStart?: string
  businessHoursEnd?: string
  timezone?: string
}

// Communication record for database
export interface CommunicationRecord {
  id?: string
  workspaceId: string
  customerId?: string
  jobId?: string
  channel: MessageChannel
  direction: MessageDirection
  fromNumber?: string
  toNumber?: string
  fromEmail?: string
  toEmail?: string
  subject?: string
  body?: string
  transcript?: string
  recordingUrl?: string
  durationSeconds?: number
  status: MessageStatus
  errorMessage?: string
  twilioSid?: string
  sendgridId?: string
  externalId?: string
  sequenceEnrollmentId?: string
  sequenceStep?: number
  aiSummary?: string
  aiSentiment?: "positive" | "neutral" | "negative"
  aiIntent?: string
  metadata?: Record<string, unknown>
  createdAt?: Date
}
