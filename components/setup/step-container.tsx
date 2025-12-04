import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { IconFileText, IconMessageCircle } from "@tabler/icons-react"
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
      className="w-full max-w-[700px] border-zinc-800 bg-black px-4 shadow-xl sm:px-0"
      onKeyDown={handleKeyDown}
    >
      {showHeroSection && (
        <div className="bg-black px-4 py-12">
          <div className="mx-auto max-w-2xl">
            <h1 className="mb-3 text-center text-5xl font-bold tracking-tight text-white">
              Let&apos;s create your profile
            </h1>

            <p className="mb-10 text-center text-base text-zinc-400">
              AI tools built specifically for roofing professionals to save time
              and close more deals.
            </p>

            <div className="space-y-6 text-left">
              <div className="flex items-start gap-3">
                <div className="shrink-0">
                  <IconFileText
                    className="size-6 bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent"
                    strokeWidth={2}
                  />
                </div>
                <div>
                  <h3 className="mb-1 text-lg font-semibold text-white">
                    Instant Roof Reports
                  </h3>
                  <p className="text-sm text-zinc-400">
                    No more waiting days or hours for information your team
                    needs now.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="shrink-0">
                  <IconMessageCircle
                    className="size-6 bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent"
                    strokeWidth={2}
                  />
                </div>
                <div>
                  <h3 className="mb-1 text-lg font-semibold text-white">
                    AI Chat Tailored for Roofers
                  </h3>
                  <p className="text-sm text-zinc-400">
                    Refine strategy, analyze results, create documents.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <CardHeader className="bg-black px-4 pb-6 pt-8">
        <CardDescription className="text-base text-white">
          {stepDescription}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 bg-black px-4 pb-8">
        {children}
      </CardContent>

      <CardFooter className="bg-black px-4 py-6">
        <div className="w-full space-y-3">
          {showNextButton && (
            <Button
              ref={buttonRef}
              size="lg"
              onClick={() => onShouldProceed(true)}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold text-white shadow-lg shadow-cyan-500/30 hover:from-cyan-600 hover:to-blue-700"
            >
              Next
            </Button>
          )}
          {showBackButton && (
            <Button
              size="lg"
              variant="outline"
              onClick={() => onShouldProceed(false)}
              className="w-full border-zinc-700 text-zinc-400 hover:bg-zinc-900 hover:text-white"
            >
              Back
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
