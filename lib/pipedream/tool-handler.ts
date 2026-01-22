import { Tool } from "@modelcontextprotocol/sdk/types.js"
import { pipedreamManager } from "./pipedream-mcp-manager"
import { requiresConfirmation } from "./action-rules"

export interface PipedreamToolCall {
  toolName: string
  arguments: Record<string, unknown>
  appSlug?: string
  appName?: string
}

export interface PipedreamToolResult {
  success: boolean
  result?: any
  error?: string
  requiresConfirmation?: boolean
  confirmationId?: string
}

// Pending confirmations storage (in production, use Redis or similar)
const pendingConfirmations = new Map<
  string,
  {
    userId: string
    toolCall: PipedreamToolCall
    createdAt: Date
    expiresAt: Date
  }
>()

/**
 * Generate a unique confirmation ID
 */
function generateConfirmationId(): string {
  return `confirm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Convert MCP tools to OpenAI-compatible function format
 */
export function convertToolsToOpenAIFormat(tools: Tool[]): Array<{
  type: "function"
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}> {
  return tools.map(tool => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description || "",
      parameters: tool.inputSchema || { type: "object", properties: {} }
    }
  }))
}

/**
 * Execute a Pipedream tool call
 */
export async function executePipedreamTool(
  userId: string,
  toolCall: PipedreamToolCall,
  skipConfirmation = false
): Promise<PipedreamToolResult> {
  const { toolName, arguments: args } = toolCall

  // Check if this action requires confirmation
  if (!skipConfirmation && requiresConfirmation(toolName)) {
    const confirmationId = generateConfirmationId()

    // Store pending confirmation (expires in 5 minutes)
    pendingConfirmations.set(confirmationId, {
      userId,
      toolCall,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    })

    return {
      success: false,
      requiresConfirmation: true,
      confirmationId
    }
  }

  try {
    const result = await pipedreamManager.callTool(userId, toolName, args)

    return {
      success: true,
      result
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }
  }
}

/**
 * Confirm and execute a pending tool call
 */
export async function confirmAndExecuteTool(
  userId: string,
  confirmationId: string
): Promise<PipedreamToolResult> {
  const pending = pendingConfirmations.get(confirmationId)

  if (!pending) {
    return {
      success: false,
      error: "Confirmation not found or expired"
    }
  }

  // Verify user matches
  if (pending.userId !== userId) {
    return {
      success: false,
      error: "Unauthorized confirmation attempt"
    }
  }

  // Check if expired
  if (new Date() > pending.expiresAt) {
    pendingConfirmations.delete(confirmationId)
    return {
      success: false,
      error: "Confirmation has expired"
    }
  }

  // Remove from pending
  pendingConfirmations.delete(confirmationId)

  // Execute with skipConfirmation flag
  return executePipedreamTool(userId, pending.toolCall, true)
}

/**
 * Cancel a pending confirmation
 */
export function cancelConfirmation(
  userId: string,
  confirmationId: string
): boolean {
  const pending = pendingConfirmations.get(confirmationId)

  if (!pending || pending.userId !== userId) {
    return false
  }

  pendingConfirmations.delete(confirmationId)
  return true
}

/**
 * Get pending confirmation details
 */
export function getPendingConfirmation(confirmationId: string) {
  const pending = pendingConfirmations.get(confirmationId)
  if (!pending || new Date() > pending.expiresAt) {
    return null
  }
  return {
    toolCall: pending.toolCall,
    createdAt: pending.createdAt,
    expiresAt: pending.expiresAt
  }
}

/**
 * Clean up expired confirmations
 */
export function cleanupExpiredConfirmations(): void {
  const now = new Date()
  for (const [id, pending] of pendingConfirmations) {
    if (now > pending.expiresAt) {
      pendingConfirmations.delete(id)
    }
  }
}

/**
 * Parse tool call result content
 */
export function parseToolResult(result: any): string {
  if (!result || !result.content || result.content.length === 0) {
    return "Action completed successfully."
  }

  return result.content
    .map((item: any) => {
      if (item.type === "text") {
        return item.text
      }
      // Handle other content types as needed
      return JSON.stringify(item)
    })
    .join("\n")
}

// Cleanup expired confirmations every minute
if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpiredConfirmations, 60000)
}
