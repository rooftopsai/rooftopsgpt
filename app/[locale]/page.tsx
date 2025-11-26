// @ts-nocheck
"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/browser-client"
import { getProfileByUserId } from "@/db/profile"
import { getHomeWorkspaceByUserId } from "@/db/workspaces"

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const session = (await supabase.auth.getSession()).data.session

        if (!session) {
          // Not logged in, redirect to login
          router.push("/login")
          return
        }

        // Logged in, check if onboarded
        const profile = await getProfileByUserId(session.user.id)

        if (!profile.has_onboarded) {
          // Not onboarded, redirect to setup
          router.push("/setup")
        } else {
          // Onboarded, redirect to home workspace
          const homeWorkspaceId = await getHomeWorkspaceByUserId(session.user.id)

          // Preserve query params (like subscription_success)
          const queryString = searchParams.toString()
          const url = queryString
            ? `/${homeWorkspaceId}/chat?${queryString}`
            : `/${homeWorkspaceId}/chat`

          router.push(url)
        }
      } catch (err) {
        console.error("Error during redirect:", err)
        // If there's an error, default to login page
        router.push("/login")
      }
    })()
  }, [router, searchParams])

  // Show a simple loading state
  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="mt-4 rounded bg-blue-500 px-4 py-2 text-white"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="size-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-500"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
