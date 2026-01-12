// @ts-nocheck
"use client"

import React, { ReactNode, useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase/browser-client"
import { useChatbotUI } from "@/context/context"
import { getWorkspaceById } from "@/db/workspaces"
import { getChatsByWorkspaceId } from "@/db/chats"
import { getFoldersByWorkspaceId } from "@/db/folders"
import { getPromptWorkspacesByWorkspaceId } from "@/db/prompts"
import { getPresetWorkspacesByWorkspaceId } from "@/db/presets"
import { getToolWorkspacesByWorkspaceId } from "@/db/tools"
import { getModelWorkspacesByWorkspaceId } from "@/db/models"
import { getCollectionWorkspacesByWorkspaceId } from "@/db/collections"
import { getFileWorkspacesByWorkspaceId } from "@/db/files"

import { Dashboard } from "@/components/ui/dashboard"
import { UsageWarningProvider } from "@/components/usage/usage-warning-provider"
import { OnboardingModal } from "@/components/modals/onboarding-modal"
import { PaymentFailureBanner } from "@/components/billing/payment-failure-banner"
import { toast } from "sonner"

interface WorkspaceLayoutProps {
  children: ReactNode
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  return <InnerWorkspaceLoader>{children}</InnerWorkspaceLoader>
}

function InnerWorkspaceLoader({ children }: { children: ReactNode }) {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const workspaceId = params.workspaceid as string

  const {
    profile,
    setSelectedWorkspace,
    setChats,
    setFolders,
    setPrompts,
    setPresets,
    setTools,
    setModels,
    setCollections,
    setFiles,
    setChatSettings,
    setChatMessages,
    setUserInput,
    setIsGenerating,
    setFirstTokenReceived,
    setChatFiles,
    setChatImages,
    setNewMessageFiles,
    setNewMessageImages,
    setShowFilesDisplay,
    setUserSubscription
  } = useChatbotUI()

  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [gracePeriodInfo, setGracePeriodInfo] = useState<{
    inGracePeriod: boolean
    daysRemaining: number
  } | null>(null)

  const handleUpdatePayment = async () => {
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST"
      })

      if (response.ok) {
        const { url } = await response.json()
        window.location.href = url
      } else {
        toast.error("Failed to open billing portal")
      }
    } catch (error) {
      console.error("Error opening billing portal:", error)
      toast.error("An error occurred. Please try again.")
    }
  }

  useEffect(() => {
    ;(async () => {
      const session = (await supabase.auth.getSession()).data.session
      if (!session) {
        router.push("/login")
        return
      }
      await fetchWorkspaceData(workspaceId)
    })()
  }, [workspaceId])

  async function fetchWorkspaceData(wsId: string) {
    setLoading(true)

    const workspace = await getWorkspaceById(wsId)
    if (!workspace) {
      // handle missing workspace
      router.push("/404")
      return
    }
    setSelectedWorkspace(workspace)

    // Fetch all workspace data in parallel for faster loading
    const [
      chats,
      folders,
      promptsData,
      presetsData,
      toolsData,
      modelsData,
      collectionsData,
      filesData
    ] = await Promise.all([
      getChatsByWorkspaceId(wsId),
      getFoldersByWorkspaceId(wsId),
      getPromptWorkspacesByWorkspaceId(wsId),
      getPresetWorkspacesByWorkspaceId(wsId),
      getToolWorkspacesByWorkspaceId(wsId),
      getModelWorkspacesByWorkspaceId(wsId),
      getCollectionWorkspacesByWorkspaceId(wsId),
      getFileWorkspacesByWorkspaceId(wsId)
    ])

    setChats(chats)
    setFolders(folders)
    setPrompts(promptsData.prompts)
    setPresets(presetsData.presets)
    setTools(toolsData.tools)
    setModels(modelsData.models)
    setCollections(collectionsData.collections)
    setFiles(filesData.files)

    // Load user subscription from API endpoint (more secure than direct DB access)
    let userPlanType: "free" | "premium" | "business" = "free"
    try {
      const response = await fetch("/api/subscription")
      if (response.ok) {
        const { subscription } = await response.json()
        if (subscription) {
          setUserSubscription(subscription)
          // Determine plan type for model validation
          if (subscription.status === "active") {
            userPlanType =
              (subscription.plan_type as "free" | "premium" | "business") ||
              "free"
          }

          // Check for payment failure grace period
          if (subscription.status === "past_due") {
            try {
              const graceResponse = await fetch(
                "/api/subscription/grace-period"
              )
              if (graceResponse.ok) {
                const { gracePeriod } = await graceResponse.json()
                setGracePeriodInfo(gracePeriod)
              }
            } catch (error) {
              console.error("Error loading grace period:", error)
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading subscription:", error)
    }

    // Get the requested/default model
    const requestedModel = (searchParams.get("model") ||
      (workspace as any).default_model ||
      "gpt-4o") as any

    // Validate model against subscription - if not allowed, use gpt-4o
    const { isModelAllowed } = await import("@/lib/subscription-utils")
    const finalModel = isModelAllowed(userPlanType, requestedModel)
      ? requestedModel
      : "gpt-4o"

    setChatSettings({
      model: finalModel,
      prompt: (workspace as any).default_prompt || "",
      temperature: (workspace as any).default_temperature ?? 0.5,
      contextLength: (workspace as any).default_context_length ?? 4096,
      includeProfileContext: (workspace as any).include_profile_context ?? true,
      includeWorkspaceInstructions:
        (workspace as any).include_workspace_instructions ?? true,
      embeddingsProvider:
        ((workspace as any).embeddings_provider as "openai" | "local") ||
        "openai"
    })

    // reset chat UI state
    setChatMessages([])
    setUserInput("")
    setIsGenerating(false)
    setFirstTokenReceived(false)
    setChatFiles([])
    setChatImages([])
    setNewMessageFiles([])
    setNewMessageImages([])
    setShowFilesDisplay(false)

    setLoading(false)

    // Show onboarding modal if user hasn't completed it yet
    if (profile && !profile.has_onboarded) {
      setShowOnboarding(true)
    }
  }

  if (loading) {
    return (
      <div className="flex size-full items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-500"></div>
      </div>
    )
  }

  return (
    <>
      {/* Payment failure banner - show above Dashboard */}
      {gracePeriodInfo && (
        <PaymentFailureBanner
          daysRemaining={gracePeriodInfo.daysRemaining}
          onUpdatePayment={handleUpdatePayment}
        />
      )}

      <Dashboard>
        <UsageWarningProvider />
        {children}
        <OnboardingModal
          open={showOnboarding}
          onOpenChange={setShowOnboarding}
        />
      </Dashboard>
    </>
  )
}
