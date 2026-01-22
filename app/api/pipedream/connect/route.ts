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

    // Create Pipedream client
    const pd = new PipedreamClient({
      clientId,
      clientSecret,
      projectId
    })

    // Get allowed origins for CORS
    const allowedOrigin = process.env.NEXT_PUBLIC_URL || "http://localhost:3000"

    // Create a connect token for this user
    const tokenResponse = await pd.tokens.create({
      externalUserId: user.id,
      allowedOrigins: [allowedOrigin]
    })

    return NextResponse.json({
      token: tokenResponse.token,
      expiresAt:
        tokenResponse.expiresAt?.toISOString?.() || tokenResponse.expiresAt,
      connectLinkUrl: tokenResponse.connectLinkUrl,
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
