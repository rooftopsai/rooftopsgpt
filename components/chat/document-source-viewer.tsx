"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileText, Download, ExternalLink, X, Globe } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"

interface DocumentSourceViewerProps {
  documentId: string
  sourceNumber: number
  chunkContent: string
  title: string
  fileName: string
  documentType: string
  isGlobal: boolean
  isOpen: boolean
  onClose: () => void
}

export function DocumentSourceViewer({
  documentId,
  sourceNumber,
  chunkContent,
  title,
  fileName,
  documentType,
  isGlobal,
  isOpen,
  onClose
}: DocumentSourceViewerProps) {
  const [fullDocument, setFullDocument] = useState<any>(null)
  const [loadingFull, setLoadingFull] = useState(false)

  // Fetch full document for download option
  const fetchFullDocument = async () => {
    if (fullDocument) return

    setLoadingFull(true)
    try {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from("documents")
        .select("file_url")
        .eq("id", documentId)
        .single()

      if (fetchError) throw fetchError
      setFullDocument(data)
    } catch (err: any) {
      console.error("Error fetching full document:", err)
    } finally {
      setLoadingFull(false)
    }
  }

  // Fetch full document info when opened
  const handleOpenChange = (open: boolean) => {
    if (open) {
      fetchFullDocument()
    } else {
      onClose()
    }
  }

  const handleDownload = () => {
    if (fullDocument?.file_url) {
      window.open(fullDocument.file_url, "_blank")
    }
  }

  // Helper to strip HTML tags
  const stripHtml = (html: string): string => {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  }

  // Check if this is a web source
  const isWebSource = documentType === "Web Search"

  // Extract domain from URL for web sources
  const getDomain = (url: string) => {
    try {
      if (url.startsWith('http')) {
        const urlObj = new URL(url)
        return urlObj.hostname.replace('www.', '')
      }
    } catch (e) {}
    return null
  }

  // Get favicon URL for web sources
  const getFaviconUrl = (url: string) => {
    const domain = getDomain(url)
    if (domain) {
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    }
    return null
  }

  const domain = isWebSource ? getDomain(fileName) : null
  const faviconUrl = isWebSource ? getFaviconUrl(fileName) : null

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col">
        {/* Close button */}
        <button
          onClick={onClose}
          className="ring-offset-background focus:ring-ring absolute right-4 top-4 z-50 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </button>

        {/* Enhanced Header */}
        <div className="space-y-4 border-b pb-4">
          <div className="flex items-start gap-4 pr-8">
            {/* Source number badge */}
            <div className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-md">
              {sourceNumber}
            </div>

            {/* Icon and title */}
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-3">
                {isWebSource && faviconUrl ? (
                  <div className="bg-muted flex size-6 shrink-0 items-center justify-center overflow-hidden rounded">
                    <Image
                      src={faviconUrl}
                      alt=""
                      width={24}
                      height={24}
                      className="object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                    <Globe className="text-muted-foreground absolute size-4" style={{ display: 'none' }} />
                  </div>
                ) : (
                  <div className="bg-primary/10 flex size-6 shrink-0 items-center justify-center rounded">
                    <FileText className="text-primary size-4" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h2 className="break-words text-xl font-semibold leading-tight">
                    {stripHtml(title)}
                  </h2>
                  {isWebSource && domain && (
                    <div className="text-muted-foreground mt-1 truncate text-sm">
                      {domain}
                    </div>
                  )}
                </div>
              </div>

              {/* Source type badge */}
              <div className="flex items-center gap-2">
                <span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-3 py-1 text-xs font-medium">
                  {documentType}
                </span>
                {isGlobal && (
                  <span className="bg-primary/10 text-primary inline-flex items-center rounded-full px-3 py-1 text-xs font-medium">
                    Rooftops AI Search
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          {/* Main content */}
          <div className="bg-card rounded-lg border p-6">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {stripHtml(chunkContent)}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            {isWebSource ? (
              <Button
                onClick={() => window.open(fileName, "_blank")}
                variant="default"
                size="sm"
                className="gap-2"
              >
                <ExternalLink className="size-4" />
                Open Source
              </Button>
            ) : (
              fullDocument?.file_url && (
                <Button
                  onClick={handleDownload}
                  variant="default"
                  size="sm"
                  className="gap-2"
                >
                  <Download className="size-4" />
                  View Full Document
                </Button>
              )
            )}
          </div>
        </div>

        {/* Enhanced footer with metadata */}
        {!isWebSource && (
          <div className="bg-muted/20 -mx-6 -mb-6 mt-2 rounded-b-lg border-t px-6 pb-6 pt-4">
            <div className="text-muted-foreground mb-3 text-xs font-semibold">
              Document Information
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <div className="text-muted-foreground">File Name</div>
                <div className="truncate font-medium" title={fileName}>{fileName}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Source Location</div>
                <div className="font-medium">{isGlobal ? "Rooftops AI Search" : "Your Workspace"}</div>
              </div>
              <div className="col-span-2 space-y-1">
                <div className="text-muted-foreground">Document ID</div>
                <div className="text-muted-foreground/80 truncate font-mono text-[10px]" title={documentId}>
                  {documentId}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer for web sources */}
        {isWebSource && (
          <div className="bg-muted/20 -mx-6 -mb-6 mt-2 rounded-b-lg border-t px-6 pb-6 pt-4">
            <div className="text-muted-foreground mb-3 text-xs font-semibold">
              Source Information
            </div>
            <div className="space-y-2 text-xs">
              <div className="space-y-1">
                <div className="text-muted-foreground">URL</div>
                <a
                  href={fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary block break-all font-medium hover:underline"
                >
                  {fileName}
                </a>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
