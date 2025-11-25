import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next")

  if (code) {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    await supabase.auth.exchangeCodeForSession(code)

    // After OAuth sign-in, check if user has a profile and redirect accordingly
    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
      // Check if user has a profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single()

      if (!profile) {
        // New user from OAuth - redirect to setup
        return NextResponse.redirect(requestUrl.origin + "/setup")
      } else if (!profile.has_onboarded) {
        // User exists but hasn't completed onboarding
        return NextResponse.redirect(requestUrl.origin + "/setup")
      } else {
        // User has completed onboarding - redirect to their workspace
        const { data: homeWorkspace } = await supabase
          .from("workspaces")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("is_home", true)
          .single()

        if (homeWorkspace) {
          return NextResponse.redirect(requestUrl.origin + `/${homeWorkspace.id}/chat`)
        }
      }
    }
  }

  if (next) {
    return NextResponse.redirect(requestUrl.origin + next)
  } else {
    return NextResponse.redirect(requestUrl.origin)
  }
}
