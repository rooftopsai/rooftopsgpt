"use client"

import { Card } from "@/components/ui/card"
import { FileText } from "lucide-react"
import Image from "next/image"

interface SourceInfo {
  id: string
  sourceNumber: number
  fileName: string
  documentType: string
  preview: string
  chunkContent: string
  title: string
  isGlobal: boolean
}

interface SourceCardsProps {
  messageMetadata?: string
}

export function SourceCards({ messageMetadata }: SourceCardsProps) {
  // Helper to strip HTML tags
  const stripHtml = (html: string): string => {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
  }

  // Parse sources from message metadata
  const extractSources = (): SourceInfo[] => {
    if (!messageMetadata) {
      return []
    }

    try {
      const metadata = JSON.parse(messageMetadata)
      if (metadata.sources && Array.isArray(metadata.sources)) {
        return metadata.sources
      }
    } catch (error) {
      // Failed to parse metadata
    }

    return []
  }

  const sources = extractSources()

  if (sources.length === 0) {
    return null
  }

  const handleCardClick = (source: SourceInfo) => {
    // If this is a web source (URL), open it directly with UTM tracking
    if (source.fileName && source.fileName.startsWith("http")) {
      try {
        const url = new URL(source.fileName)
        url.searchParams.set("utm_source", "rooftopsai")
        url.searchParams.set("utm_medium", "chat")
        url.searchParams.set("utm_campaign", "source_card")
        window.open(url.toString(), "_blank", "noopener,noreferrer")
      } catch (error) {
        // Failed to open URL
      }
      return
    }
  }

  // Truncate preview text
  const truncatePreview = (text: string, maxLength: number = 40) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength).trim() + "..."
  }

  // Extract domain from URL for web sources
  const getDomain = (fileName: string) => {
    try {
      if (fileName.startsWith("http")) {
        const url = new URL(fileName)
        return url.hostname.replace("www.", "")
      }
    } catch (e) {}
    return null
  }

  // Get favicon URL for web sources
  const getFaviconUrl = (fileName: string) => {
    const domain = getDomain(fileName)
    if (domain) {
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    }
    return null
  }

  return (
    <div className="not-prose mb-2 mt-4">
      <div className="scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent flex gap-2 overflow-x-auto pb-2">
        {sources.map(source => {
          const isWebSource = source.documentType === "Web Search"
          const faviconUrl = isWebSource ? getFaviconUrl(source.fileName) : null
          const domain = getDomain(source.fileName)

          return (
            <Card
              key={source.sourceNumber}
              className="hover:bg-accent/50 group flex shrink-0 cursor-pointer items-start gap-2 border p-2.5 transition-colors duration-150"
              style={{ width: "200px" }}
              onClick={() => handleCardClick(source)}
            >
              {/* Number badge */}
              <div className="bg-foreground/10 text-foreground mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm text-[10px] font-semibold">
                {source.sourceNumber}
              </div>

              {/* Content */}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {/* Title */}
                <div className="line-clamp-2 text-xs font-medium leading-tight">
                  {stripHtml(source.title)}
                </div>

                {/* Domain/Source with favicon */}
                <div className="flex items-center gap-1.5">
                  {isWebSource && faviconUrl ? (
                    <Image
                      src={faviconUrl}
                      alt=""
                      width={12}
                      height={12}
                      className="shrink-0"
                    />
                  ) : (
                    <FileText className="text-muted-foreground size-3 shrink-0" />
                  )}
                  <span className="text-muted-foreground truncate text-[10px]">
                    {isWebSource && domain ? domain : source.documentType}
                  </span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
