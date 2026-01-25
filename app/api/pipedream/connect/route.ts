import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const { appSlug } = body

    // Check for required environment variables
    const clientId = process.env.PIPEDREAM_CLIENT_ID
    const clientSecret = process.env.PIPEDREAM_CLIENT_SECRET
    const projectId = process.env.PIPEDREAM_PROJECT_ID

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error: "Pipedream not configured",
          message: "Please set PIPEDREAM_CLIENT_ID and PIPEDREAM_CLIENT_SECRET"
        },
        { status: 500 }
      )
    }

    if (!projectId) {
      return NextResponse.json(
        {
          error: "Pipedream project not configured",
          message: "Please set PIPEDREAM_PROJECT_ID"
        },
        { status: 500 }
      )
    }

    // Use require to avoid Next.js bundling issues
    const { PipedreamClient } = require("@pipedream/sdk")

    // Get allowed origins for CORS
    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000"
    const allowedOrigins = [baseUrl.replace(/\/$/, "")]

    // Determine environment
    const projectEnvironment = process.env.PIPEDREAM_PROJECT_ENVIRONMENT || "development"

    // Create Pipedream client with correct options
    const pd = new PipedreamClient({
      clientId,
      clientSecret,
      projectId,
      projectEnvironment
    })

    // Create a connect token for this user
    // The SDK's tokens.create() method handles the OAuth and returns a token response
    const tokenResponse = await pd.tokens.create({
      externalUserId: user.id,
      allowedOrigins
    })

    // Extract the data from the response
    const tokenData = tokenResponse.data || tokenResponse

    // Build the connect URL - if appSlug is provided, append it
    let connectUrl = tokenData.connectLinkUrl
    if (appSlug && connectUrl) {
      const url = new URL(connectUrl)
      url.searchParams.set("app", appSlug)
      connectUrl = url.toString()
    }

    return NextResponse.json({
      token: tokenData.token,
      expiresAt: tokenData.expiresAt,
      connectLinkUrl: connectUrl,
      appSlug: appSlug || null,
      externalUserId: user.id
    })
  } catch (error: any) {
    console.error("Error initiating Pipedream connection:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
