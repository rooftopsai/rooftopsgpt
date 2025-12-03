// @ts-nocheck
"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import ExploreMap from "@/components/explore/ExploreMap"
import { PropertyData } from "@/lib/property/property-service"
import { useChatbotUI } from "@/context/context"
import { Button } from "@/components/ui/button"
import { IconMenu2, IconSparkles, IconCrown } from "@tabler/icons-react"
import Link from "next/link"

export default function ExplorePage() {
  const params = useParams()
  const workspaceId = params.workspaceid as string
  const [propertyData, setPropertyData] = useState<PropertyData | null>(null)
  const { userSubscription, showSidebar, setShowSidebar } = useChatbotUI()

  const handlePropertySelect = (data: any) => {
    setPropertyData(data.propertyData)
  }

  const isPremium = userSubscription?.status === "active"

  return (
    <div className="flex size-full flex-col">
      {/* Mobile Header - only show on mobile */}
      <div className="flex items-center justify-between px-4 py-3 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSidebar(!showSidebar)}
          className="size-9"
        >
          <IconMenu2 size={20} />
        </Button>

        <img
          src="https://uploads-ssl.webflow.com/64e9150f53771ac56ef528b7/64ee16bb300d3e08d25a03ac_rooftops-logo-gr-black.png"
          alt="Rooftops AI"
          className="h-7 w-auto dark:invert"
        />

        {isPremium ? (
          <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500">
            <IconCrown size={18} className="text-white" />
          </div>
        ) : (
          <Link href={`/${params.locale}/${workspaceId}/upgrade`}>
            <Button variant="default" size="sm" className="h-9">
              <IconSparkles size={16} className="mr-1" />
              Upgrade
            </Button>
          </Link>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <ExploreMap
          onPropertySelect={handlePropertySelect}
          workspaceId={workspaceId}
        />
      </div>
    </div>
  )
}
