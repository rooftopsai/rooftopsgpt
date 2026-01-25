"use client"

import {
  IconCurrencyDollar,
  IconExternalLink,
  IconInfoCircle
} from "@tabler/icons-react"

interface PriceSource {
  title: string
  snippet: string
  url: string
}

interface MaterialPricesData {
  status: string
  material: string
  region?: string
  price_sources?: PriceSource[]
  note?: string
  message?: string
}

interface AgentMaterialPricesCardProps {
  data: MaterialPricesData
}

export function AgentMaterialPricesCard({ data }: AgentMaterialPricesCardProps) {
  if (data.status !== "success" || !data.price_sources || data.price_sources.length === 0) {
    return null
  }

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace("www.", "")
    } catch {
      return url
    }
  }

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-purple-500/5 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-blue-500/15 bg-gradient-to-r from-green-500/15 to-emerald-500/15 px-4 py-3">
        <div className="flex size-10 items-center justify-center rounded-xl border border-green-500/30 bg-gradient-to-br from-green-500/20 to-emerald-500/20 shadow-sm shadow-green-500/10">
          <IconCurrencyDollar className="size-5 text-green-400" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Material Pricing</h3>
          <p className="text-sm font-light text-muted-foreground">
            {data.material} {data.region && `• ${data.region}`}
          </p>
        </div>
      </div>

      {/* Price Sources */}
      <div className="divide-y divide-blue-500/10">
        {data.price_sources.map((source, index) => (
          <a
            key={index}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-3 transition-all hover:bg-blue-500/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-medium text-blue-400 hover:underline">
                  {source.title}
                </h4>
                <p className="mt-0.5 text-xs font-light text-green-400">{getDomain(source.url)}</p>
                <p className="mt-1 line-clamp-2 text-sm font-light text-muted-foreground">
                  {source.snippet}
                </p>
              </div>
              <IconExternalLink className="size-4 shrink-0 text-muted-foreground" />
            </div>
          </a>
        ))}
      </div>

      {/* Note */}
      {data.note && (
        <div className="flex items-start gap-2 border-t border-blue-500/15 bg-gradient-to-r from-blue-500/10 to-purple-500/10 px-4 py-2 text-xs font-light text-muted-foreground">
          <IconInfoCircle className="mt-0.5 size-4 shrink-0 text-blue-400" />
          <span>{data.note}</span>
        </div>
      )}
    </div>
  )
}
