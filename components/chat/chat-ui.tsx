// components > chat > chat-ui.tsx (with message padding)

import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { useChatbotUI } from "@/context/context"
import { getAssistantToolsByAssistantId } from "@/db/assistant-tools"
import { getChatFilesByChatId } from "@/db/chat-files"
import { getChatById, createChat } from "@/db/chats"
import { getMessageFileItemsByMessageId } from "@/db/message-file-items"
import { getMessagesByChatId } from "@/db/messages"
import { getMessageImageFromStorage } from "@/db/storage/message-images"
import { convertBlobToBase64 } from "@/lib/blob-to-b64"
import useHotkey from "@/lib/hooks/use-hotkey"
import { LLMID, MessageImage } from "@/types"
import { useParams } from "next/navigation"
import { FC, useContext, useEffect, useState } from "react"
import { toast } from "sonner"
import { ChatHelp } from "./chat-help"
import { useScroll } from "./chat-hooks/use-scroll"
import { ChatInput } from "./chat-input"
import { ChatMessages } from "./chat-messages"
import { ChatScrollButtons } from "./chat-scroll-buttons"
import { ChatSecondaryButtons } from "./chat-secondary-buttons"
import { useDocumentStore } from "@/lib/stores/document-store"
import { VoiceMode } from "@/components/voice-mode/VoiceMode"
import { CanvasDrawer } from "../canvas/canvas-drawer"
import { EmptyStateChat } from "../empty-states/empty-state-chat"

interface ChatUIProps {}

export const ChatUI: FC<ChatUIProps> = ({}) => {
  useHotkey("o", () => handleNewChat())

  const params = useParams()
  const { isDocMode } = useDocumentStore()

  const {
    chatMessages,
    setChatMessages,
    selectedChat,
    setSelectedChat,
    setChatSettings,
    setChatImages,
    assistants,
    setSelectedAssistant,
    setChatFileItems,
    setChatFiles,
    setShowFilesDisplay,
    setUseRetrieval,
    setSelectedTools,
    profile,
    selectedWorkspace
  } = useChatbotUI()

  const { handleNewChat, handleFocusChatInput, handleSendMessage } =
    useChatHandler()

  const {
    messagesStartRef,
    messagesEndRef,
    handleScroll,
    scrollToBottom,
    setIsAtBottom,
    isAtTop,
    isAtBottom,
    isOverflowing,
    scrollToTop
  } = useScroll()

  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false)
  const [voiceChatId, setVoiceChatId] = useState<string | null>(null)

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      await fetchMessages()
      await fetchChat()

      scrollToBottom()
      setIsAtBottom(true)
    }

    if (params.chatid) {
      fetchData().then(() => {
        handleFocusChatInput()
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [])

  const fetchMessages = async () => {
    const fetchedMessages = await getMessagesByChatId(params.chatid as string)

    const imagePromises: Promise<MessageImage>[] = fetchedMessages.flatMap(
      message =>
        message.image_paths
          ? message.image_paths.map(async imagePath => {
              const url = await getMessageImageFromStorage(imagePath)

              if (url) {
                const response = await fetch(url)
                const blob = await response.blob()
                const base64 = await convertBlobToBase64(blob)

                return {
                  messageId: message.id,
                  path: imagePath,
                  base64,
                  url,
                  file: null
                }
              }

              return {
                messageId: message.id,
                path: imagePath,
                base64: "",
                url,
                file: null
              }
            })
          : []
    )

    const images: MessageImage[] = await Promise.all(imagePromises.flat())
    setChatImages(images)

    const messageFileItemPromises = fetchedMessages.map(
      async message => await getMessageFileItemsByMessageId(message.id)
    )

    const messageFileItems = await Promise.all(messageFileItemPromises)

    const uniqueFileItems = messageFileItems.flatMap(item => item.file_items)
    setChatFileItems(uniqueFileItems)

    const chatFiles = await getChatFilesByChatId(params.chatid as string)

    setChatFiles(
      chatFiles.files.map(file => ({
        id: file.id,
        name: file.name,
        type: file.type,
        file: null
      }))
    )

    setUseRetrieval(true)
    setShowFilesDisplay(true)

    const fetchedChatMessages = fetchedMessages.map(message => {
      return {
        message,
        fileItems: messageFileItems
          .filter(messageFileItem => messageFileItem.id === message.id)
          .flatMap(messageFileItem =>
            messageFileItem.file_items.map(fileItem => fileItem.id)
          )
      }
    })

    setChatMessages(fetchedChatMessages)
  }

  const fetchChat = async () => {
    const chat = await getChatById(params.chatid as string)
    if (!chat) return

    if (chat.assistant_id) {
      const assistant = assistants.find(
        assistant => assistant.id === chat.assistant_id
      )

      if (assistant) {
        setSelectedAssistant(assistant)

        const assistantTools = (
          await getAssistantToolsByAssistantId(assistant.id)
        ).tools
        setSelectedTools(assistantTools)
      }
    }

    setSelectedChat(chat)
    setChatSettings({
      model: chat.model as LLMID,
      prompt: chat.prompt,
      temperature: chat.temperature,
      contextLength: chat.context_length,
      includeProfileContext: chat.include_profile_context,
      includeWorkspaceInstructions: chat.include_workspace_instructions,
      embeddingsProvider: chat.embeddings_provider as "openai" | "local"
    })
  }

  const handleVoiceModeOpen = async () => {
    if (!profile || !selectedWorkspace) {
      toast.error("Please select a workspace first")
      return
    }

    try {
      // Create a new chat for the voice conversation
      const newChat = await createChat({
        user_id: profile.user_id,
        workspace_id: selectedWorkspace.id,
        name: `Voice Chat - ${new Date().toLocaleString()}`,
        model: selectedWorkspace.default_model,
        prompt: selectedWorkspace.default_prompt,
        temperature: selectedWorkspace.default_temperature,
        context_length: selectedWorkspace.default_context_length,
        include_profile_context: selectedWorkspace.include_profile_context,
        include_workspace_instructions:
          selectedWorkspace.include_workspace_instructions,
        embeddings_provider: selectedWorkspace.embeddings_provider,
        folder_id: null
      })

      setVoiceChatId(newChat.id)
      setIsVoiceModeOpen(true)
    } catch (error) {
      console.error("Failed to create voice chat:", error)
      toast.error("Failed to start voice mode")
    }
  }

  if (loading) {
    return (
      <div className="flex size-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading chat...
          </p>
        </div>
      </div>
    )
  }

  // Get appropriate chat input width based on document panel and screen size
  const getChatInputClasses = () => {
    // Base classes
    let classes = "relative items-end px-2 pb-3 pt-0"

    // Mobile view
    if (isMobile) {
      return `${classes} w-full`
    }

    // When document panel is open, use responsive width
    if (isDocMode) {
      return `${classes} w-full max-w-full sm:max-w-[90%] sm:pb-8 sm:pt-5 md:max-w-[90%] lg:max-w-[90%] xl:max-w-[90%]`
    }

    // Default view (no document panel)
    return `${classes} w-full min-w-[300px] sm:w-[600px] sm:pb-8 sm:pt-5 md:w-[700px] lg:w-[700px] xl:w-[800px]`
  }

  return (
    <div className="relative flex h-full flex-col items-center">
      <div className="absolute left-4 top-2.5 hidden justify-center md:flex">
        <ChatScrollButtons
          isAtTop={isAtTop}
          isAtBottom={isAtBottom}
          isOverflowing={isOverflowing}
          scrollToTop={scrollToTop}
          scrollToBottom={scrollToBottom}
        />
      </div>

      <div className="absolute right-4 top-1 flex h-[40px] items-center space-x-2">
        <ChatSecondaryButtons />
      </div>

      {/* Subtle chat title - only show if chat has a name */}
      {selectedChat?.name && (
        <div className="flex w-full items-center justify-center pb-1 pt-3">
          <div className="text-muted-foreground max-w-[200px] truncate text-sm sm:max-w-[400px] md:max-w-[500px] lg:max-w-[600px] xl:max-w-[700px]">
            {selectedChat.name}
          </div>
        </div>
      )}

      {/* Add px-4 (or adjust px-6 etc. as needed) for horizontal padding */}
      <div
        className="flex size-full flex-col overflow-auto px-4"
        onScroll={handleScroll}
      >
        <div ref={messagesStartRef} />

        {chatMessages.length === 0 ? (
          <EmptyStateChat
            onPromptClick={prompt => handleSendMessage(prompt, [], false)}
          />
        ) : (
          <ChatMessages />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat input with responsive width */}
      <div className={getChatInputClasses()}>
        <ChatInput onVoiceModeClick={handleVoiceModeOpen} />
        <p className="p-1 text-center text-sm text-gray-500 dark:text-gray-400">
          Rooftops AI can make mistakes. Check important information.
        </p>
      </div>

      {/* Voice Mode Modal - Fullscreen */}
      {isVoiceModeOpen && voiceChatId && (
        <VoiceMode
          chatId={voiceChatId}
          onClose={() => {
            setIsVoiceModeOpen(false)
            setVoiceChatId(null)
          }}
        />
      )}

      {/* Canvas Drawer for artifacts/documents */}
      <CanvasDrawer />
    </div>
  )
}
