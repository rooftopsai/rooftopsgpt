import { useChatbotUI } from "@/context/context"
import useHotkey from "@/lib/hooks/use-hotkey"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { cn } from "@/lib/utils"
import {
  IconArrowUp,
  IconBolt,
  IconCirclePlus,
  IconPlayerStopFilled,
  IconSend,
  IconWaveSine
} from "@tabler/icons-react"
import Image from "next/image"
import { FC, useContext, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Input } from "../ui/input"
import { TextareaAutosize } from "../ui/textarea-autosize"
import { ChatCommandInput } from "./chat-command-input"
import { ChatFilesDisplay } from "./chat-files-display"
import { useChatHandler } from "./chat-hooks/use-chat-handler"
import { useChatHistoryHandler } from "./chat-hooks/use-chat-history"
import { usePromptAndCommand } from "./chat-hooks/use-prompt-and-command"
import { useSelectFileHandler } from "./chat-hooks/use-select-file-handler"
// Add import for property message handler
import { PropertyMessageHandler } from "@/lib/property/property-message-handler"
import { nanoid } from "nanoid"
// Import the ReportLoading component
import { ReportLoading } from "@/components/property/report-loading"

interface ChatInputProps {
  onVoiceModeClick?: () => void
}

export const ChatInput: FC<ChatInputProps> = ({ onVoiceModeClick }) => {
  const { t } = useTranslation()

  // Create property message handler
  const propertyHandler = new PropertyMessageHandler()
  
  // Add state for property report loading animation
  const [isGeneratingPropertyReport, setIsGeneratingPropertyReport] = useState(false)

  useHotkey("l", () => {
    handleFocusChatInput()
  })

  const [isTyping, setIsTyping] = useState<boolean>(false)

  const {
    isAssistantPickerOpen,
    focusAssistant,
    setFocusAssistant,
    userInput,
    chatMessages,
    isGenerating,
    selectedPreset,
    selectedAssistant,
    focusPrompt,
    setFocusPrompt,
    focusFile,
    focusTool,
    setFocusTool,
    isToolPickerOpen,
    isPromptPickerOpen,
    setIsPromptPickerOpen,
    isFilePickerOpen,
    setFocusFile,
    chatSettings,
    selectedTools,
    setSelectedTools,
    assistantImages,
    setChatMessages,
    setIsGenerating
  } = useChatbotUI()

  const {
    chatInputRef,
    handleSendMessage: originalHandleSendMessage,
    handleStopMessage,
    handleFocusChatInput
  } = useChatHandler()

  // Function to check if text likely contains an address
  const containsAddress = (text: string): boolean => {
    // Check for common address patterns
    const addressPatterns = [
      /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Place|Pl|Court|Ct)\b/i,
      /\d+\s+[A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}\b/,
      /property\s+at\s+.+/i,
      /address\s+.+/i
    ];
    
    return addressPatterns.some(pattern => pattern.test(text));
  };

  // Override handleSendMessage to include property detection
  const handleSendMessage = async (
    content: string,
    messages: any[],
    isRegeneration: boolean
  ) => {
    // Only check for property if this is a new message (not regeneration)
    if (!isRegeneration && content.trim()) {
      try {
        // Show typing indicator
        setIsGenerating(true)
        
        // Check if the content likely contains an address and show the property report loading animation
        if (containsAddress(content)) {
          setIsGeneratingPropertyReport(true)
        }
        
        // Check if message contains property address
        const propertyResult = await propertyHandler.handleMessage(content)
        
        // Hide the property report loading animation
        setIsGeneratingPropertyReport(false)
        
        if (propertyResult) {
          // Get chat details from existing messages
          const chatId = messages.length > 0 ? messages[0].message.chat_id : ""
          const userId = messages.length > 0 ? messages[0].message.user_id : ""
          
          // Get next sequence number
          const lastSequenceNumber = messages.length > 0 
            ? messages[messages.length - 1].message.sequence_number 
            : -1
          
          // Create a user message to show what was asked
          const userMessage = {
            id: nanoid(),
            chat_id: chatId,
            role: "user",
            content,
            model: chatSettings?.model || "gpt-4",
            image_paths: [],
            sequence_number: lastSequenceNumber + 1,
            user_id: userId,
            assistant_id: selectedAssistant?.id || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          
          // Create an assistant message with the property report
          const assistantMessage = {
            id: nanoid(),
            chat_id: chatId,
            role: "assistant",
            content: propertyResult.content,
            model: chatSettings?.model || "gpt-4",
            image_paths: [],
            sequence_number: lastSequenceNumber + 2,
            user_id: userId,
            assistant_id: selectedAssistant?.id || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            reportData: propertyResult.reportData
          }
          
          // Add these messages to the chat
          setChatMessages((prevMessages) => [
            ...prevMessages,
            { message: userMessage, fileItems: [] },
            { message: assistantMessage, fileItems: [] }
          ])
          
          // Reset input field
          handleInputChange("")
          
          // Reset generating state
          setIsGenerating(false)
          
          return // Skip normal message handling
        }
        
        // No property detected, reset generating state
        setIsGenerating(false)
      } catch (error) {
        console.error("Error detecting property:", error)
        setIsGeneratingPropertyReport(false)
        setIsGenerating(false)
      }
    }
    
    // If no property detected or there was an error, 
    // proceed with original message handling
    originalHandleSendMessage(content, messages, isRegeneration)
  }

  const { handleInputChange } = usePromptAndCommand()

  const { filesToAccept, handleSelectDeviceFile } = useSelectFileHandler()

  const {
    setNewMessageContentToNextUserMessage,
    setNewMessageContentToPreviousUserMessage
  } = useChatHistoryHandler()

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => {
      handleFocusChatInput()
    }, 200) // FIX: hacky
  }, [selectedPreset, selectedAssistant])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isTyping && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      setIsPromptPickerOpen(false)
      handleSendMessage(userInput, chatMessages, false)
    }

    // Consolidate conditions to avoid TypeScript error
    if (
      isPromptPickerOpen ||
      isFilePickerOpen ||
      isToolPickerOpen ||
      isAssistantPickerOpen
    ) {
      if (
        event.key === "Tab" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown"
      ) {
        event.preventDefault()
        // Toggle focus based on picker type
        if (isPromptPickerOpen) setFocusPrompt(!focusPrompt)
        if (isFilePickerOpen) setFocusFile(!focusFile)
        if (isToolPickerOpen) setFocusTool(!focusTool)
        if (isAssistantPickerOpen) setFocusAssistant(!focusAssistant)
      }
    }

    if (event.key === "ArrowUp" && event.shiftKey && event.ctrlKey) {
      event.preventDefault()
      setNewMessageContentToPreviousUserMessage()
    }

    if (event.key === "ArrowDown" && event.shiftKey && event.ctrlKey) {
      event.preventDefault()
      setNewMessageContentToNextUserMessage()
    }

    if (
      isAssistantPickerOpen &&
      (event.key === "Tab" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown")
    ) {
      event.preventDefault()
      setFocusAssistant(!focusAssistant)
    }
  }

  const handlePaste = (event: React.ClipboardEvent) => {
    const imagesAllowed = LLM_LIST.find(
      llm => llm.modelId === chatSettings?.model
    )?.imageInput

    const items = event.clipboardData.items
    for (const item of items) {
      if (item.type.indexOf("image") === 0) {
        if (!imagesAllowed) {
          toast.error(
            `Images are not supported for this model. Use models like GPT-4 Vision instead.`
          )
          return
        }
        const file = item.getAsFile()
        if (!file) return
        handleSelectDeviceFile(file)
      }
    }
  }

  return (
    <>
      
      <div className="flex flex-col flex-wrap justify-center gap-2">
        <ChatFilesDisplay />

        {/* Show the loading animation when generating a property report */}
        {isGeneratingPropertyReport && <ReportLoading />}

        {selectedTools &&
          selectedTools.map((tool, index) => (
            <div
              key={index}
              className="flex justify-center"
              onClick={() =>
                setSelectedTools(
                  selectedTools.filter(
                    selectedTool => selectedTool.id !== tool.id
                  )
                )
              }
            >
              <div className="flex cursor-pointer items-center justify-center space-x-1 rounded-lg bg-purple-600 px-3 py-1 hover:opacity-50">
                <IconBolt size={20} />

                <div>{tool.name}</div>
              </div>
            </div>
          ))}

        {selectedAssistant && (
          <div className="border-primary mx-auto flex w-fit items-center space-x-2 rounded-lg border p-1.5">
            {selectedAssistant.image_path && (
              <Image
                className="rounded"
                src={
                  assistantImages.find(
                    img => img.path === selectedAssistant.image_path
                  )?.base64
                }
                width={28}
                height={28}
                alt={selectedAssistant.name}
              />
            )}

            <div className="text-sm font-bold">
              Talking to {selectedAssistant.name}
            </div>
          </div>
        )}
      </div>

      <div className="relative mt-3 w-full">
        <div className="absolute bottom-[76px] left-0 max-h-[300px] w-full overflow-auto rounded-xl">
          <ChatCommandInput />
        </div>

        <>
          <IconCirclePlus
            className="absolute bottom-[12px] left-3 cursor-pointer p-1 hover:opacity-50 z-10"
            size={32}
            onClick={() => fileInputRef.current?.click()}
          />

          {/* Hidden input to select files from device */}
          <Input
            ref={fileInputRef}
            className="hidden"
            type="file"
            onChange={e => {
              if (!e.target.files) return
              handleSelectDeviceFile(e.target.files[0])
            }}
            accept={filesToAccept}
          />
        </>

        <TextareaAutosize
          textareaRef={chatInputRef}
          className="ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring text-md flex w-full resize-none rounded-xl border-none bg-background px-14 py-4 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_0_20px_rgba(59,130,246,0.15),0_0_40px_rgba(139,92,246,0.1)]"
          placeholder={t(`Ask me anything...`)}
          onValueChange={handleInputChange}
          value={userInput}
          minRows={1}
          maxRows={18}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onCompositionStart={() => setIsTyping(true)}
          onCompositionEnd={() => setIsTyping(false)}
        />

        <div className="absolute bottom-[14px] right-3 cursor-pointer hover:opacity-50 z-10">
          {isGenerating ? (
            <IconPlayerStopFilled
              className="hover:bg-background animate-pulse rounded bg-transparent p-1"
              onClick={handleStopMessage}
              size={30}
            />
          ) : !userInput && onVoiceModeClick ? (
            <button
              onClick={onVoiceModeClick}
              className="flex items-center gap-2 bg-black text-white rounded-full px-3 py-1.5 hover:bg-gray-800 transition-colors"
            >
              <IconWaveSine size={20} />
              <span className="text-sm font-medium">Voice</span>
            </button>
          ) : (
            <IconArrowUp
              className={cn(
                "bg-black text-white rounded-full p-1",
                !userInput && "cursor-not-allowed opacity-50"
              )}
              onClick={() => {
                if (!userInput) return

                handleSendMessage(userInput, chatMessages, false)
              }}
              size={30}
            />
          )}
        </div>

      </div>
    </>
  )
}