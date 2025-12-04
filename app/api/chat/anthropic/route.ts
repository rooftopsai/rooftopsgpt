// @ts-nocheck
// app > api > chat > anthropic > route.ts

import { CHAT_SETTING_LIMITS } from "@/lib/chat-setting-limits"
import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { getBase64FromDataURL, getMediaTypeFromDataURL } from "@/lib/utils"
import { ChatSettings } from "@/types"
import Anthropic from "@anthropic-ai/sdk"
import { AnthropicStream, StreamingTextResponse } from "ai"
import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { createClient } from "@supabase/supabase-js"
import { ROOFING_EXPERT_SYSTEM_PROMPT } from "@/lib/system-prompts"
import { GLOBAL_API_KEYS } from "@/lib/api-keys"
import {
  requireFeatureAccess,
  trackAndCheckFeature
} from "@/lib/subscription-helpers"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  const json = await request.json()
  const { chatSettings, messages, workspaceId } = json as {
    chatSettings: ChatSettings
    messages: any[]
    workspaceId?: string
  }

  console.log("[Anthropic Route] POST handler called", {
    model: chatSettings?.model,
    messageCount: messages?.length,
    workspaceId
  })

  try {
    const profile = await getServerProfile()

    // Check subscription limits before processing
    const accessCheck = await requireFeatureAccess(
      profile.user_id,
      "chat_messages"
    )
    if (!accessCheck.allowed) {
      return NextResponse.json(
        {
          error: accessCheck.error,
          limit: accessCheck.limit,
          currentUsage: accessCheck.currentUsage,
          upgradeRequired: true
        },
        { status: 402 }
      )
    }

    // Use global API key
    console.log("[Anthropic Route] API key check:", {
      hasKey: !!GLOBAL_API_KEYS.anthropic,
      keyPrefix: GLOBAL_API_KEYS.anthropic?.substring(0, 10) + "..."
    })

    if (!GLOBAL_API_KEYS.anthropic) {
      console.error("[Anthropic Route] API key not found")
      return NextResponse.json(
        { error: "Anthropic API key not configured" },
        { status: 500 }
      )
    }

    // RAG: Search documents for relevant context
    let documentContext = ""
    let sourceDocs: any[] = []

    try {
      // Get the user's latest message
      const userMessages = messages.filter((m: any) => m.role === "user")
      const latestUserMessage = userMessages[userMessages.length - 1]
      const userQuery =
        typeof latestUserMessage?.content === "string"
          ? latestUserMessage.content
          : latestUserMessage?.content?.[0]?.text || ""

      // Check if query is relevant for document retrieval
      const isRelevantQuery = (query: string): boolean => {
        const lowerQuery = query.toLowerCase()

        // Skip RAG for conversational/greeting queries
        const conversationalPatterns = [
          /^(hi|hello|hey|greetings|good morning|good afternoon|good evening)/i,
          /what('s| is) (your|the) (name|time|date)/i,
          /who are you/i,
          /how are you/i,
          /tell me about yourself/i,
          /^(thanks|thank you|thx)/i,
          /^(ok|okay|yes|no|sure|alright)$/i
        ]

        if (conversationalPatterns.some(pattern => pattern.test(query))) {
          return false
        }

        // Only use RAG for queries that seem to need specific information
        const documentRelevantKeywords = [
          "specification",
          "specifications",
          "datasheet",
          "manual",
          "guide",
          "documentation",
          "document",
          "standard",
          "requirement",
          "requirements",
          "code",
          "regulation",
          "osha",
          "safety",
          "installation",
          "procedure",
          "warranty",
          "product",
          "material",
          "manufacturer",
          "technical",
          "model",
          "compliance",
          "certified",
          "rating",
          "dimension",
          "what does",
          "how to",
          "according to",
          "as per",
          "refer to"
        ]

        return documentRelevantKeywords.some(keyword =>
          lowerQuery.includes(keyword)
        )
      }

      if (userQuery && workspaceId && isRelevantQuery(userQuery)) {
        // Generate embedding for the query
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        })

        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-ada-002",
          input: userQuery
        })
        const queryEmbedding = embeddingResponse.data[0].embedding

        // Search documents using Supabase
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: results, error } = await supabase.rpc(
          "search_documents",
          {
            query_embedding: queryEmbedding,
            match_threshold: 0.7,
            match_count: 3,
            filter_workspace_id: workspaceId
          }
        )

        let sourceCounter = 0

        if (!error && results && results.length > 0) {
          documentContext = "\n\n--- RELEVANT DOCUMENTATION ---\n"
          documentContext +=
            "The following information has been retrieved from uploaded manufacturer documentation. Please cite these sources in your response:\n\n"

          results.forEach((result: any) => {
            sourceCounter++
            const sourceType = result.is_global
              ? "Rooftops AI Search"
              : "Your Documents"
            documentContext += `[Source ${sourceCounter}] (${sourceType}: ${result.document_title || result.file_name})\n${result.content}\n\n`

            sourceDocs.push({
              id: result.document_id,
              sourceNumber: sourceCounter,
              title: result.document_title || result.file_name,
              fileName: result.file_name,
              isGlobal: result.is_global,
              documentType: sourceType,
              chunkContent: result.content,
              preview: result.content.substring(0, 50).trim()
            })
          })
        }

        // Also search the web with Brave (no timeout)
        try {
          console.log("Anthropic RAG - Starting Brave search")
          const braveStartTime = Date.now()

          const braveResponse = await fetch(
            `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/search/brave`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query: userQuery, count: 3 })
            }
          )

          const braveElapsed = Date.now() - braveStartTime
          console.log(
            `Anthropic RAG - Brave response received after ${braveElapsed}ms, status: ${braveResponse.status}`
          )

          if (braveResponse.ok) {
            const braveData = await braveResponse.json()
            if (braveData.success && braveData.results?.length > 0) {
              if (!documentContext) {
                documentContext = "\n\n--- RELEVANT INFORMATION ---\n"
              }

              documentContext += "\n--- WEB SEARCH RESULTS ---\n"

              braveData.results.forEach((result: any) => {
                sourceCounter++
                const snippet =
                  result.description || result.extra_snippets?.[0] || ""
                documentContext += `[Source ${sourceCounter}] (Web Search: ${result.title})\nURL: ${result.url}\n${snippet}\n\n`

                sourceDocs.push({
                  id: `web-${sourceCounter}`,
                  sourceNumber: sourceCounter,
                  title: result.title,
                  fileName: result.url,
                  isGlobal: false,
                  documentType: "Web Search",
                  chunkContent: `${result.title}\n\n${snippet}\n\nSource: ${result.url}`,
                  preview: snippet.substring(0, 50).trim()
                })
              })
            }
          }
        } catch (braveError) {
          console.error("Brave search error (timeout or failure):", braveError)
          // Continue without Brave results - don't let this block the response
        }

        if (documentContext) {
          documentContext += "--- END INFORMATION ---\n"
          documentContext +=
            "When answering, cite specific sources using the format [Source X] where applicable.\n\n"
        }
      }
    } catch (ragError) {
      console.error("RAG search error:", ragError)
      // Continue without RAG if it fails
    }

    let ANTHROPIC_FORMATTED_MESSAGES: any = messages.slice(1)

    ANTHROPIC_FORMATTED_MESSAGES = ANTHROPIC_FORMATTED_MESSAGES?.map(
      (message: any) => {
        const messageContent =
          typeof message?.content === "string"
            ? [message.content]
            : message?.content

        return {
          ...message,
          content: messageContent.map((content: any) => {
            if (typeof content === "string") {
              // Handle the case where content is a string
              return { type: "text", text: content }
            } else if (
              content?.type === "image_url" &&
              content?.image_url?.url?.length
            ) {
              return {
                type: "image",
                source: {
                  type: "base64",
                  media_type: getMediaTypeFromDataURL(content.image_url.url),
                  data: getBase64FromDataURL(content.image_url.url)
                }
              }
            } else {
              return content
            }
          })
        }
      }
    )

    const anthropic = new Anthropic({
      apiKey: GLOBAL_API_KEYS.anthropic
    })

    try {
      // Prepend roofing expert prompt and document context to system message
      const systemMessage =
        ROOFING_EXPERT_SYSTEM_PROMPT +
        "\n\n" +
        (documentContext || "") +
        messages[0].content

      console.log("[Anthropic Route] Creating Anthropic API request", {
        model: chatSettings.model,
        messageCount: ANTHROPIC_FORMATTED_MESSAGES.length,
        temperature: chatSettings.temperature,
        hasSystemMessage: !!systemMessage,
        maxTokens:
          CHAT_SETTING_LIMITS[chatSettings.model]?.MAX_TOKEN_OUTPUT_LENGTH
      })

      const response = await anthropic.messages.create({
        model: chatSettings.model,
        messages: ANTHROPIC_FORMATTED_MESSAGES,
        temperature: chatSettings.temperature,
        system: systemMessage,
        max_tokens:
          CHAT_SETTING_LIMITS[chatSettings.model].MAX_TOKEN_OUTPUT_LENGTH,
        stream: true
      })

      console.log("[Anthropic Route] API request successful")

      try {
        const stream = AnthropicStream(response)

        // Track usage after successful API call (don't await to not block response)
        trackAndCheckFeature(profile.user_id, "chat_messages", 1).catch(err =>
          console.error("Failed to track usage:", err)
        )

        // If we have document sources, prepend metadata to the stream
        if (sourceDocs.length > 0) {
          const encoder = new TextEncoder()
          const metadataLine = `__DOCUMENTS__:${JSON.stringify(sourceDocs)}\n`

          const transformedStream = new ReadableStream({
            async start(controller) {
              // First, send the metadata
              controller.enqueue(encoder.encode(metadataLine))

              // Then pipe through the original stream
              const reader = stream.getReader()
              try {
                while (true) {
                  const { done, value } = await reader.read()
                  if (done) break
                  controller.enqueue(value)
                }
              } finally {
                reader.releaseLock()
                controller.close()
              }
            }
          })

          return new StreamingTextResponse(transformedStream)
        }

        return new StreamingTextResponse(stream)
      } catch (error: any) {
        console.error("Error parsing Anthropic API response:", error)
        return new NextResponse(
          JSON.stringify({
            message:
              "An error occurred while parsing the Anthropic API response"
          }),
          { status: 500 }
        )
      }
    } catch (error: any) {
      console.error("[Anthropic Route] Error calling Anthropic API:", {
        message: error.message,
        status: error.status,
        type: error.type,
        error: error
      })
      return new NextResponse(
        JSON.stringify({
          message: `Anthropic API error: ${error.message || "Unknown error"}`,
          details: error.type || error.status
        }),
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error("[Anthropic Route] Outer error catch:", {
      message: error.message,
      status: error.status,
      stack: error.stack
    })

    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "Anthropic API Key not found. Please set it in your profile settings."
    } else if (errorCode === 401) {
      errorMessage =
        "Anthropic API Key is incorrect. Please fix it in your profile settings."
    }

    return new NextResponse(
      JSON.stringify({ message: errorMessage, error: error.message }),
      {
        status: errorCode
      }
    )
  }
}
