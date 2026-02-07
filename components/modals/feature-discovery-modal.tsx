"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useChatbotUI } from "@/context/context"
import Link from "next/link"

interface FeatureStep {
  icon: string
  title: string
  description: string
  isPremium?: boolean
}

interface FeatureDiscoveryModalProps {
  featureKey: string // unique key for localStorage tracking
  title: string
  subtitle: string
  steps: FeatureStep[]
  ctaText?: string
  ctaAction?: () => void
  premiumCtaText?: string
}

const STORAGE_PREFIX = "feature_discovered_"

export function FeatureDiscoveryModal({
  featureKey,
  title,
  subtitle,
  steps,
  ctaText = "Got it, let's go!",
  ctaAction,
  premiumCtaText = "Start 3-Day Free Trial"
}: FeatureDiscoveryModalProps) {
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const { userSubscription } = useChatbotUI()

  const isFreeUser =
    !userSubscription ||
    userSubscription.plan_type === "free" ||
    (!userSubscription.plan_type && !userSubscription.tier)

  useEffect(() => {
    const hasSeen = localStorage.getItem(STORAGE_PREFIX + featureKey)
    if (!hasSeen) {
      // Small delay so the page renders first
      const timer = setTimeout(() => setOpen(true), 800)
      return () => clearTimeout(timer)
    }
  }, [featureKey])

  const handleClose = () => {
    setOpen(false)
    localStorage.setItem(STORAGE_PREFIX + featureKey, "true")
    if (ctaAction) ctaAction()
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleClose()
    }
  }

  const hasPremiumFeatures = steps.some(s => s.isPremium)

  return (
    <Dialog open={open} onOpenChange={val => { if (!val) handleClose() }}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        <DialogTitle className="sr-only">{title}</DialogTitle>

        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-cyan-500 via-cyan-600 to-green-500 px-8 pb-6 pt-8 text-white">
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="mt-2 text-sm text-cyan-100">{subtitle}</p>
        </div>

        {/* Steps */}
        <div className="px-8 py-6">
          {/* Progress dots */}
          {steps.length > 1 && (
            <div className="mb-6 flex justify-center gap-2">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === currentStep
                      ? "w-8 bg-cyan-500"
                      : "w-2 bg-gray-200 hover:bg-gray-300"
                  }`}
                  aria-label={`Step ${i + 1}`}
                />
              ))}
            </div>
          )}

          {/* Current step content */}
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-50 to-green-50 text-4xl">
              {steps[currentStep].icon}
            </div>
            <h3 className="mb-2 text-lg font-bold text-gray-900">
              {steps[currentStep].title}
              {steps[currentStep].isPremium && (
                <span className="ml-2 rounded-full bg-gradient-to-r from-amber-200 to-amber-300 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                  Pro
                </span>
              )}
            </h3>
            <p className="text-sm leading-relaxed text-gray-600">
              {steps[currentStep].description}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-8 py-4">
          <div className="flex items-center justify-between gap-3">
            {steps.length > 1 && currentStep < steps.length - 1 ? (
              <>
                <button
                  onClick={handleClose}
                  className="text-sm text-gray-500 transition-colors hover:text-gray-700"
                >
                  Skip tour
                </button>
                <Button
                  onClick={handleNext}
                  className="bg-gradient-to-r from-cyan-500 to-green-500 text-white hover:from-cyan-600 hover:to-green-600"
                >
                  Next
                </Button>
              </>
            ) : (
              <>
                {isFreeUser && hasPremiumFeatures ? (
                  <div className="flex w-full flex-col gap-2 sm:flex-row">
                    <Button
                      onClick={handleClose}
                      variant="outline"
                      className="flex-1"
                    >
                      {ctaText}
                    </Button>
                    <Link href="/pricing" className="flex-1" onClick={handleClose}>
                      <Button className="w-full bg-gradient-to-r from-cyan-500 to-green-500 text-white hover:from-cyan-600 hover:to-green-600">
                        {premiumCtaText}
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <Button
                    onClick={handleClose}
                    className="w-full bg-gradient-to-r from-cyan-500 to-green-500 text-white hover:from-cyan-600 hover:to-green-600"
                  >
                    {ctaText}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
