// app/api/webhooks/twilio/status/route.ts
// Handle status callbacks for SMS and Voice from Twilio

import { NextResponse } from "next/server"
import {
  handleSmsStatusWebhook,
  handleVoiceStatusWebhook
} from "@/lib/messaging/twilio-client"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()

    // Check if it's an SMS or Voice status callback
    const messageSid = formData.get("MessageSid") as string
    const callSid = formData.get("CallSid") as string

    if (messageSid) {
      // SMS status callback
      const messageStatus = formData.get("MessageStatus") as string
      const errorCode = formData.get("ErrorCode") as string
      const errorMessage = formData.get("ErrorMessage") as string

      console.log("[SMS Status]", messageSid, messageStatus)

      await handleSmsStatusWebhook(
        messageSid,
        messageStatus,
        errorCode,
        errorMessage
      )
    } else if (callSid) {
      // Voice status callback
      const callStatus = formData.get("CallStatus") as string
      const callDuration = formData.get("CallDuration") as string
      const recordingUrl = formData.get("RecordingUrl") as string

      console.log("[Voice Status]", callSid, callStatus)

      await handleVoiceStatusWebhook(
        callSid,
        callStatus,
        callDuration ? parseInt(callDuration) : undefined,
        recordingUrl
      )
    }

    // Always return 200 to Twilio
    return new Response("OK", { status: 200 })
  } catch (error) {
    console.error("Status webhook error:", error)
    // Still return 200 to acknowledge receipt
    return new Response("OK", { status: 200 })
  }
}
