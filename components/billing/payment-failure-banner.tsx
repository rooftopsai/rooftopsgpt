"use client"

import { FC, useState } from "react"
import { Button } from "@/components/ui/button"
import { IconAlertCircle, IconX } from "@tabler/icons-react"
import { toast } from "sonner"

interface PaymentFailureBannerProps {
  daysRemaining: number
  onUpdatePayment: () => void
}

export const PaymentFailureBanner: FC<PaymentFailureBannerProps> = ({
  daysRemaining,
  onUpdatePayment
}) => {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="border-b border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <IconAlertCircle className="size-5 text-red-600 dark:text-red-400" />
          <div>
            <p className="font-medium text-red-900 dark:text-red-100">
              Payment Failed
            </p>
            <p className="text-sm text-red-700 dark:text-red-300">
              {daysRemaining > 0
                ? `Update your payment method within ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} to keep your subscription active.`
                : "Your subscription has been downgraded to free tier. Update payment to restore access."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={onUpdatePayment}
            size="sm"
            className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
          >
            Update Payment Method
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="rounded p-1 hover:bg-red-100 dark:hover:bg-red-900/40"
            aria-label="Dismiss"
          >
            <IconX className="size-5 text-red-600 dark:text-red-400" />
          </button>
        </div>
      </div>
    </div>
  )
}
