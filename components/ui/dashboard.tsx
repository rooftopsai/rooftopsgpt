"use client"

import { Sidebar } from "@/components/sidebar/sidebar"
import { SidebarSwitcher } from "@/components/sidebar/sidebar-switcher"
import { Button } from "@/components/ui/button"
import { Tabs } from "@/components/ui/tabs"
import useHotkey from "@/lib/hooks/use-hotkey"
import { cn } from "@/lib/utils"
import { ContentType } from "@/types"
import { IconLayoutSidebarLeftExpand, IconMenu2 } from "@tabler/icons-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { FC, useState, useContext, useEffect } from "react"
import { useSelectFileHandler } from "../chat/chat-hooks/use-select-file-handler"
import { CommandK } from "../utility/command-k"
import { useChatbotUI } from "@/context/context"
import { DocumentPanel } from "@/components/ui/documentPanel"
import { useDocumentStore } from "@/lib/stores/document-store"
import { RooftopsSVG } from "@/components/icons/rooftops-svg"

export const SIDEBAR_WIDTH = 350
export const SIDEBAR_ICON_WIDTH = 70
export const DOCUMENT_PANEL_WIDTH = 500 // Width of document panel in pixels

interface DashboardProps {
  children: React.ReactNode
}

export const Dashboard: FC<DashboardProps> = ({ children }) => {
  // toggle with "s"
  useHotkey("s", () => setShowSidebar(prev => !prev))

  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabValue = searchParams.get("tab") || "chats"

  const { handleSelectDeviceFile } = useSelectFileHandler()
  const { isDocMode } = useDocumentStore()
  const { hasActiveExploreReport } = useChatbotUI()

  const [contentType, setContentType] = useState<ContentType>(
    tabValue as ContentType
  )
  const [showSidebar, setShowSidebar] = useState(
    localStorage.getItem("showSidebar") === "true"
  )
  const [isDragging, setIsDragging] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const onFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    handleSelectDeviceFile(file)
    setIsDragging(false)
  }
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleToggleSidebar = () => {
    setShowSidebar(prev => !prev)
    localStorage.setItem("showSidebar", String(!showSidebar))
  }

  // Calculate main content width when document panel is open
  const getMainContentWidth = () => {
    // When explore report is active, use full width (sidebar is hidden)
    if (hasActiveExploreReport) {
      return {
        width: "100%",
        marginRight: "0",
        display: "flex"
      }
    }

    // On mobile with document open, hide content
    if (isDocMode && isMobile) {
      return {
        display: "none"
      }
    }

    // When document panel is open, reduce width by its width
    if (isDocMode && !isMobile) {
      return {
        width: `calc(100vw - ${DOCUMENT_PANEL_WIDTH}px${showSidebar ? ` - ${SIDEBAR_WIDTH}px` : ` - ${SIDEBAR_ICON_WIDTH}px`})`,
        marginRight: `${DOCUMENT_PANEL_WIDTH}px`,
        display: "flex"
      }
    }

    // On mobile with collapsed sidebar, use full width
    if (isMobile && !showSidebar) {
      return {
        width: "100%",
        marginRight: "0",
        display: "flex"
      }
    }

    // Default state - account for sidebar width when open
    return {
      width: showSidebar
        ? `calc(100% - ${SIDEBAR_WIDTH}px)`
        : `calc(100% - ${SIDEBAR_ICON_WIDTH}px)`,
      marginRight: "0",
      display: "flex"
    }
  }

  return (
    <div className="relative flex size-full overflow-hidden">
      <CommandK />

      {/* Floating hamburger button for mobile when sidebar is collapsed */}
      {isMobile && !showSidebar && !hasActiveExploreReport && (
        <Button
          className="fixed left-4 top-4 z-30 size-10 bg-black/80 hover:bg-black"
          variant="ghost"
          size="icon"
          onClick={handleToggleSidebar}
          aria-label="Open sidebar"
        >
          <IconMenu2 size={24} className="text-white" />
        </Button>
      )}

      {/* Sidebar - always part of layout flow */}
      {(!isMobile || showSidebar) && !hasActiveExploreReport && (
        <div
          className={cn(
            "z-20 shrink-0 transition-all duration-300",
            showSidebar
              ? "border-r border-blue-500/10 bg-white dark:border-blue-400/15 dark:bg-gray-900"
              : ""
          )}
          style={{
            minWidth: showSidebar
              ? `${SIDEBAR_WIDTH}px`
              : `${SIDEBAR_ICON_WIDTH}px`,
            maxWidth: showSidebar
              ? `${SIDEBAR_WIDTH}px`
              : `${SIDEBAR_ICON_WIDTH}px`,
            width: showSidebar
              ? `${SIDEBAR_WIDTH}px`
              : `${SIDEBAR_ICON_WIDTH}px`
          }}
        >
          <Tabs
            className="flex size-full"
            value={contentType}
            onValueChange={val => {
              setContentType(val as ContentType)
              router.replace(`${pathname}?tab=${val}`)
            }}
          >
            {!showSidebar ? (
              <div className="flex size-full flex-col bg-black">
                {/* Rooftops AI logo with expand button */}
                <div className="flex flex-col items-center border-b border-gray-800/50 px-2 py-3">
                  <div
                    className="mb-2 cursor-pointer"
                    onClick={handleToggleSidebar}
                  >
                    <RooftopsSVG width="40" height="40" />
                  </div>
                  <Button
                    className="size-8 bg-transparent hover:bg-gray-800/50"
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleSidebar}
                    aria-label="Expand sidebar"
                  >
                    <IconMenu2 size={20} className="text-gray-200" />
                  </Button>
                </div>

                {/* Icon-only switcher - clicking expands sidebar */}
                <div className="flex-1 overflow-hidden">
                  <SidebarSwitcher
                    onContentTypeChange={type => {
                      setContentType(type)
                      handleToggleSidebar()
                    }}
                  />
                </div>
              </div>
            ) : (
              <>
                <SidebarSwitcher onContentTypeChange={setContentType} />
                <Sidebar
                  contentType={contentType}
                  showSidebar={showSidebar}
                  toggleSidebar={handleToggleSidebar}
                  isMobile={isMobile}
                />
              </>
            )}
          </Tabs>
        </div>
      )}

      {/* Main Content */}
      <div
        className="bg-muted/50 relative z-10 flex grow flex-col transition-all duration-300"
        style={getMainContentWidth()}
        onDrop={onFileDrop}
        onDragOver={onDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        {isDragging ? (
          <div className="flex h-full items-center justify-center bg-black/50 text-2xl text-white">
            drop file here
          </div>
        ) : (
          <div className="w-full grow overflow-auto">{children}</div>
        )}
      </div>

      {/* Document Panel */}
      {isDocMode && (
        <div
          className="fixed right-0 top-0 z-30 h-full overflow-hidden border-l bg-white 
            shadow-xl transition-all duration-300 dark:bg-gray-800"
          style={{
            width: isMobile ? "100%" : `${DOCUMENT_PANEL_WIDTH}px`,
            transform: isDocMode ? "translateX(0)" : "translateX(100%)",
            top: "0px",
            height: "100vh"
          }}
        >
          <DocumentPanel />
        </div>
      )}
    </div>
  )
}
