import { createClient } from "@/lib/supabase/middleware"
import { i18nRouter } from "next-i18n-router"
import { NextResponse, type NextRequest } from "next/server"
import i18nConfig from "./i18nConfig"

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  console.log("🔵 Middleware hit:", pathname)

  try {
    // Check if we're at a root locale path BEFORE i18n processing
    const localePattern = new RegExp(`^/(${i18nConfig.locales.join('|')})/?$`)
    const isRootPath = pathname === "/" || localePattern.test(pathname)

    if (isRootPath) {
      const { supabase } = createClient(request)
      const session = await supabase.auth.getSession()

      console.log("🔍 Root path detected, hasSession:", !!session?.data?.session)

      // Determine locale
      const localeMatch = pathname.match(localePattern)
      const locale = localeMatch ? localeMatch[1] : i18nConfig.defaultLocale

      if (session?.data?.session) {
        // Authenticated: redirect to home workspace
        const { data: homeWorkspace } = await supabase
          .from("workspaces")
          .select("*")
          .eq("user_id", session.data.session.user.id)
          .eq("is_home", true)
          .single()

        if (homeWorkspace) {
          const redirectUrl = `/${locale}/${homeWorkspace.id}/chat`
          console.log("🟢 Redirecting authenticated user to:", redirectUrl)
          return NextResponse.redirect(new URL(redirectUrl, request.url))
        }
      } else {
        // Not authenticated: redirect to login
        const redirectUrl = `/${locale}/login`
        console.log("🔴 Redirecting unauthenticated user to:", redirectUrl)
        return NextResponse.redirect(new URL(redirectUrl, request.url))
      }
    }

    // Process i18n routing for non-root paths
    console.log("⚪️ Processing i18n routing")
    const i18nResult = i18nRouter(request, i18nConfig)
    if (i18nResult) {
      console.log("🟡 i18n redirect triggered")
      return i18nResult
    }

    const { response } = createClient(request)
    return response
  } catch (e) {
    console.error("❌ Middleware error:", e)
    return NextResponse.next({
      request: {
        headers: request.headers
      }
    })
  }
}

// Update the matcher to include special routes
export const config = {
  matcher: [
    "/((?!api|static|.*\\..*|_next|auth).*)",
  ]
}