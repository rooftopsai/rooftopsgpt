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
    <div className="w-full mb-6">
      {/* Horizontal scrolling cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 px-1 snap-x snap-mandatory scrollbar-hide">
        {/* Featured Property Report Card with map background */}
        <button
          onClick={handleExploreClick}
          className="flex-none w-[180px] snap-start"
        >
          <div className="h-[100px] rounded-xl border backdrop-blur-md p-4 flex flex-col justify-center items-center transition-all shadow-lg hover:shadow-xl text-left relative overflow-hidden bg-white/60 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600">
            {/* Subtle map background */}
            <div
              className="absolute inset-0 opacity-5 dark:opacity-10 bg-cover bg-center"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%233b82f6' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }}
            />

            <div className="relative z-10 flex items-center gap-3">
              <IconMap size={24} className="text-blue-500 dark:text-blue-400 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Property Reports</h3>
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
              className="flex-none w-[180px] snap-start"
            >
              <div className={`h-[100px] rounded-xl backdrop-blur-md p-4 flex flex-col justify-center items-center transition-all text-left border ${
                selectedCategory === category.id
                  ? "bg-white/80 dark:bg-gray-700/90 border-gray-300 dark:border-gray-600 shadow-lg"
                  : "bg-white/50 dark:bg-gray-800/70 border-gray-200 dark:border-gray-700 hover:bg-white/70 dark:hover:bg-gray-700/80 hover:border-gray-300 dark:hover:border-gray-600 shadow-md hover:shadow-lg"
              }`}>
                <div className="flex items-center gap-3">
                  <Icon size={24} className="text-blue-500 dark:text-blue-400 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{category.title}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{category.description}</p>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Scroll indicator on mobile */}
      <div className="text-center mt-2 text-xs text-muted-foreground sm:hidden">
        ← Scroll for more →
      </div>

      {/* Prompt suggestions dropdown */}
      {selectedCategory && (
        <div className="mt-4 bg-white/70 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {PROMPT_CATEGORIES.find((c) => c.id === selectedCategory)?.title} suggestions
            </h3>
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1 rounded hover:bg-gray-200/50 dark:hover:bg-gray-700/50 backdrop-blur-sm transition-all"
            >
              <svg
                className="h-4 w-4"
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
                  className="w-full text-left px-4 py-3 rounded-md backdrop-blur-sm bg-white/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 hover:bg-white/80 dark:hover:bg-gray-600/70 hover:border-gray-300 dark:hover:border-gray-500 transition-all text-sm text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white shadow-sm hover:shadow-md"
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
