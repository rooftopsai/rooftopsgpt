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
import ErrorBoundary from "@/components/utility/error-boundary"

export default function ExplorePage() {
  const params = useParams()
  const workspaceId = params.workspaceid as string
  const [propertyData, setPropertyData] = useState<PropertyData | null>(null)
  const {
    userSubscription,
    showSidebar,
    setShowSidebar,
    hasActiveExploreReport
  } = useChatbotUI()

  const handlePropertySelect = (data: any) => {
    setPropertyData(data.propertyData)
  }

  // Check for premium or business subscription
  const isPremiumOrBusiness =
    (userSubscription?.plan_type === "premium" ||
      userSubscription?.plan_type === "business" ||
      userSubscription?.plan_type === "premium_monthly" ||
      userSubscription?.plan_type === "premium_annual" ||
      userSubscription?.plan_type === "business_monthly" ||
      userSubscription?.plan_type === "business_annual") &&
    (userSubscription?.status === "active" ||
      userSubscription?.status === "trialing")

  return (
    <ErrorBoundary>
      <div className="flex size-full flex-col">
        {/* Mobile Header - only show on mobile and when no report is active */}
        {!hasActiveExploreReport && (
          <div className="flex items-center justify-between px-4 py-3 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebar(!showSidebar)}
              className="size-9"
            >
              <IconMenu2 size={20} />
            </Button>

            <div className="flex items-center gap-2">
              <img
                src="https://uploads-ssl.webflow.com/64e9150f53771ac56ef528b7/64ee16bb300d3e08d25a03ac_rooftops-logo-gr-black.png"
                alt="Rooftops AI"
                className="h-7 w-auto dark:invert"
              />
              {isPremiumOrBusiness && (
                <span className="rounded-full bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 shadow-sm">
                  Pro
                </span>
              )}
            </div>

            {isPremiumOrBusiness ? (
              <div className="size-9" /> // Empty spacer to maintain layout
            ) : (
              <Link href={`/${params.locale}/${workspaceId}/upgrade`}>
                <Button variant="default" size="sm" className="h-9">
                  <IconSparkles size={16} className="mr-1" />
                  Upgrade
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="relative flex-1 overflow-auto">
          <ExploreMap
            onPropertySelect={handlePropertySelect}
            workspaceId={workspaceId}
          />
        </div>
      </div>
    </ErrorBoundary>
  )
}
