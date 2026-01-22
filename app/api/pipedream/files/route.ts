import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export const runtime = "nodejs"
export const maxDuration = 60

// Map app slugs to their Google Drive MIME types
const APP_MIME_TYPES: Record<string, string[]> = {
  google_sheets: ["application/vnd.google-apps.spreadsheet"],
  google_docs: ["application/vnd.google-apps.document"],
  google_drive: [
    "application/vnd.google-apps.spreadsheet",
    "application/vnd.google-apps.document",
    "application/vnd.google-apps.presentation",
    "application/vnd.google-apps.folder"
  ]
}

// List files from connected apps using Pipedream's proxy API
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const appSlug = searchParams.get("app") || "google_drive"
    const query = searchParams.get("q") || ""

    console.log(
      `[Files API] Listing files for app: ${appSlug}, query: ${query}`
    )

    // Use Pipedream SDK
    const { PipedreamClient } = require("@pipedream/sdk")

    const pd = new PipedreamClient({
      clientId,
      clientSecret,
      projectId
    })

    // Get the user's accounts to find the right account ID
    const accountsPage = await pd.accounts.list({
      externalUserId: user.id,
      includeCredentials: false
    })

    // Find the best account to use
    const googleAppSlugs = ["google_drive", "google_sheets", "google_docs"]
    const accounts: { id: string; appSlug: string }[] = []

    for await (const account of accountsPage) {
      const accountAppSlug = account.app?.nameSlug || ""
      if (googleAppSlugs.includes(accountAppSlug)) {
        accounts.push({ id: account.id, appSlug: accountAppSlug })
      }
    }

    // Sort by priority: google_drive first, then the requested app, then others
    accounts.sort((a, b) => {
      if (a.appSlug === "google_drive") return -1
      if (b.appSlug === "google_drive") return 1
      if (a.appSlug === appSlug) return -1
      if (b.appSlug === appSlug) return 1
      return 0
    })

    const selectedAccount = accounts[0] || null
    console.log(`[Files API] Available Google accounts:`, accounts)
    console.log(`[Files API] Selected account:`, selectedAccount)

    if (!selectedAccount) {
      return NextResponse.json({
        files: [],
        message:
          "No Google account connected. Please connect Google Drive, Sheets, or Docs first."
      })
    }

    // Build the Google Drive API query
    const mimeTypes = APP_MIME_TYPES[appSlug] || APP_MIME_TYPES.google_drive
    const mimeTypeQuery = mimeTypes.map(t => `mimeType='${t}'`).join(" or ")

    let driveQuery = `(${mimeTypeQuery}) and trashed=false`
    if (query) {
      driveQuery += ` and name contains '${query.replace(/'/g, "\\'")}'`
    }

    console.log(`[Files API] Google Drive query: ${driveQuery}`)

    // Build the Google Drive API URL
    const driveApiUrl = new URL("https://www.googleapis.com/drive/v3/files")
    driveApiUrl.searchParams.set("q", driveQuery)
    driveApiUrl.searchParams.set(
      "fields",
      "files(id,name,mimeType,webViewLink,modifiedTime)"
    )
    driveApiUrl.searchParams.set("orderBy", "modifiedTime desc")
    driveApiUrl.searchParams.set("pageSize", "50")

    console.log(
      `[Files API] Calling Google API via proxy: ${driveApiUrl.toString()}`
    )

    // Try SDK proxy first, then fall back to direct HTTP
    let driveResponse: any

    // Check if SDK proxy method exists
    if (pd.proxy && typeof pd.proxy.get === "function") {
      console.log(`[Files API] Using SDK proxy.get()`)
      try {
        driveResponse = await pd.proxy.get({
          externalUserId: user.id,
          accountId: selectedAccount.id,
          url: driveApiUrl.toString()
        })
        console.log(
          `[Files API] SDK proxy response:`,
          JSON.stringify(driveResponse).substring(0, 500)
        )
      } catch (sdkError: any) {
        console.error(
          `[Files API] SDK proxy failed, trying direct HTTP:`,
          sdkError.message
        )
        driveResponse = null
      }
    } else {
      console.log(
        `[Files API] SDK proxy not available, pd.proxy:`,
        typeof pd.proxy
      )
    }

    // Fallback to direct HTTP if SDK didn't work
    if (!driveResponse) {
      console.log(`[Files API] Using direct HTTP proxy call`)

      // Get access token for Pipedream API
      const accessToken = await pd.rawAccessToken
      console.log(`[Files API] Got access token:`, !!accessToken)

      // URL encode the target URL for the proxy endpoint
      const encodedUrl = Buffer.from(driveApiUrl.toString()).toString(
        "base64url"
      )

      // Build proxy URL
      const proxyUrl = `https://api.pipedream.com/v1/connect/${projectId}/proxy/${selectedAccount.id}/${encodedUrl}`

      console.log(
        `[Files API] Direct proxy URL: ${proxyUrl.substring(0, 100)}...`
      )

      const proxyResponse = await fetch(proxyUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-pd-external-user-id": user.id
        }
      })

      if (!proxyResponse.ok) {
        const errorText = await proxyResponse.text()
        console.error(
          `[Files API] Direct proxy failed: ${proxyResponse.status}`,
          errorText
        )
        return NextResponse.json({
          files: [],
          error: `Proxy request failed: ${proxyResponse.status}`,
          details: errorText
        })
      }

      driveResponse = await proxyResponse.json()
      console.log(
        `[Files API] Direct proxy response:`,
        JSON.stringify(driveResponse).substring(0, 500)
      )
    }

    // Handle response
    const responseData = driveResponse?.body || driveResponse

    if (responseData?.error) {
      console.error(`[Files API] API error:`, responseData.error)
      const errorMessage =
        responseData.error.message || JSON.stringify(responseData.error)

      if (
        errorMessage.includes("403") ||
        errorMessage.includes("Forbidden") ||
        errorMessage.includes("insufficient")
      ) {
        return NextResponse.json({
          files: [],
          error: "The connected account doesn't have permission to list files.",
          suggestion: "Try connecting Google Drive directly for file browsing.",
          details: errorMessage
        })
      }

      return NextResponse.json({
        files: [],
        error: "Failed to fetch files from Google",
        details: errorMessage
      })
    }

    // Extract files from response
    const rawFiles = responseData?.files || []
    console.log(`[Files API] Found ${rawFiles.length} files`)

    // Transform files to our format
    const files = rawFiles.map((f: any) => ({
      id: f.id,
      name: f.name || f.title || "Untitled",
      type: getMimeTypeLabel(f.mimeType),
      mimeType: f.mimeType,
      url: f.webViewLink,
      modifiedTime: f.modifiedTime
    }))

    return NextResponse.json({
      files,
      appSlug,
      accountUsed: selectedAccount.appSlug
    })
  } catch (error: any) {
    console.error("Error listing files:", error)
    return NextResponse.json(
      { error: error.message || "Failed to list files" },
      { status: 500 }
    )
  }
}

function getMimeTypeLabel(mimeType: string): string {
  const labels: Record<string, string> = {
    "application/vnd.google-apps.spreadsheet": "spreadsheet",
    "application/vnd.google-apps.document": "document",
    "application/vnd.google-apps.presentation": "presentation",
    "application/vnd.google-apps.folder": "folder"
  }
  return labels[mimeType] || "file"
}
