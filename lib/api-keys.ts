// lib/api-keys.ts
// Centralized API key management for multi-tenant SaaS
// All users share these global API keys

export const GLOBAL_API_KEYS = {
  // OpenAI
  openai: process.env.GLOBAL_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  openai_org: process.env.GLOBAL_OPENAI_ORG_ID,

  // Anthropic
  anthropic:
    process.env.GLOBAL_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,

  // Google Gemini
  google_gemini:
    process.env.GLOBAL_GOOGLE_GEMINI_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY,

  // Groq
  groq: process.env.GLOBAL_GROQ_API_KEY || process.env.GROQ_API_KEY,

  // Mistral
  mistral: process.env.GLOBAL_MISTRAL_API_KEY || process.env.MISTRAL_API_KEY,

  // Perplexity
  perplexity:
    process.env.GLOBAL_PERPLEXITY_API_KEY || process.env.PERPLEXITY_API_KEY,

  // OpenRouter
  openrouter:
    process.env.GLOBAL_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY,

  // xAI Grok
  xai: process.env.GLOBAL_XAI_API_KEY || process.env.XAI_API_KEY,

  // Azure OpenAI
  azure_openai:
    process.env.GLOBAL_AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY,
  azure_openai_endpoint:
    process.env.GLOBAL_AZURE_OPENAI_ENDPOINT ||
    process.env.AZURE_OPENAI_ENDPOINT,
  azure_openai_35_turbo_id: process.env.GLOBAL_AZURE_OPENAI_35_TURBO_ID,
  azure_openai_45_turbo_id: process.env.GLOBAL_AZURE_OPENAI_45_TURBO_ID,
  azure_openai_45_vision_id: process.env.GLOBAL_AZURE_OPENAI_45_VISION_ID,

  // Other services
  brave_search: process.env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_AI_API_KEY
} as const

// Validation function to check if required keys are set
export function validateApiKeys(): { valid: boolean; missing: string[] } {
  const requiredKeys = ["openai", "anthropic"]
  const missing: string[] = []

  for (const key of requiredKeys) {
    if (!GLOBAL_API_KEYS[key as keyof typeof GLOBAL_API_KEYS]) {
      missing.push(key)
    }
  }

  return {
    valid: missing.length === 0,
    missing
  }
}

// Helper to check if a specific provider is configured
export function isProviderConfigured(
  provider: keyof typeof GLOBAL_API_KEYS
): boolean {
  return !!GLOBAL_API_KEYS[provider]
}
