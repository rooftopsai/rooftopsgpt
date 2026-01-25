// app/api/agent/confirm/route.ts
// API endpoint for confirming or canceling tool calls
// Executes MCP tools via Pipedream when confirmed

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { checkAgentAccess } from "@/lib/entitlements"
import { MCPSessionManager, isPipedreamConfigured } from "@/lib/pipedream/mcp-session"

export const runtime = "nodejs"
export const maxDuration = 60

interface ConfirmRequest {
  session_id: string
  tool_call_id: string
  action: "confirm" | "cancel"
}

// Execute a built-in tool that requires confirmation
async function executeConfirmedBuiltinTool(
  toolName: string,
  toolArgs: Record<string, any>
): Promise<Record<string, any>> {
  switch (toolName) {
    case "send_email":
      // This will be handled by MCP if available
      return {
        status: "info",
        message: "Email sending requires a connected email service. Please connect Gmail or Outlook in your settings.",
        action_needed: "connect_email_service"
      }

    case "schedule_appointment":
      return {
        status: "info",
        message: "Calendar scheduling requires a connected calendar service. Please connect Google Calendar or Outlook in your settings.",
        action_needed: "connect_calendar_service"
      }

    case "create_estimate":
      // This can be done locally - generate an estimate document
      return {
        status: "success",
        message: "Estimate created successfully",
        estimate: {
          customer: toolArgs.customer_name,
          address: toolArgs.property_address,
          roof_area: toolArgs.roof_area_sqft,
          material: toolArgs.material_type,
          created_at: new Date().toISOString()
        }
      }

    default:
      return {
        status: "info",
        message: `Action "${toolName}" confirmed but requires additional integration setup.`
      }
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

    const hasAccess = await checkAgentAccess(user.id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Agent feature requires Premium or Business subscription" },
        { status: 403 }
      )
    }

    const body: ConfirmRequest = await request.json()
    const { session_id, tool_call_id, action } = body

    if (!session_id || !tool_call_id || !action) {
      return NextResponse.json(
        { error: "session_id, tool_call_id, and action are required" },
        { status: 400 }
      )
    }

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from("agent_sessions")
      .select("*")
      .eq("id", session_id)
      .eq("user_id", user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    if (action === "cancel") {
      // Update tool execution as cancelled
      await supabase
        .from("agent_tool_executions")
        .update({
          status: "cancelled",
          completed_at: new Date().toISOString()
        })
        .eq("session_id", session_id)
        .eq("status", "pending")

      // Log activity
      await supabase.from("agent_activity_log").insert([
        {
          user_id: user.id,
          session_id,
          action_type: "tool_cancelled",
          title: "Action Cancelled",
          description: "User cancelled the pending action"
        }
      ])

      return NextResponse.json({
        success: true,
        action: "cancelled",
        message: "Action cancelled"
      })
    }

    if (action === "confirm") {
      // Get the pending tool execution
      const { data: toolExecution } = await supabase
        .from("agent_tool_executions")
        .select("*")
        .eq("session_id", session_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (!toolExecution) {
        return NextResponse.json(
          { error: "No pending action found" },
          { status: 404 }
        )
      }

      const toolName = toolExecution.tool_name
      const toolArgs = toolExecution.tool_input as Record<string, any>
      const isMCP = toolArgs._isMCP === true

      // Remove the internal flag before execution
      delete toolArgs._isMCP

      let result: any

      if (isMCP && isPipedreamConfigured()) {
        // Execute via Pipedream MCP
        try {
          console.log("[Confirm] Executing MCP tool:", toolName, toolArgs)

          const mcpSession = new MCPSessionManager(user.id, session_id)
          await mcpSession.connect()

          // Get user's enabled apps
          const { data: dataSources } = await supabase
            .from("pipedream_data_sources")
            .select("app_slug")
            .eq("user_id", user.id)
            .eq("enabled", true)

          if (dataSources && dataSources.length > 0) {
            const enabledApps = dataSources.map(ds => ds.app_slug)
            await mcpSession.selectApps(enabledApps)
          }

          const mcpResult = await mcpSession.callTool(toolName, toolArgs)
          mcpSession.close()

          result = {
            status: "success",
            source: "pipedream",
            message: `Action "${toolName}" executed successfully via connected app`,
            data: mcpResult.content || mcpResult
          }

          console.log("[Confirm] MCP tool executed successfully:", result)
        } catch (mcpError: any) {
          console.error("[Confirm] MCP tool execution error:", mcpError)
          result = {
            status: "error",
            source: "pipedream",
            message: mcpError.message || "Failed to execute connected app action"
          }
        }
      } else {
        // Execute built-in tool
        result = await executeConfirmedBuiltinTool(toolName, toolArgs)
      }

      // Update tool execution as completed
      await supabase
        .from("agent_tool_executions")
        .update({
          status: "completed",
          tool_output: result,
          confirmed_at: new Date().toISOString(),
          confirmed_by: user.id,
          completed_at: new Date().toISOString()
        })
        .eq("id", toolExecution.id)

      // Update the tool message in the conversation
      await supabase
        .from("agent_messages")
        .update({
          content: JSON.stringify(result)
        })
        .eq("session_id", session_id)
        .eq("tool_call_id", tool_call_id)

      // Log activity
      await supabase.from("agent_activity_log").insert([
        {
          user_id: user.id,
          session_id,
          action_type: "tool_confirmed",
          title: `Confirmed: ${toolName}`,
          description: `User confirmed and executed action: ${toolName}`
        }
      ])

      return NextResponse.json({
        success: true,
        action: "confirmed",
        tool_name: toolName,
        result,
        message: result.status === "success"
          ? "Action confirmed and executed successfully"
          : result.message
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Agent confirm error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
