import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export const runtime = "nodejs"

// This endpoint handles the webhook callback from Pipedream Connect
// When a user connects an app, Pipedream sends a POST request here
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Pipedream sends the external_user_id (which is our user.id)
    // and information about the connected account
    const { external_user_id, account } = body

    if (!external_user_id) {
      return NextResponse.json(
        { error: "Missing external_user_id" },
        { status: 400 }
      )
    }

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Check if connection exists
    const { data: existingConnection } = await supabase
      .from("pipedream_connections")
      .select("*")
      .eq("user_id", external_user_id)
      .single()

    if (!existingConnection) {
      // Create new connection record
      const projectId = process.env.PIPEDREAM_PROJECT_ID || "default"
      await supabase.from("pipedream_connections").insert({
        user_id: external_user_id,
        pipedream_project_id: projectId,
        mcp_server_url: `https://mcp.pipedream.com/sse`,
        api_key: "",
        connected_apps: account
          ? [account.app?.name_slug || account.app_slug]
          : []
      })
    } else if (account) {
      // Update connected apps list
      const appSlug = account.app?.name_slug || account.app_slug
      const currentApps = existingConnection.connected_apps || []

      if (!currentApps.includes(appSlug)) {
        await supabase
          .from("pipedream_connections")
          .update({
            connected_apps: [...currentApps, appSlug],
            updated_at: new Date().toISOString()
          })
          .eq("user_id", external_user_id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in Pipedream webhook callback:", error)
    return NextResponse.json(
      { error: error.message || "Webhook processing failed" },
      { status: 500 }
    )
  }
}

// GET endpoint for when Pipedream Connect redirects back (popup close)
export async function GET(request: NextRequest) {
  // Simple page that tells the user to close the popup
  // The parent window will reload when it detects the popup closed
  return new NextResponse(
    `<!DOCTYPE html>
    <html>
      <head>
        <title>Connected</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: #f5f5f5;
          }
          .success {
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 { color: #22c55e; margin-bottom: 10px; }
          p { color: #666; }
        </style>
      </head>
      <body>
        <div class="success">
          <h1>✓ Connected!</h1>
          <p>You can close this window.</p>
        </div>
        <script>
          // Auto-close after a brief delay
          setTimeout(() => window.close(), 1500);
        </script>
      </body>
    </html>`,
    {
      headers: { "Content-Type": "text/html" }
    }
  )
}
