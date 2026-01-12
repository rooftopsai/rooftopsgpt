// components/property/property-report.tsx

import React, { FC, useState, useRef } from "react"
import { GeneratedReport } from "@/lib/property/report-generator"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import {
  IconLoader2,
  IconCamera,
  IconBuildingSkyscraper
} from "@tabler/icons-react"

interface PropertyReportMessageProps {
  message: any
  reportData?: GeneratedReport
}

export const PropertyReportMessage: FC<PropertyReportMessageProps> = ({
  message,
  reportData
}) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "roof" | "solar" | "recommendations" | "images"
  >("overview")
  const [isDownloading, setIsDownloading] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<number>>(new Set())
  const reportRef = useRef<HTMLDivElement>(null)

  // Placeholder image for fallback
  const PLACEHOLDER_IMAGE =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='system-ui' font-size='16' fill='%239ca3af'%3EImage Not Available%3C/text%3E%3C/svg%3E"

  // If no report data, render a standard message
  if (!reportData) {
    return (
      <div className="flex flex-col gap-2 whitespace-pre-wrap">
        {message.content}
      </div>
    )
  }

  // Parse the JSON data for easier access - ensure we have a default empty object
  const data = reportData.jsonData || {}

  // Initialize default structures to prevent undefined errors
  const propertyData = {
    address: "",
    details: {
      propertyType: "Unknown",
      yearBuilt: "Unknown",
      squareFeet: "Unknown",
      lotSize: "Unknown",
      groundArea: null
    }
  }

  const roofData = {
    summary: {
      area: 0,
      totalRoofSquares: null,
      facets: 0,
      pitch: "Unknown"
    },
    facetDetails: []
  }

  const solarData = {
    potential: {
      maxPanels: 0,
      yearlyEnergy: 0,
      sunshineHours: 0,
      suitabilityScore: "Unknown"
    },
    financials: {
      installationCost: 0,
      netSavings: 0,
      lifetimeUtilityBill: 0,
      totalCostWithSolar: 0,
      costWithoutSolar: 0,
      paybackPeriodYears: null,
      monthlyUtilityBill: null
    }
  }

  // Extract captured images from report data if they exist
  const capturedImages =
    data.enhancedAnalysis?.capturedImages ||
    data.satelliteViews ||
    data.enhancedAnalysis?.satelliteViews ||
    data.imageData ||
    []

  // Safe extraction of data from potentially nested objects
  const safeExtract = (obj, path, defaultValue) => {
    const parts = path.split(".")
    let current = obj

    for (const part of parts) {
      if (current == null || typeof current !== "object") {
        return defaultValue
      }
      current = current[part]
    }

    return current !== undefined ? current : defaultValue
  }

  // Get property address from any of the possible paths
  const getPropertyAddress = () => {
    return (
      safeExtract(data, "property.address", "") ||
      safeExtract(data, "address.fullAddress", "") ||
      safeExtract(data, "propertyData.address.fullAddress", "Property Address")
    )
  }

  // Get generated date or default to today
  const getGeneratedDate = () => {
    const date = safeExtract(data, "metadata.generated", null)
    return date
      ? new Date(date).toLocaleDateString()
      : new Date().toLocaleDateString()
  }

  // Load property details safely
  const loadPropertyDetails = () => {
    const details =
      safeExtract(data, "property.details", {}) ||
      safeExtract(data, "propertyData.details", {}) ||
      {}

    return {
      propertyType: details.propertyType || "Unknown",
      yearBuilt: details.yearBuilt || "Unknown",
      squareFeet: details.squareFeet || "Unknown",
      lotSize: details.lotSize || "Unknown",
      groundArea: details.groundArea || null
    }
  }

  // Load roof summary safely
  const loadRoofSummary = () => {
    const summary =
      safeExtract(data, "roof.summary", {}) ||
      safeExtract(data, "propertyData.roof.summary", {}) ||
      {}

    return {
      area: summary.area || 0,
      totalRoofSquares: summary.totalRoofSquares || null,
      facets: summary.facets || 0,
      pitch: summary.pitch || "Unknown"
    }
  }

  // Load solar data safely
  const loadSolarData = () => {
    const potential =
      safeExtract(data, "solar.potential", {}) ||
      safeExtract(data, "propertyData.solar.potential", {}) ||
      {}

    const financials =
      safeExtract(data, "solar.financials", {}) ||
      safeExtract(data, "propertyData.solar.financials", {}) ||
      {}

    return {
      potential: {
        maxPanels: potential.maxPanels || 0,
        yearlyEnergy: potential.yearlyEnergy || 0,
        sunshineHours: potential.sunshineHours || 0,
        suitabilityScore: potential.suitabilityScore || "Unknown"
      },
      financials: {
        installationCost: financials.installationCost || 0,
        netSavings: financials.netSavings || 0,
        lifetimeUtilityBill: financials.lifetimeUtilityBill || 0,
        totalCostWithSolar: financials.totalCostWithSolar || 0,
        costWithoutSolar: financials.costWithoutSolar || 0,
        paybackPeriodYears: financials.paybackPeriodYears || null,
        monthlyUtilityBill: financials.monthlyUtilityBill || null
      }
    }
  }

  // Load roof facet details safely
  const loadRoofFacetDetails = () => {
    return (
      safeExtract(data, "roof.facetDetails", []) ||
      safeExtract(data, "propertyData.roof.facetDetails", []) ||
      []
    )
  }

  // Function to download as PDF
  const downloadAsPDF = async () => {
    if (!reportRef.current) return

    setIsDownloading(true)

    try {
      // Create a temporary div with all tabs visible for PDF
      const tempDiv = document.createElement("div")
      tempDiv.className = reportRef.current.className
      tempDiv.style.position = "absolute"
      tempDiv.style.left = "-9999px"
      tempDiv.style.width = "850px" // Fixed width for PDF
      document.body.appendChild(tempDiv)

      // Clone the report content
      const reportClone = reportRef.current.cloneNode(true) as HTMLDivElement

      // Show all tabs in the clone by removing hidden classes
      const tabContents = reportClone.querySelectorAll("[data-tab-content]")
      tabContents.forEach(tab => {
        ;(tab as HTMLElement).style.display = "block"
      })

      tempDiv.appendChild(reportClone)

      // Generate PDF
      const pdf = new jsPDF("p", "mm", "a4")
      const pageWidth = pdf.internal.pageSize.getWidth()

      // Add logo to top left
      const logoUrl =
        "https://uploads-ssl.webflow.com/64e9150f53771ac56ef528b7/64ee16bb300d3e08d25a03ac_rooftops-logo-gr-black.png"

      // First load the logo image
      const logoImg = new Image()
      logoImg.crossOrigin = "Anonymous"

      // Wait for the logo to load before continuing
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve
        logoImg.onerror = reject
        logoImg.src = logoUrl
      })

      // Calculate logo dimensions (max width of 100px)
      const logoWidth = 30 // 30mm is approximately 100px
      const logoHeight = logoWidth * (logoImg.height / logoImg.width)

      // Add the logo
      pdf.addImage(logoImg, "PNG", 14, 10, logoWidth, logoHeight)

      // Add title (move it down a bit to accommodate the logo)
      pdf.setFontSize(16)
      pdf.text(`Property Report: ${getPropertyAddress()}`, 14, logoHeight + 20)
      pdf.setFontSize(10)
      pdf.text(`Generated on ${getGeneratedDate()}`, 14, logoHeight + 27)
      pdf.line(14, logoHeight + 30, pageWidth - 14, logoHeight + 30)

      let currentY = logoHeight + 35
      const maxY = 280 // Max content height per page

      // Capture each tab section
      const sections = [
        { title: "Property Overview", id: "overview" },
        { title: "Roof Analysis", id: "roof" },
        { title: "Solar Potential", id: "solar" },
        { title: "Captured Images", id: "images" },
        { title: "Recommendations", id: "recommendations" }
      ]

      for (const section of sections) {
        const sectionElement = tempDiv.querySelector(
          `[data-tab-content="${section.id}"]`
        )
        if (!sectionElement) continue

        // Add section title
        pdf.setFontSize(14)
        pdf.text(section.title, 14, currentY)
        currentY += 8

        // Need to check if we need a new page
        if (currentY > maxY) {
          pdf.addPage()
          currentY = 20
        }

        // Convert section to image
        const canvas = await html2canvas(sectionElement as HTMLElement, {
          scale: 2,
          useCORS: true,
          logging: false
        })

        // Calculate image size
        const imgWidth = pageWidth - 28 // 14mm margin on each side
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        // Check if we need a new page for this section
        if (currentY + imgHeight > maxY) {
          pdf.addPage()
          currentY = 20
        }

        // Add image to PDF
        pdf.addImage(
          canvas.toDataURL("image/jpeg", 0.9),
          "JPEG",
          14,
          currentY,
          imgWidth,
          imgHeight
        )

        currentY += imgHeight + 10

        // Add a new page for the next section if needed
        if (
          currentY > maxY &&
          section.id !== sections[sections.length - 1].id
        ) {
          pdf.addPage()
          currentY = 20
        }
      }

      // Add footer
      pdf.setFontSize(8)
      pdf.text(
        "This report was generated using the Rooftops AI property analysis system.",
        14,
        285
      )

      // Save the PDF
      pdf.save(
        `Property_Report_${getPropertyAddress().replace(/[^a-zA-Z0-9]/g, "_")}.pdf`
      )

      // Clean up
      document.body.removeChild(tempDiv)
    } catch (error) {
      console.error("Error generating PDF:", error)
    } finally {
      setIsDownloading(false)
    }
  }

  // Load data using the safe methods
  const propertyDetails = loadPropertyDetails()
  const roofSummary = loadRoofSummary()
  const solarInfo = loadSolarData()
  const facetDetails = loadRoofFacetDetails()

  // Helper to safely format a number with commas
  const formatNumber = (num, fixed = 0) => {
    if (num === undefined || num === null) return "0"
    return parseFloat(num.toString()).toLocaleString(undefined, {
      maximumFractionDigits: fixed
    })
  }

  return (
    <div
      ref={reportRef}
      className="mx-auto flex w-full max-w-4xl flex-col gap-2 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md"
    >
      {/* Header with download button */}
      <div className="flex flex-wrap items-center justify-between border-b border-gray-200 bg-gray-50 p-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Property Report: {getPropertyAddress()}
          </h2>
          <p className="text-sm text-gray-500">
            Generated on {getGeneratedDate()}
          </p>
        </div>

        <button
          onClick={downloadAsPDF}
          disabled={isDownloading}
          className="mt-2 flex items-center rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 sm:mt-0"
        >
          {isDownloading ? (
            <>
              <IconLoader2 className="mr-2 size-5" />
              <span>Generating PDF...</span>
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mr-2 size-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>Download PDF</span>
            </>
          )}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto border-b border-gray-200">
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "overview"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "roof"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("roof")}
        >
          Roof Analysis
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "solar"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("solar")}
        >
          Solar Potential
        </button>
        <button
          className={`flex items-center px-4 py-2 text-sm font-medium ${
            activeTab === "images"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("images")}
        >
          <IconCamera size={16} className="mr-1" />
          Captured Images{" "}
          {capturedImages.length > 0 && `(${capturedImages.length})`}
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "recommendations"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("recommendations")}
        >
          Recommendations
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        <div
          data-tab-content="overview"
          className={activeTab === "overview" ? "block" : "hidden space-y-4"}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="mb-2 text-lg font-medium text-gray-800">
                Property Details
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Property Type:</span>
                  <span className="font-medium">
                    {propertyDetails.propertyType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Year Built:</span>
                  <span className="font-medium">
                    {propertyDetails.yearBuilt}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Square Footage:</span>
                  <span className="font-medium">
                    {propertyDetails.squareFeet} sq ft
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lot Size:</span>
                  <span className="font-medium">
                    {propertyDetails.lotSize
                      ? `${propertyDetails.lotSize} acres`
                      : "Unknown"}
                  </span>
                </div>
                {propertyDetails.groundArea && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ground Area:</span>
                    <span className="font-medium">
                      {propertyDetails.groundArea} sq ft
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="mb-2 text-lg font-medium text-gray-800">
                Roof Summary
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Area:</span>
                  <span className="font-medium">
                    {formatNumber(roofSummary.area)} sq ft
                  </span>
                </div>
                {roofSummary.totalRoofSquares && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Squares:</span>
                    <span className="font-medium">
                      {roofSummary.totalRoofSquares}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Facets:</span>
                  <span className="font-medium">{roofSummary.facets}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pitch:</span>
                  <span className="font-medium">{roofSummary.pitch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Solar Potential:</span>
                  <span className="font-medium">
                    {solarInfo.potential.maxPanels} panels
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 p-4">
            <h3 className="mb-2 text-lg font-medium text-gray-800">
              Financial Summary
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded bg-white p-3 shadow-sm">
                <p className="text-sm text-gray-500">Solar Installation</p>
                <p className="text-xl font-bold text-gray-900">
                  ${formatNumber(solarInfo.financials.installationCost)}
                </p>
              </div>
              <div className="rounded bg-white p-3 shadow-sm">
                <p className="text-sm text-gray-500">20-Year Savings</p>
                <p className="text-xl font-bold text-green-600">
                  ${formatNumber(solarInfo.financials.netSavings)}
                </p>
              </div>
              <div className="rounded bg-white p-3 shadow-sm">
                <p className="text-sm text-gray-500">Yearly Energy</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatNumber(solarInfo.potential.yearlyEnergy)} kWh
                </p>
              </div>
            </div>
          </div>

          {/* Show a preview of the captured images */}
          {capturedImages.length > 0 && (
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-800">
                  Analysis Images
                </h3>
                <button
                  onClick={() => setActiveTab("images")}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  View all {capturedImages.length} images →
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {capturedImages.slice(0, 4).map((img, idx) => (
                  <div
                    key={idx}
                    className="aspect-square overflow-hidden rounded bg-gray-200"
                  >
                    <img
                      src={
                        imageLoadErrors.has(idx)
                          ? PLACEHOLDER_IMAGE
                          : img.imageData || img.url || img || PLACEHOLDER_IMAGE
                      }
                      alt={`View ${idx + 1}`}
                      className="size-full object-cover"
                      onError={(e: any) => {
                        setImageLoadErrors(prev => new Set(prev).add(idx))
                        e.target.src = PLACEHOLDER_IMAGE
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          data-tab-content="roof"
          className={activeTab === "roof" ? "block" : "hidden space-y-4"}
        >
          <div className="rounded-lg bg-gray-50 p-4">
            <h3 className="mb-2 text-lg font-medium text-gray-800">
              Roof Specifications
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 flex justify-between">
                  <span className="text-gray-600">Total Area:</span>
                  <span className="font-medium">
                    {formatNumber(roofSummary.area)} sq ft
                  </span>
                </div>
                <div className="mb-2 flex justify-between">
                  <span className="text-gray-600">Number of Facets:</span>
                  <span className="font-medium">{roofSummary.facets}</span>
                </div>
              </div>
              <div>
                <div className="mb-2 flex justify-between">
                  <span className="text-gray-600">Roof Pitch:</span>
                  <span className="font-medium">{roofSummary.pitch}</span>
                </div>
                <div className="mb-2 flex justify-between">
                  <span className="text-gray-600">Estimated Age:</span>
                  <span className="font-medium">
                    {propertyDetails.yearBuilt !== "Unknown" &&
                    !isNaN(Number(propertyDetails.yearBuilt))
                      ? `${new Date().getFullYear() - Number(propertyDetails.yearBuilt)} years`
                      : "Unknown"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {facetDetails && facetDetails.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <h3 className="border-b border-gray-200 bg-gray-50 p-4 text-lg font-medium text-gray-800">
                Roof Facet Details
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Facet
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Area (sq ft)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Pitch
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Orientation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Sunlight (hrs/day)
                      </th>
                      {facetDetails[0]?.percentageOfRoof !== undefined && (
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          % of Roof
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {facetDetails.map((facet, index) => (
                      <tr key={index}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          Facet {index + 1}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {facet && facet.area
                            ? formatNumber(facet.area, 2)
                            : "Unknown"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {facet && facet.pitch ? facet.pitch : "Unknown"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {facet && facet.orientation
                            ? facet.orientation
                            : "Unknown"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {facet && facet.sunlightHours
                            ? formatNumber(facet.sunlightHours, 1)
                            : "Unknown"}
                        </td>
                        {facet && facet.percentageOfRoof !== undefined && (
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {formatNumber(facet.percentageOfRoof, 1)}%
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div
          data-tab-content="solar"
          className={activeTab === "solar" ? "block" : "hidden space-y-4"}
        >
          <div className="rounded-lg bg-gray-50 p-4">
            <h3 className="mb-2 text-lg font-medium text-gray-800">
              Solar Potential
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded bg-white p-3 shadow-sm">
                <p className="text-sm text-gray-500">Maximum Panels</p>
                <p className="text-xl font-bold text-gray-900">
                  {solarInfo.potential.maxPanels || 0}
                </p>
              </div>
              <div className="rounded bg-white p-3 shadow-sm">
                <p className="text-sm text-gray-500">Yearly Energy</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatNumber(solarInfo.potential.yearlyEnergy)} kWh
                </p>
              </div>
              <div className="rounded bg-white p-3 shadow-sm">
                <p className="text-sm text-gray-500">Daily Sunshine</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatNumber(
                    (solarInfo.potential.sunshineHours || 0) / 365,
                    1
                  )}{" "}
                  hrs/day
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 p-4">
            <h3 className="mb-2 text-lg font-medium text-gray-800">
              Financial Analysis
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-600">
                  Upfront Cost of Solar Installation:
                </span>
                <span className="font-medium">
                  ${formatNumber(solarInfo.financials.installationCost)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-600">
                  Lifetime Utility Bill with Solar:
                </span>
                <span className="font-medium">
                  ${formatNumber(solarInfo.financials.lifetimeUtilityBill)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-600">
                  Total Cost with Solar (20 Years):
                </span>
                <span className="font-medium">
                  ${formatNumber(solarInfo.financials.totalCostWithSolar)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-600">
                  Cost Without Solar (20 Years):
                </span>
                <span className="font-medium">
                  ${formatNumber(solarInfo.financials.costWithoutSolar)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-600">
                  Net Savings Over 20 Years:
                </span>
                <span className="font-medium text-green-600">
                  ${formatNumber(solarInfo.financials.netSavings)}
                </span>
              </div>
              {solarInfo.financials.paybackPeriodYears !== null &&
                solarInfo.financials.paybackPeriodYears !== undefined && (
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-600">Payback Period:</span>
                    <span className="font-medium">
                      {solarInfo.financials.paybackPeriodYears} years
                    </span>
                  </div>
                )}
              {solarInfo.financials.monthlyUtilityBill !== null &&
                solarInfo.financials.monthlyUtilityBill !== undefined && (
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-600">
                      Current Monthly Utility Bill:
                    </span>
                    <span className="font-medium">
                      $
                      {formatNumber(solarInfo.financials.monthlyUtilityBill, 2)}
                    </span>
                  </div>
                )}
            </div>
          </div>

          <div className="rounded-lg bg-green-50 p-4 text-center">
            <h3 className="mb-2 text-lg font-medium text-gray-800">
              Solar Suitability
            </h3>
            <p
              className={`font-medium ${
                solarInfo.potential.suitabilityScore === "Great Fit"
                  ? "text-green-600"
                  : solarInfo.potential.suitabilityScore === "Good Fit"
                    ? "text-blue-600"
                    : "text-red-600"
              }`}
            >
              Based on our analysis, this property{" "}
              {solarInfo.potential.suitabilityScore !== "Unknown"
                ? `is a ${solarInfo.potential.suitabilityScore.toLowerCase()} for solar panel installation.`
                : solarInfo.financials.netSavings > 0
                  ? "could benefit from solar panel installation."
                  : "may not be ideal for solar panel installation."}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              With ${formatNumber(solarInfo.financials.netSavings)} in estimated
              savings over 20 years.
            </p>
          </div>
        </div>

        {/* New Captured Images Tab */}
        <div
          data-tab-content="images"
          className={activeTab === "images" ? "block" : "hidden space-y-4"}
        >
          {capturedImages.length > 0 ? (
            <>
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="mb-2 text-lg font-medium text-gray-800">
                  Enhanced Images Used for AI Analysis
                </h3>
                <p className="mb-4 text-sm text-gray-600">
                  These are the images that were captured, enhanced, and sent to
                  the AI for analysis. The enhancements include edge detection,
                  contrast adjustments, and measurement grids to help the AI
                  make more accurate assessments of the roof structure.
                </p>

                {/* Image Gallery */}
                <div className="mb-4 grid grid-cols-4 gap-2">
                  {capturedImages.map((img, idx) => (
                    <div
                      key={idx}
                      className={`aspect-square cursor-pointer overflow-hidden rounded border-2 bg-gray-200 ${selectedImageIndex === idx ? "border-blue-500" : "border-transparent"}`}
                      onClick={() => setSelectedImageIndex(idx)}
                    >
                      <img
                        src={
                          imageLoadErrors.has(idx)
                            ? PLACEHOLDER_IMAGE
                            : img.imageData ||
                              img.url ||
                              img ||
                              PLACEHOLDER_IMAGE
                        }
                        alt={`View ${idx + 1}`}
                        className="size-full object-cover"
                        onError={(e: any) => {
                          setImageLoadErrors(prev => new Set(prev).add(idx))
                          e.target.src = PLACEHOLDER_IMAGE
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Selected Image Viewer */}
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-2">
                    <h4 className="font-medium text-gray-700">
                      {capturedImages[selectedImageIndex]?.viewName ||
                        `View ${selectedImageIndex + 1} - ${["Top", "North", "East", "South", "West", "Northeast", "Southeast", "Southwest", "Northwest"][selectedImageIndex] || "Enhanced"}`}
                    </h4>
                    <div className="text-xs text-gray-500">
                      Captured at{" "}
                      {capturedImages[selectedImageIndex]?.timestamp
                        ? new Date(
                            capturedImages[selectedImageIndex].timestamp
                          ).toLocaleTimeString()
                        : "Unknown time"}
                    </div>
                  </div>
                  <div className="p-2">
                    <img
                      src={
                        imageLoadErrors.has(selectedImageIndex)
                          ? PLACEHOLDER_IMAGE
                          : capturedImages[selectedImageIndex]?.imageData ||
                            capturedImages[selectedImageIndex]?.url ||
                            capturedImages[selectedImageIndex] ||
                            PLACEHOLDER_IMAGE
                      }
                      alt={`Selected view ${selectedImageIndex + 1}`}
                      className="w-full rounded"
                      onError={(e: any) => {
                        setImageLoadErrors(prev =>
                          new Set(prev).add(selectedImageIndex)
                        )
                        e.target.src = PLACEHOLDER_IMAGE
                      }}
                    />
                  </div>
                  <div className="border-t border-gray-200 bg-gray-50 p-2 text-xs text-gray-500">
                    <div className="flex gap-x-4">
                      <span>
                        <span className="font-medium">Edge Detection:</span>{" "}
                        {capturedImages[selectedImageIndex]?.enhancementOptions
                          ?.enhanceEdges
                          ? "Enabled"
                          : "Unknown"}
                      </span>
                      <span>
                        <span className="font-medium">Contrast:</span>{" "}
                        {capturedImages[selectedImageIndex]?.enhancementOptions
                          ?.enhanceContrast
                          ? "Enhanced"
                          : "Unknown"}
                      </span>
                      <span>
                        <span className="font-medium">Measurement Grid:</span>{" "}
                        {capturedImages[selectedImageIndex]?.enhancementOptions
                          ?.addMeasurementGrid
                          ? "Added"
                          : "Unknown"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 p-4">
                <div className="mb-2 flex items-center gap-3">
                  <IconBuildingSkyscraper className="text-blue-600" size={24} />
                  <h3 className="text-lg font-medium text-gray-800">
                    How These Images Help
                  </h3>
                </div>
                <p className="mb-3 text-sm text-gray-700">
                  Our AI analysis uses these enhanced satellite images from
                  multiple angles to:
                </p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <svg
                      className="size-5 shrink-0 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>
                      Calculate precise roof area measurements with greater
                      accuracy
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg
                      className="size-5 shrink-0 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>
                      Identify individual roof facets, their orientation and
                      pitch
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg
                      className="size-5 shrink-0 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>
                      Detect obstacles that might affect solar panel placement
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg
                      className="size-5 shrink-0 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>
                      Assess material conditions and maintenance needs
                    </span>
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <div className="rounded-lg bg-gray-50 p-8 text-center">
              <IconCamera size={48} className="mx-auto mb-3 text-gray-400" />
              <h3 className="mb-2 text-lg font-medium text-gray-800">
                No Images Available
              </h3>
              <p className="text-gray-600">
                This report doesn&apos;t include any enhanced satellite imagery.
                Try analyzing the property again to generate imagery for more
                accurate assessment.
              </p>
            </div>
          )}
        </div>

        <div
          data-tab-content="recommendations"
          className={
            activeTab === "recommendations" ? "block" : "hidden space-y-4"
          }
        >
          <div className="rounded-lg bg-gray-50 p-4">
            <h3 className="mb-2 text-lg font-medium text-gray-800">
              Roofing Recommendations
            </h3>
            <div className="space-y-3">
              {propertyDetails.yearBuilt !== "Unknown" &&
                !isNaN(Number(propertyDetails.yearBuilt)) && (
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 size-5 shrink-0 text-blue-500">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">
                        {new Date().getFullYear() -
                          Number(propertyDetails.yearBuilt) >
                        20
                          ? "Consider Full Replacement"
                          : new Date().getFullYear() -
                                Number(propertyDetails.yearBuilt) >
                              15
                            ? "Inspection Recommended"
                            : new Date().getFullYear() -
                                  Number(propertyDetails.yearBuilt) >
                                10
                              ? "Preventative Maintenance"
                              : "Regular Maintenance"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date().getFullYear() -
                          Number(propertyDetails.yearBuilt) >
                        20
                          ? "Based on the property age, your roof may be approaching the end of its serviceable life."
                          : new Date().getFullYear() -
                                Number(propertyDetails.yearBuilt) >
                              15
                            ? "Your roof is reaching the age where problems typically develop. A thorough inspection is advised."
                            : new Date().getFullYear() -
                                  Number(propertyDetails.yearBuilt) >
                                10
                              ? "At this age, preventative maintenance can extend roof life and prevent costly repairs."
                              : "Your roof is relatively new. Regular maintenance will help protect your investment."}
                      </p>
                    </div>
                  </div>
                )}

              <div className="flex items-start gap-2">
                <div className="mt-0.5 size-5 shrink-0 text-blue-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">
                    {typeof roofSummary.pitch === "string" &&
                    roofSummary.pitch.includes("/") &&
                    parseInt(roofSummary.pitch.split("/")[0]) >= 8
                      ? "Steep Roof Considerations"
                      : typeof roofSummary.pitch === "string" &&
                          roofSummary.pitch.includes("/") &&
                          parseInt(roofSummary.pitch.split("/")[0]) <= 3
                        ? "Low-Slope Solutions"
                        : "Standard Pitch Considerations"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {typeof roofSummary.pitch === "string" &&
                    roofSummary.pitch.includes("/") &&
                    parseInt(roofSummary.pitch.split("/")[0]) >= 8
                      ? "Your roof has a steep pitch which affects material choice and installation complexity."
                      : typeof roofSummary.pitch === "string" &&
                          roofSummary.pitch.includes("/") &&
                          parseInt(roofSummary.pitch.split("/")[0]) <= 3
                        ? "Your roof has a relatively low pitch which requires special materials to prevent water pooling."
                        : "Your roof has a standard pitch suitable for most roofing materials."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <h3 className="border-b border-gray-200 bg-gray-50 p-4 text-lg font-medium text-gray-800">
              Material Options
            </h3>
            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <div className="flex h-32 items-center justify-center bg-gray-200">
                  <span className="text-lg font-medium text-gray-800">
                    Asphalt Shingles
                  </span>
                </div>
                <div className="space-y-2 p-3">
                  <p className="text-xs text-gray-500">
                    Economical and widely used
                  </p>
                  <p className="text-sm">Lifespan: 15-30 years</p>
                  <p className="text-sm">Cost: $-$$</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-gray-200">
                <div className="flex h-32 items-center justify-center bg-gray-200">
                  <span className="text-lg font-medium text-gray-800">
                    Metal Roofing
                  </span>
                </div>
                <div className="space-y-2 p-3">
                  <p className="text-xs text-gray-500">
                    Durable and energy efficient
                  </p>
                  <p className="text-sm">Lifespan: 40-70 years</p>
                  <p className="text-sm">Cost: $$-$$$</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-gray-200">
                <div className="flex h-32 items-center justify-center bg-gray-200">
                  <span className="text-lg font-medium text-gray-800">
                    Clay Tile
                  </span>
                </div>
                <div className="space-y-2 p-3">
                  <p className="text-xs text-gray-500">
                    Aesthetically pleasing, excellent durability
                  </p>
                  <p className="text-sm">Lifespan: 50+ years</p>
                  <p className="text-sm">Cost: $$$-$$$$</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 p-4">
            <h3 className="mb-2 text-lg font-medium text-gray-800">
              Next Steps
            </h3>
            <ol className="list-inside list-decimal space-y-2 text-gray-700">
              <li>
                Schedule a professional inspection for a detailed roof
                assessment
              </li>
              <li>
                Request a customized quote for your specific roofing needs
              </li>
              <li>Explore financing options and flexible payment plans</li>
            </ol>

            <div className="mt-4 border-t border-blue-200 pt-3">
              <button className="rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700">
                Request Professional Inspection
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PropertyReportMessage
