import { CHAT_SETTING_LIMITS } from "@/lib/chat-setting-limits"
import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { OpenAIStream, StreamingTextResponse } from "ai"
import OpenAI from "openai"
import { ROOFING_EXPERT_SYSTEM_PROMPT } from "@/lib/system-prompts"
import { GLOBAL_API_KEYS } from "@/lib/api-keys"
import { withSubscriptionCheck, trackChatUsage } from "@/lib/chat-with-subscription"

export const runtime = "edge"

export async function POST(request: Request): Promise<Response> {
  const json = await request.json()
  const { chatSettings, messages } = json as {
    chatSettings: ChatSettings
    messages: any[]
  }

  try {
    // Check subscription
    const subCheck = await withSubscriptionCheck()
    if (!subCheck.allowed) {
      return subCheck.response || new Response(JSON.stringify({ error: "Subscription check failed" }), { status: 403 })
    }
    const profile = subCheck.profile!

    if (!GLOBAL_API_KEYS.mistral) {
      return new Response(
        JSON.stringify({ error: "Mistral API key not configured" }),
        { status: 500 }
      )
    }

    // Mistral is compatible the OpenAI SDK
    const mistral = new OpenAI({
      apiKey: GLOBAL_API_KEYS.mistral,
      baseURL: "https://api.mistral.ai/v1"
    })

    // Prepend roofing expert prompt to system message
    const modifiedMessages = [...messages]
    if (modifiedMessages.length > 0) {
      modifiedMessages[0] = {
        ...modifiedMessages[0],
        content: ROOFING_EXPERT_SYSTEM_PROMPT + "\n\n" + modifiedMessages[0].content
      }
    }

    const response = await mistral.chat.completions.create({
      model: chatSettings.model,
      messages: modifiedMessages,
      max_tokens:
        CHAT_SETTING_LIMITS[chatSettings.model].MAX_TOKEN_OUTPUT_LENGTH,
      stream: true
    })

    // Convert the response into a friendly text-stream.
    const stream = OpenAIStream(response)

    // Track usage after successful API call (don't await to not block response)
    trackChatUsage(profile.user_id)

    // Respond with the stream
    return new StreamingTextResponse(stream)
  } catch (error: any) {
    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "Mistral API Key not found. Please set it in your profile settings."
    } else if (errorCode === 401) {
      errorMessage =
        "Mistral API Key is incorrect. Please fix it in your profile settings."
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
