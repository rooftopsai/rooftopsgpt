"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { IconRobot, IconCrown, IconCheck } from "@tabler/icons-react"

export function AgentUpgradePrompt() {
  return (
    <div className="flex h-full items-center justify-center bg-gray-950 p-8">
      <div className="max-w-lg text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600">
          <IconRobot className="size-10 text-white" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white">
          Rooftops AI Agent
        </h1>
        <p className="mt-3 text-gray-400">
          Your intelligent assistant for roofing business automation
        </p>

        {/* Features */}
        <div className="mt-8 space-y-3 text-left">
          <FeatureItem>
            Research material costs and availability in real-time
          </FeatureItem>
          <FeatureItem>
            Generate reports and send them to your team
          </FeatureItem>
          <FeatureItem>
            Manage customer communications and follow-ups
          </FeatureItem>
          <FeatureItem>
            Check weather forecasts for job scheduling
          </FeatureItem>
          <FeatureItem>
            Execute complex multi-step business tasks
          </FeatureItem>
        </div>

        {/* CTA */}
        <div className="mt-8">
          <Link href="/pricing">
            <Button className="h-12 px-8 text-lg bg-gradient-to-r from-[#ffd700] via-[#ffb700] to-[#ff8c00] font-semibold text-white hover:from-[#ffb700] hover:via-[#ff8c00] hover:to-[#ffd700]">
              <IconCrown className="mr-2 size-5" fill="currentColor" stroke={0} />
              Upgrade to Premium
            </Button>
          </Link>
          <p className="mt-3 text-sm text-gray-500">
            AI Agent is included in Premium and Business plans
          </p>
        </div>

        {/* Stats */}
        <div className="mt-10 grid grid-cols-3 gap-4 border-t border-gray-800 pt-8">
          <StatItem value="10x" label="Faster research" />
          <StatItem value="24/7" label="Always available" />
          <StatItem value="100+" label="Tools available" />
        </div>
      </div>
    </div>
  )
}

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green-500/20">
        <IconCheck className="size-4 text-green-400" />
      </div>
      <span className="text-gray-300">{children}</span>
    </div>
  )
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  )
}
