"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import Image from "next/image"
import {
  IconPlus,
  IconWorld,
  IconArrowUp,
  IconMap,
  IconMaximize,
  IconCalculator,
  IconFileText,
  IconMessageCircle,
  IconHome,
  IconClock,
  IconCash,
  IconTargetArrow,
  IconTrendingUp,
  IconStar,
  IconQuote,
  IconChevronLeft,
  IconChevronRight,
  IconRobot,
  IconFileAnalytics,
  IconSend,
  IconUserBolt,
  IconSparkles,
  IconBrandInstagram,
  IconMail,
  IconCheck,
  IconRocket
} from "@tabler/icons-react"
import { createClient } from "@/lib/supabase/client"

// Testimonials data for social proof
const testimonials = [
  {
    quote:
      "Rooftops AI cut my estimate time from 2 hours to 10 minutes. I'm closing 40% more jobs because I can respond faster.",
    name: "Mike Rodriguez",
    company: "Rodriguez Roofing",
    location: "Dallas, TX",
    metric: "+40% close rate"
  },
  {
    quote:
      "The satellite roof reports are incredibly accurate. My crew trusts the measurements and we rarely have material overruns now.",
    name: "Sarah Chen",
    company: "Summit Roofing Co",
    location: "Denver, CO",
    metric: "15% material savings"
  },
  {
    quote:
      "I used to spend Sundays doing paperwork. Now the AI handles my proposals and follow-ups. Got my weekends back.",
    name: "James Wilson",
    company: "Wilson & Sons Roofing",
    location: "Atlanta, GA",
    metric: "+12 hrs/week saved"
  }
]

export default function LandingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"chat" | "report">("chat")
  const [inputValue, setInputValue] = useState("")
  const [currentTestimonial, setCurrentTestimonial] = useState(0)

  useEffect(() => {
    // If there's a code parameter (from email verification), redirect to auth callback
    const code = searchParams.get("code")
    if (code) {
      router.push(`/auth/callback?code=${code}`)
      return
    }

    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (session) {
        // Check if user has completed onboarding
        const { data: profile } = await supabase
          .from("profiles")
          .select("has_onboarded")
          .eq("user_id", session.user.id)
          .single()

        // If user hasn't onboarded, send them to setup
        if (!profile || !profile.has_onboarded) {
          router.push("/setup")
          return
        }

        const { data: homeWorkspace } = await supabase
          .from("workspaces")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("is_home", true)
          .single()

        if (homeWorkspace) {
          router.push(`/${homeWorkspace.id}/chat`)
        }
      } else {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router, searchParams])

  const handleRedirectToLogin = () => {
    router.push("/login")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    router.push("/login")
  }

  if (isLoading) {
    return (
      <div className="flex min-h-full w-full items-center justify-center bg-[#FAFAFA]">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 animate-spin rounded-full border-4 border-gray-300 border-t-[#24BDEB]"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-full w-full flex-col bg-[#FAFAFA]">
      {/* Header - Full width edge-to-edge */}
      <header className="sticky top-0 z-50 flex w-full items-center justify-between bg-[#FAFAFA] px-4 py-3 md:px-6">
        <div
          className="flex shrink-0 cursor-pointer items-center"
          onClick={handleRedirectToLogin}
        >
          <Image
            src="/rooftops-logo-gr-black.png"
            alt="Rooftops AI"
            width={160}
            height={40}
            className="h-7 w-auto object-contain sm:h-8 md:h-9"
            priority
          />
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <button
            onClick={handleRedirectToLogin}
            className="px-2 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 sm:px-3"
          >
            Sign In
          </button>
          <button
            onClick={handleRedirectToLogin}
            className="rounded-lg bg-[#1A1A1A] px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-black sm:px-4 sm:py-2"
          >
            Sign Up
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center px-4 pb-12 pt-6 sm:pt-10 md:px-6 md:pt-16 lg:pt-20">
        <div className="relative z-10 w-full max-w-5xl">
          {/* Hero Heading with Shimmer Effect */}
          <div className="mb-6 text-center sm:mb-10 md:mb-14">
            <h1 className="animate-shimmer-text text-4xl leading-tight tracking-tight sm:text-5xl md:text-5xl lg:text-6xl">
              Win more roofing jobs. Work less.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl font-[Inter] text-sm font-normal text-gray-600 sm:text-base md:text-lg">
              AI-powered roof reports, instant estimates, and automated
              proposals. Close deals faster while your competition is still
              measuring.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={handleRedirectToLogin}
                className="rounded-lg bg-[#1A1A1A] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-black"
              >
                Start Free Trial
              </button>
              <button
                onClick={handleRedirectToLogin}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50"
              >
                Watch Demo
              </button>
            </div>
          </div>

          {/* Quantified Value Stats - Like Handoff */}
          <div className="mx-auto mb-8 grid max-w-3xl grid-cols-2 gap-3 px-4 sm:grid-cols-4 sm:gap-4">
            <div className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-gray-100">
              <div className="text-xl font-bold text-[#24BDEB] sm:text-2xl">
                +12 hrs
              </div>
              <div className="text-xs text-gray-500">saved weekly</div>
            </div>
            <div className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-gray-100">
              <div className="text-xl font-bold text-[#4FEBBC] sm:text-2xl">
                +35%
              </div>
              <div className="text-xs text-gray-500">more jobs closed</div>
            </div>
            <div className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-gray-100">
              <div className="text-xl font-bold text-[#24BDEB] sm:text-2xl">
                2 min
              </div>
              <div className="text-xs text-gray-500">roof reports</div>
            </div>
            <div className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-gray-100">
              <div className="text-xl font-bold text-[#4FEBBC] sm:text-2xl">
                $50k+
              </div>
              <div className="text-xs text-gray-500">avg revenue boost</div>
            </div>
          </div>

          {/* Chat Input */}
          <div className="mx-auto flex w-full max-w-3xl flex-col px-0 sm:px-4">
            {/* Tabs Container */}
            <div className="relative z-10 -mb-[1px] flex items-end gap-0 pl-2 sm:pl-4">
              {/* Chat Tab */}
              <div
                className={`rounded-t-xl transition-all duration-200 ${
                  activeTab === "chat"
                    ? "z-20 bg-[#24BDEB] p-[1px] pb-0"
                    : "mb-[1px] py-[1px]"
                }`}
              >
                <button
                  onClick={() => setActiveTab("chat")}
                  className={`flex size-full items-center gap-1.5 whitespace-nowrap rounded-t-[11px] px-3 py-2 text-sm font-medium sm:gap-2 sm:px-4 sm:py-2.5${
                    activeTab === "chat"
                      ? "border-b border-white bg-white pb-2.5 pt-2 text-gray-900 sm:pb-3 sm:pt-2.5"
                      : "border border-transparent bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-900"
                  }`}
                >
                  <IconMessageCircle className="size-4" />
                  <span>Rooftops Chat</span>
                </button>
              </div>

              {/* Report Tab */}
              <div
                className={`ml-[-1px] rounded-t-xl transition-all duration-200 ${
                  activeTab === "report"
                    ? "z-20 bg-[#4FEBBC] p-[1px] pb-0"
                    : "mb-[1px] py-[1px]"
                }`}
              >
                <button
                  onClick={() => setActiveTab("report")}
                  className={`flex size-full items-center gap-1.5 whitespace-nowrap rounded-t-[11px] px-3 py-2 text-sm font-medium sm:gap-2 sm:px-4 sm:py-2.5${
                    activeTab === "report"
                      ? "border-b border-white bg-white pb-2.5 pt-2 text-gray-900 sm:pb-3 sm:pt-2.5"
                      : "border border-transparent bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-900"
                  }`}
                >
                  <IconHome className="size-4" />
                  <span>Instant Roof Report</span>
                </button>
              </div>
            </div>

            {/* Input Area with Gradient Border */}
            <div className="gradient-border relative z-0 rounded-2xl p-[1px] shadow-lg">
              <form
                onSubmit={handleSubmit}
                className="relative rounded-[15px] bg-white p-3 transition-all duration-300 sm:p-4"
              >
                <textarea
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  placeholder={
                    activeTab === "chat"
                      ? "Ask me anything..."
                      : "Enter address for instant report..."
                  }
                  className="min-h-[60px] w-full resize-none bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400 sm:min-h-[80px]"
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit(e)
                    }
                  }}
                />

                <div className="mt-2 flex items-center justify-between">
                  {/* Left Actions */}
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      type="button"
                      onClick={handleRedirectToLogin}
                      className="rounded-full p-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 sm:p-2"
                      title="Add attachment"
                    >
                      <IconPlus className="size-4 sm:size-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleRedirectToLogin}
                      className="rounded-full p-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 sm:p-2"
                      title="Browse internet"
                    >
                      <IconWorld className="size-4 sm:size-5" />
                    </button>
                    <div className="mx-1 h-4 w-[1px] bg-gray-200" />
                    <button
                      type="button"
                      onClick={handleRedirectToLogin}
                      className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 sm:gap-2 sm:py-1.5"
                    >
                      <svg
                        className="size-3.5 sm:size-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                      </svg>
                      <span>GPT-5.2</span>
                    </button>
                  </div>

                  {/* Send Button */}
                  <button
                    type="submit"
                    className={`flex items-center justify-center rounded-full p-1.5 transition-all duration-200 sm:p-2 ${
                      inputValue.trim()
                        ? "scale-100 bg-gray-900 text-white shadow-md"
                        : "cursor-not-allowed bg-gray-200 text-gray-500"
                    }`}
                  >
                    <IconArrowUp className="size-4 sm:size-5" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="mx-auto mt-5 grid w-full max-w-3xl grid-cols-2 gap-2.5 sm:mt-6 sm:gap-3 sm:px-4 md:grid-cols-4">
            {/* Card 1 - with gradient border */}
            <button
              onClick={handleRedirectToLogin}
              className="group relative h-full rounded-xl bg-gradient-to-r from-[#24BDEB] to-[#4FEBBC]/50 p-[1px] text-left shadow-sm transition-all duration-300 hover:shadow-md"
            >
              <div className="flex h-full flex-col justify-between rounded-[11px] bg-white p-3 transition-colors hover:bg-gray-50">
                <div className="mb-2">
                  <IconMap className="mb-2 size-5 text-[#24BDEB]" />
                  <h3 className="text-sm font-bold leading-tight text-[#1A1A1A]">
                    Instant Roof Measurements
                  </h3>
                </div>
                <p className="text-xs leading-tight text-gray-500">
                  2 min reports
                </p>
              </div>
            </button>

            {/* Card 2 */}
            <button
              onClick={handleRedirectToLogin}
              className="group relative h-full rounded-xl border border-gray-200 bg-white text-left shadow-sm transition-all duration-200 hover:shadow-md"
            >
              <div className="flex h-full flex-col justify-between rounded-xl p-3 transition-colors hover:bg-gray-50">
                <div className="mb-2">
                  <IconMaximize className="mb-2 size-5 text-[#24BDEB]" />
                  <h3 className="text-sm font-bold leading-tight text-[#1A1A1A]">
                    Satellite Roof Analysis
                  </h3>
                </div>
                <p className="text-xs leading-tight text-gray-500">
                  No ladder needed
                </p>
              </div>
            </button>

            {/* Card 3 */}
            <button
              onClick={handleRedirectToLogin}
              className="group relative h-full rounded-xl border border-gray-200 bg-white text-left shadow-sm transition-all duration-200 hover:shadow-md"
            >
              <div className="flex h-full flex-col justify-between rounded-xl p-3 transition-colors hover:bg-gray-50">
                <div className="mb-2">
                  <IconCalculator className="mb-2 size-5 text-[#24BDEB]" />
                  <h3 className="text-sm font-bold leading-tight text-[#1A1A1A]">
                    AI Cost Estimates
                  </h3>
                </div>
                <p className="text-xs leading-tight text-gray-500">
                  Bid with confidence
                </p>
              </div>
            </button>

            {/* Card 4 */}
            <button
              onClick={handleRedirectToLogin}
              className="group relative h-full rounded-xl border border-gray-200 bg-white text-left shadow-sm transition-all duration-200 hover:shadow-md"
            >
              <div className="flex h-full flex-col justify-between rounded-xl p-3 transition-colors hover:bg-gray-50">
                <div className="mb-2">
                  <IconFileText className="mb-2 size-5 text-[#24BDEB]" />
                  <h3 className="text-sm font-bold leading-tight text-[#1A1A1A]">
                    AI Proposals & Follow-ups
                  </h3>
                </div>
                <p className="text-xs leading-tight text-gray-500">
                  Close Deals
                </p>
              </div>
            </button>
          </div>

          {/* How It Works Section */}
          <div className="mx-auto mt-16 w-full max-w-4xl px-4">
            <h2 className="mb-8 text-center text-2xl font-bold text-[#1A1A1A] sm:text-3xl">
              How Roofers Win with AI
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="relative rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#24BDEB]/10 text-lg font-bold text-[#24BDEB]">
                  1
                </div>
                <h3 className="mb-2 font-bold text-[#1A1A1A]">
                  Enter Any Address
                </h3>
                <p className="text-sm text-gray-600">
                  Type in a property address. Our AI instantly pulls satellite
                  imagery and analyzes the roof.
                </p>
              </div>
              <div className="relative rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#4FEBBC]/10 text-lg font-bold text-[#4FEBBC]">
                  2
                </div>
                <h3 className="mb-2 font-bold text-[#1A1A1A]">
                  Get Instant Report
                </h3>
                <p className="text-sm text-gray-600">
                  Receive detailed measurements, pitch analysis, material
                  recommendations, and cost estimates in under 2 minutes.
                </p>
              </div>
              <div className="relative rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#24BDEB]/10 text-lg font-bold text-[#24BDEB]">
                  3
                </div>
                <h3 className="mb-2 font-bold text-[#1A1A1A]">Send & Close</h3>
                <p className="text-sm text-gray-600">
                  Generate professional proposals with one click. Send to
                  homeowners and close deals faster than ever.
                </p>
              </div>
            </div>
          </div>

          {/* Testimonials Section */}
          <div className="mx-auto mt-16 w-full max-w-3xl px-4">
            <h2 className="mb-2 text-center text-2xl font-bold text-[#1A1A1A] sm:text-3xl">
              Trusted by Roofers Nationwide
            </h2>
            <p className="mb-8 text-center text-sm text-gray-500">
              Join hundreds of roofing contractors growing their business with
              AI
            </p>

            <div className="relative rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100 sm:p-8">
              <IconQuote className="absolute left-4 top-4 size-8 text-[#24BDEB]/20 sm:left-6 sm:top-6 sm:size-10" />

              <div className="relative z-10">
                <p className="mb-6 text-base italic text-gray-700 sm:text-lg">
                  &ldquo;{testimonials[currentTestimonial].quote}&rdquo;
                </p>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#1A1A1A]">
                      {testimonials[currentTestimonial].name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {testimonials[currentTestimonial].company} ·{" "}
                      {testimonials[currentTestimonial].location}
                    </div>
                  </div>
                  <div className="rounded-full bg-[#4FEBBC]/10 px-3 py-1 text-sm font-semibold text-[#0D9488]">
                    {testimonials[currentTestimonial].metric}
                  </div>
                </div>
              </div>

              {/* Testimonial Navigation */}
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() =>
                    setCurrentTestimonial(prev =>
                      prev === 0 ? testimonials.length - 1 : prev - 1
                    )
                  }
                  className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <IconChevronLeft className="size-5" />
                </button>
                <div className="flex gap-1.5">
                  {testimonials.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentTestimonial(idx)}
                      className={`size-2 rounded-full transition-colors ${
                        idx === currentTestimonial
                          ? "bg-[#24BDEB]"
                          : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() =>
                    setCurrentTestimonial(prev =>
                      prev === testimonials.length - 1 ? 0 : prev + 1
                    )
                  }
                  className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <IconChevronRight className="size-5" />
                </button>
              </div>

              {/* Star Rating */}
              <div className="mt-4 flex justify-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <IconStar
                    key={i}
                    className="size-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Features Grid - Expanded */}
          <div className="mx-auto mt-16 w-full max-w-4xl px-4">
            <h2 className="mb-2 text-center text-2xl font-bold text-[#1A1A1A] sm:text-3xl">
              Everything You Need to Dominate Your Market
            </h2>
            <p className="mb-8 text-center text-sm text-gray-500">
              Built specifically for roofing contractors
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <IconFileAnalytics className="mb-3 size-8 text-[#24BDEB]" />
                <h3 className="mb-1 font-bold text-[#1A1A1A]">
                  AI Roof Measurements
                </h3>
                <p className="text-sm text-gray-600">
                  Satellite-powered reports with facet counts, pitch analysis,
                  and square footage.
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <IconCalculator className="mb-3 size-8 text-[#4FEBBC]" />
                <h3 className="mb-1 font-bold text-[#1A1A1A]">
                  Instant Cost Estimates
                </h3>
                <p className="text-sm text-gray-600">
                  Material and labor costs calculated automatically based on
                  your pricing.
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <IconSend className="mb-3 size-8 text-[#24BDEB]" />
                <h3 className="mb-1 font-bold text-[#1A1A1A]">
                  One-Click Proposals
                </h3>
                <p className="text-sm text-gray-600">
                  Generate professional proposals and send directly to
                  homeowners.
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <IconRobot className="mb-3 size-8 text-[#4FEBBC]" />
                <h3 className="mb-1 font-bold text-[#1A1A1A]">AI Assistant</h3>
                <p className="text-sm text-gray-600">
                  Ask questions, draft emails, and get help with any roofing
                  task.
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <IconTargetArrow className="mb-3 size-8 text-[#24BDEB]" />
                <h3 className="mb-1 font-bold text-[#1A1A1A]">
                  Lead Follow-up
                </h3>
                <p className="text-sm text-gray-600">
                  Automated follow-up sequences that convert leads into signed
                  contracts.
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <IconTrendingUp className="mb-3 size-8 text-[#4FEBBC]" />
                <h3 className="mb-1 font-bold text-[#1A1A1A]">
                  Solar Analysis
                </h3>
                <p className="text-sm text-gray-600">
                  Upsell solar with built-in potential analysis and savings
                  estimates.
                </p>
              </div>
            </div>
          </div>

          {/* AI Employees Coming Soon Section */}
          <div className="mx-auto mt-20 w-full max-w-4xl px-4">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 sm:p-12">
              {/* Background decoration */}
              <div className="absolute -right-20 -top-20 size-64 rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-500/20 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 size-64 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 blur-3xl" />

              <div className="relative z-10">
                {/* Coming Soon Badge */}
                <div className="mb-6 flex justify-center sm:justify-start">
                  <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-500/20 to-cyan-500/20 px-4 py-1.5 ring-1 ring-teal-500/30">
                    <IconRocket className="size-4 text-teal-400" />
                    <span className="text-sm font-semibold text-teal-300">
                      Coming Soon
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start">
                  {/* Left Content */}
                  <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-3xl font-bold text-white sm:text-4xl">
                      AI Employees for Your{" "}
                      <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                        Roofing Business
                      </span>
                    </h2>
                    <p className="mt-4 text-gray-300">
                      Hire AI-powered team members that work 24/7 to handle sales follow-ups,
                      content creation, customer communication, and more. Scale without scaling payroll.
                    </p>

                    {/* Feature bullets */}
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {[
                        { icon: IconMail, text: "Automated lead follow-up" },
                        { icon: IconFileText, text: "Content & SEO creation" },
                        { icon: IconBrandInstagram, text: "Social media management" },
                        { icon: IconMessageCircle, text: "24/7 customer responses" }
                      ].map(item => (
                        <div
                          key={item.text}
                          className="flex items-center gap-2 text-sm text-gray-300"
                        >
                          <item.icon className="size-4 text-teal-400" />
                          {item.text}
                        </div>
                      ))}
                    </div>

                    {/* Price and CTA */}
                    <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
                      <div className="text-center sm:text-left">
                        <div className="text-sm text-gray-400">Starting at</div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-white">$199</span>
                          <span className="text-gray-400">/month</span>
                        </div>
                      </div>
                      <button
                        onClick={handleRedirectToLogin}
                        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:shadow-teal-500/25"
                      >
                        <IconUserBolt className="size-5" />
                        Join the Waitlist
                      </button>
                    </div>
                  </div>

                  {/* Right - AI Employee Cards */}
                  <div className="flex flex-shrink-0 flex-col gap-3">
                    {[
                      { name: "Marcus", role: "Sales", color: "bg-emerald-500" },
                      { name: "Aisha", role: "Marketing", color: "bg-pink-500" },
                      { name: "Elena", role: "Estimating", color: "bg-blue-500" },
                      { name: "Ryan", role: "Insurance", color: "bg-amber-500" }
                    ].map((emp, idx) => (
                      <div
                        key={emp.name}
                        className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-2.5 ring-1 ring-white/10 backdrop-blur-sm"
                        style={{
                          animationDelay: `${idx * 100}ms`,
                          transform: `translateX(${idx * 8}px)`
                        }}
                      >
                        <div
                          className={`flex size-8 items-center justify-center rounded-lg ${emp.color} text-sm font-bold text-white`}
                        >
                          {emp.name[0]}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {emp.name}
                          </div>
                          <div className="text-xs text-gray-400">{emp.role}</div>
                        </div>
                        <IconSparkles className="ml-auto size-4 text-yellow-400" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Integrations Section */}
          <div className="mx-auto mt-16 w-full max-w-4xl px-4">
            <p className="mb-6 text-center text-sm font-medium text-gray-400">
              POWERED BY INDUSTRY-LEADING DATA
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 opacity-60 grayscale sm:gap-10">
              <div className="flex items-center gap-2 text-gray-500">
                <svg className="size-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.372 0 0 5.373 0 12s5.372 12 12 12c6.627 0 12-5.373 12-12S18.627 0 12 0zm.14 19.018c-3.868 0-7-3.14-7-7.018c0-3.878 3.132-7.018 7-7.018c1.89 0 3.47.697 4.682 1.829l-1.974 1.978c-.532-.511-1.46-1.105-2.708-1.105c-2.31 0-4.187 1.903-4.187 4.316c0 2.412 1.877 4.316 4.187 4.316c2.693 0 3.683-1.917 3.832-2.914h-3.832v-2.568h6.408c.063.327.106.663.106 1.097c0 4.015-2.677 6.087-6.514 6.087z" />
                </svg>
                <span className="text-sm font-medium">Google Maps</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <svg className="size-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
                <span className="text-sm font-medium">Solar API</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <svg className="size-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="text-sm font-medium">Satellite Imagery</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <IconRobot className="size-6" />
                <span className="text-sm font-medium">GPT-5</span>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mx-auto mt-16 w-full max-w-3xl px-4">
            <div className="rounded-2xl bg-gradient-to-r from-[#1A1A1A] to-[#333] p-8 text-center text-white sm:p-12">
              <h2 className="mb-3 text-2xl font-bold sm:text-3xl">
                Ready to Close More Roofing Jobs?
              </h2>
              <p className="mb-6 text-gray-300">
                Join the roofers who are winning more bids and working smarter
                with AI.
              </p>
              <button
                onClick={handleRedirectToLogin}
                className="rounded-lg bg-gradient-to-r from-[#24BDEB] to-[#4FEBBC] px-8 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl"
              >
                Start Your Free Trial
              </button>
              <p className="mt-4 text-sm text-gray-400">
                No credit card required · Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white px-4 py-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <Image
              src="/rooftops-logo-gr-black.png"
              alt="Rooftops AI"
              width={120}
              height={30}
              className="h-6 w-auto"
            />
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <button
              onClick={() => router.push("/pricing")}
              className="hover:text-gray-900"
            >
              Pricing
            </button>
            <a href="mailto:team@rooftops.ai" className="hover:text-gray-900">
              Contact
            </a>
            <a href="#" className="hover:text-gray-900">
              Privacy
            </a>
            <a href="#" className="hover:text-gray-900">
              Terms
            </a>
          </div>
          <p className="text-sm text-gray-400">© 2024 Rooftops AI</p>
        </div>
      </footer>

      {/* CSS for Shimmer Effect and Gradient Border */}
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap");

        @keyframes shimmer {
          0% {
            background-position: 200% center;
          }
          100% {
            background-position: -200% center;
          }
        }

        .animate-shimmer-text {
          font-family: "Inter", sans-serif;
          font-weight: 700;
          background: linear-gradient(
            to right,
            #1a1a1a 0%,
            #1a1a1a 40%,
            #24bdeb 47%,
            #4febbc 53%,
            #1a1a1a 60%,
            #1a1a1a 100%
          );
          background-size: 500% auto;
          color: #1a1a1a;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 12s linear infinite;
          padding-bottom: 0.1em;
        }

        .gradient-border {
          background: linear-gradient(to right, #24bdeb, #4febbc);
        }
      `}</style>
    </div>
  )
}
