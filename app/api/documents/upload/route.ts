import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import OpenAI from "openai"
import pdf from "pdf-parse"

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
    start = end - overlap
  }

  return chunks
}

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

    const formData = await request.formData()
    const file = formData.get("file") as File
    const workspaceId = formData.get("workspaceId") as string
    const title = formData.get("title") as string || file.name

    if (!file || !workspaceId) {
      return NextResponse.json(
        { error: "File and workspaceId are required" },
        { status: 400 }
      )
    }

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

    // Upload file to Supabase storage
    const fileName = `${user.id}/${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
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
    const { data: { publicUrl } } = supabase.storage
      .from("documents")
      .getPublicUrl(fileName)

    // Create document record
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        workspace_id: workspaceId,
        title,
        content,
        file_name: file.name,
        file_type: file.type,
        file_url: publicUrl
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
          totalChunks: chunks.length
        }
      })
    }

    // Insert all chunks
    const { error: chunksError } = await supabase
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
      chunksCount: chunks.length
    })
  } catch (error: any) {
    console.error("Error in document upload:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
