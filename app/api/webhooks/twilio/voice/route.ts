// app/api/webhooks/twilio/voice/route.ts
// Handle inbound voice calls from Twilio

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  lookupCustomerByPhone,
  getWorkspaceByPhoneNumber
} from "@/lib/messaging/gateway"
import { InboundVoiceWebhook } from "@/lib/messaging/types"

// Get Supabase client
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function POST(request: Request) {
  try {
    // Parse form data from Twilio
    const formData = await request.formData()
    const webhookData: InboundVoiceWebhook = {
      CallSid: formData.get("CallSid") as string,
      AccountSid: formData.get("AccountSid") as string,
      From: formData.get("From") as string,
      To: formData.get("To") as string,
      CallStatus: formData.get("CallStatus") as string,
      Direction: formData.get("Direction") as string,
      CallerName: formData.get("CallerName") as string,
      FromCity: formData.get("FromCity") as string,
      FromState: formData.get("FromState") as string
    }

    console.log("[Inbound Call]", webhookData.From, "->", webhookData.To)

    const supabase = getServiceClient()

    // Find which workspace this number belongs to
    const workspaceId = await getWorkspaceByPhoneNumber(webhookData.To)

    if (!workspaceId) {
      console.warn("No workspace found for number:", webhookData.To)
      return new Response(generateTwimlFallback(), {
        headers: { "Content-Type": "text/xml" }
      })
    }

    // Get workspace phone settings
    const { data: phoneConfig } = await supabase
      .from("phone_numbers")
      .select("*")
      .eq("workspace_id", workspaceId)
      .or(`phone_number.eq.${webhookData.To}`)
      .single()

    // Look up customer by phone number
    const customerData = await lookupCustomerByPhone(webhookData.From, workspaceId)

    // Log the inbound call
    await supabase.from("communications").insert({
      workspace_id: workspaceId,
      customer_id: customerData?.customer?.id,
      job_id: customerData?.latestJob?.id,
      channel: "voice",
      direction: "inbound",
      from_number: webhookData.From,
      to_number: webhookData.To,
      status: "answered",
      twilio_sid: webhookData.CallSid,
      metadata: {
        callerName: webhookData.CallerName,
        fromCity: webhookData.FromCity,
        fromState: webhookData.FromState
      }
    })

    // If it's a new caller, create a lead
    if (!customerData?.customer) {
      await supabase.from("customers").insert({
        workspace_id: workspaceId,
        name: webhookData.CallerName || `Caller (${webhookData.From})`,
        phone: webhookData.From,
        status: "lead",
        source: "phone_inbound",
        metadata: {
          fromCity: webhookData.FromCity,
          fromState: webhookData.FromState
        }
      })
    }

    // Generate TwiML response
    const greeting = phoneConfig?.greeting_message ||
      "Thank you for calling. How can we help you today?"

    const twiml = generateVoiceTwiml(
      greeting,
      customerData?.customer?.name,
      phoneConfig?.forward_to,
      workspaceId
    )

    return new Response(twiml, {
      headers: { "Content-Type": "text/xml" }
    })
  } catch (error) {
    console.error("Voice webhook error:", error)
    return new Response(generateTwimlFallback(), {
      headers: { "Content-Type": "text/xml" }
    })
  }
}

// Generate TwiML for voice call
function generateVoiceTwiml(
  greeting: string,
  customerName?: string,
  forwardTo?: string,
  workspaceId?: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  // Personalize greeting if we know the customer
  const personalizedGreeting = customerName
    ? `Hello ${customerName}! ${greeting}`
    : greeting

  // For now, we'll use a simple IVR menu
  // In the future, this is where we'd integrate AI voice
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${escapeXml(personalizedGreeting)}</Say>

  <Gather numDigits="1" action="${baseUrl}/api/webhooks/twilio/voice/menu?workspaceId=${workspaceId}" method="POST">
    <Say voice="alice">
      Press 1 to schedule a free estimate.
      Press 2 to check on an existing project.
      Press 3 to speak with someone.
      Or stay on the line and we'll connect you with our team.
    </Say>
  </Gather>

  ${forwardTo ? `
  <Say voice="alice">Please hold while we connect you.</Say>
  <Dial timeout="30" callerId="${escapeXml(forwardTo)}">
    <Number>${escapeXml(forwardTo)}</Number>
  </Dial>
  ` : `
  <Say voice="alice">Please leave a message after the beep and we'll call you back shortly.</Say>
  <Record maxLength="120" transcribe="true" transcribeCallback="${baseUrl}/api/webhooks/twilio/voice/transcription" />
  `}

  <Say voice="alice">Thank you for calling. Goodbye!</Say>
</Response>`
}

// Fallback TwiML for errors
function generateTwimlFallback(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">
    We're sorry, but we're unable to take your call right now.
    Please leave a message after the beep and we'll call you back.
  </Say>
  <Record maxLength="120" />
  <Say voice="alice">Thank you for calling. Goodbye!</Say>
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
