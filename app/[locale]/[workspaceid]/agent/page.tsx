// app/[locale]/[workspaceid]/agent/page.tsx
"use client"

import { useParams } from "next/navigation"
import { AgentPanel } from "@/components/agent-v2"

export default function AgentPage() {
  const params = useParams()
  const workspaceId = params.workspaceid as string

  return (
    <div className="h-full">
      <AgentPanel workspaceId={workspaceId} />
    </div>
  )
}
