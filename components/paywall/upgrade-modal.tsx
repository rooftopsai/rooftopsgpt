"use client"

import { FC } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  currentPlan?: string
  currentUsage?: number
  limit?: number
  featureName?: string
}

export const UpgradeModal: FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  currentPlan = "free",
  currentUsage = 0,
  limit = 20,
  featureName = "chat messages"
}) => {
  const router = useRouter()

  const handleUpgrade = (plan: string) => {
    router.push(`/pricing?plan=${plan}`)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Upgrade Your Plan</DialogTitle>
          <DialogDescription className="text-base">
            You've reached your {featureName} limit ({currentUsage}/{limit} this month).
            Upgrade to continue using Rooftops AI.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          {/* Pro Plan */}
          <div className="hover:border-primary rounded-lg border p-6 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold">Pro Plan</h3>
                <p className="mt-2 text-3xl font-bold">
                  $29<span className="text-muted-foreground text-base font-normal">/month</span>
                </p>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-5 text-green-500" />
                <span>1,000 chat messages per month</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-5 text-green-500" />
                <span>20 property reports per month</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-5 text-green-500" />
                <span>Unlimited weather lookups</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-5 text-green-500" />
                <span>50 document generations per month</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-5 text-green-500" />
                <span>Priority support</span>
              </li>
            </ul>

            <Button
              className="mt-4 w-full"
              onClick={() => handleUpgrade("pro")}
            >
              Upgrade to Pro
            </Button>
          </div>

          {/* Team Plan */}
          <div className="border-primary relative rounded-lg border-2 p-6">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs font-semibold">
                MOST POPULAR
              </span>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold">Team Plan</h3>
                <p className="mt-2 text-3xl font-bold">
                  $99<span className="text-muted-foreground text-base font-normal">/month</span>
                </p>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-5 text-green-500" />
                <span>5,000 chat messages per month</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-5 text-green-500" />
                <span>100 property reports per month</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-5 text-green-500" />
                <span>Unlimited weather lookups</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-5 text-green-500" />
                <span>Unlimited document generations</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-5 text-green-500" />
                <span>Dedicated support</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-5 text-green-500" />
                <span>Team collaboration tools</span>
              </li>
            </ul>

            <Button
              className="mt-4 w-full"
              onClick={() => handleUpgrade("team")}
            >
              Upgrade to Team
            </Button>
          </div>
        </div>

        <div className="text-muted-foreground mt-4 text-center text-sm">
          <Button variant="ghost" onClick={onClose}>
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
