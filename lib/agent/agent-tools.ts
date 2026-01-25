// lib/agent/agent-tools.ts
// Built-in tools for the Rooftops AI Agent

import OpenAI from "openai"

export interface AgentTool {
  name: string
  description: string
  category: string
  parameters: Record<string, unknown>
  requiresConfirmation: boolean
}

// Built-in tools that the agent can use
export const BUILTIN_AGENT_TOOLS: AgentTool[] = [
  // Research Tools
  {
    name: "web_search",
    description:
      "Search the web for information. Use this to find current pricing, industry news, regulations, and other public information.",
    category: "research",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query"
        },
        num_results: {
          type: "number",
          description: "Number of results to return (default: 5)",
          default: 5
        }
      },
      required: ["query"]
    },
    requiresConfirmation: false
  },
  {
    name: "get_material_prices",
    description:
      "Look up current prices for roofing materials from common suppliers.",
    category: "research",
    parameters: {
      type: "object",
      properties: {
        material_type: {
          type: "string",
          description:
            "Type of material (e.g., 'asphalt shingles', 'metal roofing', 'TPO')"
        },
        brand: {
          type: "string",
          description: "Specific brand (optional)"
        },
        region: {
          type: "string",
          description: "Geographic region for pricing"
        }
      },
      required: ["material_type"]
    },
    requiresConfirmation: false
  },
  {
    name: "get_weather_forecast",
    description:
      "Get weather forecast for a location. Useful for job scheduling.",
    category: "research",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "City, state or zip code"
        },
        days: {
          type: "number",
          description: "Number of days to forecast (1-10)",
          default: 7
        }
      },
      required: ["location"]
    },
    requiresConfirmation: false
  },

  // Document Tools
  {
    name: "generate_report",
    description:
      "Generate a formatted report based on provided data. Can create inspection reports, job summaries, sales reports, etc.",
    category: "documents",
    parameters: {
      type: "object",
      properties: {
        report_type: {
          type: "string",
          enum: ["inspection", "job_summary", "sales", "estimate", "proposal"],
          description: "Type of report to generate"
        },
        title: {
          type: "string",
          description: "Report title"
        },
        data: {
          type: "object",
          description: "Data to include in the report"
        },
        format: {
          type: "string",
          enum: ["html", "markdown", "text"],
          default: "html",
          description: "Output format"
        }
      },
      required: ["report_type", "title"]
    },
    requiresConfirmation: false
  },
  {
    name: "create_estimate",
    description:
      "Create a cost estimate for a roofing job based on measurements and materials.",
    category: "documents",
    parameters: {
      type: "object",
      properties: {
        customer_name: {
          type: "string",
          description: "Customer name"
        },
        property_address: {
          type: "string",
          description: "Property address"
        },
        roof_area_sqft: {
          type: "number",
          description: "Total roof area in square feet"
        },
        material_type: {
          type: "string",
          description: "Primary roofing material"
        },
        labor_hours: {
          type: "number",
          description: "Estimated labor hours"
        },
        additional_items: {
          type: "array",
          items: { type: "string" },
          description: "Additional line items (e.g., 'gutters', 'flashing')"
        }
      },
      required: ["customer_name", "property_address", "roof_area_sqft"]
    },
    requiresConfirmation: true
  },

  // Communication Tools
  {
    name: "draft_email",
    description:
      "Draft an email. Returns the draft for review before sending.",
    category: "communication",
    parameters: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Recipient email address"
        },
        subject: {
          type: "string",
          description: "Email subject"
        },
        body: {
          type: "string",
          description: "Email body content"
        },
        tone: {
          type: "string",
          enum: ["professional", "friendly", "formal", "casual"],
          default: "professional",
          description: "Tone of the email"
        }
      },
      required: ["to", "subject"]
    },
    requiresConfirmation: false
  },
  {
    name: "send_email",
    description: "Send an email to a recipient. Requires user confirmation.",
    category: "communication",
    parameters: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Recipient email address"
        },
        subject: {
          type: "string",
          description: "Email subject"
        },
        body: {
          type: "string",
          description: "Email body content (HTML supported)"
        },
        cc: {
          type: "array",
          items: { type: "string" },
          description: "CC recipients"
        }
      },
      required: ["to", "subject", "body"]
    },
    requiresConfirmation: true
  },

  // Data Tools
  {
    name: "search_customers",
    description: "Search for customers in the CRM database.",
    category: "crm",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (name, email, phone, or address)"
        },
        status: {
          type: "string",
          enum: ["lead", "prospect", "customer", "all"],
          default: "all",
          description: "Filter by customer status"
        },
        limit: {
          type: "number",
          default: 10,
          description: "Maximum results to return"
        }
      },
      required: ["query"]
    },
    requiresConfirmation: false
  },
  {
    name: "get_customer_details",
    description: "Get detailed information about a specific customer.",
    category: "crm",
    parameters: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Customer ID"
        }
      },
      required: ["customer_id"]
    },
    requiresConfirmation: false
  },
  {
    name: "search_jobs",
    description: "Search for jobs/projects in the system.",
    category: "crm",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (customer name, address, or job ID)"
        },
        status: {
          type: "string",
          enum: [
            "scheduled",
            "in_progress",
            "completed",
            "cancelled",
            "all"
          ],
          default: "all",
          description: "Filter by job status"
        },
        date_range: {
          type: "object",
          properties: {
            start: { type: "string", description: "Start date (YYYY-MM-DD)" },
            end: { type: "string", description: "End date (YYYY-MM-DD)" }
          },
          description: "Filter by date range"
        }
      },
      required: []
    },
    requiresConfirmation: false
  },

  // Property Analysis Tools
  {
    name: "generate_property_report",
    description:
      "Generate a comprehensive property report with roof analysis and solar potential for a given address. Uses Google Solar API to analyze the roof structure, area, pitch, facets, and solar energy potential. Returns detailed information about the property including roof area in square feet, number of roof facets, roof pitch, and financial analysis for solar installation.",
    category: "documents",
    parameters: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Full property address (e.g., '123 Main St, Memphis, TN 38103')"
        },
        include_solar: {
          type: "boolean",
          description: "Include solar potential analysis (default: true)",
          default: true
        }
      },
      required: ["address"]
    },
    requiresConfirmation: false
  },

  // Artifact Generation Tools
  {
    name: "generate_artifact",
    description:
      "Generate a visual artifact like a business card, flyer, door hanger, or promotional material. Returns HTML/CSS that can be previewed and exported. Use this when the user asks you to create, design, or make a visual deliverable.",
    category: "documents",
    parameters: {
      type: "object",
      properties: {
        artifact_type: {
          type: "string",
          enum: ["business_card", "flyer", "door_hanger", "postcard", "email_template", "social_post"],
          description: "Type of artifact to generate"
        },
        title: {
          type: "string",
          description: "Main headline or title text"
        },
        company_name: {
          type: "string",
          description: "Business/company name"
        },
        tagline: {
          type: "string",
          description: "Company tagline or subtitle"
        },
        contact_info: {
          type: "object",
          properties: {
            phone: { type: "string" },
            email: { type: "string" },
            website: { type: "string" },
            address: { type: "string" }
          },
          description: "Contact information to include"
        },
        key_services: {
          type: "array",
          items: { type: "string" },
          description: "List of key services or features to highlight"
        },
        offer: {
          type: "string",
          description: "Special offer or call-to-action (e.g., 'Free Inspection', '10% Off')"
        },
        style: {
          type: "string",
          enum: ["professional", "modern", "bold", "minimal", "classic"],
          default: "professional",
          description: "Visual style for the design"
        },
        primary_color: {
          type: "string",
          description: "Primary brand color (hex code like #24BDEB)"
        }
      },
      required: ["artifact_type", "company_name"]
    },
    requiresConfirmation: false
  },

  // Scheduling Tools
  {
    name: "check_calendar",
    description: "Check calendar availability for a date range.",
    category: "scheduling",
    parameters: {
      type: "object",
      properties: {
        start_date: {
          type: "string",
          description: "Start date (YYYY-MM-DD)"
        },
        end_date: {
          type: "string",
          description: "End date (YYYY-MM-DD)"
        },
        resource: {
          type: "string",
          description: "Specific resource/crew to check (optional)"
        }
      },
      required: ["start_date"]
    },
    requiresConfirmation: false
  },
  {
    name: "schedule_appointment",
    description:
      "Schedule an appointment or job. Requires user confirmation.",
    category: "scheduling",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Appointment title"
        },
        date: {
          type: "string",
          description: "Date (YYYY-MM-DD)"
        },
        time: {
          type: "string",
          description: "Time (HH:MM)"
        },
        duration_hours: {
          type: "number",
          description: "Duration in hours"
        },
        customer_id: {
          type: "string",
          description: "Associated customer ID (optional)"
        },
        location: {
          type: "string",
          description: "Location/address"
        },
        notes: {
          type: "string",
          description: "Additional notes"
        }
      },
      required: ["title", "date", "time"]
    },
    requiresConfirmation: true
  }
]

// Convert agent tools to OpenAI function format
export function convertToOpenAITools(
  tools: AgentTool[]
): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return tools.map(tool => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }))
}

// Get all available tools including built-in and MCP tools
export function getAllAgentTools(mcpTools?: AgentTool[]): AgentTool[] {
  const allTools = [...BUILTIN_AGENT_TOOLS]
  if (mcpTools) {
    allTools.push(...mcpTools)
  }
  return allTools
}

// Check if a tool requires user confirmation
export function toolRequiresConfirmation(toolName: string): boolean {
  const tool = BUILTIN_AGENT_TOOLS.find(t => t.name === toolName)
  if (tool) {
    return tool.requiresConfirmation
  }
  // For unknown tools, check if name suggests write operation
  const writeKeywords = [
    "send",
    "create",
    "update",
    "delete",
    "schedule",
    "submit",
    "post"
  ]
  return writeKeywords.some(keyword =>
    toolName.toLowerCase().includes(keyword)
  )
}

// Get tools by category
export function getToolsByCategory(category: string): AgentTool[] {
  return BUILTIN_AGENT_TOOLS.filter(tool => tool.category === category)
}
