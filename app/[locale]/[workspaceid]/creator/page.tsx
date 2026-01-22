// app/[locale]/[workspaceid]/creator/page.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useChatbotUI } from "@/context/context"
import { UpgradeModal } from "@/components/modals/upgrade-modal"
import { EmptyStateAgentsLocked } from "@/components/empty-states/empty-state-agents-locked"
import { FeaturedAgentHero } from "@/components/creator/FeaturedAgentHero"
import { IconChevronRight } from "@tabler/icons-react"

const agents = [
  {
    id: "marcus",
    name: "Marcus",
    title: "Sales Specialist",
    avatar: "/agents/marcus.svg",
    gradient: "from-blue-600 to-indigo-600",
    description:
      "Expert in lead follow-ups, proposal writing, and closing deals. Handles objections and creates compelling sales communications.",
    categories: ["Sales", "Lead Generation", "Proposals"]
  },
  {
    id: "elena",
    name: "Elena",
    title: "Estimating Expert",
    avatar: "/agents/elena.svg",
    gradient: "from-purple-600 to-violet-600",
    description:
      "Specializes in precise material calculations, labor estimates, and competitive bid preparation for roofing projects.",
    categories: ["Estimating", "Bidding", "Materials"]
  },
  {
    id: "jordan",
    name: "Jordan",
    title: "Project Coordinator",
    avatar: "/agents/jordan.svg",
    gradient: "from-orange-600 to-amber-600",
    description:
      "Creates project schedules, coordinates crews, and manages customer communications throughout the roofing project lifecycle.",
    categories: ["Project Management", "Scheduling", "Coordination"]
  },
  {
    id: "sophia",
    name: "Sophia",
    title: "Customer Service Representative",
    avatar: "/agents/sophia.svg",
    gradient: "from-green-600 to-emerald-600",
    description:
      "Handles customer inquiries, resolves complaints, and delivers exceptional service with empathy and professionalism.",
    categories: ["Customer Service", "Support", "Communication"]
  },
  {
    id: "ryan",
    name: "Ryan",
    title: "Insurance Claims Specialist",
    avatar: "/agents/ryan.svg",
    gradient: "from-red-600 to-rose-600",
    description:
      "Expert in insurance claim documentation, supplement requests, and maximizing claim approvals for storm damage repairs.",
    categories: ["Insurance", "Claims", "Documentation"]
  },
  {
    id: "aisha",
    name: "Aisha",
    title: "Marketing Manager",
    avatar: "/agents/aisha.svg",
    gradient: "from-pink-600 to-fuchsia-600",
    description:
      "Creates engaging marketing content including social media posts, blog articles, review responses, and brand messaging.",
    categories: ["Marketing", "Social Media", "Content"]
  },
  {
    id: "derek",
    name: "Derek",
    title: "Safety & Compliance Officer",
    avatar: "/agents/derek.svg",
    gradient: "from-yellow-500 to-orange-500",
    description:
      "Develops safety checklists, OSHA compliance documentation, incident reports, and training materials for roofing operations.",
    categories: ["Safety", "Compliance", "Training"]
  },
  {
    id: "nina",
    name: "Nina",
    title: "Business Manager",
    avatar: "/agents/nina.svg",
    gradient: "from-gray-600 to-slate-600",
    description:
      "Creates professional business documents including contracts, invoices, collection letters, and financial reports.",
    categories: ["Business", "Legal", "Finance"]
  }
]

export default function CreatorStudioPage() {
  // 1) grab params
  const { locale, workspaceid: workspaceId } = useParams() as {
    locale: string
    workspaceid: string
  }

  // 2) track the search term and selected categories
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Get user subscription to check tier
  const { userSubscription } = useChatbotUI()
  const userTier =
    userSubscription?.tier || userSubscription?.plan_type || "free"

  // Comprehensive check for premium/business access (including monthly/annual variants)
  const hasAgentAccess =
    (userTier === "premium" ||
      userTier === "business" ||
      userTier === "premium_monthly" ||
      userTier === "premium_annual" ||
      userTier === "business_monthly" ||
      userTier === "business_annual") &&
    (userSubscription?.status === "active" ||
      userSubscription?.status === "trialing")

  // 3) extract all unique categories
  const allCategories = Array.from(
    new Set(agents.flatMap(agent => agent.categories))
  ).sort()

  // 4) derive a filtered list
  const filtered = agents.filter(agent => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      agent.name.toLowerCase().includes(term) ||
      agent.title.toLowerCase().includes(term) ||
      agent.description.toLowerCase().includes(term) ||
      agent.categories.some(cat => cat.toLowerCase().includes(term))

    const matchesCategory =
      selectedCategories.length === 0 ||
      agent.categories.some(cat => selectedCategories.includes(cat))

    return matchesSearch && matchesCategory
  })

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedCategories([])
  }

  // 5) select featured agents for hero rotator
  const featuredAgents = [
    agents.find(a => a.id === "marcus"),
    agents.find(a => a.id === "ryan"),
    agents.find(a => a.id === "elena")
  ].filter(Boolean) as typeof agents

  return (
    <div className="mx-auto max-w-7xl p-8">
      {/* Featured Agent Hero Rotator */}
      {hasAgentAccess && <FeaturedAgentHero featuredAgents={featuredAgents} />}

      {/* Show empty state for free users */}
      {!hasAgentAccess ? (
        <EmptyStateAgentsLocked />
      ) : (
        <div className="mx-auto max-w-4xl">
          {/* Search bar */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search agents…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:ring-primary/20 focus:border-primary w-full rounded-xl border py-3 pl-4 pr-12 transition-all duration-200 focus:outline-none focus:ring-2"
              />
              <svg
                className="text-muted-foreground absolute right-4 top-3.5 size-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Category Filters */}
          <div className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter by:
              </span>
              {(searchTerm || selectedCategories.length > 0) && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {allCategories.map(category => {
                const isSelected = selectedCategories.includes(category)
                return (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-150 ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-md hover:bg-blue-700"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    }`}
                  >
                    {category}
                  </button>
                )
              })}
            </div>
          </div>

          {/* All Agents - List View */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              All Agents
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filtered.length} {filtered.length === 1 ? "agent" : "agents"}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="mb-4 text-gray-500 dark:text-gray-400">
                No agents found matching your filters.
              </p>
              <button
                onClick={clearFilters}
                className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {filtered.map(agent => (
                <Link
                  key={agent.id}
                  href={`/${locale}/${workspaceId}/creator/${agent.id}`}
                  className="group block"
                >
                  <div className="flex items-center gap-4 rounded-lg p-4 transition-all duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    {/* Avatar */}
                    <img
                      src={(agent as any).avatar || (agent as any).avatarUrl}
                      alt={agent.name}
                      className="size-12 shrink-0 rounded-full"
                    />

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {agent.name}
                      </h3>
                      <p className="truncate text-sm text-gray-600 dark:text-gray-400">
                        {agent.title}
                      </p>
                    </div>

                    {/* Badge */}
                    <span className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                      Premium
                    </span>

                    {/* Arrow */}
                    <IconChevronRight
                      className="shrink-0 text-gray-400 transition-colors group-hover:text-gray-600 dark:group-hover:text-gray-300"
                      size={20}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        reason="agent_access"
      />
    </div>
  )
}
