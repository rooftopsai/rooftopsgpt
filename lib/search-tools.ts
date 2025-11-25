// Search tools for RAG + Brave Search

export interface RAGResult {
  content: string
  similarity: float
  document_title?: string
  file_name?: string
}

export interface BraveSearchResult {
  title: string
  description: string
  url: string
}

/**
 * Search the RAG document database
 */
export async function searchDocuments(
  query: string,
  workspaceId: string,
  matchThreshold: number = 0.7,
  matchCount: number = 5
): Promise<RAGResult[]> {
  const response = await fetch("/api/documents/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      workspaceId,
      matchThreshold,
      matchCount
    })
  })

  if (!response.ok) {
    throw new Error("Failed to search documents")
  }

  const data = await response.json()
  return data.results || []
}

/**
 * Search roofing manufacturer websites using Brave Search
 */
export async function searchManufacturerSites(
  query: string,
  manufacturers: string[] = ["gaf.com", "owenscorning.com", "certainteed.com"]
): Promise<BraveSearchResult[]> {
  // Add site: operators to search specific manufacturers
  const siteQueries = manufacturers.map(site => `site:${site}`).join(" OR ")
  const fullQuery = `${query} (${siteQueries})`

  const response = await fetch("/api/search/brave", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: fullQuery })
  })

  if (!response.ok) {
    throw new Error("Failed to search manufacturer sites")
  }

  const data = await response.json()
  return data.results || []
}

/**
 * Combined search: RAG + Brave Search
 * Returns both internal documents and web results
 */
export async function searchAll(
  query: string,
  workspaceId: string
): Promise<{
  documents: RAGResult[]
  webResults: BraveSearchResult[]
}> {
  const [documents, webResults] = await Promise.all([
    searchDocuments(query, workspaceId).catch(() => []),
    searchManufacturerSites(query).catch(() => [])
  ])

  return { documents, webResults }
}
