"use client"

import { useChatbotUI } from "@/context/context"
import { IconHome, IconPlus, IconTrash } from "@tabler/icons-react"
import { FC, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

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

  console.log("📋 ReportsList: Component rendered")
  console.log("📋 ReportsList: selectedWorkspace:", selectedWorkspace)

  useEffect(() => {
    console.log("📋 ReportsList: useEffect triggered")
    if (selectedWorkspace) {
      fetchReports()
    }
  }, [selectedWorkspace])

  const fetchReports = async () => {
    if (!selectedWorkspace) {
      console.log("📋 ReportsList: No selectedWorkspace")
      return
    }

    try {
      setIsLoading(true)
      console.log(
        "📋 ReportsList: Fetching reports for workspace:",
        selectedWorkspace.id
      )
      const response = await fetch(
        `/api/property-reports?workspace_id=${selectedWorkspace.id}`
      )

      console.log("📋 ReportsList: Response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("📋 ReportsList: Fetched reports:", data)
        setReports(data)
      } else {
        console.error(
          "📋 ReportsList: Failed to fetch reports:",
          response.statusText
        )
      }
    } catch (error) {
      console.error("📋 ReportsList: Error fetching property reports:", error)
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

  const handleNewReport = () => {
    // Navigate to explore page to create a new report
    router.push(`/${selectedWorkspace?.id}/explore`)
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        {/* New Report Button */}
        <div className="mb-4 px-2">
          <Button
            variant="ghost"
            className="hover:border-border flex h-[36px] w-full justify-start border-0 border-b border-transparent bg-transparent font-semibold hover:bg-transparent"
            style={{ padding: "0px 10px 0px 4px" }}
            onClick={handleNewReport}
          >
            <IconPlus className="mr-2" size={20} strokeWidth={2} />
            New Report
          </Button>
        </div>

        <div className="flex flex-1 items-center justify-center p-4">
          <div className="text-muted-foreground text-sm">
            Loading reports...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* New Report Button */}
      <div className="mb-4 px-2">
        <Button
          variant="ghost"
          className="hover:border-border flex h-[36px] w-full justify-start border-0 border-b border-transparent bg-transparent font-semibold hover:bg-transparent"
          style={{ padding: "0px 10px 0px 4px" }}
          onClick={handleNewReport}
        >
          <IconPlus className="mr-2" size={20} strokeWidth={2} />
          New Report
        </Button>
      </div>

      {reports.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <IconHome size={48} className="text-muted-foreground mb-4" />
          <div className="text-muted-foreground mb-2 text-sm font-medium">
            No property reports yet
          </div>
          <div className="text-muted-foreground text-xs">
            Create your first report by analyzing a property
          </div>
        </div>
      ) : (
        <>
          {/* History Header */}
          <div className="text-muted-foreground mb-2 px-2 text-xs font-semibold">
            HISTORY
          </div>

          {/* Reports List */}
          <div className="flex-1 space-y-2 overflow-y-auto px-2">
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
                <div className="mb-1 pr-8">
                  <div className="line-clamp-2 text-sm font-medium">
                    {report.address}
                  </div>
                </div>

                {/* Date */}
                <div className="text-muted-foreground text-xs">
                  {format(
                    new Date(report.created_at),
                    "MMM d, yyyy 'at' h:mm a"
                  )}
                </div>

                {/* Delete button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 size-6 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={e => handleDeleteReport(report.id, e)}
                >
                  <IconTrash size={14} />
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
