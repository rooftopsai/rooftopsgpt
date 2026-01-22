// app/[locale]/[workspaceid]/chat/page.tsx
"use client"

import { ChatHelp } from "@/components/chat/chat-help"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatSettings } from "@/components/chat/chat-settings"
import { ChatUI } from "@/components/chat/chat-ui"
import { QuickSettings } from "@/components/chat/quick-settings"
import { QuickPrompts } from "@/components/chat/quick-prompts"
import { RooftopsSVG } from "@/components/icons/rooftops-svg"
import { useChatbotUI } from "@/context/context"
import useHotkey from "@/lib/hooks/use-hotkey"
import { useTheme } from "next-themes"
import {
  useEffect,
  useState,
  useRef,
  useLayoutEffect,
  useCallback
} from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { VoiceMode } from "@/components/voice-mode/VoiceMode"
import { IconMicrophone, IconSparkles, IconCheck } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { createChat } from "@/db/chats"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"
import { PLANS } from "@/lib/stripe-config"
import { getGreeting } from "@/lib/greetings"

export default function ChatPage() {
  // pull out the initialPrompt param if present
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialPrompt = searchParams.get("initialPrompt") ?? ""
  const subscriptionSuccess =
    searchParams.get("subscription_success") === "true"
  const planType = searchParams.get("plan") || "premium"
  const sessionId = searchParams.get("session_id")

  // grab our context + handlers
  const {
    chatMessages,
    setUserSubscription,
    profile,
    selectedChat,
    selectedWorkspace,
    userSubscription
  } = useChatbotUI()

  // Check for premium or business subscription
  const isPremiumOrBusiness =
    (userSubscription?.plan_type === "premium" ||
      userSubscription?.plan_type === "business" ||
      userSubscription?.plan_type === "premium_monthly" ||
      userSubscription?.plan_type === "premium_annual" ||
      userSubscription?.plan_type === "business_monthly" ||
      userSubscription?.plan_type === "business_annual") &&
    (userSubscription?.status === "active" ||
      userSubscription?.status === "trialing")
  const { handleNewChat, handleSendMessage, handleFocusChatInput } =
    useChatHandler()
  const { theme } = useTheme()

  // ensure we only initialize once per mount
  const [didInit, setDidInit] = useState(false)
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false)
  const [greeting, setGreeting] = useState("Let's get to work.")
  const [voiceChatId, setVoiceChatId] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(subscriptionSuccess)
  const [subscriptionProcessed, setSubscriptionProcessed] = useState(false)

  // Auto-fit headline refs and state
  const headlineContainerRef = useRef<HTMLDivElement>(null)
  const headlineTextRef = useRef<HTMLHeadingElement>(null)
  const [headlineFontSize, setHeadlineFontSize] = useState(52)

  // Auto-fit the headline to prevent wrapping
  const fitHeadline = useCallback(() => {
    const container = headlineContainerRef.current
    const text = headlineTextRef.current
    if (!container || !text) return

    const maxFontSize = 52
    const minFontSize = 24
    const containerWidth = container.offsetWidth - 60 // Account for logo + margin

    // Binary search for optimal font size
    let low = minFontSize
    let high = maxFontSize
    let optimalSize = minFontSize

    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      text.style.fontSize = `${mid}px`

      if (text.scrollWidth <= containerWidth) {
        optimalSize = mid
        low = mid + 1
      } else {
        high = mid - 1
      }
    }

    setHeadlineFontSize(optimalSize)
  }, [])

  // Fit headline on mount and resize
  useEffect(() => {
    fitHeadline()
    window.addEventListener("resize", fitHeadline)
    return () => window.removeEventListener("resize", fitHeadline)
  }, [fitHeadline, greeting])

  // if there's an initialPrompt, wipe the slate and send it as the first user message
  useEffect(() => {
    if (initialPrompt && !didInit) {
      setDidInit(true)

      // sendMessage(signature: content, existingMessages, isRegeneration)
      handleSendMessage(initialPrompt, [], false)
    }
  }, [initialPrompt, didInit, handleNewChat, handleSendMessage])

  // Process subscription after successful checkout (DEV WORKAROUND)
  useEffect(() => {
    if (subscriptionSuccess && sessionId && !subscriptionProcessed) {
      setSubscriptionProcessed(true)

      // Call the create-subscription endpoint
      fetch("/api/stripe/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      })
        .then(async response => {
          if (response.ok) {
            const data = await response.json()
            setUserSubscription(data.subscription)
            console.log("Subscription created successfully:", data.subscription)
          } else {
            console.error(
              "Failed to create subscription:",
              await response.text()
            )
          }
        })
        .catch(error => {
          console.error("Error creating subscription:", error)
        })
    }
  }, [
    subscriptionSuccess,
    sessionId,
    subscriptionProcessed,
    setUserSubscription
  ])

  // Set dynamic greeting based on time of day (client-side only to avoid hydration mismatch)
  useEffect(() => {
    setGreeting(getGreeting())
  }, [])

  // allow hotkeys for new chat & focusing
  useHotkey("o", () => handleNewChat())
  useHotkey("l", () => handleFocusChatInput())

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

  return (
    <>
      {chatMessages.length === 0 ? (
        <div className="relative flex h-full flex-col items-center justify-center px-4">
          {/* Mobile logo at top - only visible on mobile */}
          <div className="absolute inset-x-0 top-4 flex items-center justify-center gap-2 md:hidden">
            <img
              src="https://uploads-ssl.webflow.com/64e9150f53771ac56ef528b7/64ee16bb300d3e08d25a03ac_rooftops-logo-gr-black.png"
              alt="Rooftops AI"
              className="h-8 w-auto dark:invert"
            />
            {isPremiumOrBusiness && (
              <span className="rounded-full bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 shadow-sm">
                Pro
              </span>
            )}
          </div>

          {/* Centered content container */}
          <div className="flex w-full max-w-[800px] flex-col items-center justify-center space-y-8">
            {/* Mobile greeting text - visible on mobile only */}
            <h1 className="text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl md:hidden dark:text-white">
              {greeting}
            </h1>

            {/* Desktop greeting section with logo inline with text - hidden on mobile */}
            <div
              ref={headlineContainerRef}
              className="hidden w-full items-center justify-center md:flex"
            >
              <div className="mr-3 size-12 shrink-0">
                <RooftopsSVG width="48" height="48" />
              </div>
              <h1
                ref={headlineTextRef}
                style={{ fontSize: `${headlineFontSize}px` }}
                className="mt-1 whitespace-nowrap font-bold leading-none tracking-tight text-gray-900 dark:text-white"
              >
                {greeting}
              </h1>
            </div>

            {/* Chat input */}
            <div className="w-full">
              <ChatInput onVoiceModeClick={handleVoiceModeOpen} />
            </div>

            {/* Quick prompts below input */}
            <div className="w-full">
              <QuickPrompts />
            </div>
          </div>
        </div>
      ) : (
        <ChatUI />
      )}

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

      {/* Subscription Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500">
              <IconSparkles size={32} className="text-white" />
            </div>
            <DialogTitle className="text-center text-2xl">
              Welcome to {planType === "premium" ? "Premium" : "Business"}!
            </DialogTitle>
            <DialogDescription className="text-center">
              Your subscription is now active. Here&apos;s what you unlocked:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {planType === "premium" && (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <IconCheck className="mt-1 size-5 shrink-0 text-green-500" />
                  <div>
                    <p className="font-semibold">1,000 Chat Messages/month</p>
                    <p className="text-muted-foreground text-sm">
                      50x more conversations with AI
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <IconCheck className="mt-1 size-5 shrink-0 text-green-500" />
                  <div>
                    <p className="font-semibold">20 Property Reports/month</p>
                    <p className="text-muted-foreground text-sm">
                      Generate detailed property analysis reports
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <IconCheck className="mt-1 size-5 shrink-0 text-green-500" />
                  <div>
                    <p className="font-semibold">Unlimited Weather Lookups</p>
                    <p className="text-muted-foreground text-sm">
                      Check weather conditions anytime
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <IconCheck className="mt-1 size-5 shrink-0 text-green-500" />
                  <div>
                    <p className="font-semibold">
                      50 Document Generations/month
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Create professional roofing documents
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <IconCheck className="mt-1 size-5 shrink-0 text-green-500" />
                  <div>
                    <p className="font-semibold">Priority Support</p>
                    <p className="text-muted-foreground text-sm">
                      Get help faster when you need it
                    </p>
                  </div>
                </div>
              </div>
            )}

            {planType === "business" && (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <IconCheck className="mt-1 size-5 shrink-0 text-green-500" />
                  <div>
                    <p className="font-semibold">5,000 Chat Messages/month</p>
                    <p className="text-muted-foreground text-sm">
                      250x more conversations with AI
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <IconCheck className="mt-1 size-5 shrink-0 text-green-500" />
                  <div>
                    <p className="font-semibold">100 Property Reports/month</p>
                    <p className="text-muted-foreground text-sm">
                      Generate comprehensive property analysis
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <IconCheck className="mt-1 size-5 shrink-0 text-green-500" />
                  <div>
                    <p className="font-semibold">Unlimited Weather Lookups</p>
                    <p className="text-muted-foreground text-sm">
                      Check weather conditions anytime
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <IconCheck className="mt-1 size-5 shrink-0 text-green-500" />
                  <div>
                    <p className="font-semibold">
                      Unlimited Document Generations
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Create unlimited professional documents
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <IconCheck className="mt-1 size-5 shrink-0 text-green-500" />
                  <div>
                    <p className="font-semibold">Dedicated Support</p>
                    <p className="text-muted-foreground text-sm">
                      Priority assistance for your business
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <IconCheck className="mt-1 size-5 shrink-0 text-green-500" />
                  <div>
                    <p className="font-semibold">Team Collaboration</p>
                    <p className="text-muted-foreground text-sm">
                      Work together with up to 10 team members
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center pt-4">
            <Button
              onClick={() => {
                setShowSuccessModal(false)
                // Clean up URL
                router.replace(window.location.pathname)
              }}
              className="w-full"
            >
              Get Started
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
