import { Client as MCPClient } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"

const MCP_BASE_URL =
  process.env.PIPEDREAM_MCP_URL || "https://remote.mcp.pipedream.net"

// Session cache with TTL
const sessionCache = new Map<
  string,
  { session: MCPSessionManager; lastUsed: number }
>()
const SESSION_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface PipedreamHeaders {
  Authorization: string
  "x-pd-project-id": string
  "x-pd-environment": string
  "x-pd-external-user-id": string
  "x-pd-tool-mode": string
  "x-pd-app-discovery": string
}

/**
 * Get authorization headers for Pipedream MCP requests
 */
export async function getPipedreamHeaders(
  externalUserId: string
): Promise<PipedreamHeaders> {
  const clientId = process.env.PIPEDREAM_CLIENT_ID!
  const clientSecret = process.env.PIPEDREAM_CLIENT_SECRET!
  const projectId = process.env.PIPEDREAM_PROJECT_ID!

  // Use require to avoid Next.js bundling issues
  const { PipedreamClient } = require("@pipedream/sdk")

  const projectEnvironment = process.env.PIPEDREAM_PROJECT_ENVIRONMENT || "development"

  const pd = new PipedreamClient({
    clientId,
    clientSecret,
    projectId,
    projectEnvironment
  })

  const accessToken = await pd.rawAccessToken

  return {
    Authorization: `Bearer ${accessToken}`,
    "x-pd-project-id": projectId,
    "x-pd-environment":
      process.env.PIPEDREAM_PROJECT_ENVIRONMENT || "development",
    "x-pd-external-user-id": externalUserId,
    "x-pd-tool-mode": "full-config",
    "x-pd-app-discovery": "true"
  }
}

/**
 * MCPSessionManager handles connections to Pipedream's MCP server
 */
export class MCPSessionManager {
  private serverUrl: string
  private client: MCPClient | null = null
  private connectionPromise: Promise<void> | null = null
  private chatId: string
  private userId: string
  private isConnected: boolean = false
  private lastError: Error | null = null

  constructor(userId: string, chatId: string) {
    this.serverUrl = MCP_BASE_URL
    this.chatId = chatId
    this.userId = userId
  }

  /**
   * Check if the session is healthy
   */
  public isHealthy(): boolean {
    return this.isConnected && this.client !== null && this.lastError === null
  }

  /**
   * Get the last error if any
   */
  public getLastError(): Error | null {
    return this.lastError
  }

  /**
   * Connects to the MCP server
   */
  public async connect(): Promise<void> {
    // If already connected and healthy, return
    if (this.isConnected && this.client) {
      return
    }

    // If connection in progress, wait for it
    if (this.connectionPromise) {
      return this.connectionPromise
    }

    this.connectionPromise = new Promise(async (resolve, reject) => {
      try {
        console.log(`[MCP] Connecting for user ${this.userId}...`)
        const headers = await getPipedreamHeaders(this.userId)

        const transport = new StreamableHTTPClientTransport(
          new URL(this.serverUrl),
          {
            requestInit: {
              headers: {
                "x-pd-mcp-chat-id": this.chatId,
                ...headers
              }
            } as RequestInit
          }
        )

        this.client = new MCPClient(
          {
            name: "RooftopsGPT",
            version: "1.0.0"
          },
          {
            capabilities: {}
          }
        )

        await this.client.connect(transport)
        this.isConnected = true
        this.lastError = null
        console.log("[MCP] Connection established")
        resolve()
      } catch (error) {
        console.error("[MCP] Connection error:", error)
        this.lastError = error instanceof Error ? error : new Error(String(error))
        this.isConnected = false
        this.close()
        reject(new Error(`Failed to establish MCP connection: ${this.lastError.message}`))
      }
    })

    return this.connectionPromise
  }

  /**
   * Reconnect to the MCP server (force new connection)
   */
  public async reconnect(): Promise<void> {
    console.log("[MCP] Forcing reconnection...")
    this.close()
    return this.connect()
  }

  /**
   * Disconnects from the MCP server
   */
  public close(): void {
    if (this.client) {
      try {
        this.client.close()
      } catch (e) {
        // Ignore close errors
      }
      this.client = null
    }
    this.connectionPromise = null
    this.isConnected = false
  }

  /**
   * Ensure connection is healthy, reconnect if needed
   */
  private async ensureConnection(): Promise<void> {
    if (!this.isHealthy()) {
      await this.reconnect()
    }
  }

  /**
   * Selects which apps to enable tools for
   */
  public async selectApps(appSlugs: string[]): Promise<void> {
    await this.ensureConnection()

    if (!this.client) {
      throw new Error("MCP client not initialized")
    }

    try {
      console.log("[MCP] Calling select_apps with:", appSlugs)
      await this.client.callTool({
        name: "select_apps",
        arguments: { apps: appSlugs }
      })
    } catch (error) {
      console.error("[MCP] Failed to select apps:", error)
      this.lastError = error instanceof Error ? error : new Error(String(error))
      // Try reconnecting once
      await this.reconnect()
      await this.client!.callTool({
        name: "select_apps",
        arguments: { apps: appSlugs }
      })
    }
  }

  /**
   * Lists available tools from the MCP server
   */
  public async listTools(): Promise<any[]> {
    await this.ensureConnection()

    if (!this.client) {
      throw new Error("MCP client not initialized")
    }

    try {
      const mcpTools = await this.client.listTools()
      const toolNames = mcpTools.tools.map((t: any) => t.name)
      console.log(`[MCP] Available tools (${toolNames.length}):`, toolNames.slice(0, 10).join(", "), toolNames.length > 10 ? "..." : "")
      return mcpTools.tools
    } catch (error) {
      console.error("[MCP] Failed to list tools:", error)
      this.lastError = error instanceof Error ? error : new Error(String(error))
      // Try reconnecting once
      await this.reconnect()
      const mcpTools = await this.client!.listTools()
      return mcpTools.tools
    }
  }

  /**
   * Calls a specific tool with arguments
   */
  public async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<any> {
    await this.ensureConnection()

    if (!this.client) {
      throw new Error("MCP client not initialized")
    }

    console.log(`[MCP] Calling tool: ${name}`, JSON.stringify(args).slice(0, 200))

    try {
      const result = await this.client.callTool({
        name,
        arguments: args
      })
      return result
    } catch (error) {
      console.error(`[MCP] Tool call failed for ${name}:`, error)
      this.lastError = error instanceof Error ? error : new Error(String(error))

      // Try reconnecting and retrying once
      await this.reconnect()
      const result = await this.client!.callTool({
        name,
        arguments: args
      })
      return result
    }
  }

  /**
   * Finds a tool by partial name match
   */
  public async findTool(
    ...keywords: string[]
  ): Promise<{ name: string; description: string; inputSchema: any } | null> {
    const tools = await this.listTools()

    const tool = tools.find((t: any) =>
      keywords.every(kw => t.name.toLowerCase().includes(kw.toLowerCase()))
    )

    return tool || null
  }
}

/**
 * Generate a session ID for MCP
 */
export function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 15)
}

/**
 * Check if Pipedream is configured
 */
export function isPipedreamConfigured(): boolean {
  return !!(
    process.env.PIPEDREAM_CLIENT_ID &&
    process.env.PIPEDREAM_CLIENT_SECRET &&
    process.env.PIPEDREAM_PROJECT_ID
  )
}

/**
 * Get or create an MCP session for a user
 * Uses caching with TTL to avoid creating too many connections
 */
export async function getOrCreateMCPSession(
  userId: string,
  chatId: string
): Promise<MCPSessionManager> {
  const cacheKey = `${userId}-${chatId}`
  const cached = sessionCache.get(cacheKey)
  const now = Date.now()

  // Return cached session if healthy and not expired
  if (cached && cached.session.isHealthy() && now - cached.lastUsed < SESSION_TTL_MS) {
    cached.lastUsed = now
    return cached.session
  }

  // Clean up old session if exists
  if (cached) {
    cached.session.close()
    sessionCache.delete(cacheKey)
  }

  // Create new session
  const session = new MCPSessionManager(userId, chatId)
  await session.connect()

  sessionCache.set(cacheKey, { session, lastUsed: now })

  // Cleanup old sessions periodically
  cleanupStaleSessions()

  return session
}

/**
 * Clean up stale sessions from cache
 */
function cleanupStaleSessions(): void {
  const now = Date.now()
  for (const [key, value] of sessionCache.entries()) {
    if (now - value.lastUsed > SESSION_TTL_MS) {
      value.session.close()
      sessionCache.delete(key)
    }
  }
}

/**
 * Close all MCP sessions (useful for cleanup)
 */
export function closeAllSessions(): void {
  for (const [key, value] of sessionCache.entries()) {
    value.session.close()
  }
  sessionCache.clear()
}
