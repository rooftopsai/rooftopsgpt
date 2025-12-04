"use client"

import { useChatbotUI } from "@/context/context"
import { IconHome, IconMapPin, IconTrash } from "@tabler/icons-react"
import { FC, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"

interface PropertyReport {
  id: string
  address: string
  latitude: number
  longitude: number
  facet_count: number | null
  roof_area: number | null
  squares: number | null
  pitch: string | null
  complexity: string | null
  confidence: string | null
  material: string | null
  condition: string | null
  user_summary: string | null
  created_at: string
}

export const ReportsList: FC = () => {
  const router = useRouter()
  const { selectedWorkspace } = useChatbotUI()
  const [reports, setReports] = useState<PropertyReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<string | null>(null)

  useEffect(() => {
    if (selectedWorkspace) {
      fetchReports()
    }
  }, [selectedWorkspace])

  const fetchReports = async () => {
    if (!selectedWorkspace) return

    try {
      setIsLoading(true)
      const response = await fetch(
        `/api/property-reports?workspace_id=${selectedWorkspace.id}`
      )

      if (response.ok) {
        const data = await response.json()
        setReports(data)
      }
    } catch (error) {
      console.error("Error fetching property reports:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteReport = async (
    reportId: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation()

    if (!confirm("Are you sure you want to delete this property report?")) {
      return
    }

    try {
      const response = await fetch(`/api/property-reports/${reportId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        setReports(reports.filter(r => r.id !== reportId))
      }
    } catch (error) {
      console.error("Error deleting property report:", error)
    }
  }

  const handleViewReport = (reportId: string) => {
    setSelectedReport(reportId)
    // Navigate to explore page with report ID parameter
    router.push(`/${selectedWorkspace?.id}/explore?reportId=${reportId}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-muted-foreground text-sm">Loading reports...</div>
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <IconHome size={48} className="text-muted-foreground mb-4" />
        <div className="text-muted-foreground mb-2 text-sm font-medium">
          No property reports yet
        </div>
        <div className="text-muted-foreground text-xs">
          Create your first report by analyzing a property
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-2 overflow-y-auto">
      {reports.map(report => (
        <div
          key={report.id}
          onClick={() => handleViewReport(report.id)}
          className={`hover:bg-accent group relative flex cursor-pointer flex-col rounded-lg border p-3 transition-colors ${
            selectedReport === report.id
              ? "bg-accent border-primary"
              : "border-border"
          }`}
        >
          {/* Address */}
          <div className="mb-1 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <IconMapPin size={16} className="text-muted-foreground mt-0.5" />
              <div className="line-clamp-2 text-sm font-medium">
                {report.address}
              </div>
            </div>

            {/* Delete button */}
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 transition-opacity group-hover:opacity-100"
              onClick={e => handleDeleteReport(report.id, e)}
            >
              <IconTrash size={16} />
            </Button>
          </div>

          {/* Report details */}
          <div className="text-muted-foreground mt-2 flex flex-wrap gap-2 text-xs">
            {report.roof_area && (
              <span className="rounded-md bg-blue-500/10 px-2 py-1 text-blue-600 dark:text-blue-400">
                {report.roof_area.toLocaleString()} sq ft
              </span>
            )}
            {report.squares && (
              <span className="rounded-md bg-green-500/10 px-2 py-1 text-green-600 dark:text-green-400">
                {report.squares} squares
              </span>
            )}
            {report.pitch && (
              <span className="rounded-md bg-purple-500/10 px-2 py-1 text-purple-600 dark:text-purple-400">
                {report.pitch} pitch
              </span>
            )}
            {report.facet_count && (
              <span className="rounded-md bg-orange-500/10 px-2 py-1 text-orange-600 dark:text-orange-400">
                {report.facet_count} facets
              </span>
            )}
          </div>

          {/* Timestamp */}
          <div className="text-muted-foreground mt-2 text-xs">
            {formatDistanceToNow(new Date(report.created_at), {
              addSuffix: true
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
