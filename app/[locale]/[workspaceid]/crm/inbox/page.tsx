"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import {
  IconMessage,
  IconPhone,
  IconMail,
  IconSearch,
  IconSend,
  IconLoader2,
  IconUser,
  IconClock,
  IconCheck,
  IconChecks,
  IconRobot
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface Conversation {
  id: string
  customerId: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  lastMessage: string
  lastMessageAt: string
  lastMessageType: "sms" | "email" | "voice"
  unreadCount: number
  isAIResponding: boolean
}

interface Message {
  id: string
  conversationId: string
  direction: "inbound" | "outbound"
  channel: "sms" | "email" | "voice"
  content: string
  status: "sent" | "delivered" | "read" | "failed"
  isAI: boolean
  createdAt: string
}

export default function InboxPage() {
  const params = useParams()
  const workspaceId = params.workspaceid as string

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState("")

  // Mock data for demonstration
  useEffect(() => {
    const mockConversations: Conversation[] = [
      {
        id: "1",
        customerId: "c1",
        customerName: "John Smith",
        customerPhone: "+1 (303) 555-0101",
        lastMessage:
          "Thanks! When can you come out for the inspection?",
        lastMessageAt: new Date(Date.now() - 15 * 60000).toISOString(),
        lastMessageType: "sms",
        unreadCount: 2,
        isAIResponding: false
      },
      {
        id: "2",
        customerId: "c2",
        customerName: "Sarah Johnson",
        customerPhone: "+1 (720) 555-0202",
        lastMessage: "Got the estimate, looks good. Let me talk to my husband.",
        lastMessageAt: new Date(Date.now() - 2 * 3600000).toISOString(),
        lastMessageType: "sms",
        unreadCount: 0,
        isAIResponding: false
      },
      {
        id: "3",
        customerId: "c3",
        customerName: "Mike Williams",
        customerEmail: "mike@example.com",
        lastMessage: "Is the metal roofing option still available?",
        lastMessageAt: new Date(Date.now() - 5 * 3600000).toISOString(),
        lastMessageType: "email",
        unreadCount: 1,
        isAIResponding: true
      },
      {
        id: "4",
        customerId: "c4",
        customerName: "Emily Davis",
        customerPhone: "+1 (303) 555-0404",
        lastMessage: "The crew did an amazing job! Thanks so much.",
        lastMessageAt: new Date(Date.now() - 24 * 3600000).toISOString(),
        lastMessageType: "sms",
        unreadCount: 0,
        isAIResponding: false
      }
    ]

    setTimeout(() => {
      setConversations(mockConversations)
      setLoading(false)
    }, 500)
  }, [workspaceId])

  const loadMessages = (conversation: Conversation) => {
    setSelectedConversation(conversation)
    setLoadingMessages(true)

    // Mock messages
    const mockMessages: Message[] = [
      {
        id: "m1",
        conversationId: conversation.id,
        direction: "inbound",
        channel: "sms",
        content: "Hi, I got a flyer about your roofing services. We had some hail damage recently.",
        status: "read",
        isAI: false,
        createdAt: new Date(Date.now() - 2 * 3600000).toISOString()
      },
      {
        id: "m2",
        conversationId: conversation.id,
        direction: "outbound",
        channel: "sms",
        content: "Hi! Thanks for reaching out to ABC Roofing. I'm sorry to hear about the hail damage. We'd be happy to come out for a free inspection. What address is the property at?",
        status: "delivered",
        isAI: true,
        createdAt: new Date(Date.now() - 2 * 3600000 + 30000).toISOString()
      },
      {
        id: "m3",
        conversationId: conversation.id,
        direction: "inbound",
        channel: "sms",
        content: "123 Oak Street, Denver CO 80202",
        status: "read",
        isAI: false,
        createdAt: new Date(Date.now() - 90 * 60000).toISOString()
      },
      {
        id: "m4",
        conversationId: conversation.id,
        direction: "outbound",
        channel: "sms",
        content: "Perfect! I have availability tomorrow at 10am or 2pm, or Thursday anytime after noon. Which works best for you?",
        status: "delivered",
        isAI: true,
        createdAt: new Date(Date.now() - 85 * 60000).toISOString()
      },
      {
        id: "m5",
        conversationId: conversation.id,
        direction: "inbound",
        channel: "sms",
        content: conversation.lastMessage,
        status: "read",
        isAI: false,
        createdAt: conversation.lastMessageAt
      }
    ]

    setTimeout(() => {
      setMessages(mockMessages)
      setLoadingMessages(false)
    }, 300)
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    setSending(true)

    // Add message to the list immediately
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId: selectedConversation.id,
      direction: "outbound",
      channel: "sms",
      content: newMessage,
      status: "sent",
      isAI: false,
      createdAt: new Date().toISOString()
    }

    setMessages(prev => [...prev, tempMessage])
    setNewMessage("")

    // Simulate sending
    setTimeout(() => {
      setMessages(prev =>
        prev.map(m =>
          m.id === tempMessage.id ? { ...m, status: "delivered" as const } : m
        )
      )
      setSending(false)
    }, 1000)
  }

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString()
  }

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    })
  }

  const filteredConversations = conversations.filter(
    c =>
      c.customerName.toLowerCase().includes(search.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(search.toLowerCase())
  )

  const getChannelIcon = (type: "sms" | "email" | "voice") => {
    switch (type) {
      case "sms":
        return <IconMessage size={14} className="text-blue-500" />
      case "email":
        return <IconMail size={14} className="text-purple-500" />
      case "voice":
        return <IconPhone size={14} className="text-green-500" />
    }
  }

  const getStatusIcon = (status: Message["status"]) => {
    switch (status) {
      case "sent":
        return <IconCheck size={12} className="text-gray-400" />
      case "delivered":
        return <IconChecks size={12} className="text-gray-400" />
      case "read":
        return <IconChecks size={12} className="text-blue-500" />
      default:
        return null
    }
  }

  return (
    <div className="flex h-full">
      {/* Conversation List */}
      <div className="w-[350px] shrink-0 border-r bg-white">
        <div className="border-b p-4">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Inbox</h2>
          <div className="relative">
            <IconSearch
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="overflow-y-auto">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <IconLoader2 size={24} className="animate-spin text-purple-600" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No conversations found
            </div>
          ) : (
            filteredConversations.map(conversation => (
              <button
                key={conversation.id}
                onClick={() => loadMessages(conversation)}
                className={cn(
                  "flex w-full items-start gap-3 border-b p-4 text-left transition-colors hover:bg-gray-50",
                  selectedConversation?.id === conversation.id && "bg-purple-50"
                )}
              >
                <div className="relative">
                  <div className="flex size-10 items-center justify-center rounded-full bg-gray-100">
                    <IconUser size={20} className="text-gray-500" />
                  </div>
                  {conversation.unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-purple-600 text-xs font-medium text-white">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">
                      {conversation.customerName}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTimeAgo(conversation.lastMessageAt)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    {getChannelIcon(conversation.lastMessageType)}
                    <span className="truncate text-sm text-gray-500">
                      {conversation.lastMessage}
                    </span>
                  </div>
                  {conversation.isAIResponding && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-purple-600">
                      <IconRobot size={12} />
                      AI is responding...
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex flex-1 flex-col bg-gray-50">
        {selectedConversation ? (
          <>
            {/* Thread Header */}
            <div className="flex items-center justify-between border-b bg-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-purple-100">
                  <IconUser size={20} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedConversation.customerName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedConversation.customerPhone ||
                      selectedConversation.customerEmail}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {selectedConversation.customerPhone && (
                  <a
                    href={`tel:${selectedConversation.customerPhone}`}
                    className="rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-50"
                  >
                    <IconPhone size={18} className="text-gray-600" />
                  </a>
                )}
                {selectedConversation.customerEmail && (
                  <a
                    href={`mailto:${selectedConversation.customerEmail}`}
                    className="rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-50"
                  >
                    <IconMail size={18} className="text-gray-600" />
                  </a>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingMessages ? (
                <div className="flex h-full items-center justify-center">
                  <IconLoader2
                    size={24}
                    className="animate-spin text-purple-600"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map(message => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.direction === "outbound"
                          ? "justify-end"
                          : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2",
                          message.direction === "outbound"
                            ? "bg-purple-600 text-white"
                            : "bg-white text-gray-900 shadow-sm"
                        )}
                      >
                        {message.isAI && message.direction === "outbound" && (
                          <div
                            className={cn(
                              "mb-1 flex items-center gap-1 text-xs",
                              message.direction === "outbound"
                                ? "text-purple-200"
                                : "text-purple-600"
                            )}
                          >
                            <IconRobot size={12} />
                            AI Response
                          </div>
                        )}
                        <p className="text-sm">{message.content}</p>
                        <div
                          className={cn(
                            "mt-1 flex items-center justify-end gap-1 text-xs",
                            message.direction === "outbound"
                              ? "text-purple-200"
                              : "text-gray-400"
                          )}
                        >
                          <span>{formatMessageTime(message.createdAt)}</span>
                          {message.direction === "outbound" &&
                            getStatusIcon(message.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="border-t bg-white p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyPress={e =>
                    e.key === "Enter" && !e.shiftKey && handleSendMessage()
                  }
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? (
                    <IconLoader2 size={18} className="animate-spin" />
                  ) : (
                    <IconSend size={18} />
                  )}
                  Send
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Messages are sent via SMS to the customer's phone number
              </p>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-gray-400">
            <IconMessage size={48} className="mb-4" />
            <p>Select a conversation to view messages</p>
          </div>
        )}
      </div>
    </div>
  )
}
