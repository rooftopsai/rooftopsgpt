// components > messages > message.tsx

import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { useChatbotUI } from "@/context/context"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { cn } from "@/lib/utils"
import { Tables } from "@/supabase/types"
import { LLM, LLMID, MessageImage, ModelProvider } from "@/types"
import CombinedReport from "@/components/property/combined-report"
import { getFileFromStorage } from "@/db/storage/files"

import {
  IconBolt,
  IconCaretDownFilled,
  IconCaretRightFilled,
  IconCircleFilled,
  IconCloudRain,
  IconFileText,
  IconMoodSmile,
  IconPencil,
  IconFileTypePdf,
  IconFileTypeDocx,
  IconFileTypeTxt,
  IconFileTypeCsv,
  IconJson,
  IconMarkdown,
  IconFileFilled,
  IconX
} from "@tabler/icons-react"
import Image from "next/image"
import { FC, useContext, useEffect, useRef, useState } from "react"
import { ModelIcon } from "../models/model-icon"
import { Button } from "../ui/button"
import { FileIcon } from "../ui/file-icon"
import { FilePreview } from "../ui/file-preview"
import { TextareaAutosize } from "../ui/textarea-autosize"
import { WithTooltip } from "../ui/with-tooltip"
import { MessageActions } from "./message-actions"
import { MessageMarkdown } from "./message-markdown"
import { ChatWeatherLookup } from "@/components/weather/ChatWeatherLookup"
import { SourceCards } from "../chat/source-cards"
import { RooftopsSVG } from "../icons/rooftops-svg"
import { ArtifactMessageProcessor } from "../canvas/artifact-message-processor"
import { ArtifactGeneratingPreview } from "../canvas/artifact-generating-preview"
import { ArtifactCompleteCard } from "../canvas/artifact-complete-card"

const ICON_SIZE = 32

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
        setMessageIndex(prev => (prev + 1) % loadingMessages.length)
        setIsTransitioning(false)
      }, 300) // Wait for fade out before changing text
    }, 2000) // Change message every 2 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-2">
      <IconCircleFilled className="animate-pulse" size={20} />
      <span
        className="text-muted-foreground text-sm transition-opacity duration-300"
        style={{ opacity: isTransitioning ? 0 : 1 }}
      >
        {loadingMessages[messageIndex]}
      </span>
    </div>
  )
}

interface MessageProps {
  message: Tables<"messages">
  fileItems: Tables<"file_items">[]
  attachedFiles?: any[]
  isEditing: boolean
  isLast: boolean
  onStartEdit: (message: Tables<"messages">) => void
  onCancelEdit: () => void
  onSubmitEdit: (value: string, sequenceNumber: number) => void
}

export const Message: FC<MessageProps> = ({
  message,
  fileItems,
  attachedFiles = [],
  isEditing,
  isLast,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit
}) => {
  const {
    assistants,
    profile,
    isGenerating,
    setIsGenerating,
    firstTokenReceived,
    availableLocalModels,
    availableOpenRouterModels,
    chatMessages,
    selectedAssistant,
    chatImages,
    assistantImages,
    toolInUse,
    files,
    models
  } = useChatbotUI()

  const { handleSendMessage } = useChatHandler()

  const editInputRef = useRef<HTMLTextAreaElement>(null)

  const [isHovering, setIsHovering] = useState(false)
  const [editedMessage, setEditedMessage] = useState(message.content)

  const [showImagePreview, setShowImagePreview] = useState(false)
  const [selectedImage, setSelectedImage] = useState<MessageImage | null>(null)

  const [showFileItemPreview, setShowFileItemPreview] = useState(false)
  const [selectedFileItem, setSelectedFileItem] =
    useState<Tables<"file_items"> | null>(null)

  const [viewSources, setViewSources] = useState(false)

  // Weather widget states
  const [isProcessingWeather, setIsProcessingWeather] = useState(false)
  const [weatherError, setWeatherError] = useState<string | null>(null)

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(message.content)
    } else {
      const textArea = document.createElement("textarea")
      textArea.value = message.content
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
    }
  }

  const handleSendEdit = () => {
    onSubmitEdit(editedMessage, message.sequence_number)
    onCancelEdit()
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (isEditing && event.key === "Enter" && event.metaKey) {
      handleSendEdit()
    }
  }

  const handleRegenerate = async () => {
    setIsGenerating(true)
    await handleSendMessage(
      editedMessage || chatMessages[chatMessages.length - 2].message.content,
      chatMessages,
      true
    )
  }

  const handleStartEdit = () => {
    onStartEdit(message)
  }

  useEffect(() => {
    setEditedMessage(message.content)

    if (isEditing && editInputRef.current) {
      const input = editInputRef.current
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
    }
  }, [isEditing])

  // Model data and assistant information
  const MODEL_DATA = [
    ...models.map(model => ({
      modelId: model.model_id as LLMID,
      modelName: model.name,
      provider: "custom" as ModelProvider,
      hostedId: model.id,
      platformLink: "",
      imageInput: false
    })),
    ...LLM_LIST,
    ...availableLocalModels,
    ...availableOpenRouterModels
  ].find(llm => llm.modelId === message.model) as LLM

  const messageAssistantImage = assistantImages.find(
    image => image.assistantId === message.assistant_id
  )?.base64

  const selectedAssistantImage = assistantImages.find(
    image => image.path === selectedAssistant?.image_path
  )?.base64

  const modelDetails = LLM_LIST.find(model => model.modelId === message.model)

  // File handling
  const fileAccumulator: Record<
    string,
    {
      id: string
      name: string
      count: number
      type: string
      description: string
    }
  > = {}

  const fileSummary = fileItems.reduce((acc, fileItem) => {
    const parentFile = files.find(file => file.id === fileItem.file_id)
    if (parentFile) {
      if (!acc[parentFile.id]) {
        acc[parentFile.id] = {
          id: parentFile.id,
          name: parentFile.name,
          count: 1,
          type: parentFile.type,
          description: parentFile.description
        }
      } else {
        acc[parentFile.id].count += 1
      }
    }
    return acc
  }, fileAccumulator)

  // Check if this is a property report message
  const isPropertyReport =
    message.role === "assistant" &&
    message.metadata &&
    typeof message.metadata === "string" &&
    message.metadata.includes('"type":"property_report"')

  // Parse metadata to get report info (if it exists)
  const getReportData = () => {
    if (!message.metadata) return null

    try {
      const metadata =
        typeof message.metadata === "string"
          ? JSON.parse(message.metadata)
          : message.metadata

      if (metadata.type === "property_report") {
        return {
          reportData: metadata.reportData || null,
          analysisData: metadata.analysisData || null,
          address: metadata.metadata?.address || null
        }
      }
      return null
    } catch (error) {
      console.error("Error parsing property report metadata:", error)
      console.error(
        "Metadata that caused error:",
        typeof message.metadata === "string"
          ? message.metadata.substring(0, 100)
          : JSON.stringify(message.metadata).substring(0, 100)
      )
      return null
    }
  }

  const propertyReportData = getReportData()

  // Strict location extraction - only from explicit markers
  const extractLocationFromMessage = (content: string): string | null => {
    try {
      // ONLY check for explicit location markers to avoid false positives

      // 1. Check explicit bracket notation markers
      const triggerMatch = content.match(/\[TRIGGER_WEATHER_LOOKUP:([^\]]+)\]/i)
      if (triggerMatch && triggerMatch[1]) {
        return triggerMatch[1].trim()
      }

      const weatherLocMatch = content.match(/\[WEATHER_LOCATION:([^\]]+)\]/i)
      if (weatherLocMatch && weatherLocMatch[1]) {
        return weatherLocMatch[1].trim()
      }

      // 2. Check for HTML comment markers
      const htmlCommentMatch = content.match(
        /<!--\s*WEATHER_WIDGET_LOCATION:([^>]+)\s*-->/i
      )
      if (htmlCommentMatch && htmlCommentMatch[1]) {
        return htmlCommentMatch[1].trim()
      }

      // 3. Only extract from very explicit "weather for [location]" phrases
      const weatherForMatch = content.match(
        /weather\s+(?:forecast\s+)?(?:for|in)\s+([A-Z][^\.,:;\n?!]+?)(?:\s+(?:is|shows|indicates)|[\.,:;])/i
      )
      if (weatherForMatch && weatherForMatch[1]) {
        const location = weatherForMatch[1].trim()
        // Validate it looks like a real location (not a common word)
        if (location.length > 2 && location.length < 100) {
          return location
        }
      }

      // 4. If we have a generic weather trigger marker, check user's message
      if (content.includes("[WEATHER_LOOKUP]")) {
        const userMessages = chatMessages
          .filter(msg => msg.message.role === "user")
          .map(msg => msg.message.content)

        if (userMessages.length > 0) {
          const lastUserMessage = userMessages[userMessages.length - 1]

          // Only extract explicit weather location requests from user
          const userWeatherMatch = lastUserMessage.match(
            /weather\s+(?:for|in|at)\s+([A-Z][^\.,:;\n?!]+)/i
          )
          if (userWeatherMatch && userWeatherMatch[1]) {
            return userWeatherMatch[1].trim()
          }

          // Try ZIP code extraction as fallback
          const zipMatch = lastUserMessage.match(/\b(\d{5}(?:-\d{4})?)\b/)
          if (zipMatch && zipMatch[1]) {
            return zipMatch[1]
          }
        }
      }

      return null
    } catch (error) {
      console.error("Error extracting location from message:", error)
      return null
    }
  }

  // Enhanced weather widget detection - only trigger on explicit markers
  const shouldShowWeatherWidget = (): boolean => {
    // Only show for assistant messages, not user messages
    if (message.role !== "assistant") return false

    const content = message.content

    try {
      // Skip if the message explicitly states inability to provide weather
      if (
        /(?:unable|can't|cannot)\s+(?:to\s+)?provide.+weather/i.test(content) ||
        /(?:don't|do not)\s+have\s+(?:access|the ability).+weather/i.test(
          content
        )
      ) {
        return false
      }

      // ONLY check for explicit weather widget triggers/markers
      // This prevents false positives from general roofing discussions
      if (
        /\[(?:TRIGGER_WEATHER_LOOKUP|WEATHER_LOCATION):[^\]]+\]/i.test(
          content
        ) ||
        content.includes("[WEATHER_LOOKUP]") ||
        /<!--\s*WEATHER_WIDGET_LOCATION:[^>]+\s*-->/.test(content)
      ) {
        return true
      }

      // Check for very explicit "here's the weather" phrases only
      if (
        /here(?:'s| is) (?:the )?(?:current )?weather (?:information|data|forecast)/i.test(
          content
        )
      ) {
        return true
      }

      // Default to false - don't trigger on general content
      return false
    } catch (error) {
      console.error("Error in shouldShowWeatherWidget:", error)
      return false
    }
  }

  // Get location to use for weather lookup
  const weatherLocation =
    message.role === "assistant"
      ? extractLocationFromMessage(message.content)
      : null
  const showWeatherWidget = shouldShowWeatherWidget()

  // Enhanced message content rendering with proper weather widget handling
  const renderMessageContent = () => {
    try {
      if (isEditing) {
        return (
          <TextareaAutosize
            textareaRef={editInputRef}
            className="text-md"
            value={editedMessage}
            onValueChange={setEditedMessage}
            maxRows={20}
          />
        )
      }

      if (
        !firstTokenReceived &&
        isGenerating &&
        isLast &&
        message.role === "assistant"
      ) {
        // Rendering loading state
        switch (toolInUse) {
          case "none":
            return <LoadingIndicator />
          case "retrieval":
            return (
              <div className="flex animate-pulse items-center space-x-2">
                <IconFileText size={20} />
                <div>Searching files...</div>
              </div>
            )
          default:
            return (
              <div className="flex animate-pulse items-center space-x-2">
                <IconBolt size={20} />
                <div>Using {toolInUse}...</div>
              </div>
            )
        }
      }

      if (isPropertyReport && propertyReportData) {
        // If data is missing, create minimal data structure to avoid errors
        const safeAnalysisData = propertyReportData.analysisData || {
          rawAnalysis: "Report data unavailable",
          structuredData: {
            userSummary: "Unable to display property report data"
          }
        }

        const safeReportData = propertyReportData.reportData || {
          jsonData: {
            property: { address: "Report data unavailable" },
            roof: { summary: {} },
            metadata: { generated: new Date().toISOString() }
          }
        }

        return (
          <div>
            <p className="mb-4">{message.content}</p>

            <div className="overflow-hidden rounded-[5px] border border-gray-200 shadow-sm dark:border-gray-700">
              <CombinedReport
                analysisData={safeAnalysisData}
                reportData={safeReportData}
              />
            </div>
          </div>
        )
      }

      // Handling weather widget case
      if (showWeatherWidget) {
        // Create a version of the message content with weather markers removed for display
        let cleanContent = message.content
          .replace(/\[TRIGGER_WEATHER_LOOKUP:[^\]]+\]/gi, "")
          .replace(/\[WEATHER_LOCATION:[^\]]+\]/gi, "")
          .replace(/\[WEATHER_LOOKUP\]/gi, "")
          .replace(/<!--\s*WEATHER_WIDGET_LOCATION:[^>]+\s*-->/g, "")
          .trim()

        // Clean up any double line breaks that might be left
        cleanContent = cleanContent.replace(/\n\n+/g, "\n\n")

        return (
          <div>
            {/* Only render the message content if it's not empty after cleaning */}
            {cleanContent && (
              <MessageMarkdown
                content={cleanContent}
                metadata={message.metadata}
              />
            )}

            {/* Show source cards at bottom for assistant messages with sources */}
            {message.role === "assistant" && message.metadata && (
              <SourceCards messageMetadata={message.metadata} />
            )}

            {/* Weather widget section */}
            <div className="">
              {/* Header showing location */}
              <div className="mb-2 flex items-center font-medium text-blue-700">
                <IconCloudRain className="mr-2" size={20} />
                <span>
                  Weather information for {weatherLocation || "your location"}
                </span>
              </div>

              {/* The weather widget component */}
              <ChatWeatherLookup
                messageId={message.id}
                messageContent={message.content}
                initialLocation={weatherLocation || ""}
                autoSubmit={true}
              />

              {/* Show error if any */}
              {weatherError && (
                <div className="mt-2 text-sm text-red-500">{weatherError}</div>
              )}
            </div>
          </div>
        )
      } else {
        // Regular message rendering
        // Remove artifact tags from display (they're shown in canvas instead)
        let cleanContent = message.content
        if (message.role === "assistant") {
          // First, remove complete artifacts (with closing tag)
          cleanContent = message.content.replace(
            /<artifact\s+type="[^"]+"\s+title="[^"]+">[\s\S]*?<\/artifact>/g,
            ""
          )

          // Also remove incomplete artifacts (during streaming - no closing tag yet)
          cleanContent = cleanContent.replace(
            /<artifact\s+type="[^"]+"\s+title="[^"]+">[\s\S]*$/g,
            ""
          )

          cleanContent = cleanContent.trim()
        }

        return (
          <div>
            {cleanContent && (
              <MessageMarkdown
                content={cleanContent}
                metadata={message.metadata}
              />
            )}
            {/* Bottom message actions right after content */}
            {!isEditing && (
              <div className="mt-4 flex justify-end">
                <MessageActions
                  onCopy={handleCopy}
                  onEdit={handleStartEdit}
                  isAssistant={message.role === "assistant"}
                  isLast={isLast}
                  isEditing={isEditing}
                  isHovering={true}
                  onRegenerate={handleRegenerate}
                />
              </div>
            )}
            {/* Show source cards at bottom for assistant messages with sources */}
            {message.role === "assistant" && message.metadata && (
              <SourceCards messageMetadata={message.metadata} />
            )}
            {/* Show artifact generating preview for assistant messages */}
            {message.role === "assistant" && (
              <ArtifactGeneratingPreview messageContent={message.content} />
            )}
            {/* Show artifact complete card for assistant messages */}
            {message.role === "assistant" && (
              <ArtifactCompleteCard messageContent={message.content} />
            )}
          </div>
        )
      }
    } catch (error) {
      console.error("Error rendering message content:", error)
      return (
        <MessageMarkdown
          content={message.content}
          metadata={message.metadata}
        />
      )
    }
  }

  return (
    <div
      className={cn(
        "flex w-full justify-center",
        message.role === "user" ? "bg-muted/30" : ""
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onKeyDown={handleKeyDown}
    >
      <div className="relative flex w-full flex-col px-6 py-4 sm:w-[550px] sm:px-0 md:w-[650px] lg:w-[650px] xl:w-[700px]">
        <div className="absolute right-5 top-7 sm:right-0">
          <MessageActions
            onCopy={handleCopy}
            onEdit={handleStartEdit}
            isAssistant={message.role === "assistant"}
            isLast={isLast}
            isEditing={isEditing}
            isHovering={isHovering}
            onRegenerate={handleRegenerate}
          />
        </div>
        <div className="space-y-3">
          {/* Avatar and name section */}
          {message.role === "system" ? (
            <div className="flex items-center space-x-4">
              <IconPencil
                className="border-primary bg-primary text-secondary rounded border-DEFAULT p-1"
                size={ICON_SIZE}
              />
              <div className="text-lg font-semibold">Prompt</div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              {message.role === "assistant" ? (
                <div
                  className="flex items-center justify-center bg-transparent"
                  style={{ width: `${ICON_SIZE}px`, height: `${ICON_SIZE}px` }}
                >
                  <RooftopsSVG width={ICON_SIZE} height={ICON_SIZE} />
                </div>
              ) : profile?.image_url ? (
                <Image
                  className="size-[32px] rounded-full"
                  src={profile?.image_url}
                  height={32}
                  width={32}
                  alt="user image"
                />
              ) : (
                <div className="flex size-[32px] items-center justify-center rounded-full bg-gradient-to-br from-[#4FEBBC] to-[#24BDEB]">
                  <IconMoodSmile
                    className="text-white"
                    size={20}
                    stroke={2}
                  />
                </div>
              )}

              {/* Only show name for user messages, not assistant messages */}
              {message.role !== "assistant" && (
                <div className="font-semibold">
                  {profile?.display_name ?? profile?.username}
                </div>
              )}
            </div>
          )}

          {/* Message content */}
          {renderMessageContent()}
        </div>

        {/* File sources section */}
        {fileItems.length > 0 && (
          <div className="border-primary mt-6 border-t pt-4 font-bold">
            {!viewSources ? (
              <div
                className="flex cursor-pointer items-center text-lg hover:opacity-50"
                onClick={() => setViewSources(true)}
              >
                {fileItems.length}
                {fileItems.length > 1 ? " Sources " : " Source "}
                from {Object.keys(fileSummary).length}{" "}
                {Object.keys(fileSummary).length > 1 ? "Files" : "File"}{" "}
                <IconCaretRightFilled className="ml-1" />
              </div>
            ) : (
              <>
                <div
                  className="flex cursor-pointer items-center text-lg hover:opacity-50"
                  onClick={() => setViewSources(false)}
                >
                  {fileItems.length}
                  {fileItems.length > 1 ? " Sources " : " Source "}
                  from {Object.keys(fileSummary).length}{" "}
                  {Object.keys(fileSummary).length > 1 ? "Files" : "File"}{" "}
                  <IconCaretDownFilled className="ml-1" />
                </div>

                <div className="mt-3 space-y-4">
                  {Object.values(fileSummary).map((file, index) => (
                    <div key={index}>
                      <div className="flex items-center space-x-2">
                        <div>
                          <FileIcon type={file.type} />
                        </div>

                        <div className="truncate">{file.name}</div>
                      </div>

                      {fileItems
                        .filter(fileItem => {
                          const parentFile = files.find(
                            parentFile => parentFile.id === fileItem.file_id
                          )
                          return parentFile?.id === file.id
                        })
                        .map((fileItem, index) => (
                          <div
                            key={index}
                            className="ml-8 mt-1.5 flex cursor-pointer items-center space-x-2 hover:opacity-50"
                            onClick={() => {
                              setSelectedFileItem(fileItem)
                              setShowFileItemPreview(true)
                            }}
                          >
                            <div className="text-sm font-normal">
                              <span className="mr-1 text-lg font-bold">-</span>{" "}
                              {fileItem.content.substring(0, 200)}...
                            </div>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Images section */}
        <div className="mt-3 flex flex-wrap gap-2">
          {message.image_paths.map((path, index) => {
            const item = chatImages.find(image => image.path === path)

            return (
              <Image
                key={index}
                className="cursor-pointer rounded hover:opacity-50"
                src={path.startsWith("data") ? path : item?.base64}
                alt="message image"
                width={300}
                height={300}
                onClick={() => {
                  setSelectedImage({
                    messageId: message.id,
                    path,
                    base64: path.startsWith("data") ? path : item?.base64 || "",
                    url: path.startsWith("data") ? "" : item?.url || "",
                    file: null
                  })

                  setShowImagePreview(true)
                }}
                loading="lazy"
              />
            )
          })}
        </div>

        {/* Attached files section for user messages */}
        {message.role === "user" && attachedFiles.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {attachedFiles
              .filter(
                (file, index, self) =>
                  // Remove duplicates
                  self.findIndex(f => f.id === file.id) === index
              )
              .map(file => {
                const handleFileClick = async () => {
                  const fileRecord = files.find(f => f.id === file.id)
                  if (!fileRecord) return
                  const link = await getFileFromStorage(fileRecord.file_path)
                  window.open(link, "_blank")
                }

                return (
                  <div
                    key={file.id}
                    className="relative flex h-[64px] cursor-pointer items-center space-x-3 rounded-xl border-2 border-blue-500/30 bg-blue-50/50 px-4 py-3 hover:bg-blue-100/50 dark:border-blue-500/50 dark:bg-blue-950/30 dark:hover:bg-blue-900/40"
                    onClick={handleFileClick}
                  >
                    <div className="rounded bg-blue-500 p-2">
                      {(() => {
                        let fileExtension = file.type.includes("/")
                          ? file.type.split("/")[1]
                          : file.type

                        switch (fileExtension) {
                          case "pdf":
                            return <IconFileTypePdf className="text-white" />
                          case "markdown":
                            return <IconMarkdown className="text-white" />
                          case "txt":
                            return <IconFileTypeTxt className="text-white" />
                          case "json":
                            return <IconJson className="text-white" />
                          case "csv":
                            return <IconFileTypeCsv className="text-white" />
                          case "docx":
                            return <IconFileTypeDocx className="text-white" />
                          default:
                            return <IconFileFilled className="text-white" />
                        }
                      })()}
                    </div>

                    <div className="truncate text-sm">
                      <div className="truncate font-medium text-blue-700 dark:text-blue-300">
                        {file.name}
                      </div>
                      <div className="truncate text-xs text-blue-600/70 dark:text-blue-400/70">
                        {file.type}
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        )}

        {/* Edit buttons section */}
        {isEditing && (
          <div className="mt-4 flex justify-center space-x-2">
            <Button size="sm" onClick={handleSendEdit}>
              Save & Send
            </Button>

            <Button size="sm" variant="outline" onClick={onCancelEdit}>
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Preview modals section */}
      {showImagePreview && selectedImage && (
        <FilePreview
          type="image"
          item={selectedImage}
          isOpen={showImagePreview}
          onOpenChange={(isOpen: boolean) => {
            setShowImagePreview(isOpen)
            setSelectedImage(null)
          }}
        />
      )}

      {showFileItemPreview && selectedFileItem && (
        <FilePreview
          type="file_item"
          item={selectedFileItem}
          isOpen={showFileItemPreview}
          onOpenChange={(isOpen: boolean) => {
            setShowFileItemPreview(isOpen)
            setSelectedFileItem(null)
          }}
        />
      )}

      {/* Artifact processor - automatically detects and creates artifacts from AI responses */}
      <ArtifactMessageProcessor
        messageContent={message.content}
        messageId={message.id}
        role={message.role}
      />
    </div>
  )
}
