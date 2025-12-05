"use client"

import { useChatbotUI } from "@/context/context"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { LLMID } from "@/types"
import { IconChevronDown, IconLock } from "@tabler/icons-react"
import { FC } from "react"
import { ModelIcon } from "../models/model-icon"
import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "../ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "../ui/tooltip"
import { cn } from "@/lib/utils"
import { getAllowedModels } from "@/lib/subscription-utils"
import { useRouter } from "next/navigation"

// Only show these models that are integrated and working
const AVAILABLE_MODELS = [
  "gpt-5-mini",
  "gpt-4o",
  "gpt-4-turbo-preview",
  "gpt-3.5-turbo"
]

interface ModelSelectorProps {
  className?: string
}

export const ModelSelector: FC<ModelSelectorProps> = ({ className }) => {
  const { chatSettings, setChatSettings, userSubscription, selectedWorkspace } =
    useChatbotUI()

  const router = useRouter()

  // Determine user's plan type
  const planType =
    userSubscription && userSubscription.status === "active"
      ? (userSubscription.plan_type as "free" | "premium" | "business") ||
        "free"
      : "free"

  // Get allowed models for this plan
  const allowedModelIds = getAllowedModels(planType)

  const currentModel = LLM_LIST.find(llm => llm.modelId === chatSettings?.model)

  const handleModelSelect = (modelId: LLMID, isAllowed: boolean) => {
    if (!chatSettings) return

    if (!isAllowed) {
      // Redirect to pricing page
      router.push("/pricing")
      return
    }

    setChatSettings({
      ...chatSettings,
      model: modelId
    })
  }

  // Always render with a fallback if currentModel is not found
  const displayModel = currentModel || {
    modelId: "gpt-4o",
    modelName: "GPT-4o",
    provider: "openai" as const
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <DropdownMenu>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "hover:bg-accent h-8 gap-2 px-2 text-sm font-medium",
                  className
                )}
              >
                <ModelIcon
                  provider={displayModel.provider}
                  width={16}
                  height={16}
                />
                <span className="max-w-[120px] truncate">
                  {displayModel.modelName}
                </span>
                <IconChevronDown size={14} />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>

          <DropdownMenuContent align="start" className="w-[250px]">
            {LLM_LIST.filter(llm => AVAILABLE_MODELS.includes(llm.modelId)).map(
              model => {
                const isAllowed = allowedModelIds.includes(
                  model.modelId as string
                )
                return (
                  <DropdownMenuItem
                    key={model.modelId}
                    onClick={() =>
                      handleModelSelect(model.modelId as LLMID, isAllowed)
                    }
                    className="flex items-center gap-2"
                  >
                    <ModelIcon
                      provider={model.provider}
                      width={18}
                      height={18}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {model.modelName}
                      </div>
                      {model.description && (
                        <div className="text-muted-foreground text-xs">
                          {model.description}
                        </div>
                      )}
                    </div>
                    {chatSettings?.model === model.modelId && (
                      <div className="text-primary text-xs">✓</div>
                    )}
                    {!isAllowed && (
                      <IconLock className="text-muted-foreground size-4" />
                    )}
                  </DropdownMenuItem>
                )
              }
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <TooltipContent>
          <p>Select model</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
