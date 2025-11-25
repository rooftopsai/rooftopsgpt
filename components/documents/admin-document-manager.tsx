"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { IconUpload, IconGlobe } from "@tabler/icons-react"

export function AdminDocumentManager() {
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState("")

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".pdf") && !file.name.endsWith(".txt")) {
      setUploadStatus("Error: Only PDF and TXT files are supported")
      return
    }

    setUploading(true)
    setUploadStatus("Uploading and processing global document...")

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("title", file.name)

      const response = await fetch("/api/documents/admin/upload", {
        method: "POST",
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setUploadStatus(
          `✅ Success! Uploaded global document with ${data.chunksCount} searchable chunks. This document is now available to all users.`
        )
        e.target.value = "" // Reset input
      } else {
        setUploadStatus(`❌ Error: ${data.error}`)
      }
    } catch (error: any) {
      setUploadStatus(`❌ Error: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Admin Upload Section */}
      <Card className="border-primary/50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <IconGlobe size={20} className="text-primary" />
          <h3 className="text-lg font-semibold">Upload Global Documents</h3>
        </div>
        <div className="space-y-4">
          <div className="bg-primary/10 border-primary/20 rounded-md border p-3 text-sm">
            <p className="mb-1 font-medium">Admin Only - Global Documents</p>
            <p className="text-muted-foreground">
              Documents uploaded here will be accessible to all users across all workspaces.
              Use this for manufacturer documentation, specifications, and other shared resources.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".pdf,.txt"
              onChange={handleUpload}
              disabled={uploading}
              className="flex-1"
            />
            {uploading && (
              <div className="flex items-center gap-2">
                <div className="border-primary size-4 animate-spin rounded-full border-2 border-t-transparent" />
                <span className="text-muted-foreground text-sm">
                  Processing...
                </span>
              </div>
            )}
          </div>
          {uploadStatus && (
            <div className="text-muted-foreground text-sm">{uploadStatus}</div>
          )}
          <div className="text-muted-foreground text-xs">
            Supported formats: PDF, TXT • Files are split into chunks and
            embedded for semantic search • Documents will appear in all workspace searches
          </div>
        </div>
      </Card>
    </div>
  )
}
