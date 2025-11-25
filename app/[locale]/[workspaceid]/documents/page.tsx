"use client"

import { DocumentManager } from "@/components/documents/document-manager"
import { AdminDocumentManager } from "@/components/documents/admin-document-manager"
import { useChatbotUI } from "@/context/context"
import { useContext } from "react"
import { useParams } from "next/navigation"

export default function DocumentsPage() {
  const params = useParams()
  const workspaceId = params.workspaceid as string

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="bg-secondary flex h-[50px] min-h-[50px] w-full items-center justify-center border-b-2 font-bold">
        Document Library (RAG System)
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl space-y-8">
          <div>
            <h1 className="mb-2 text-2xl font-bold">
              Manufacturer Documentation Library
            </h1>
            <p className="text-muted-foreground">
              Upload roofing manufacturer PDFs and documentation. They&apos;ll be
              automatically processed and made searchable using AI embeddings.
            </p>
          </div>

          {/* Admin Section - Global Documents */}
          <AdminDocumentManager />

          {/* Regular Section - Workspace Documents */}
          <DocumentManager workspaceId={workspaceId} />
        </div>
      </div>
    </div>
  )
}
