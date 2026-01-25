"use client"

import { useState } from "react"
import {
  IconMail,
  IconUser,
  IconChevronDown,
  IconChevronUp,
  IconCopy,
  IconCheck
} from "@tabler/icons-react"

interface EmailDraft {
  to: string
  subject: string
  body: string
}

interface EmailDraftData {
  status: string
  draft: EmailDraft
  message?: string
}

interface AgentEmailDraftCardProps {
  data: EmailDraftData
}

export function AgentEmailDraftCard({ data }: AgentEmailDraftCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [copied, setCopied] = useState(false)

  if (data.status !== "success" || !data.draft) {
    return null
  }

  const { draft } = data

  const handleCopy = async () => {
    const emailText = `To: ${draft.to}\nSubject: ${draft.subject}\n\n${draft.body}`
    await navigator.clipboard.writeText(emailText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-purple-500/5 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-blue-500/15 bg-gradient-to-r from-blue-500/15 to-purple-500/15 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/20 to-purple-500/20 shadow-sm shadow-blue-500/10">
            <IconMail className="size-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Email Draft</h3>
            <p className="text-sm font-light text-muted-foreground">Review before sending</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 px-2.5 py-1.5 text-xs font-light text-foreground shadow-sm transition-all hover:border-blue-500/30 hover:from-blue-500/15 hover:to-purple-500/15"
          >
            {copied ? (
              <>
                <IconCheck className="size-3 text-green-400" />
                Copied
              </>
            ) : (
              <>
                <IconCopy className="size-3" />
                Copy
              </>
            )}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-xl border border-transparent p-1.5 text-muted-foreground transition-all hover:border-blue-500/20 hover:bg-blue-500/10 hover:text-foreground"
          >
            {isExpanded ? (
              <IconChevronUp className="size-5" />
            ) : (
              <IconChevronDown className="size-5" />
            )}
          </button>
        </div>
      </div>

      {/* Email Preview */}
      {isExpanded && (
        <div className="p-4">
          {/* Email Header */}
          <div className="mb-4 space-y-2 border-b border-blue-500/15 pb-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-16 font-light text-muted-foreground">To:</span>
              <span className="font-light text-foreground">{draft.to}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-16 font-light text-muted-foreground">Subject:</span>
              <span className="font-medium text-foreground">{draft.subject}</span>
            </div>
          </div>

          {/* Email Body */}
          <div className="prose prose-slate dark:prose-invert prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-sm font-light text-foreground/80">
              {draft.body}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-blue-500/15 bg-gradient-to-r from-blue-500/10 to-purple-500/10 px-4 py-2 text-xs font-light text-muted-foreground">
        {data.message || "To send this email, connect your email account in Settings."}
      </div>
    </div>
  )
}
