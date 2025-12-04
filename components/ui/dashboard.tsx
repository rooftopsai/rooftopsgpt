"use client"

import { Sidebar } from "@/components/sidebar/sidebar"
import { SidebarSwitcher } from "@/components/sidebar/sidebar-switcher"
import { Button } from "@/components/ui/button"
import { Tabs } from "@/components/ui/tabs"
import useHotkey from "@/lib/hooks/use-hotkey"
import { cn } from "@/lib/utils"
import { ContentType } from "@/types"
import { IconLayoutSidebarLeftExpand } from "@tabler/icons-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { FC, useState, useContext, useEffect } from "react"
import { useSelectFileHandler } from "../chat/chat-hooks/use-select-file-handler"
import { CommandK } from "../utility/command-k"
import { useChatbotUI } from "@/context/context"
import { DocumentPanel } from "@/components/ui/documentPanel"
import { useDocumentStore } from "@/lib/stores/document-store"

export const SIDEBAR_WIDTH = 350
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
    // On mobile with document open, hide content
    if (isDocMode && isMobile) {
      return {
        display: "none"
      }
    }

    // When document panel is open, reduce width by its width
    if (isDocMode && !isMobile) {
      return {
        width: `calc(100vw - ${DOCUMENT_PANEL_WIDTH}px${showSidebar ? ` - ${SIDEBAR_WIDTH}px` : ""})`,
        marginRight: `${DOCUMENT_PANEL_WIDTH}px`,
        display: "flex"
      }
    }

    // Default state - account for sidebar width when open
    return {
      width: showSidebar ? `calc(100% - ${SIDEBAR_WIDTH}px)` : "100%",
      marginRight: "0",
      display: "flex"
    }
  }

  return (
    <div className="relative flex size-full overflow-hidden">
      <CommandK />

      {/* Sidebar */}
      <div
        className={cn(
          "z-20 shrink-0 bg-white transition-all duration-300 dark:bg-gray-900",
          showSidebar
            ? "border-r border-blue-500/10 dark:border-blue-400/15"
            : ""
        )}
        style={{
          minWidth: showSidebar ? `${SIDEBAR_WIDTH}px` : "0px",
          maxWidth: showSidebar ? `${SIDEBAR_WIDTH}px` : "0px",
          width: showSidebar ? `${SIDEBAR_WIDTH}px` : "0px"
        }}
      >
        {showSidebar && (
          <Tabs
            className="flex h-full"
            value={contentType}
            onValueChange={val => {
              setContentType(val as ContentType)
              router.replace(`${pathname}?tab=${val}`)
            }}
          >
            <SidebarSwitcher onContentTypeChange={setContentType} />

            <Sidebar
              contentType={contentType}
              showSidebar={showSidebar}
              toggleSidebar={handleToggleSidebar}
              isMobile={isMobile}
            />
          </Tabs>
        )}
      </div>

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

        {!showSidebar && (
          <Button
            className="absolute left-4 top-3 z-50 size-10 border-2 border-gray-300 bg-white shadow-lg hover:border-blue-500 hover:shadow-xl dark:border-gray-600 dark:bg-gray-800 dark:hover:border-blue-400"
            variant="outline"
            size="icon"
            onClick={handleToggleSidebar}
            aria-label="Open sidebar"
          >
            <IconLayoutSidebarLeftExpand
              size={24}
              className="text-gray-700 dark:text-gray-200"
            />
          </Button>
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
