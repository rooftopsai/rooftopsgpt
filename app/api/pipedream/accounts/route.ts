import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export const runtime = "nodejs"

// Fetch connected accounts from Pipedream for the current user
export async function GET() {
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

    const clientId = process.env.PIPEDREAM_CLIENT_ID
    const clientSecret = process.env.PIPEDREAM_CLIENT_SECRET
    const projectId = process.env.PIPEDREAM_PROJECT_ID

    if (!clientId || !clientSecret || !projectId) {
      return NextResponse.json(
        { error: "Pipedream not configured" },
        { status: 500 }
      )
    }

    // Use require to avoid Next.js bundling issues
    const { PipedreamClient } = require("@pipedream/sdk")

    // Determine environment
    const projectEnvironment = process.env.PIPEDREAM_PROJECT_ENVIRONMENT || "development"

    const pd = new PipedreamClient({
      clientId,
      clientSecret,
      projectId,
      projectEnvironment
    })

    // Get accounts for this user
    const accountsResponse = await pd.accounts.list({
      externalUserId: user.id,
      includeCredentials: false
    })

    // Collect accounts from the paginated response
    const accounts: Array<{
      id: string
      name?: string
      appSlug: string
      appName: string
      iconUrl?: string
      createdAt?: string
    }> = []

    // Handle paginated async iterator or direct response
    const accountsData = accountsResponse.data || accountsResponse

    // Check if it's an async iterator
    if (accountsData[Symbol.asyncIterator]) {
      for await (const account of accountsData) {
        accounts.push({
          id: account.id || "",
          name: account.name,
          appSlug: account.app?.nameSlug || "",
          appName: account.app?.name || "",
          iconUrl: account.app?.imgSrc,
          createdAt: account.createdAt?.toISOString?.() || account.createdAt
        })
      }
    } else if (Array.isArray(accountsData)) {
      // Direct array response
      for (const account of accountsData) {
        accounts.push({
          id: account.id || "",
          name: account.name,
          appSlug: account.app?.nameSlug || account.app?.name_slug || "",
          appName: account.app?.name || "",
          iconUrl: account.app?.imgSrc || account.app?.img_src,
          createdAt: account.createdAt || account.created_at
        })
      }
    } else if (accountsData.accounts) {
      // Response with accounts property
      for (const account of accountsData.accounts) {
        accounts.push({
          id: account.id || "",
          name: account.name,
          appSlug: account.app?.nameSlug || account.app?.name_slug || "",
          appName: account.app?.name || "",
          iconUrl: account.app?.imgSrc || account.app?.img_src,
          createdAt: account.createdAt || account.created_at
        })
      }
    }

    console.log(
      `[Pipedream] Found ${accounts.length} accounts for user ${user.id}`
    )

    // Update our database with the connected apps
    if (accounts.length > 0) {
      const appSlugs = accounts.map(acc => acc.appSlug).filter(Boolean)

      // Check if connection exists
      const { data: existingConnection } = await supabase
        .from("pipedream_connections")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (existingConnection) {
        // Update connected apps
        await supabase
          .from("pipedream_connections")
          .update({
            connected_apps: appSlugs,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id)
      } else {
        // Create connection record
        await supabase.from("pipedream_connections").insert({
          user_id: user.id,
          pipedream_project_id: projectId,
          mcp_server_url: `https://remote.mcp.pipedream.net`,
          api_key: "",
          connected_apps: appSlugs
        })
      }

      // Create/update data source entries for each account
      for (const account of accounts) {
        if (!account.appSlug) continue

        // Use a combination insert approach - try insert, if fails due to constraint, update
        const { error: insertError } = await supabase
          .from("pipedream_data_sources")
          .insert({
            user_id: user.id,
            chat_id: null,
            app_slug: account.appSlug,
            app_name: account.appName,
            app_icon_url: account.iconUrl || null,
            enabled: true
          })

        if (insertError) {
          // If insert failed (likely duplicate), try to update instead
          await supabase
            .from("pipedream_data_sources")
            .update({
              app_name: account.appName,
              app_icon_url: account.iconUrl || null,
              enabled: true
            })
            .eq("user_id", user.id)
            .eq("app_slug", account.appSlug)
            .is("chat_id", null)
        }
      }
    }

    return NextResponse.json({ accounts })
  } catch (error: any) {
    console.error("Error fetching Pipedream accounts:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch accounts" },
      { status: 500 }
    )
  }
}
