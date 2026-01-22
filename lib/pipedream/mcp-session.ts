import { Client as MCPClient } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"

const MCP_BASE_URL =
  process.env.PIPEDREAM_MCP_URL || "https://remote.mcp.pipedream.net"

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

  const pd = new PipedreamClient({
    clientId,
    clientSecret,
    projectId
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

  constructor(userId: string, chatId: string) {
    this.serverUrl = MCP_BASE_URL
    this.chatId = chatId
    this.userId = userId
  }

  /**
   * Connects to the MCP server
   */
  public async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise
    }

    this.connectionPromise = new Promise(async (resolve, reject) => {
      try {
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
        console.log("[MCP] Connection established")
        resolve()
      } catch (error) {
        console.error("[MCP] Connection error:", error)
        this.close()
        reject(new Error("Failed to establish MCP connection"))
      }
    })

    return this.connectionPromise
  }

  /**
   * Disconnects from the MCP server
   */
  public close(): void {
    if (this.client) {
      this.client.close()
      this.client = null
    }
    this.connectionPromise = null
  }

  /**
   * Selects which apps to enable tools for
   */
  public async selectApps(appSlugs: string[]): Promise<void> {
    await this.connect()

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
      throw error
    }
  }

  /**
   * Lists available tools from the MCP server
   */
  public async listTools(): Promise<any[]> {
    await this.connect()

    if (!this.client) {
      throw new Error("MCP client not initialized")
    }

    const mcpTools = await this.client.listTools()
    console.log(
      "[MCP] Available tools:",
      mcpTools.tools.map((t: any) => t.name).join(", ")
    )
    return mcpTools.tools
  }

  /**
   * Calls a specific tool with arguments
   */
  public async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<any> {
    await this.connect()

    if (!this.client) {
      throw new Error("MCP client not initialized")
    }

    console.log(`[MCP] Calling tool: ${name}`, args)
    const result = await this.client.callTool({
      name,
      arguments: args
    })

    return result
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
