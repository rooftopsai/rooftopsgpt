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
        <div className="border-b bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 px-8 py-10 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-indigo-950/20">
          <div className="mb-6 flex items-center justify-center">
            <IconSparkles className="mr-2 size-8 text-blue-600 dark:text-blue-400" />
          </div>

          <h1 className="mb-4 text-center text-3xl font-bold">
            Welcome to the Future of Roofing
          </h1>

          <p className="text-muted-foreground mb-8 text-center text-lg">
            You&apos;re about to experience AI-powered tools designed
            specifically for roofing professionals. Save time, reduce costs, and
            win more jobs.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col items-center rounded-lg bg-white/60 p-4 text-center backdrop-blur-sm dark:bg-black/20">
              <IconClock className="mb-2 size-6 text-blue-600 dark:text-blue-400" />
              <h3 className="mb-1 font-semibold">Save Time</h3>
              <p className="text-muted-foreground text-sm">
                Instant property analysis and estimates
              </p>
            </div>

            <div className="flex flex-col items-center rounded-lg bg-white/60 p-4 text-center backdrop-blur-sm dark:bg-black/20">
              <IconCurrencyDollar className="mb-2 size-6 text-blue-600 dark:text-blue-400" />
              <h3 className="mb-1 font-semibold">Cut Costs</h3>
              <p className="text-muted-foreground text-sm">
                Reduce site visits and manual measurements
              </p>
            </div>

            <div className="flex flex-col items-center rounded-lg bg-white/60 p-4 text-center backdrop-blur-sm dark:bg-black/20">
              <IconChartBar className="mb-2 size-6 text-blue-600 dark:text-blue-400" />
              <h3 className="mb-1 font-semibold">Win More</h3>
              <p className="text-muted-foreground text-sm">
                Professional reports that close deals faster
              </p>
            </div>
          </div>
        </div>
      )}

      <CardHeader>
        <CardTitle className="flex justify-between">
          <div>{stepTitle}</div>

          <div className="text-sm">
            {stepNum} / {SETUP_STEP_COUNT}
          </div>
        </CardTitle>

        <CardDescription>{stepDescription}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">{children}</CardContent>

      <CardFooter className="flex justify-between">
        <div>
          {showBackButton && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onShouldProceed(false)}
            >
              Back
            </Button>
          )}
        </div>

        <div>
          {showNextButton && (
            <Button
              ref={buttonRef}
              size="sm"
              onClick={() => onShouldProceed(true)}
            >
              Next
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
