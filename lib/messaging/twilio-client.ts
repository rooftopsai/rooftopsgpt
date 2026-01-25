// lib/messaging/twilio-client.ts
// Twilio client wrapper for SMS and Voice

import {
  SendSmsOptions,
  SendSmsResult,
  InitiateCallOptions,
  InitiateCallResult,
  CommunicationRecord
} from "./types"
import { createClient } from "@supabase/supabase-js"

// Twilio credentials from environment
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER

// Check if Twilio is configured
export function isTwilioConfigured(): boolean {
  return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER)
}

// Get Supabase client
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Get workspace phone number or fall back to default
async function getFromNumber(workspaceId: string): Promise<string> {
  const supabase = getServiceClient()

  const { data: phoneNumber } = await supabase
    .from("phone_numbers")
    .select("phone_number")
    .eq("workspace_id", workspaceId)
    .eq("active", true)
    .eq("sms_enabled", true)
    .single()

  return phoneNumber?.phone_number || TWILIO_PHONE_NUMBER || ""
}

// Log communication to database
async function logCommunication(
  record: Omit<CommunicationRecord, "id" | "createdAt">
): Promise<string | null> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from("communications")
    .insert({
      workspace_id: record.workspaceId,
      customer_id: record.customerId,
      job_id: record.jobId,
      channel: record.channel,
      direction: record.direction,
      from_number: record.fromNumber,
      to_number: record.toNumber,
      from_email: record.fromEmail,
      to_email: record.toEmail,
      subject: record.subject,
      body: record.body,
      transcript: record.transcript,
      recording_url: record.recordingUrl,
      duration_seconds: record.durationSeconds,
      status: record.status,
      error_message: record.errorMessage,
      twilio_sid: record.twilioSid,
      sendgrid_id: record.sendgridId,
      external_id: record.externalId,
      sequence_enrollment_id: record.sequenceEnrollmentId,
      sequence_step: record.sequenceStep,
      ai_summary: record.aiSummary,
      ai_sentiment: record.aiSentiment,
      ai_intent: record.aiIntent,
      metadata: record.metadata
    })
    .select("id")
    .single()

  if (error) {
    console.error("Failed to log communication:", error)
    return null
  }

  return data.id
}

// Update communication status
async function updateCommunicationStatus(
  twilioSid: string,
  status: string,
  errorMessage?: string
): Promise<void> {
  const supabase = getServiceClient()

  await supabase
    .from("communications")
    .update({
      status,
      error_message: errorMessage
    })
    .eq("twilio_sid", twilioSid)
}

// Send SMS via Twilio
export async function sendSms(options: SendSmsOptions): Promise<SendSmsResult> {
  const { to, body, workspaceId, customerId, jobId, sequenceEnrollmentId, mediaUrls } =
    options

  // Check if Twilio is configured
  if (!isTwilioConfigured()) {
    console.warn("Twilio not configured - SMS not sent")

    // Log as pending (for when Twilio is configured)
    await logCommunication({
      workspaceId,
      customerId,
      jobId,
      channel: "sms",
      direction: "outbound",
      toNumber: to,
      body,
      status: "pending",
      sequenceEnrollmentId,
      metadata: { reason: "twilio_not_configured" }
    })

    return {
      success: false,
      error: "Twilio not configured"
    }
  }

  try {
    const fromNumber = await getFromNumber(workspaceId)

    // Use Twilio REST API directly (avoiding dependency on twilio package for now)
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString(
      "base64"
    )

    const params = new URLSearchParams({
      To: to,
      From: fromNumber,
      Body: body
    })

    // Add media URLs if present
    if (mediaUrls && mediaUrls.length > 0) {
      mediaUrls.forEach((url, index) => {
        params.append(`MediaUrl${index}`, url)
      })
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params.toString()
      }
    )

    const data = await response.json()

    if (!response.ok) {
      await logCommunication({
        workspaceId,
        customerId,
        jobId,
        channel: "sms",
        direction: "outbound",
        fromNumber,
        toNumber: to,
        body,
        status: "failed",
        errorMessage: data.message || "Failed to send SMS",
        sequenceEnrollmentId
      })

      return {
        success: false,
        error: data.message || "Failed to send SMS"
      }
    }

    // Log successful send
    const messageId = await logCommunication({
      workspaceId,
      customerId,
      jobId,
      channel: "sms",
      direction: "outbound",
      fromNumber,
      toNumber: to,
      body,
      status: "queued",
      twilioSid: data.sid,
      sequenceEnrollmentId
    })

    return {
      success: true,
      messageId: messageId || undefined,
      twilioSid: data.sid
    }
  } catch (error) {
    console.error("SMS send error:", error)

    await logCommunication({
      workspaceId,
      customerId,
      jobId,
      channel: "sms",
      direction: "outbound",
      toNumber: to,
      body,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      sequenceEnrollmentId
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

// Initiate outbound voice call
export async function initiateCall(
  options: InitiateCallOptions
): Promise<InitiateCallResult> {
  const { to, workspaceId, customerId, jobId, script, voiceUrl, recordCall, timeout } =
    options

  if (!isTwilioConfigured()) {
    console.warn("Twilio not configured - call not initiated")

    await logCommunication({
      workspaceId,
      customerId,
      jobId,
      channel: "voice",
      direction: "outbound",
      toNumber: to,
      body: script,
      status: "pending",
      metadata: { reason: "twilio_not_configured" }
    })

    return {
      success: false,
      error: "Twilio not configured"
    }
  }

  try {
    const fromNumber = await getFromNumber(workspaceId)

    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString(
      "base64"
    )

    // Build the URL for TwiML - either custom URL or our default handler
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const twimlUrl =
      voiceUrl ||
      `${baseUrl}/api/webhooks/twilio/voice/outbound?workspaceId=${workspaceId}`

    const params = new URLSearchParams({
      To: to,
      From: fromNumber,
      Url: twimlUrl,
      Method: "POST",
      Timeout: String(timeout || 30)
    })

    if (recordCall) {
      params.append("Record", "true")
      params.append(
        "RecordingStatusCallback",
        `${baseUrl}/api/webhooks/twilio/recording`
      )
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params.toString()
      }
    )

    const data = await response.json()

    if (!response.ok) {
      await logCommunication({
        workspaceId,
        customerId,
        jobId,
        channel: "voice",
        direction: "outbound",
        fromNumber,
        toNumber: to,
        body: script,
        status: "failed",
        errorMessage: data.message || "Failed to initiate call"
      })

      return {
        success: false,
        error: data.message || "Failed to initiate call"
      }
    }

    await logCommunication({
      workspaceId,
      customerId,
      jobId,
      channel: "voice",
      direction: "outbound",
      fromNumber,
      toNumber: to,
      body: script,
      status: "pending",
      twilioSid: data.sid
    })

    return {
      success: true,
      callSid: data.sid
    }
  } catch (error) {
    console.error("Voice call error:", error)

    await logCommunication({
      workspaceId,
      customerId,
      jobId,
      channel: "voice",
      direction: "outbound",
      toNumber: to,
      body: script,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error"
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

// Handle SMS status webhook
export async function handleSmsStatusWebhook(
  messageSid: string,
  status: string,
  errorCode?: string,
  errorMessage?: string
): Promise<void> {
  // Map Twilio status to our status
  const statusMap: Record<string, string> = {
    queued: "queued",
    sending: "queued",
    sent: "sent",
    delivered: "delivered",
    read: "read",
    failed: "failed",
    undelivered: "failed"
  }

  const mappedStatus = statusMap[status] || status

  await updateCommunicationStatus(
    messageSid,
    mappedStatus,
    errorCode ? `${errorCode}: ${errorMessage}` : undefined
  )
}

// Handle voice status webhook
export async function handleVoiceStatusWebhook(
  callSid: string,
  status: string,
  duration?: number,
  recordingUrl?: string
): Promise<void> {
  const supabase = getServiceClient()

  const statusMap: Record<string, string> = {
    queued: "pending",
    ringing: "pending",
    "in-progress": "answered",
    completed: "answered",
    busy: "busy",
    "no-answer": "no_answer",
    failed: "failed",
    canceled: "failed"
  }

  const mappedStatus = statusMap[status] || status

  const updateData: Record<string, any> = {
    status: mappedStatus
  }

  if (duration) {
    updateData.duration_seconds = duration
  }

  if (recordingUrl) {
    updateData.recording_url = recordingUrl
  }

  await supabase
    .from("communications")
    .update(updateData)
    .eq("twilio_sid", callSid)
}

// Export Twilio configuration check
export { updateCommunicationStatus, logCommunication }
