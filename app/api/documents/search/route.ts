import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(cookies())

    // Get current user
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { query, workspaceId, matchThreshold = 0.7, matchCount = 5 } = body

    if (!query || !workspaceId) {
      return NextResponse.json(
        { error: "Query and workspaceId are required" },
        { status: 400 }
      )
    }

    // Generate embedding for the query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: query
    })

    const queryEmbedding = embeddingResponse.data[0].embedding

    // Search for similar documents
    const { data: results, error: searchError } = await supabase.rpc(
      "search_documents",
      {
        query_embedding: queryEmbedding,
        match_threshold: matchThreshold,
        match_count: matchCount,
        filter_workspace_id: workspaceId
      }
    )

    if (searchError) {
      console.error("Search error:", searchError)
      return NextResponse.json(
        { error: "Failed to search documents" },
        { status: 500 }
      )
    }

    // Get full document info for the results
    const documentIds = [...new Set(results.map((r: any) => r.document_id))]
    const { data: documents } = await supabase
      .from("documents")
      .select("id, title, file_name, created_at, is_global")
      .in("id", documentIds)

    // Combine results with document info
    const enrichedResults = results.map((result: any) => {
      const document = documents?.find((d: any) => d.id === result.document_id)
      return {
        ...result,
        document_title: document?.title,
        file_name: document?.file_name,
        created_at: document?.created_at,
        is_global: document?.is_global || false
      }
    })

    return NextResponse.json({
      success: true,
      results: enrichedResults,
      count: enrichedResults.length
    })
  } catch (error: any) {
    console.error("Error in document search:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
