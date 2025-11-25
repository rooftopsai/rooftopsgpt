import { createClient as createServerClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import OpenAI from "openai"
import pdf from "pdf-parse"
import { createClient } from "@/lib/supabase/server"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Split text into chunks
function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    chunks.push(text.slice(start, end))

    // If we've reached the end, stop
    if (end >= text.length) break

    start = end - overlap
  }

  return chunks
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(cookies())

    // Get current user (for authentication)
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Create service role client for bypassing RLS
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      )
    }

    const title = formData.get("title") as string || file.name

    // Read file content
    const buffer = Buffer.from(await file.arrayBuffer())
    let content = ""

    if (file.type === "application/pdf") {
      const pdfData = await pdf(buffer)
      content = pdfData.text
    } else if (file.type === "text/plain") {
      content = buffer.toString("utf-8")
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Only PDF and TXT are supported." },
        { status: 400 }
      )
    }

    // Upload file to Supabase storage in global folder
    const fileName = `global/${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("documents")
      .upload(fileName, buffer, {
        contentType: file.type
      })

    if (uploadError) {
      console.error("Upload error:", uploadError)
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("documents")
      .getPublicUrl(fileName)

    // Create document record with is_global = true
    // workspace_id is NULL for global documents
    const { data: document, error: docError } = await supabaseAdmin
      .from("documents")
      .insert({
        user_id: user.id,
        workspace_id: null, // NULL for global documents
        title,
        content,
        file_name: file.name,
        file_type: file.type,
        file_url: publicUrl,
        is_global: true
      })
      .select()
      .single()

    if (docError) {
      console.error("Document creation error:", docError)
      return NextResponse.json(
        { error: "Failed to create document" },
        { status: 500 }
      )
    }

    // Split content into chunks
    const chunks = chunkText(content)

    // Generate embeddings for each chunk
    const chunkRecords = []
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]

      // Generate embedding
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: chunk
      })

      const embedding = embeddingResponse.data[0].embedding

      chunkRecords.push({
        document_id: document.id,
        content: chunk,
        embedding,
        chunk_index: i,
        metadata: {
          fileName: file.name,
          chunkSize: chunk.length,
          totalChunks: chunks.length,
          isGlobal: true
        }
      })
    }

    // Insert all chunks using admin client
    const { error: chunksError } = await supabaseAdmin
      .from("document_chunks")
      .insert(chunkRecords)

    if (chunksError) {
      console.error("Chunks insertion error:", chunksError)
      return NextResponse.json(
        { error: "Failed to create document chunks" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      document,
      chunksCount: chunks.length,
      isGlobal: true
    })
  } catch (error: any) {
    console.error("Error in admin document upload:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
