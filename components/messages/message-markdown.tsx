import React, { FC, useState, useEffect } from "react"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import { MessageCodeBlock } from "./message-codeblock"
import { MessageMarkdownMemoized } from "./message-markdown-memoized"
import { useDocumentStore } from "@/lib/stores/document-store"
import { Button } from "../ui/button"
import { IconFileText } from "@tabler/icons-react"
import { SourceCitation } from "../chat/source-citation"

interface MessageMarkdownProps {
  content: string
}

// Loading status messages that rotate
const loadingMessages = [
  "thinking",
  "searching the Rooftops",
  "analyzing",
  "gathering information",
  "consulting the docs",
  "finding the best answer",
  "processing",
  "crunching the numbers"
]

const LoadingIndicator: FC = () => {
  const [messageIndex, setMessageIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true)

      setTimeout(() => {
        setMessageIndex((prev) => (prev + 1) % loadingMessages.length)
        setIsTransitioning(false)
      }, 300) // Wait for fade out before changing text
    }, 2000) // Change message every 2 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <span className="inline-flex items-center gap-2">
      <span className="animate-pulse cursor-default">▍</span>
      <span
        className="text-muted-foreground text-sm transition-opacity duration-300"
        style={{ opacity: isTransitioning ? 0 : 1 }}
      >
        {loadingMessages[messageIndex]}
      </span>
    </span>
  )
}

export const MessageMarkdown: FC<MessageMarkdownProps> = ({ content }) => {
  const { loadDocument, setDocumentMode } = useDocumentStore()
  
  // Check if this contains our special document marker
  const documentMarkerRegex = /DOCUMENT_ID:(doc_\d+)/;
  const documentMatch = content.match(documentMarkerRegex);
  
  // If we found a document marker, render a button instead of the normal content
  if (documentMatch) {
    const documentId = documentMatch[1];
    
    const handleOpenDocument = () => {
      loadDocument(documentId);
      setDocumentMode(true);
    };
    
    return (
      <div className="space-y-4">
        <p>I've created a document based on your request.</p>
        
        <div 
          onClick={handleOpenDocument}
          className="flex cursor-pointer items-center rounded-lg border border-blue-200 bg-blue-50 p-4 transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
        >
          <div className="mr-3 shrink-0 text-blue-500">
            <IconFileText size={24} />
          </div>
          <div>
            <div className="font-medium">Document Ready</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Click to view and edit the document</div>
          </div>
        </div>
      </div>
    );
  }
  
  // Regular markdown rendering for non-document messages
  return (
    <MessageMarkdownMemoized
      className="prose dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 min-w-full space-y-6 break-words"
      remarkPlugins={[remarkGfm, remarkMath]}
      components={{
        p({ children }) {
          // Process children to replace [Source X] with clickable citations
          const processChildren = (child: any): any => {
            if (typeof child === 'string') {
              // Check if this string contains [Source X] patterns
              const sourcePattern = /\[Source (\d+)\]/g
              const matches = Array.from(child.matchAll(sourcePattern))

              if (matches.length > 0) {
                const parts: any[] = []
                let lastIndex = 0

                matches.forEach((match) => {
                  const fullMatch = match[0]
                  const sourceNum = parseInt(match[1])
                  const matchIndex = match.index!

                  // Add text before the match
                  if (matchIndex > lastIndex) {
                    parts.push(child.substring(lastIndex, matchIndex))
                  }

                  // Add the citation component
                  parts.push(
                    <SourceCitation
                      key={`source-${sourceNum}-${matchIndex}`}
                      sourceNumber={sourceNum}
                      messageContent={content}
                    />
                  )

                  lastIndex = matchIndex + fullMatch.length
                })

                // Add remaining text after last match
                if (lastIndex < child.length) {
                  parts.push(child.substring(lastIndex))
                }

                return parts
              }
            }
            return child
          }

          const processedChildren = React.Children.map(children, processChildren)
          return <p className="mb-2 last:mb-0">{processedChildren}</p>
        },
        img({ node, ...props }) {
          return <img className="max-w-[67%]" {...props} />
        },
        code({ node, className, children, ...props }) {
          const childArray = React.Children.toArray(children)
          const firstChild = childArray[0] as React.ReactElement
          const firstChildAsString = React.isValidElement(firstChild)
            ? (firstChild as React.ReactElement).props.children
            : firstChild

          if (firstChildAsString === "▍") {
            return <span className="mt-1"><LoadingIndicator /></span>
          }

          if (typeof firstChildAsString === "string") {
            childArray[0] = firstChildAsString.replace("`▍`", "▍")
          }

          const match = /language-(\w+)/.exec(className || "")

          if (
            typeof firstChildAsString === "string" &&
            !firstChildAsString.includes("\n")
          ) {
            return (
              <code className={className} {...props}>
                {childArray}
              </code>
            )
          }

          return (
            <MessageCodeBlock
              key={Math.random()}
              language={(match && match[1]) || ""}
              value={String(childArray).replace(/\n$/, "")}
              {...props}
            />
          )
        }
      }}
    >
      {content}
    </MessageMarkdownMemoized>
  )
}