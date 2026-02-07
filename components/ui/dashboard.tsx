"use client"

import { UnifiedSidebar } from "@/components/sidebar/unified-sidebar"
import { Button } from "@/components/ui/button"
import useHotkey from "@/lib/hooks/use-hotkey"
import { cn } from "@/lib/utils"
import { IconMenu2 } from "@tabler/icons-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { FC, useState, useContext, useEffect } from "react"
import { useSelectFileHandler } from "../chat/chat-hooks/use-select-file-handler"
import { CommandK } from "../utility/command-k"
import { useChatbotUI } from "@/context/context"
import { DocumentPanel } from "@/components/ui/documentPanel"
import { useDocumentStore } from "@/lib/stores/document-store"

export const SIDEBAR_WIDTH = 280
export const SIDEBAR_ICON_WIDTH = 60
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

  const { handleSelectDeviceFile } = useSelectFileHandler()
  const { isDocMode } = useDocumentStore()
  const { hasActiveExploreReport } = useChatbotUI()

  const [showSidebar, setShowSidebar] = useState(() => {
    const saved = localStorage.getItem("showSidebar")
    // Default to open on desktop if user hasn't explicitly toggled it
    if (saved === null) {
      return window.innerWidth >= 768
    }
    return saved === "true"
  })
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

      {/* Unified Sidebar */}
      {!hasActiveExploreReport && (
        <UnifiedSidebar
          isCollapsed={!showSidebar}
          onToggle={handleToggleSidebar}
        />
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
