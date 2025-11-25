// components/sidebar/sidebar.tsx
import { useChatbotUI } from "@/context/context"
import { Tables } from "@/supabase/types"
import { ContentType } from "@/types"
import { FC } from "react"
import { TabsContent } from "../ui/tabs"
import { WorkspaceSwitcher } from "../utility/workspace-switcher"
import { WorkspaceSettings } from "../workspace/workspace-settings"
import { SidebarContent } from "./sidebar-content"
import { Button } from "@/components/ui/button"
import { IconLayoutSidebarLeftCollapse, IconCrown } from "@tabler/icons-react"
import Link from "next/link"

interface SidebarProps {
  contentType: ContentType
  showSidebar: boolean
  toggleSidebar: () => void // Add the toggle function prop
}

export const Sidebar: FC<SidebarProps> = ({
  contentType,
  showSidebar,
  toggleSidebar
}) => {
  const {
    folders,
    chats,
    presets,
    prompts,
    files,
    collections,
    assistants,
    tools,
    models,
    userSubscription
  } = useChatbotUI()

  const chatFolders = folders.filter(folder => folder.type === "chats")
  const presetFolders = folders.filter(folder => folder.type === "presets")
  const promptFolders = folders.filter(folder => folder.type === "prompts")
  const filesFolders = folders.filter(folder => folder.type === "files")
  const collectionFolders = folders.filter(
    folder => folder.type === "collections"
  )
  const assistantFolders = folders.filter(
    folder => folder.type === "assistants"
  )
  const toolFolders = folders.filter(folder => folder.type === "tools")
  const modelFolders = folders.filter(folder => folder.type === "models")

  // Determine crown icon based on subscription
  const isPremium = userSubscription?.plan_type === "premium" && userSubscription?.status === "active"
  const isBusiness = userSubscription?.plan_type === "business" && userSubscription?.status === "active"
  const hasActiveSubscription = userSubscription?.status === "active"

  const renderSidebarContent = (
    contentType: ContentType,
    data: any[],
    folders: Tables<"folders">[]
  ) => {
    return (
      <SidebarContent
        contentType={contentType}
        data={data}
        folders={folders}
      />
    )
  }

  return (
    <TabsContent
      value={contentType}
      className="size-full overflow-auto border-none"
    >
      <div className="flex h-full flex-col p-3">
        {/* Header with logo and collapse button */}
        <div className="mb-4 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <img
              src="https://uploads-ssl.webflow.com/64e9150f53771ac56ef528b7/64ee16bb300d3e08d25a03ac_rooftops-logo-gr-black.png"
              alt="Rooftops AI"
              className="h-6 w-auto dark:invert"
            />
            {isPremium && (
              <IconCrown size={18} className="text-gray-800 dark:text-gray-200" />
            )}
            {isBusiness && (
              <IconCrown size={18} className="text-yellow-500" />
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 hover:bg-blue-500/10 dark:hover:bg-blue-400/10"
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
          >
            <IconLayoutSidebarLeftCollapse size={18} className="text-muted-foreground" />
          </Button>
        </div>

        {/* Upgrade to Pro button - only show if user doesn't have active subscription */}
        {!hasActiveSubscription && (
          <div className="mb-3 px-1">
            <Link href="/pricing">
              <Button className="h-[36px] w-full border-0 bg-gradient-to-r from-[#ffd700] via-[#ffb700] to-[#ff8c00] text-white hover:from-[#ffb700] hover:via-[#ff8c00] hover:to-[#ffd700]">
                <IconCrown size={18} className="mr-2" />
                Upgrade to Pro
              </Button>
            </Link>
          </div>
        )}

        {/* Workspace switcher */}
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <WorkspaceSwitcher />
          <WorkspaceSettings />
        </div>

        {/* Main content area */}
        <div className="-mx-1 flex-1 overflow-auto">
          {(() => {
            switch (contentType) {
              case "chats":
                return renderSidebarContent("chats", chats, chatFolders)
              case "presets":
                return renderSidebarContent("presets", presets, presetFolders)
              case "prompts":
                return renderSidebarContent("prompts", prompts, promptFolders)
              case "files":
                return renderSidebarContent("files", files, filesFolders)
              case "collections":
                return renderSidebarContent(
                  "collections",
                  collections,
                  collectionFolders
                )
              case "assistants":
                return renderSidebarContent(
                  "assistants",
                  assistants,
                  assistantFolders
                )
              case "tools":
                return renderSidebarContent("tools", tools, toolFolders)
              case "models":
                return renderSidebarContent("models", models, modelFolders)
              case "creator":
                return renderSidebarContent("creator", [], [])
              default:
                return null
            }
          })()}
        </div>
      </div>
    </TabsContent>
  )
}
