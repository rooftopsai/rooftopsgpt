"use client"

import { FC, useState } from "react"
import { Button } from "@/components/ui/button"
import { IconInfoCircle, IconX } from "@tabler/icons-react"

interface CancellationNoticeBannerProps {
  tier: string
  endDate: string
  onReactivate: () => void
}

export const CancellationNoticeBanner: FC<CancellationNoticeBannerProps> = ({
  tier,
  endDate,
  onReactivate
}) => {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const formattedDate = new Date(endDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  })

  return (
    <div className="border-b border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-900/20">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <IconInfoCircle className="size-5 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-100">
              Subscription Ending
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Your {tier} plan is active until {formattedDate}. You can
              reactivate anytime before then.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={onReactivate}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Reactivate Subscription
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="rounded p-1 hover:bg-blue-100 dark:hover:bg-blue-900/40"
            aria-label="Dismiss"
          >
            <IconX className="size-5 text-blue-600 dark:text-blue-400" />
          </button>
        </div>
      </div>
    </div>
  )
}
