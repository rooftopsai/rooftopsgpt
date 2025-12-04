// components > sidebar > sidebar-content.tsx
import { Tables } from "@/supabase/types"
import { ContentType, DataListType } from "@/types"
import { FC, useState } from "react"
import { SidebarCreateButtons } from "./sidebar-create-buttons"
import { SidebarDataList } from "./sidebar-data-list"
import { SidebarSearch } from "./sidebar-search"
import { ConnectionsList } from "./items/tools/connections-list"
import { ReportsList } from "./items/reports/reports-list"
import Link from "next/link"
import { IconSparkles, IconPalette, IconCrown } from "@tabler/icons-react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"

interface SidebarContentProps {
  contentType: ContentType
  data: DataListType
  folders: Tables<"folders">[]
  isMobile?: boolean
  toggleSidebar?: () => void
}

export const SidebarContent: FC<SidebarContentProps> = ({
  contentType,
  data,
  folders,
  isMobile,
  toggleSidebar
}) => {
  const [searchTerm, setSearchTerm] = useState("")

  // Extract the workspace ID from the URL path
  const pathname = usePathname()
  const workspaceIdMatch = pathname.match(/^\/([^\/]+)/)
  const currentWorkspaceId = workspaceIdMatch ? workspaceIdMatch[1] : ""

  const filteredData: any = data.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    // Subtract 50px for the height of the workspace settings
    <div className="flex max-h-[calc(100%-10px)] grow flex-col">
      {/* AI Property Reports button - styled like New Chat button with crown badge */}
      <div className="mb-2">
        <Button
          variant="ghost"
          className="hover:border-border h-[36px] w-full justify-start border-0 border-b border-transparent bg-transparent font-semibold hover:bg-transparent"
          style={{ padding: "0px 10px 0px 4px" }}
          asChild
        >
          <Link
            href={
              currentWorkspaceId ? `/${currentWorkspaceId}/explore` : "/explore"
            }
            onClick={() => {
              if (isMobile && toggleSidebar) {
                toggleSidebar()
              }
            }}
          >
            <IconSparkles size={20} className="mr-2" stroke={2} />
            <span>AI Property Reports</span>
            <IconCrown
              size={22}
              className="ml-auto opacity-70"
              fill="currentColor"
              stroke={0}
            />
          </Link>
        </Button>
      </div>

      {/* Creator Studio button - styled like New Chat button with crown badge */}
      <div className="mb-2">
        <Button
          variant="ghost"
          className="hover:border-border h-[36px] w-full justify-start border-0 border-b border-transparent bg-transparent font-semibold hover:bg-transparent"
          style={{ padding: "0px 10px 0px 4px" }}
          asChild
        >
          <Link
            href={
              currentWorkspaceId ? `/${currentWorkspaceId}/creator` : "/creator"
            }
            onClick={() => {
              if (isMobile && toggleSidebar) {
                toggleSidebar()
              }
            }}
          >
            <IconPalette size={20} className="mr-2" stroke={2} />
            <span>Creator Studio</span>
            <IconCrown
              size={22}
              className="ml-auto opacity-70"
              fill="currentColor"
              stroke={0}
            />
          </Link>
        </Button>
      </div>

      {contentType !== "reports" && (
        <>
          <div className="flex items-center">
            <SidebarCreateButtons
              contentType={contentType}
              hasData={data.length > 0}
              isMobile={isMobile}
              toggleSidebar={toggleSidebar}
            />
          </div>

          <div className="mt-2">
            <SidebarSearch
              contentType={contentType}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
          </div>
        </>
      )}

      {contentType === "tools" && (
        <div className="mt-2">
          <div className="text-muted-foreground mb-2 px-2 text-xs font-semibold">
            CONNECTIONS
          </div>
          <ConnectionsList />
        </div>
      )}

      {contentType === "reports" ? (
        <div className="mt-2 flex-1 overflow-y-auto">
          <ReportsList />
        </div>
      ) : (
        <SidebarDataList
          contentType={contentType}
          data={filteredData}
          folders={folders}
        />
      )}
    </div>
  )
}
