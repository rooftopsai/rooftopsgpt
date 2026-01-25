// app/api/webhooks/twilio/sms/route.ts
// Handle inbound SMS messages from Twilio

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  lookupCustomerByPhone,
  getWorkspaceByPhoneNumber,
  sendSms
} from "@/lib/messaging/gateway"
import { InboundSmsWebhook } from "@/lib/messaging/types"

// Verify Twilio webhook signature (optional but recommended)
function verifyTwilioSignature(request: Request): boolean {
  // In production, implement Twilio signature validation
  // https://www.twilio.com/docs/usage/webhooks/webhooks-security
  const twilioSignature = request.headers.get("x-twilio-signature")

  // For now, just check if the request has required Twilio fields
  return true
}

// Get Supabase client
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function POST(request: Request) {
  // Verify request
  if (!verifyTwilioSignature(request)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
  }

  try {
    // Parse form data from Twilio
    const formData = await request.formData()
    const webhookData: InboundSmsWebhook = {
      MessageSid: formData.get("MessageSid") as string,
      SmsSid: formData.get("SmsSid") as string,
      AccountSid: formData.get("AccountSid") as string,
      From: formData.get("From") as string,
      To: formData.get("To") as string,
      Body: formData.get("Body") as string,
      NumMedia: formData.get("NumMedia") as string,
      FromCity: formData.get("FromCity") as string,
      FromState: formData.get("FromState") as string,
      FromZip: formData.get("FromZip") as string,
      FromCountry: formData.get("FromCountry") as string
    }

    console.log("[Inbound SMS]", webhookData.From, "->", webhookData.To, ":", webhookData.Body)

    const supabase = getServiceClient()

    // Find which workspace this number belongs to
    const workspaceId = await getWorkspaceByPhoneNumber(webhookData.To)

    if (!workspaceId) {
      console.warn("No workspace found for number:", webhookData.To)
      // Still return 200 to Twilio to acknowledge receipt
      return new Response(generateTwimlResponse("Sorry, we couldn't process your message."), {
        headers: { "Content-Type": "text/xml" }
      })
    }

    // Look up customer by phone number
    const customerData = await lookupCustomerByPhone(webhookData.From, workspaceId)

    // Log the inbound message
    await supabase.from("communications").insert({
      workspace_id: workspaceId,
      customer_id: customerData?.customer?.id,
      job_id: customerData?.latestJob?.id,
      channel: "sms",
      direction: "inbound",
      from_number: webhookData.From,
      to_number: webhookData.To,
      body: webhookData.Body,
      status: "delivered",
      twilio_sid: webhookData.MessageSid,
      metadata: {
        fromCity: webhookData.FromCity,
        fromState: webhookData.FromState,
        fromZip: webhookData.FromZip,
        numMedia: webhookData.NumMedia
      }
    })

    // Process the message and generate response
    const response = await processInboundSms(
      workspaceId,
      webhookData,
      customerData
    )

    // Return TwiML response
    return new Response(generateTwimlResponse(response), {
      headers: { "Content-Type": "text/xml" }
    })
  } catch (error) {
    console.error("SMS webhook error:", error)

    // Still return 200 to Twilio
    return new Response(
      generateTwimlResponse("Sorry, we encountered an error. Please try again later."),
      { headers: { "Content-Type": "text/xml" } }
    )
  }
}

// Process inbound SMS and generate response
async function processInboundSms(
  workspaceId: string,
  webhookData: InboundSmsWebhook,
  customerData: { customer: any; latestJob: any } | null
): Promise<string> {
  const messageBody = webhookData.Body.toLowerCase().trim()
  const supabase = getServiceClient()

  // Check for stop/unsubscribe keywords
  if (["stop", "unsubscribe", "cancel", "quit"].includes(messageBody)) {
    if (customerData?.customer) {
      await supabase
        .from("customers")
        .update({ do_not_text: true })
        .eq("id", customerData.customer.id)

      // Stop any active sequences
      await supabase
        .from("sequence_enrollments")
        .update({ status: "unsubscribed", stopped_at: new Date().toISOString() })
        .eq("customer_id", customerData.customer.id)
        .eq("status", "active")
    }
    return "You've been unsubscribed. Reply START to resubscribe."
  }

  // Check for start/resubscribe keywords
  if (["start", "subscribe", "yes"].includes(messageBody)) {
    if (customerData?.customer) {
      await supabase
        .from("customers")
        .update({ do_not_text: false })
        .eq("id", customerData.customer.id)
    }
    return "You've been resubscribed. We'll keep you updated on your roofing project. Reply STOP to unsubscribe."
  }

  // Check for status request
  if (["status", "update", "where", "when"].some(keyword => messageBody.includes(keyword))) {
    if (customerData?.latestJob) {
      const job = customerData.latestJob
      return getJobStatusMessage(job)
    }
    return "I couldn't find an active job for your number. Please call our office for assistance."
  }

  // Check for help request
  if (["help", "info", "?"].some(keyword => messageBody.includes(keyword))) {
    return "Reply with:\n- STATUS for job updates\n- STOP to unsubscribe\nOr call our office to speak with someone."
  }

  // Check if this stops an active sequence
  if (customerData?.customer) {
    const { data: activeEnrollments } = await supabase
      .from("sequence_enrollments")
      .select("id, sequence:sequences(stop_on_reply)")
      .eq("customer_id", customerData.customer.id)
      .eq("status", "active")

    for (const enrollment of activeEnrollments || []) {
      if ((enrollment.sequence as any)?.stop_on_reply) {
        await supabase
          .from("sequence_enrollments")
          .update({
            status: "stopped",
            stopped_at: new Date().toISOString(),
            stop_reason: "customer_reply"
          })
          .eq("id", enrollment.id)
      }
    }
  }

  // Default response - acknowledge and route to human or AI
  // In the future, this is where we'd integrate with the AI agent

  if (customerData?.customer) {
    // Known customer
    return `Thanks for your message! A member of our team will get back to you shortly. In the meantime, reply STATUS for job updates or HELP for more options.`
  } else {
    // New contact - create a lead
    await supabase.from("customers").insert({
      workspace_id: workspaceId,
      name: `New Lead (${webhookData.From})`,
      phone: webhookData.From,
      status: "lead",
      source: "sms_inbound",
      notes: `First message: ${webhookData.Body}`,
      metadata: {
        fromCity: webhookData.FromCity,
        fromState: webhookData.FromState
      }
    })

    return `Thanks for reaching out! We've received your message and a member of our team will contact you shortly. Reply HELP for more options.`
  }
}

// Generate job status message
function getJobStatusMessage(job: any): string {
  const statusMessages: Record<string, string> = {
    lead: "We have your information and will be in touch soon to schedule an estimate.",
    estimate_scheduled: `Your estimate is scheduled for ${job.scheduled_date}. We'll see you then!`,
    estimate_sent: "Your estimate has been sent. Please review it and let us know if you have questions.",
    negotiating: "We're working on the details of your project. Someone will be in touch soon.",
    sold: "Great news! Your project is confirmed. We're working on scheduling.",
    materials_ordered: "Materials have been ordered for your project. We'll schedule installation soon.",
    scheduled: `Your installation is scheduled for ${job.scheduled_date}. We'll see you then!`,
    in_progress: "Your project is in progress! Our crew is working hard to complete it.",
    complete: "Your project is complete! Thank you for choosing us. How does everything look?",
    invoiced: "Your invoice has been sent. Please let us know if you have any questions about your bill.",
    paid: "Thank you for your payment! We appreciate your business."
  }

  return statusMessages[job.status] || `Your project status is: ${job.status}. Call our office for more details.`
}

// Generate TwiML response
function generateTwimlResponse(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`
}

// Escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}
