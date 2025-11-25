import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { GoogleGenerativeAI } from "@google/generative-ai"
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

    if (!GLOBAL_API_KEYS.google_gemini) {
      return new Response(
        JSON.stringify({ error: "Google Gemini API key not configured" }),
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(GLOBAL_API_KEYS.google_gemini)
    const googleModel = genAI.getGenerativeModel({ model: chatSettings.model })

    const lastMessage = messages.pop()

    // Prepend roofing expert prompt to first message
    const modifiedMessages = [...messages]
    if (modifiedMessages.length > 0 && modifiedMessages[0].parts) {
      const firstPart = modifiedMessages[0].parts[0]
      if (typeof firstPart === 'string') {
        modifiedMessages[0].parts[0] = ROOFING_EXPERT_SYSTEM_PROMPT + "\n\n" + firstPart
      } else if (firstPart.text) {
        modifiedMessages[0].parts[0] = {
          ...firstPart,
          text: ROOFING_EXPERT_SYSTEM_PROMPT + "\n\n" + firstPart.text
        }
      }
    }

    const chat = googleModel.startChat({
      history: modifiedMessages,
      generationConfig: {
        temperature: chatSettings.temperature
      }
    })

    const response = await chat.sendMessageStream(lastMessage.parts)

    // Track usage after successful API call (don't await to not block response)
    trackChatUsage(profile.user_id)

    const encoder = new TextEncoder()
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of response.stream) {
          const chunkText = chunk.text()
          controller.enqueue(encoder.encode(chunkText))
        }
        controller.close()
      }
    })

    return new Response(readableStream, {
      headers: { "Content-Type": "text/plain" }
    })

  } catch (error: any) {
    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "Google Gemini API Key not found. Please set it in your profile settings."
    } else if (errorMessage.toLowerCase().includes("api key not valid")) {
      errorMessage =
        "Google Gemini API Key is incorrect. Please fix it in your profile settings."
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
