"use client"

import {
  IconExternalLink,
  IconSearch,
  IconWorld
} from "@tabler/icons-react"

interface SearchResult {
  title: string
  description: string
  url: string
}

interface SearchData {
  status: string
  query: string
  results: SearchResult[]
  result_count: number
}

interface AgentSearchResultsCardProps {
  data: SearchData
}

export function AgentSearchResultsCard({ data }: AgentSearchResultsCardProps) {
  if (data.status !== "success" || !data.results || data.results.length === 0) {
    return null
  }

  const getDomain = (url: string) => {
    try {
      const domain = new URL(url).hostname.replace("www.", "")
      return domain
    } catch {
      return url
    }
  }

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-purple-500/5 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-blue-500/15 bg-gradient-to-r from-blue-500/10 to-purple-500/10 px-4 py-2">
        <IconSearch className="size-4 text-blue-400" />
        <span className="text-sm font-light text-foreground">
          Found {data.result_count} results for &quot;{data.query}&quot;
        </span>
      </div>

      {/* Results */}
      <div className="divide-y divide-blue-500/10">
        {data.results.slice(0, 5).map((result, index) => (
          <a
            key={index}
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-3 transition-all hover:bg-blue-500/10"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/15 to-purple-500/15">
                <IconWorld className="size-4 text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="truncate text-sm font-medium text-blue-400 hover:underline">
                    {result.title}
                  </h4>
                  <IconExternalLink className="size-3 shrink-0 text-muted-foreground" />
                </div>
                <p className="mt-0.5 text-xs font-light text-green-400">{getDomain(result.url)}</p>
                <p className="mt-1 line-clamp-2 text-sm font-light text-muted-foreground">
                  {result.description}
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Footer */}
      {data.results.length > 5 && (
        <div className="border-t border-blue-500/15 bg-gradient-to-r from-blue-500/10 to-purple-500/10 px-4 py-2 text-center text-xs font-light text-muted-foreground">
          Showing top 5 of {data.results.length} results
        </div>
      )}
    </div>
  )
}
