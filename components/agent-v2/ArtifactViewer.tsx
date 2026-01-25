"use client"

import { useState } from "react"
import {
  IconDownload,
  IconCopy,
  IconCheck,
  IconExternalLink,
  IconX,
  IconMaximize
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface ArtifactViewerProps {
  html: string
  artifactType: string
  companyName?: string
  onClose?: () => void
}

export function ArtifactViewer({
  html,
  artifactType,
  companyName,
  onClose
}: ArtifactViewerProps) {
  const [copied, setCopied] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(html)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${companyName?.toLowerCase().replace(/\s+/g, "-") || "artifact"}-${artifactType.replace("_", "-")}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleOpenInNewTab = () => {
    const blob = new Blob([html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    window.open(url, "_blank")
  }

  const formatArtifactType = (type: string) => {
    return type
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-background overflow-hidden",
        isFullscreen && "fixed inset-4 z-50 shadow-2xl"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-sm font-semibold text-primary">
              {artifactType.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-medium text-foreground">
              {formatArtifactType(artifactType)}
            </h3>
            {companyName && (
              <p className="text-xs text-muted-foreground">{companyName}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Copy HTML"
          >
            {copied ? (
              <>
                <IconCheck className="size-4 text-green-500" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <IconCopy className="size-4" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Download HTML"
          >
            <IconDownload className="size-4" />
            <span>Download</span>
          </button>

          <button
            onClick={handleOpenInNewTab}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Open in new tab"
          >
            <IconExternalLink className="size-4" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            <IconMaximize className="size-4" />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Close"
            >
              <IconX className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Preview */}
      <div
        className={cn(
          "relative bg-[#f0f0f0] p-6 overflow-auto",
          isFullscreen ? "h-[calc(100%-60px)]" : "max-h-[500px]"
        )}
      >
        {/* Render the HTML in a sandboxed iframe */}
        <div className="mx-auto flex items-center justify-center">
          <iframe
            srcDoc={html}
            className="border-0 bg-white shadow-lg"
            style={{
              width: artifactType === "business_card" ? "3.5in" : "100%",
              height: artifactType === "business_card" ? "2in" : "auto",
              minHeight: artifactType === "flyer" || artifactType === "door_hanger" ? "600px" : "200px",
              maxWidth: artifactType === "flyer" || artifactType === "door_hanger" ? "8.5in" : "100%"
            }}
            sandbox="allow-same-origin"
            title="Artifact Preview"
          />
        </div>
      </div>

      {/* Footer with tips */}
      <div className="border-t border-border bg-muted/20 px-4 py-2">
        <p className="text-xs text-muted-foreground">
          Tip: Download the HTML file and open it in a browser to print, or copy the HTML to embed in your website.
        </p>
      </div>
    </div>
  )
}

// Inline artifact preview for tool results
interface InlineArtifactPreviewProps {
  result: {
    html?: string
    artifact_type?: string
    company_name?: string
    status?: string
    message?: string
  }
}

export function InlineArtifactPreview({ result }: InlineArtifactPreviewProps) {
  const [showFull, setShowFull] = useState(false)

  if (result.status !== "success" || !result.html) {
    return null
  }

  return (
    <div className="mt-3">
      {showFull ? (
        <ArtifactViewer
          html={result.html}
          artifactType={result.artifact_type || "artifact"}
          companyName={result.company_name}
          onClose={() => setShowFull(false)}
        />
      ) : (
        <button
          onClick={() => setShowFull(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <IconExternalLink className="size-4" />
          View {result.artifact_type?.replace("_", " ") || "artifact"}
        </button>
      )}
    </div>
  )
}
