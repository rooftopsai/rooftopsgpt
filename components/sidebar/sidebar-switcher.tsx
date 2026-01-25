import { ContentType } from "@/types"
import {
  IconMessageCircle,
  IconHome,
  IconFolders,
  IconStack2,
  IconSparkles,
  IconPlugConnected,
  IconQuestionMark
} from "@tabler/icons-react"
import { FC } from "react"
import Link from "next/link"
import { TabsList } from "../ui/tabs"
import { WithTooltip } from "../ui/with-tooltip"
import { ProfileSettings } from "../utility/profile-settings"
import { SidebarSwitchItem } from "./sidebar-switch-item"

export const SIDEBAR_ICON_SIZE = 22

interface SidebarSwitcherProps {
  onContentTypeChange: (contentType: ContentType) => void
}

export const SidebarSwitcher: FC<SidebarSwitcherProps> = ({
  onContentTypeChange
}) => {
  return (
    <div className="flex h-full flex-col justify-between border-r border-gray-800/50 bg-black py-3">
      <TabsList className="grid h-auto grid-rows-7 gap-1 bg-transparent p-1">
        <SidebarSwitchItem
          icon={
            <IconMessageCircle
              size={SIDEBAR_ICON_SIZE}
              className="text-gray-200"
            />
          }
          contentType="chats"
          onContentTypeChange={onContentTypeChange}
        />

        <SidebarSwitchItem
          icon={
            <IconSparkles size={SIDEBAR_ICON_SIZE} className="text-gray-200" />
          }
          contentType="agent"
          onContentTypeChange={onContentTypeChange}
        />

        <SidebarSwitchItem
          icon={<IconHome size={SIDEBAR_ICON_SIZE} className="text-gray-200" />}
          contentType="reports"
          onContentTypeChange={onContentTypeChange}
        />

        {/* Presets tab hidden - not needed for users */}
        {/* <SidebarSwitchItem
          icon={<IconAdjustmentsHorizontal size={SIDEBAR_ICON_SIZE} />}
          contentType="presets"
          onContentTypeChange={onContentTypeChange}
        /> */}

        {/* Prompts tab hidden - not needed for users */}
        {/* <SidebarSwitchItem
          icon={<IconPencil size={SIDEBAR_ICON_SIZE} />}
          contentType="prompts"
          onContentTypeChange={onContentTypeChange}
        /> */}

        {/* Models tab hidden - users don't need to add custom models */}
        {/* <SidebarSwitchItem
          icon={<IconSparkles size={SIDEBAR_ICON_SIZE} />}
          contentType="models"
          onContentTypeChange={onContentTypeChange}
        /> */}

        <SidebarSwitchItem
          icon={
            <IconFolders size={SIDEBAR_ICON_SIZE} className="text-gray-200" />
          }
          contentType="files"
          onContentTypeChange={onContentTypeChange}
        />

        <SidebarSwitchItem
          icon={
            <IconStack2 size={SIDEBAR_ICON_SIZE} className="text-gray-200" />
          }
          contentType="collections"
          onContentTypeChange={onContentTypeChange}
        />

        <SidebarSwitchItem
          icon={
            <IconSparkles size={SIDEBAR_ICON_SIZE} className="text-gray-200" />
          }
          contentType="assistants"
          onContentTypeChange={onContentTypeChange}
        />

        <SidebarSwitchItem
          icon={
            <IconPlugConnected
              size={SIDEBAR_ICON_SIZE}
              className="text-gray-200"
            />
          }
          contentType="tools"
          onContentTypeChange={onContentTypeChange}
        />
      </TabsList>

      <div className="flex flex-col items-center gap-2 p-1">
        <WithTooltip
          display={<div>Help Center</div>}
          trigger={
            <Link
              href="https://resources.rooftops.ai/apphelpcenter"
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-10 items-center justify-center rounded-[5px] transition-all hover:bg-gray-800/50"
            >
              <IconQuestionMark
                size={SIDEBAR_ICON_SIZE}
                className="text-gray-200"
              />
            </Link>
          }
        />
        <WithTooltip
          display={<div>Profile Settings</div>}
          trigger={<ProfileSettings />}
        />
      </div>
    </div>
  )
}
