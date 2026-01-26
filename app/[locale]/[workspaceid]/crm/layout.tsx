"use client"

import { ReactNode } from "react"
import { useParams, usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  IconUsers,
  IconBriefcase,
  IconUsersGroup,
  IconMessageCircle,
  IconMailForward,
  IconChartBar
} from "@tabler/icons-react"

interface CRMLayoutProps {
  children: ReactNode
}

const crmNavItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: IconChartBar,
    href: (workspaceId: string) => `/${workspaceId}/crm`
  },
  {
    id: "customers",
    label: "Customers",
    icon: IconUsers,
    href: (workspaceId: string) => `/${workspaceId}/crm/customers`
  },
  {
    id: "jobs",
    label: "Jobs",
    icon: IconBriefcase,
    href: (workspaceId: string) => `/${workspaceId}/crm/jobs`
  },
  {
    id: "crews",
    label: "Crews",
    icon: IconUsersGroup,
    href: (workspaceId: string) => `/${workspaceId}/crm/crews`
  },
  {
    id: "inbox",
    label: "Inbox",
    icon: IconMessageCircle,
    href: (workspaceId: string) => `/${workspaceId}/crm/inbox`
  },
  {
    id: "sequences",
    label: "Sequences",
    icon: IconMailForward,
    href: (workspaceId: string) => `/${workspaceId}/crm/sequences`
  }
]

export default function CRMLayout({ children }: CRMLayoutProps) {
  const params = useParams()
  const pathname = usePathname()
  const workspaceId = params.workspaceid as string

  const isActive = (href: string) => {
    if (href === `/${workspaceId}/crm`) {
      return pathname === href || pathname === `/${workspaceId}/crm/`
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="flex h-full flex-col">
      {/* CRM Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Employee CRM</h1>
            <p className="text-sm text-gray-500">
              Manage customers, jobs, and automated follow-ups
            </p>
          </div>
        </div>

        {/* CRM Navigation Tabs */}
        <nav className="mt-4 flex gap-1">
          {crmNavItems.map(item => {
            const Icon = item.icon
            const href = item.href(workspaceId)
            const active = isActive(href)

            return (
              <Link
                key={item.id}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-purple-100 text-purple-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* CRM Content */}
      <div className="flex-1 overflow-auto bg-gray-50">{children}</div>
    </div>
  )
}
