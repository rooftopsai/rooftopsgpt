import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import {
  IconSparkles,
  IconClock,
  IconCurrencyDollar,
  IconChartBar
} from "@tabler/icons-react"
import { FC, useRef } from "react"

export const SETUP_STEP_COUNT = 2

interface StepContainerProps {
  stepDescription: string
  stepNum: number
  stepTitle: string
  onShouldProceed: (shouldProceed: boolean) => void
  children?: React.ReactNode
  showBackButton?: boolean
  showNextButton?: boolean
}

export const StepContainer: FC<StepContainerProps> = ({
  stepDescription,
  stepNum,
  stepTitle,
  onShouldProceed,
  children,
  showBackButton = false,
  showNextButton = true
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (buttonRef.current) {
        buttonRef.current.click()
      }
    }
  }

  // Only show hero section on first step
  const showHeroSection = stepNum === 1

  return (
    <Card
      className="max-h-[calc(100vh-60px)] w-full max-w-[700px] overflow-auto px-4 sm:px-0"
      onKeyDown={handleKeyDown}
    >
      {showHeroSection && (
        <div className="border-b bg-white px-8 py-12 dark:bg-zinc-950">
          <div className="mx-auto max-w-3xl">
            <h1 className="mb-3 text-center text-5xl font-bold tracking-tight">
              Welcome to the{" "}
              <span className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
                Future of Roofing
              </span>
            </h1>

            <p className="mb-10 text-center text-xl text-zinc-600 dark:text-zinc-400">
              We&apos;re bringing AI to your service business so you can
              skyrocket efficiency and profits and reach{" "}
              <span className="font-semibold italic">every rooftop</span> with
              AI tailored for your business.
            </p>

            <div className="mb-12 grid gap-6 sm:grid-cols-3">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30">
                  <IconClock className="size-8 text-white" strokeWidth={2} />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Save Time</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Instant property analysis and estimates in seconds
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30">
                  <IconCurrencyDollar
                    className="size-8 text-white"
                    strokeWidth={2}
                  />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Cut Costs</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Reduce site visits and manual measurements
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30">
                  <IconChartBar className="size-8 text-white" strokeWidth={2} />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Win More</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Professional reports that close deals faster
                </p>
              </div>
            </div>

            <p className="text-center text-sm text-zinc-500 dark:text-zinc-500">
              No Credit Card Required
            </p>
          </div>
        </div>
      )}

      <CardHeader className="px-8 pb-6 pt-8">
        <div className="mb-2 flex items-center justify-between">
          <CardTitle className="text-2xl font-bold">{stepTitle}</CardTitle>
          <span className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-1 text-xs font-semibold text-white">
            {stepNum} / {SETUP_STEP_COUNT}
          </span>
        </div>
        <CardDescription className="text-base text-zinc-600 dark:text-zinc-400">
          {stepDescription}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 px-8 pb-8">{children}</CardContent>

      <CardFooter className="flex justify-between border-t bg-zinc-50 px-8 py-6 dark:bg-zinc-900/50">
        <div>
          {showBackButton && (
            <Button
              size="lg"
              variant="outline"
              onClick={() => onShouldProceed(false)}
              className="border-zinc-300 dark:border-zinc-700"
            >
              Back
            </Button>
          )}
        </div>

        <div>
          {showNextButton && (
            <Button
              ref={buttonRef}
              size="lg"
              onClick={() => onShouldProceed(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold text-white shadow-lg shadow-cyan-500/30 hover:from-cyan-600 hover:to-blue-700"
            >
              Next
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
