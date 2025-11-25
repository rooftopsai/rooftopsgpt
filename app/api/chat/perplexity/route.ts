import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { OpenAIStream, StreamingTextResponse } from "ai"
import OpenAI from "openai"
import { ROOFING_EXPERT_SYSTEM_PROMPT } from "@/lib/system-prompts"
import { GLOBAL_API_KEYS } from "@/lib/api-keys"
import { withSubscriptionCheck, trackChatUsage } from "@/lib/chat-with-subscription"

export const runtime = "edge"

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages } = json as {
    chatSettings: ChatSettings
    messages: any[]
  }

  try {
    // Check subscription
    const subCheck = await withSubscriptionCheck()
    if (!subCheck.allowed) return subCheck.response
    const profile = subCheck.profile!

    if (!GLOBAL_API_KEYS.perplexity) {
      return new Response(
        JSON.stringify({ error: "Perplexity API key not configured" }),
        { status: 500 }
      )
    }

    // Perplexity is compatible the OpenAI SDK
    const perplexity = new OpenAI({
      apiKey: GLOBAL_API_KEYS.perplexity,
      baseURL: "https://api.perplexity.ai/"
    })

    // Prepend roofing expert prompt to system message
    const modifiedMessages = [...messages]
    if (modifiedMessages.length > 0) {
      modifiedMessages[0] = {
        ...modifiedMessages[0],
        content: ROOFING_EXPERT_SYSTEM_PROMPT + "\n\n" + modifiedMessages[0].content
      }
    }

    const response = await perplexity.chat.completions.create({
      model: chatSettings.model,
      messages: modifiedMessages,
      stream: true
    })

    const stream = OpenAIStream(response)

    // Track usage after successful API call (don't await to not block response)
    trackChatUsage(profile.user_id)

    return new StreamingTextResponse(stream)
  } catch (error: any) {
    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "Perplexity API Key not found. Please set it in your profile settings."
    } else if (errorCode === 401) {
      errorMessage =
        "Perplexity API Key is incorrect. Please fix it in your profile settings."
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
