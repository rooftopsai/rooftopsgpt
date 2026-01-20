import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Brand } from "@/components/ui/brand"
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
      className="w-full overflow-hidden border-none bg-black shadow-none"
      onKeyDown={handleKeyDown}
    >
      {showHeroSection && (
        <div className="bg-black px-4 pb-2 pt-8 sm:px-6">
          <div className="mx-auto max-w-2xl">
            {/* Logo */}
            <div className="mb-6">
              <Brand theme="light" />
            </div>

            {/* Main Heading */}
            <h1 className="mb-8 text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Welcome to the future of roofing
            </h1>

            {/* Features */}
            <div className="mx-auto mb-8 max-w-md space-y-5 text-left">
              <div className="flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-600">
                  <IconFileText
                    className="size-6 text-white"
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

              <div className="flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-600">
                  <IconMessageCircle
                    className="size-6 text-white"
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

            {/* Form Section Heading */}
            <h2 className="mb-2 text-center text-xl font-semibold text-white sm:text-2xl">
              Let&apos;s create your profile
            </h2>
          </div>
        </div>
      )}

      <CardContent className="bg-black px-4 pb-6 sm:px-6">
        <div className="mx-auto max-w-[28rem] space-y-4">{children}</div>
      </CardContent>

      <CardFooter className="bg-black px-4 pb-6 pt-4 sm:px-6">
        <div className="mx-auto w-full max-w-[28rem] space-y-3">
          <Button
            ref={buttonRef}
            size="lg"
            onClick={() => onShouldProceed(true)}
            disabled={!showNextButton}
            className="w-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold text-white shadow-lg shadow-cyan-500/30 hover:from-cyan-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </Button>
          {showBackButton && (
            <Button
              size="lg"
              variant="outline"
              onClick={() => onShouldProceed(false)}
              className="w-full rounded-full border-zinc-700 text-zinc-400 hover:bg-zinc-900 hover:text-white"
            >
              Back
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
