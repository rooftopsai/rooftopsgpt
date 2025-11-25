import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { CHAT_SETTING_LIMITS } from "@/lib/chat-setting-limits"
import { ChatSettings, LLMID } from "@/types"
import { OpenAIStream, StreamingTextResponse } from "ai"
import { ServerRuntime } from "next"
import OpenAI from "openai"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"
import { createClient } from "@supabase/supabase-js"
import { ROOFING_EXPERT_SYSTEM_PROMPT } from "@/lib/system-prompts"
import { GLOBAL_API_KEYS } from "@/lib/api-keys"
import { requireFeatureAccess, trackAndCheckFeature } from "@/lib/subscription-helpers"

export const runtime: ServerRuntime = "edge"

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages, workspaceId } = json as {
    chatSettings: ChatSettings
    messages: any[]
    workspaceId?: string
  }

  try {
    const profile = await getServerProfile()

    // Check subscription limits before processing
    const accessCheck = await requireFeatureAccess(profile.user_id, 'chat_messages')
    if (!accessCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: accessCheck.error,
          limit: accessCheck.limit,
          currentUsage: accessCheck.currentUsage,
          upgradeRequired: true
        }),
        { status: 402 } // 402 Payment Required
      )
    }

    // Use global API keys instead of user-provided keys
    if (!GLOBAL_API_KEYS.openai) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500 }
      )
    }

    const openai = new OpenAI({
      apiKey: GLOBAL_API_KEYS.openai,
      organization: GLOBAL_API_KEYS.openai_org
    })

    // RAG: Search documents for relevant context
    let documentContext = ""
    let sourceDocs: any[] = []

    try {
      // Get the user's latest message
      const userMessages = messages.filter((m: any) => m.role === "user")
      const latestUserMessage = userMessages[userMessages.length - 1]
      const userQuery = typeof latestUserMessage?.content === "string"
        ? latestUserMessage.content
        : latestUserMessage?.content?.[0]?.text || ""

      console.log("OpenAI RAG - Query:", userQuery?.substring(0, 100))
      console.log("OpenAI RAG - WorkspaceId:", workspaceId)

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
          'specification', 'specifications', 'datasheet', 'manual', 'guide',
          'documentation', 'document', 'standard', 'requirement', 'requirements',
          'code', 'regulation', 'osha', 'safety', 'installation', 'procedure',
          'warranty', 'product', 'material', 'manufacturer', 'technical',
          'model', 'compliance', 'certified', 'rating', 'dimension',
          'what does', 'how to', 'according to', 'as per', 'refer to'
        ]

        return documentRelevantKeywords.some(keyword => lowerQuery.includes(keyword))
      }

      if (userQuery && workspaceId && isRelevantQuery(userQuery)) {
        // Generate embedding for the query
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

        const { data: results, error } = await supabase.rpc("search_documents", {
          query_embedding: queryEmbedding,
          match_threshold: 0.7,
          match_count: 3,
          filter_workspace_id: workspaceId
        })

        let sourceCounter = 0

        if (!error && results && results.length > 0) {
          console.log("OpenAI RAG - Found", results.length, "document chunks")
          documentContext = "\n\n--- RELEVANT DOCUMENTATION ---\n"
          documentContext += "The following information has been retrieved from uploaded manufacturer documentation. Please cite these sources in your response:\n\n"

          results.forEach((result: any) => {
            sourceCounter++
            const sourceType = result.is_global ? "Rooftops AI Search" : "Your Documents"
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
        } else {
          console.log("OpenAI RAG - No results found. Error:", error)
        }

        // Also search the web with Brave (no timeout)
        try {
          console.log("OpenAI RAG - Starting Brave search")
          const braveStartTime = Date.now()

          const braveResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/search/brave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: userQuery, count: 3 })
          })

          const braveElapsed = Date.now() - braveStartTime
          console.log(`OpenAI RAG - Brave response received after ${braveElapsed}ms, status: ${braveResponse.status}`)

          if (braveResponse.ok) {
            const braveData = await braveResponse.json()
            if (braveData.success && braveData.results?.length > 0) {
              console.log("OpenAI RAG - Found", braveData.results.length, "web results")

              if (!documentContext) {
                documentContext = "\n\n--- RELEVANT INFORMATION ---\n"
              }

              documentContext += "\n--- WEB SEARCH RESULTS ---\n"

              braveData.results.forEach((result: any) => {
                sourceCounter++
                const snippet = result.description || result.extra_snippets?.[0] || ""
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
        } catch (braveError: any) {
          console.error("OpenAI RAG - Brave search error:", {
            name: braveError.name,
            message: braveError.message,
            cause: braveError.cause
          })
          // Continue without Brave results - don't let this block the response
        }

        if (documentContext) {
          documentContext += "--- END INFORMATION ---\n"
          documentContext += "When answering, cite specific sources using the format [Source X] where applicable.\n\n"
        }
      }
    } catch (ragError) {
      console.error("RAG search error:", ragError)
      // Continue without RAG if it fails
    }

    // Check if model has temperature constraints
    const modelLimits = CHAT_SETTING_LIMITS[chatSettings.model as LLMID]
    let temperature = chatSettings.temperature

    // If model only supports a single temperature value (MIN === MAX), use that value
    if (modelLimits && modelLimits.MIN_TEMPERATURE === modelLimits.MAX_TEMPERATURE) {
      temperature = modelLimits.MIN_TEMPERATURE
    }

    // Prepend document context and roofing expert prompt to system message
    const modifiedMessages = [...messages]
    if (modifiedMessages.length > 0) {
      // Combine roofing expert prompt, document context, and original system message
      const systemContent = ROOFING_EXPERT_SYSTEM_PROMPT + "\n\n" + (documentContext || "") + modifiedMessages[0].content
      modifiedMessages[0] = {
        ...modifiedMessages[0],
        content: systemContent
      }
    }

    // Build request params, only including max_tokens for specific models
    const requestParams: any = {
      model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
      messages: modifiedMessages as ChatCompletionCreateParamsBase["messages"],
      temperature: temperature,
      stream: true
    }

    // Only set max_tokens for models that need it (vision models)
    if (
      chatSettings.model === "gpt-4-vision-preview" ||
      chatSettings.model === "gpt-4o"
    ) {
      requestParams.max_tokens = 4096
    }

    const response = await openai.chat.completions.create(requestParams)

    const stream = OpenAIStream(response)

    // Track usage after successful API call (don't await to not block response)
    trackAndCheckFeature(profile.user_id, 'chat_messages', 1).catch(err =>
      console.error('Failed to track usage:', err)
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
    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "OpenAI API Key not found. Please set it in your profile settings."
    } else if (errorMessage.toLowerCase().includes("incorrect api key")) {
      errorMessage =
        "OpenAI API Key is incorrect. Please fix it in your profile settings."
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
