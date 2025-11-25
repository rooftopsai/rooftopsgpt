"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { FileText } from "lucide-react"
import { DocumentSourceViewer } from "./document-source-viewer"
import { createClient } from "@/lib/supabase/client"

interface SourceCitationProps {
  sourceNumber: number
  messageContent: string
}

export function SourceCitation({ sourceNumber, messageContent }: SourceCitationProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Extract document info from the message content
  // Look for pattern like "[Source 1] (Global Document: OSHA3755.pdf)"
  const extractDocumentInfo = () => {
    // Try multiple patterns to match different formats
    const patterns = [
      // Pattern 1: [Source X] (Type: filename)
      new RegExp(
        `\\[Source ${sourceNumber}\\]\\s*\\([^:]+:\\s*([^)]+)\\)`,
        'i'
      ),
      // Pattern 2: Just filename after [Source X]
      new RegExp(
        `\\[Source ${sourceNumber}\\].*?([A-Za-z0-9_-]+\\.(?:pdf|txt|docx?))`,
        'i'
      )
    ]

    for (const pattern of patterns) {
      const match = messageContent.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }

    return null
  }

  const handleClick = async () => {
    const fileName = extractDocumentInfo()
    if (!fileName) {
      console.error("Could not extract document info from source", {
        sourceNumber,
        messageSnippet: messageContent.substring(0, 500)
      })
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()

      // Search for document by file name
      const { data, error } = await supabase
        .from("documents")
        .select("id")
        .ilike("file_name", `%${fileName}%`)
        .limit(1)
        .single()

      if (error) throw error

      if (data) {
        setDocumentId(data.id)
        setIsViewerOpen(true)
      }
    } catch (err) {
      console.error("Error finding document:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Badge
        variant="secondary"
        className="hover:bg-primary/20 inline-flex cursor-pointer items-center gap-1 transition-colors"
        onClick={handleClick}
      >
        <FileText className="size-3" />
        Source {sourceNumber}
      </Badge>

      {documentId && (
        <DocumentSourceViewer
          documentId={documentId}
          sourceNumber={sourceNumber}
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
        />
      )}
    </>
  )
}
