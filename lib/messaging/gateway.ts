// lib/messaging/gateway.ts
// Unified messaging gateway for all communication channels

import {
  MessageChannel,
  SendSmsOptions,
  SendSmsResult,
  SendEmailOptions,
  SendEmailResult,
  InitiateCallOptions,
  InitiateCallResult
} from "./types"
import { sendSms, initiateCall, isTwilioConfigured } from "./twilio-client"
import { sendEmail, isResendConfigured } from "./resend-client"
import { createClient } from "@supabase/supabase-js"

// Get Supabase client
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Check what channels are available
export function getAvailableChannels(): MessageChannel[] {
  const channels: MessageChannel[] = []

  if (isTwilioConfigured()) {
    channels.push("sms", "voice", "whatsapp")
  }

  if (isResendConfigured()) {
    channels.push("email")
  }

  return channels
}

// Check if a specific channel is configured
export function isChannelConfigured(channel: MessageChannel): boolean {
  switch (channel) {
    case "sms":
    case "voice":
    case "whatsapp":
      return isTwilioConfigured()
    case "email":
      return isResendConfigured()
    default:
      return false
  }
}

// Unified send message function
export interface SendMessageOptions {
  channel: MessageChannel
  to: string
  body: string
  subject?: string
  workspaceId: string
  customerId?: string
  jobId?: string
  sequenceEnrollmentId?: string
  html?: string
  mediaUrls?: string[]
}

export interface SendMessageResult {
  success: boolean
  messageId?: string
  externalId?: string
  error?: string
}

export async function sendMessage(
  options: SendMessageOptions
): Promise<SendMessageResult> {
  const { channel, to, body, subject, workspaceId, customerId, jobId, html, mediaUrls } =
    options

  switch (channel) {
    case "sms":
      const smsResult = await sendSms({
        to,
        body,
        workspaceId,
        customerId,
        jobId,
        sequenceEnrollmentId: options.sequenceEnrollmentId,
        mediaUrls
      })
      return {
        success: smsResult.success,
        messageId: smsResult.messageId,
        externalId: smsResult.twilioSid,
        error: smsResult.error
      }

    case "email":
      const emailResult = await sendEmail({
        to,
        subject: subject || "Message from your roofing company",
        body,
        html,
        workspaceId,
        customerId,
        jobId
      })
      return {
        success: emailResult.success,
        messageId: emailResult.messageId,
        error: emailResult.error
      }

    case "voice":
      const callResult = await initiateCall({
        to,
        workspaceId,
        customerId,
        jobId,
        script: body
      })
      return {
        success: callResult.success,
        externalId: callResult.callSid,
        error: callResult.error
      }

    case "whatsapp":
      // WhatsApp uses the same API as SMS with a different number format
      const waResult = await sendSms({
        to: `whatsapp:${to}`,
        body,
        workspaceId,
        customerId,
        jobId,
        mediaUrls
      })
      return {
        success: waResult.success,
        messageId: waResult.messageId,
        externalId: waResult.twilioSid,
        error: waResult.error
      }

    default:
      return {
        success: false,
        error: `Unknown channel: ${channel}`
      }
  }
}

// Get customer's preferred channel
export async function getCustomerPreferredChannel(
  customerId: string
): Promise<MessageChannel | null> {
  const supabase = getServiceClient()

  const { data: customer } = await supabase
    .from("customers")
    .select("preferred_contact_method, phone, email, do_not_call, do_not_text, do_not_email")
    .eq("id", customerId)
    .single()

  if (!customer) return null

  // Check preferences and availability
  const preferred = customer.preferred_contact_method

  if (preferred === "sms" && customer.phone && !customer.do_not_text) {
    return "sms"
  }

  if (preferred === "phone" && customer.phone && !customer.do_not_call) {
    return "voice"
  }

  if (preferred === "email" && customer.email && !customer.do_not_email) {
    return "email"
  }

  // Fallback logic
  if (customer.phone && !customer.do_not_text) return "sms"
  if (customer.email && !customer.do_not_email) return "email"
  if (customer.phone && !customer.do_not_call) return "voice"

  return null
}

// Send to customer using their preferred channel
export async function sendToCustomer(
  customerId: string,
  message: {
    body: string
    subject?: string
    workspaceId: string
    jobId?: string
  }
): Promise<SendMessageResult> {
  const supabase = getServiceClient()

  // Get customer details
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .single()

  if (!customer) {
    return { success: false, error: "Customer not found" }
  }

  // Get preferred channel
  const channel = await getCustomerPreferredChannel(customerId)

  if (!channel) {
    return { success: false, error: "No valid contact method available" }
  }

  // Determine contact address
  let to: string
  switch (channel) {
    case "sms":
    case "voice":
    case "whatsapp":
      to = customer.phone
      break
    case "email":
      to = customer.email
      break
    default:
      return { success: false, error: "Invalid channel" }
  }

  return sendMessage({
    channel,
    to,
    body: message.body,
    subject: message.subject,
    workspaceId: message.workspaceId,
    customerId,
    jobId: message.jobId
  })
}

// Lookup customer by phone number (for inbound messages)
export async function lookupCustomerByPhone(
  phone: string,
  workspaceId?: string
): Promise<{
  customer: any
  latestJob: any
} | null> {
  const supabase = getServiceClient()

  // Normalize phone number (remove formatting)
  const normalizedPhone = phone.replace(/\D/g, "")
  const phoneVariants = [
    phone,
    normalizedPhone,
    `+1${normalizedPhone}`,
    `+${normalizedPhone}`
  ]

  let query = supabase
    .from("customers")
    .select(
      `
      *,
      jobs(
        id, title, status, scheduled_date, address
        order: created_at.desc
        limit: 1
      )
    `
    )
    .or(phoneVariants.map(p => `phone.eq.${p}`).join(","))

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId)
  }

  const { data: customers } = await query.limit(1)

  if (!customers || customers.length === 0) {
    return null
  }

  const customer = customers[0]
  const latestJob = customer.jobs?.[0] || null

  return { customer, latestJob }
}

// Get workspace by phone number (for routing inbound)
export async function getWorkspaceByPhoneNumber(
  phoneNumber: string
): Promise<string | null> {
  const supabase = getServiceClient()

  // Normalize phone
  const normalized = phoneNumber.replace(/\D/g, "")

  const { data } = await supabase
    .from("phone_numbers")
    .select("workspace_id")
    .or(`phone_number.eq.${phoneNumber},phone_number.eq.+${normalized},phone_number.eq.+1${normalized}`)
    .eq("active", true)
    .single()

  return data?.workspace_id || null
}

// Export individual clients for direct use
export { sendSms, sendEmail, initiateCall }
export { isTwilioConfigured, isResendConfigured }
