"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useChatHandler } from "./chat-hooks/use-chat-handler"
import {
  IconMap,
  IconZoomScan,
  IconCalculator,
  IconClipboardCheck,
  IconMessageCircle,
  IconSettings,
  IconBolt
} from "@tabler/icons-react"

interface PromptCategory {
  id: string
  title: string
  description: string
  icon: React.ElementType
  prompts: string[]
}

const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    id: "analyze",
    title: "Analyze",
    description: "Roof analysis & issues",
    icon: IconZoomScan,
    prompts: [
      "Analyze this roof for potential issues and replacement needs",
      "Estimate material costs for a 2,500 sq ft asphalt shingle roof",
      "Compare metal vs. asphalt shingle roofing for durability and cost",
      "Identify storm damage indicators from property photos",
      "Calculate ROI on solar panel installation for this property"
    ]
  },
  {
    id: "estimate",
    title: "Estimate",
    description: "Cost & timeline estimates",
    icon: IconCalculator,
    prompts: [
      "Create a detailed roofing estimate for a residential property",
      "Calculate labor hours needed for a complete roof replacement",
      "Estimate timeline for a 3,000 sq ft commercial flat roof project",
      "Break down costs: materials, labor, permits, and disposal",
      "Generate a competitive bid for a multi-family property"
    ]
  },
  {
    id: "inspect",
    title: "Inspect",
    description: "Inspection checklists",
    icon: IconClipboardCheck,
    prompts: [
      "Create a comprehensive roof inspection checklist",
      "What are signs of hail damage I should document?",
      "Generate an inspection report template for insurance claims",
      "List safety protocols for steep-slope roof inspections",
      "Identify common problem areas in older homes"
    ]
  },
  {
    id: "customer",
    title: "Customer",
    description: "Client communications",
    icon: IconMessageCircle,
    prompts: [
      "Draft a follow-up email after a roofing consultation",
      "Explain the benefits of TPO roofing to a commercial client",
      "Create a proposal for preventive maintenance program",
      "Write a warranty explanation for homeowner peace of mind",
      "Handle objection: 'Your price is higher than competitors'"
    ]
  },
  {
    id: "operations",
    title: "Operations",
    description: "Scheduling & logistics",
    icon: IconSettings,
    prompts: [
      "Optimize crew scheduling for multiple projects this week",
      "Create a quality control checklist for project completion",
      "Develop a material ordering schedule to minimize waste",
      "Plan logistics for a 5-day commercial roofing project",
      "Generate a safety briefing for working in hot weather"
    ]
  },
  {
    id: "quick",
    title: "Quick Answer",
    description: "Fast roofing answers",
    icon: IconBolt,
    prompts: [
      "What's the average lifespan of different roofing materials?",
      "Best practices for ventilation in residential roofing",
      "How to properly flash a chimney to prevent leaks",
      "When should I recommend roof repair vs. replacement?",
      "Local building code requirements for roof pitch"
    ]
  }
]

export function QuickPrompts() {
  const router = useRouter()
  const params = useParams()
  const workspaceId = params.workspaceid as string
  const { handleSendMessage } = useChatHandler()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(selectedCategory === categoryId ? null : categoryId)
  }

  const handlePromptClick = (prompt: string) => {
    handleSendMessage(prompt, [], false)
    setSelectedCategory(null)
  }

  const handleExploreClick = () => {
    router.push(`/${workspaceId}/explore`)
  }

  return (
    <div className="mb-6 w-full">
      {/* Horizontal scrolling cards */}
      <div className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
        {/* Featured Property Report Card with map background */}
        <button
          onClick={handleExploreClick}
          className="w-[180px] flex-none snap-start"
        >
          <div className="relative flex h-[100px] flex-col items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white/60 p-4 text-left shadow-lg backdrop-blur-md transition-all hover:border-gray-300 hover:shadow-xl dark:border-gray-700 dark:bg-gray-800/80 dark:hover:border-gray-600">
            {/* Subtle map background */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-5 dark:opacity-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%233b82f6' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }}
            />

            <div className="relative z-10 flex items-center gap-3">
              <IconMap size={24} className="shrink-0 text-blue-500 dark:text-blue-400" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Property Reports</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Instant analysis</p>
              </div>
            </div>
          </div>
        </button>

        {/* Regular prompt cards */}
        {PROMPT_CATEGORIES.map((category) => {
          const Icon = category.icon
          return (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className="w-[180px] flex-none snap-start"
            >
              <div className={`flex h-[100px] flex-col items-center justify-center rounded-xl border p-4 text-left backdrop-blur-md transition-all ${
                selectedCategory === category.id
                  ? "border-gray-300 bg-white/80 shadow-lg dark:border-gray-600 dark:bg-gray-700/90"
                  : "border-gray-200 bg-white/50 shadow-md hover:border-gray-300 hover:bg-white/70 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800/70 dark:hover:border-gray-600 dark:hover:bg-gray-700/80"
              }`}>
                <div className="flex items-center gap-3">
                  <Icon size={24} className="shrink-0 text-blue-500 dark:text-blue-400" />
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{category.title}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{category.description}</p>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Scroll indicator on mobile */}
      <div className="text-muted-foreground mt-2 text-center text-xs sm:hidden">
        ← Scroll for more →
      </div>

      {/* Prompt suggestions dropdown */}
      {selectedCategory && (
        <div className="animate-in fade-in slide-in-from-top-2 mt-4 rounded-xl border border-gray-200 bg-white/70 p-4 shadow-2xl backdrop-blur-xl duration-200 dark:border-gray-700 dark:bg-gray-800/90">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {PROMPT_CATEGORIES.find((c) => c.id === selectedCategory)?.title} suggestions
            </h3>
            <button
              onClick={() => setSelectedCategory(null)}
              className="rounded p-1 text-gray-500 backdrop-blur-sm transition-all hover:bg-gray-200/50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-white"
            >
              <svg
                className="size-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="space-y-2">
            {PROMPT_CATEGORIES.find((c) => c.id === selectedCategory)?.prompts.map(
              (prompt, index) => (
                <button
                  key={index}
                  onClick={() => handlePromptClick(prompt)}
                  className="w-full rounded-md border border-gray-200 bg-white/50 px-4 py-3 text-left text-sm text-gray-700 shadow-sm backdrop-blur-sm transition-all hover:border-gray-300 hover:bg-white/80 hover:text-gray-900 hover:shadow-md dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-200 dark:hover:border-gray-500 dark:hover:bg-gray-600/70 dark:hover:text-white"
                >
                  {prompt}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
