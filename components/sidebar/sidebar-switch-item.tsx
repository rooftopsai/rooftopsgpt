import { ContentType } from "@/types"
import { FC } from "react"
import { TabsTrigger } from "../ui/tabs"
import { WithTooltip } from "../ui/with-tooltip"

interface SidebarSwitchItemProps {
  contentType: ContentType
  icon: React.ReactNode
  onContentTypeChange: (contentType: ContentType) => void
}

export const SidebarSwitchItem: FC<SidebarSwitchItemProps> = ({
  contentType,
  icon,
  onContentTypeChange
}) => {
  return (
    <WithTooltip
      display={
        <div>{contentType[0].toUpperCase() + contentType.substring(1)}</div>
      }
      trigger={
        <TabsTrigger
          className="size-10 rounded-[5px] transition-all hover:bg-blue-500/5 data-[state=active]:border data-[state=active]:border-blue-500/20 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500/15 data-[state=active]:to-purple-500/15 data-[state=active]:backdrop-blur-md dark:hover:bg-blue-400/10 dark:data-[state=active]:border-blue-400/25 dark:data-[state=active]:from-blue-400/20 dark:data-[state=active]:to-purple-400/20"
          value={contentType}
          onClick={() => onContentTypeChange(contentType as ContentType)}
        >
          <div className="text-muted-foreground data-[state=active]:text-foreground">
            {icon}
          </div>
        </TabsTrigger>
      }
    />
  )
}
