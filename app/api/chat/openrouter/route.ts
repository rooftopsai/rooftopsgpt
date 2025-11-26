import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { OpenAIStream, StreamingTextResponse } from "ai"
import { ServerRuntime } from "next"
import OpenAI from "openai"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"
import { ROOFING_EXPERT_SYSTEM_PROMPT } from "@/lib/system-prompts"
import { GLOBAL_API_KEYS } from "@/lib/api-keys"
import { withSubscriptionCheck, trackChatUsage } from "@/lib/chat-with-subscription"

export const runtime: ServerRuntime = "edge"

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

    if (!GLOBAL_API_KEYS.openrouter) {
      return new Response(
        JSON.stringify({ error: "OpenRouter API key not configured" }),
        { status: 500 }
      )
    }

    const openai = new OpenAI({
      apiKey: GLOBAL_API_KEYS.openrouter,
      baseURL: "https://openrouter.ai/api/v1"
    })

    // Prepend roofing expert prompt to system message
    const modifiedMessages = [...messages]
    if (modifiedMessages.length > 0) {
      modifiedMessages[0] = {
        ...modifiedMessages[0],
        content: ROOFING_EXPERT_SYSTEM_PROMPT + "\n\n" + modifiedMessages[0].content
      }
    }

    const response = await openai.chat.completions.create({
      model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
      messages: modifiedMessages as ChatCompletionCreateParamsBase["messages"],
      temperature: chatSettings.temperature,
      max_tokens: undefined,
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
        "OpenRouter API Key not found. Please set it in your profile settings."
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
