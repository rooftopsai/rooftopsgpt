// app > api > chat > xai > route.ts
// xAI Grok API route - OpenAI-compatible

import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { CHAT_SETTING_LIMITS } from "@/lib/chat-setting-limits"
import { ChatSettings } from "@/types"
import { OpenAIStream, StreamingTextResponse } from "ai"
import { ServerRuntime } from "next"
import OpenAI from "openai"
import { ROOFING_EXPERT_SYSTEM_PROMPT } from "@/lib/system-prompts"
import { GLOBAL_API_KEYS } from "@/lib/api-keys"
import {
  requireFeatureAccess,
  trackAndCheckFeature
} from "@/lib/subscription-helpers"

export const runtime: ServerRuntime = "edge"

export async function POST(request: Request) {
  let json: any
  let chatSettings: ChatSettings
  let messages: any[]
  let workspaceId: string | undefined

  try {
    json = await request.json()
    chatSettings = json.chatSettings
    messages = json.messages
    workspaceId = json.workspaceId
  } catch (parseError: any) {
    console.error("[xAI Route] Failed to parse request", parseError)
    return new Response(
      JSON.stringify({
        error: "Invalid request body",
        details: parseError.message
      }),
      { status: 400 }
    )
  }

  try {
    const profile = await getServerProfile()

    // Check subscription limits before processing
    const accessCheck = await requireFeatureAccess(
      profile.user_id,
      "chat_messages"
    )
    if (!accessCheck.allowed) {
      const errorResponse = accessCheck as {
        allowed: false
        error: string
        limit: number | "unlimited"
        currentUsage: number
      }
      return new Response(
        JSON.stringify({
          error: errorResponse.error,
          limit: errorResponse.limit,
          currentUsage: errorResponse.currentUsage,
          upgradeRequired: true
        }),
        { status: 402 }
      )
    }

    if (!GLOBAL_API_KEYS.xai) {
      console.error("[xAI Route] API key not found")
      return new Response(
        JSON.stringify({ error: "xAI API key not configured" }),
        { status: 500 }
      )
    }

    // Create OpenAI client pointing to xAI endpoint
    // xAI is OpenAI-compatible so we can use the OpenAI SDK
    const xai = new OpenAI({
      apiKey: GLOBAL_API_KEYS.xai,
      baseURL: "https://api.x.ai/v1"
    })

    try {
      // Prepend roofing expert prompt to system message
      const systemMessage =
        ROOFING_EXPERT_SYSTEM_PROMPT + "\n\n" + messages[0].content

      // Replace first message with enhanced system message
      const xaiMessages = [
        { role: "system", content: systemMessage },
        ...messages.slice(1)
      ]

      const response = await xai.chat.completions.create({
        model: chatSettings.model,
        messages: xaiMessages as any,
        temperature: chatSettings.temperature,
        max_tokens:
          CHAT_SETTING_LIMITS[chatSettings.model].MAX_TOKEN_OUTPUT_LENGTH,
        stream: true
      })

      const stream = OpenAIStream(response)

      // Track usage after successful API call (don't await to not block response)
      trackAndCheckFeature(profile.user_id, "chat_messages", 1).catch(err =>
        console.error("Failed to track usage:", err)
      )

      return new StreamingTextResponse(stream)
    } catch (error: any) {
      console.error("[xAI Route] Error calling xAI API:", error.message)
      return new Response(
        JSON.stringify({
          message: `xAI API error: ${error.message || "Unknown error"}`,
          details: error.type || error.status
        }),
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error("[xAI Route] Outer error:", error.message)

    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage = "xAI API Key not found. Please contact support."
    } else if (errorCode === 401) {
      errorMessage = "xAI API Key is incorrect. Please contact support."
    }

    return new Response(
      JSON.stringify({ message: errorMessage, error: error.message }),
      {
        status: errorCode
      }
    )
  }
}
