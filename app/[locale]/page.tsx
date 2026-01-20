"use client"

import { useRouter } from "next/navigation"
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
  IconHome
} from "@tabler/icons-react"
import { createClient } from "@/lib/supabase/client"

export default function LandingPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"chat" | "report">("chat")
  const [inputValue, setInputValue] = useState("")

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (session) {
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
  }, [router])

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
              A new era of roofing is here.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl font-[Inter] text-sm font-normal text-gray-600 sm:text-base md:text-lg">
              Instantly analyze roof conditions, generate professional reports, and close deals faster with our AI-powered platform.
            </p>
            <div className="mt-4 flex justify-center">
              <span className="rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-600">
                Try it for free
              </span>
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
                    Generate Instant Roof Report
                  </h3>
                </div>
                <p className="text-xs leading-tight text-gray-500">Reports</p>
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
                    Analyze Your Roof Data
                  </h3>
                </div>
                <p className="text-xs leading-tight text-gray-500">Analysis</p>
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
                    Estimate Project Costs
                  </h3>
                </div>
                <p className="text-xs leading-tight text-gray-500">Estimates</p>
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
                    Draft Customer Communications
                  </h3>
                </div>
                <p className="text-xs leading-tight text-gray-500">Marketing</p>
              </div>
            </button>
          </div>
        </div>
      </main>

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
