// components > sidebar > sidebar-content.tsx
import { Tables } from "@/supabase/types"
import { ContentType, DataListType } from "@/types"
import { FC, useState } from "react"
import { SidebarCreateButtons } from "./sidebar-create-buttons"
import { SidebarDataList } from "./sidebar-data-list"
import { SidebarSearch } from "./sidebar-search"
import Link from "next/link"
import { IconSparkles, IconPalette, IconCrown } from "@tabler/icons-react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"

interface SidebarContentProps {
  contentType: ContentType
  data: DataListType
  folders: Tables<"folders">[]
}

export const SidebarContent: FC<SidebarContentProps> = ({
  contentType,
  data,
  folders
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
      <div className="mb-2 px-1">
        <Button className="h-[36px] w-full justify-between" asChild>
          <Link href={currentWorkspaceId ? `/${currentWorkspaceId}/explore` : "/explore"}>
            <div className="flex items-center">
              <IconSparkles size={18} className="mr-2" />
              <span>AI Property Reports</span>
            </div>
            <IconCrown size={14} className="ml-2 opacity-70" />
          </Link>
        </Button>
      </div>

      {/* Creator Studio button - styled like New Chat button with crown badge */}
      <div className="mb-2 px-1">
        <Button className="h-[36px] w-full justify-between" asChild>
          <Link href={currentWorkspaceId ? `/${currentWorkspaceId}/creator` : "/creator"}>
            <div className="flex items-center">
              <IconPalette size={18} className="mr-2" />
              <span>Creator Studio</span>
            </div>
            <IconCrown size={14} className="ml-2 opacity-70" />
          </Link>
        </Button>
      </div>

      <div className="flex items-center">
        <SidebarCreateButtons
          contentType={contentType}
          hasData={data.length > 0}
        />
      </div>

      <div className="mt-2">
        <SidebarSearch
          contentType={contentType}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
      </div>

      <SidebarDataList
        contentType={contentType}
        data={filteredData}
        folders={folders}
      />
    </div>
  )
}