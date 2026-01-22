import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { pipedreamManager } from "@/lib/pipedream/pipedream-mcp-manager"
import {
  executePipedreamTool,
  confirmAndExecuteTool,
  cancelConfirmation,
  getPendingConfirmation,
  parseToolResult
} from "@/lib/pipedream/tool-handler"
import {
  requiresConfirmation,
  getConfirmationMessage
} from "@/lib/pipedream/action-rules"

export const runtime = "nodejs"

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

    // Get optional enabled apps filter from query params
    const searchParams = request.nextUrl.searchParams
    const enabledAppsParam = searchParams.get("enabled_apps")
    const enabledApps = enabledAppsParam
      ? enabledAppsParam.split(",")
      : undefined

    // Check if connected
    if (!pipedreamManager.isConnected(user.id)) {
      // Try to reconnect
      const { data: connection } = await supabase
        .from("pipedream_connections")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (!connection) {
        return NextResponse.json(
          { error: "Not connected to Pipedream" },
          { status: 400 }
        )
      }

      await pipedreamManager.connect({
        userId: user.id,
        serverUrl: connection.mcp_server_url,
        apiKey: connection.api_key
      })
    }

    // Get tools
    const tools = await pipedreamManager.listTools(user.id, enabledApps)

    return NextResponse.json({
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        requiresConfirmation: requiresConfirmation(tool.name)
      }))
    })
  } catch (error: any) {
    console.error("Error fetching Pipedream tools:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch tools" },
      { status: 500 }
    )
  }
}

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
    const {
      action,
      toolName,
      arguments: args,
      confirmationId,
      appSlug,
      appName
    } = body

    // Handle different actions
    if (action === "confirm") {
      // Confirm a pending action
      if (!confirmationId) {
        return NextResponse.json(
          { error: "Missing confirmation ID" },
          { status: 400 }
        )
      }

      const result = await confirmAndExecuteTool(user.id, confirmationId)

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to execute action" },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        result: result.result
          ? parseToolResult(result.result)
          : "Action completed"
      })
    }

    if (action === "cancel") {
      // Cancel a pending action
      if (!confirmationId) {
        return NextResponse.json(
          { error: "Missing confirmation ID" },
          { status: 400 }
        )
      }

      const cancelled = cancelConfirmation(user.id, confirmationId)

      return NextResponse.json({
        success: cancelled,
        message: cancelled ? "Action cancelled" : "Confirmation not found"
      })
    }

    if (action === "status") {
      // Get status of a pending confirmation
      if (!confirmationId) {
        return NextResponse.json(
          { error: "Missing confirmation ID" },
          { status: 400 }
        )
      }

      const pending = getPendingConfirmation(confirmationId)

      return NextResponse.json({
        found: !!pending,
        pending
      })
    }

    // Default action: execute tool
    if (!toolName) {
      return NextResponse.json({ error: "Missing tool name" }, { status: 400 })
    }

    // Check if connected
    if (!pipedreamManager.isConnected(user.id)) {
      const { data: connection } = await supabase
        .from("pipedream_connections")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (!connection) {
        return NextResponse.json(
          { error: "Not connected to Pipedream" },
          { status: 400 }
        )
      }

      await pipedreamManager.connect({
        userId: user.id,
        serverUrl: connection.mcp_server_url,
        apiKey: connection.api_key
      })
    }

    // Execute the tool
    const result = await executePipedreamTool(user.id, {
      toolName,
      arguments: args || {},
      appSlug,
      appName
    })

    if (result.requiresConfirmation) {
      return NextResponse.json({
        requiresConfirmation: true,
        confirmationId: result.confirmationId,
        confirmationMessage: getConfirmationMessage(toolName, appName),
        toolName,
        arguments: args
      })
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to execute tool" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      result: result.result
        ? parseToolResult(result.result)
        : "Action completed"
    })
  } catch (error: any) {
    console.error("Error executing Pipedream tool:", error)
    return NextResponse.json(
      { error: error.message || "Failed to execute tool" },
      { status: 500 }
    )
  }
}
