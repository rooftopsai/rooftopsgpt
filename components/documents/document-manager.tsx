"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { IconUpload, IconSearch, IconFile } from "@tabler/icons-react"

interface DocumentManagerProps {
  workspaceId: string
}

export function DocumentManager({ workspaceId }: DocumentManagerProps) {
  const [uploading, setUploading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [uploadStatus, setUploadStatus] = useState("")

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".pdf") && !file.name.endsWith(".txt")) {
      setUploadStatus("Error: Only PDF and TXT files are supported")
      return
    }

    setUploading(true)
    setUploadStatus("Uploading and processing...")

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("workspaceId", workspaceId)
      formData.append("title", file.name)

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setUploadStatus(
          `✅ Success! Uploaded and created ${data.chunksCount} searchable chunks.`
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    setResults([])

    try {
      const response = await fetch("/api/documents/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          workspaceId,
          matchThreshold: 0.7,
          matchCount: 5
        })
      })

      const data = await response.json()

      if (response.ok) {
        setResults(data.results || [])
      } else {
        console.error("Search error:", data.error)
      }
    } catch (error: any) {
      console.error("Search error:", error)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Upload Documents</h3>
        <div className="space-y-4">
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
            embedded for semantic search
          </div>
        </div>
      </Card>

      {/* Search Section */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Search Documents</h3>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search your documents... (e.g., 'GAF shingle installation requirements')"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={searching || !searchQuery}>
              {searching ? (
                <>
                  <div className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Searching
                </>
              ) : (
                <>
                  <IconSearch size={18} className="mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="mt-6 space-y-3">
              <div className="text-sm font-medium">
                Found {results.length} relevant sections:
              </div>
              {results.map((result, index) => (
                <Card key={result.id} className="hover:bg-accent/50 p-4">
                  <div className="flex items-start gap-3">
                    <IconFile size={20} className="text-muted-foreground mt-1" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium">
                            {result.document_title || result.file_name}
                          </div>
                          {result.is_global && (
                            <span className="bg-primary/10 text-primary rounded px-2 py-0.5 text-xs">
                              Global
                            </span>
                          )}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {Math.round(result.similarity * 100)}% match
                        </div>
                      </div>
                      <div className="text-muted-foreground line-clamp-3 text-sm">
                        {result.content}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {searching && (
            <div className="text-muted-foreground py-8 text-center">
              Searching through your documents...
            </div>
          )}

          {!searching && results.length === 0 && searchQuery && (
            <div className="text-muted-foreground py-8 text-center">
              No results found. Try a different search query.
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
