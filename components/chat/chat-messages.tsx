import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { useChatbotUI } from "@/context/context"
import { Tables } from "@/supabase/types"
import { FC, useContext, useState } from "react"
import { Message } from "../messages/message"
import { loadDocument, setDocumentMode } from "@/lib/stores/document-store"

interface ChatMessagesProps {}

export const ChatMessages: FC<ChatMessagesProps> = ({}) => {
  const { chatMessages, chatFileItems } = useChatbotUI()
  const { handleSendEdit } = useChatHandler()
  const [editingMessage, setEditingMessage] = useState<Tables<"messages">>()

  // Function to handle opening a document
  const handleOpenDocument = (documentId: string) => {
    console.log("Opening document:", documentId);
    loadDocument(documentId);
    setDocumentMode(true);
  }

  // Function to check if a message contains a document reference
  const getDocumentId = (content: string) => {
    // Match [View Document](documentId:abc123) or other document reference patterns
    const documentMatch = content.match(/\[View Document\]\(documentId:([^)]+)\)/);
    return documentMatch ? documentMatch[1] : null;
  }

  return chatMessages
    .sort((a, b) => a.message.sequence_number - b.message.sequence_number)
    .map((chatMessage, index, array) => {
      const messageFileItems = chatFileItems.filter(
        (chatFileItem, _, self) =>
          chatMessage.fileItems.includes(chatFileItem.id) &&
          self.findIndex(item => item.id === chatFileItem.id) === _
      )

      // Check if this message has a document reference
      const documentId = getDocumentId(chatMessage.message.content);
      
      let messageContent = chatMessage.message.content;
      if (documentId) {
        // Instead of plain text, use a nicely designed card
        messageContent = `
          <div class="flex items-center p-3 my-2 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer" onclick="window.openDocument('${documentId}')">
            <div class="flex-shrink-0 mr-3 text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
                <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"></path>
                <path d="M9 17h6"></path>
                <path d="M9 13h6"></path>
              </svg>
            </div>
            <div>
              <div class="font-medium">Document Created</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">Click to view the document</div>
            </div>
          </div>
        `;
      }

      return (
        <Message
          key={chatMessage.message.sequence_number}
          message={{
            ...chatMessage.message,
            content: messageContent // Use the cleaned content
          }}
          fileItems={messageFileItems}
          isEditing={editingMessage?.id === chatMessage.message.id}
          isLast={index === array.length - 1}
          onStartEdit={setEditingMessage}
          onCancelEdit={() => setEditingMessage(undefined)}
          onSubmitEdit={handleSendEdit}
          // Add document-related props
          hasDocument={!!documentId}
          documentId={documentId || undefined}
          onViewDocument={documentId ? () => handleOpenDocument(documentId) : undefined}
        />
      )
    })
}