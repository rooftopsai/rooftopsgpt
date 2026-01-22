// Pipedream MCP Integration
// Export all pipedream-related functionality

export { pipedreamManager } from "./pipedream-mcp-manager"
export type {
  PipedreamConnection,
  ConnectOptions
} from "./pipedream-mcp-manager"

export {
  requiresConfirmation,
  isReadOnlyAction,
  getActionType,
  getConfirmationMessage,
  REQUIRES_CONFIRMATION_PATTERNS,
  READ_ONLY_PATTERNS
} from "./action-rules"

export {
  executePipedreamTool,
  confirmAndExecuteTool,
  cancelConfirmation,
  getPendingConfirmation,
  convertToolsToOpenAIFormat,
  parseToolResult
} from "./tool-handler"
export type { PipedreamToolCall, PipedreamToolResult } from "./tool-handler"
