import React, { FC, useState, useRef } from "react"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import {
  IconLoader2,
  IconCamera,
  IconBuildingSkyscraper,
  IconRuler,
  IconSquare,
  IconTriangle,
  IconInfoCircle,
  IconSun,
  IconCurrencyDollar,
  IconDownload,
  IconChevronDown,
  IconChevronUp,
  IconHomeEco,
  IconPhoto,
  IconClipboardData,
  IconBulb
} from "@tabler/icons-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface GeneratedReport {
  jsonData?: any
  // Add other fields as needed
}

interface CombinedReportProps {
  analysisData: any
  reportData?: GeneratedReport
}

interface MetricProps {
  label: string
  value: React.ReactNode
  className?: string
}
const Metric: FC<MetricProps> = ({ label, value, className = "" }) => (
  <div
    className={
      "bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 " +
      className
    }
  >
    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
      {label}
    </p>
    <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
      {value}
    </p>
  </div>
)

const CombinedReport: FC<CombinedReportProps> = ({
  analysisData,
  reportData
}) => {
  const [isDownloading, setIsDownloading] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const reportRef = useRef<HTMLDivElement>(null)

  console.log("ANALYSIS DATA:", analysisData)
  console.log("REPORT DATA:", reportData)

  // If no analysis data, render a placeholder
  if (!analysisData) {
    return (
      <Card className="overflow-hidden rounded-xl border border-gray-200 shadow-md dark:border-gray-800">
        <CardContent className="p-8 text-center">
          <IconBuildingSkyscraper
            size={48}
            className="mx-auto mb-2 text-gray-400"
          />
          <h2 className="mb-2 text-xl font-bold">No Analysis Data Available</h2>
          <p className="text-gray-500">
            Please analyze a property to view results.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Extract data from analysis
  const { analysis: rawAnalysis = "", structuredData, debug } = analysisData
  const userSummary = structuredData?.userSummary

  // Helper function to extract a summary from the raw analysis text
  const extractSummary = (analysisText: string): string | null => {
    if (!analysisText) return null

    // Try to find summary section
    const summaryMatch = analysisText.match(
      /(?:summary|conclusion|overall assessment):(.*?)(?:\n\n|\n\w|$)/is
    )
    if (summaryMatch && summaryMatch[1]) {
      // Clean up the summary text
      return summaryMatch[1].trim().replace(/\n/g, " ")
    }

    // If no explicit summary, take the first paragraph
    const firstParagraph = analysisText.split("\n\n")[0]
    if (firstParagraph && firstParagraph.length > 50) {
      return firstParagraph
    }

    return null
  }

  // Helper to safely extract data
  const safeExtract = (obj: any, path: string, defaultValue: any): any => {
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

  // Helper to safely format a number with commas
  const formatNumber = (num: any, fixed = 0): string => {
    if (num === undefined || num === null) return "0"
    return parseFloat(num.toString()).toLocaleString(undefined, {
      maximumFractionDigits: fixed
    })
  }

  // Load roof summary safely - defined early so it can be used in aiSummary fallback
  const loadRoofSummary = () => {
    const d = reportData?.jsonData || {}
    const sd = analysisData.structuredData || {}

    // Try to get roof area from Solar API if structuredData is empty
    const solarPotential = d.solarPotential || d.solar?.potential
    let roofArea = sd.roofArea
    let facetCount = sd.facetCount

    // If we don't have structured data, try to estimate from solar API
    if (!roofArea && solarPotential) {
      // Estimate roof area from solar panel data
      // Typical solar panel is ~17.5 sq ft, but only ~60% of roof is usable
      const maxPanels =
        solarPotential.maxArrayPanelsCount || solarPotential.maxPanels || 0
      const panelAreaSqFt = solarPotential.maxArrayAreaMeters2
        ? solarPotential.maxArrayAreaMeters2 * 10.764 // Convert m² to sq ft
        : maxPanels * 17.5

      // Estimate total roof area (panel area is typically 60-70% of total)
      roofArea = panelAreaSqFt > 0 ? Math.round(panelAreaSqFt / 0.65) : 0

      // Estimate facet count based on roof complexity
      // Simple roofs: 20-30 sq ft per panel, Complex roofs: 15-20 sq ft per panel
      facetCount = maxPanels > 0 ? Math.max(4, Math.round(maxPanels / 15)) : 0
    }

    // Pick ranges if present, else fall back to single
    const [facetMin, facetMax] = sd.facetCountRange ?? [
      facetCount || 0,
      facetCount || 0
    ]
    const [areaMin, areaMax] = sd.roofAreaRange ?? [
      roofArea || 0,
      roofArea || 0
    ]
    const [sqMin, sqMax] = sd.squaresRange ?? [sd.squares, sd.squares]
    const [ridMin, ridMax] = sd.ridgeLengthRange ?? [
      sd.ridgeLength,
      sd.ridgeLength
    ]
    const [valMin, valMax] = sd.valleyLengthRange ?? [
      sd.valleyLength,
      sd.valleyLength
    ]

    // Choose "best guess" for single numbers
    const bestArea = Math.round(roofArea || (areaMin + areaMax) / 2 || 0)
    const bestFacets = facetCount || Math.round((facetMin + facetMax) / 2) || 0

    return {
      facetMin,
      facetMax,
      areaMin,
      areaMax,
      sqMin,
      sqMax,
      ridMin,
      ridMax,
      valMin,
      valMax,
      bestArea,
      bestFacets,
      totalRoofSquares: sd.squares ?? Math.round(bestArea / 100)
    }
  }

  // Load roof summary early so it can be used in aiSummary fallback
  const roofSummary = loadRoofSummary()

  const aiSummary =
    extractSummary(rawAnalysis) ||
    `In summary, this is a ${structuredData?.complexity || "moderately complex"} residential roof with ${roofSummary.facetMin}-${roofSummary.facetMax} facets, hip and gable dormer geometry, and an estimated area of ${formatNumber(roofSummary.areaMin)}–${formatNumber(roofSummary.areaMax)} square feet. Installation will require navigating multiple valleys, ridges, and dormers with approximately ${roofSummary.ridMin}-${roofSummary.ridMax} ft of ridges/hips and ${roofSummary.valMin}-${roofSummary.valMax} ft of valleys.`

  // Extract captured images if available
  const capturedImages =
    analysisData.capturedImages ||
    analysisData.satelliteViews ||
    reportData?.jsonData?.enhancedAnalysis?.capturedImages ||
    reportData?.jsonData?.enhancedAnalysis?.satelliteViews ||
    []

  // Helper function to get color based on confidence
  const getConfidenceColor = (confidence: string | null) => {
    switch (confidence) {
      case "high":
        return "bg-green-500"
      case "medium":
        return "bg-yellow-500"
      case "low":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  // Helper function to get complexity color
  const getComplexityColor = (complexity: string | null) => {
    switch (complexity) {
      case "simple":
        return "text-green-600 dark:text-green-400"
      case "moderate":
        return "text-yellow-600 dark:text-yellow-400"
      case "complex":
        return "text-orange-600 dark:text-orange-400"
      default:
        return "text-gray-600 dark:text-gray-400"
    }
  }

  // Get property address from any of the possible paths
  const getPropertyAddress = () => {
    // First try the standard paths from reportData
    if (reportData && reportData.jsonData) {
      const data = reportData.jsonData
      const fromReport =
        safeExtract(data, "property.address", "") ||
        safeExtract(data, "address.fullAddress", "") ||
        safeExtract(data, "propertyData.address.fullAddress", "") ||
        safeExtract(data, "address", "")

      if (fromReport) return fromReport
    }

    // Try from the EagleView report
    const eagleViewAddress = safeExtract(
      analysisData,
      "eagleViewData.address",
      ""
    )
    if (eagleViewAddress) return eagleViewAddress

    // If not found in reportData, extract it from the analysis text
    if (analysisData && analysisData.rawAnalysis) {
      // Look for patterns like "property at [ADDRESS]" or "roof at [ADDRESS]"
      const addressPatterns = [
        /property at\s*([^.:\n]+)/i,
        /roof at\s*([^.:\n]+)/i,
        /property (?:located |situated )?at\s*([^.:\n]+)/i,
        /assessment of the roof at\s*([^.:\n]+)/i
      ]

      for (const pattern of addressPatterns) {
        const match = analysisData.rawAnalysis.match(pattern)
        if (match && match[1]) {
          const extractedAddress = match[1].trim()
          // Make sure it looks like an address (has numbers)
          if (/\d/.test(extractedAddress)) {
            return extractedAddress
          }
        }
      }
    }

    // Last resort fallback - try to extract from the Google Solar API
    if (reportData?.jsonData?.solarPotential) {
      const postalCode = safeExtract(reportData.jsonData, "postalCode", "")
      const adminArea = safeExtract(
        reportData.jsonData,
        "administrativeArea",
        ""
      )
      if (postalCode && adminArea) {
        return `Property in ${postalCode}, ${adminArea}`
      }
    }

    // Last resort fallback
    return "Property Address"
  }

  // Get generated date or default to today
  const getGeneratedDate = () => {
    if (!reportData || !reportData.jsonData)
      return new Date().toLocaleDateString()

    const date = safeExtract(reportData.jsonData, "metadata.generated", null)

    // If we have EagleView data, use that date
    const eagleViewDate = safeExtract(analysisData, "eagleViewData.date", null)
    if (eagleViewDate) return eagleViewDate

    return date
      ? new Date(date).toLocaleDateString()
      : new Date().toLocaleDateString()
  }

  // Load property details safely
  const loadPropertyDetails = () => {
    const d = reportData?.jsonData || {}

    // pull propertyType from whichever path actually contains it
    const propertyType =
      d.propertyDetails?.propertyType ?? // top-level
      d.propertyData?.details?.propertyType ?? // nested
      d.propertyData?.propertyDetails?.propertyType ?? // alternate nesting
      d.propertyType ?? // in case it was serialized at root
      "Unknown"

    return {
      propertyType,
      yearBuilt:
        d.propertyDetails?.yearBuilt ??
        d.propertyData?.details?.yearBuilt ??
        "Unknown",
      groundArea:
        d.propertyDetails?.groundArea ?? // top-level
        d.propertyData?.details?.groundArea ?? // nested
        d.propertyData?.propertyDetails?.groundArea ?? // alternate nesting
        d.groundArea, // in case it was serialized at root
      lotSize:
        d.propertyDetails?.lotSize ??
        d.propertyData?.details?.lotSize ??
        "Unknown",
      mainPitch:
        d.roofDetails?.roofPitch ??
        d.roofDetails?.details?.roofPitch ?? // nested
        d.propertyData?.roofDetails?.roofPitch ?? // alternate nesting
        d.roofPitch
    }
  }

  const loadPitchData = () => {
    // try detailed `roofDetails.facets` first
    const facetsArr = safeExtract(
      reportData?.jsonData,
      "roofDetails.facets",
      []
    )
    if (Array.isArray(facetsArr) && facetsArr.length) {
      const total = roofSummary.bestArea
      const byPitch = facetsArr.reduce<Record<string, number>>(
        (acc, f: any) => {
          const pitch = f.pitch || "Unknown"
          acc[pitch] = (acc[pitch] || 0) + (f.area || 0)
          return acc
        },
        {}
      )
      return Object.entries(byPitch).map(([pitch, area]) => ({
        pitch,
        area: Math.round(area),
        percentage: total ? parseFloat(((area / total) * 100).toFixed(1)) : 0
      }))
    }

    // fallback to EagleView
    if (analysisData.eagleViewData?.pitchData) {
      return analysisData.eagleViewData.pitchData
    }

    // fallback to single‐pitch structuredData
    if (structuredData?.pitch) {
      return [
        {
          pitch: structuredData.pitch,
          area: roofSummary.bestArea,
          percentage: 100
        }
      ]
    }

    return []
  }

  const loadWasteData = () => {
    // best “base” roof area in sq ft
    const total = roofSummary.bestArea || 0
    // waste percentages
    const tiers = [0, 5, 10, 15, 20, 25]

    return tiers.map(pct => {
      // compute total area including waste
      const areaWithWaste = Math.round(total * (1 + pct / 100))
      // convert to roofing squares
      const squares = Math.ceil(areaWithWaste / 100)
      return {
        percentage: pct,
        area: areaWithWaste,
        squares
      }
    })
  }

  // Load solar data safely
  const loadSolarData = () => {
    const d = reportData?.jsonData || {}

    // 1) Prefer the clean `d.solar` shape if present
    if (d.solar?.potential && d.solar?.financials) {
      return d.solar
    }

    // 2) Otherwise fall back to `d.solarPotential`
    if (d.solarPotential) {
      const p = d.solarPotential
      const c = p.costsAndSavings || {}

      return {
        potential: {
          maxPanels: p.maxArrayPanels ?? p.maxArrayPanelsCount ?? 0,
          yearlyEnergy: p.yearlyEnergyDcKwh ?? 0,
          sunshineHours: p.maxSunshineHoursPerYear ?? p.sunshineHours ?? 0,
          suitabilityScore: p.suitabilityScore ?? "Unknown"
        },
        financials: {
          installationCost: c.installationCost ?? 0,
          netSavings: c.netSavings ?? 0,
          totalCostWithSolar: c.totalCostWithSolar ?? 0,
          costWithoutSolar: c.costWithoutSolar ?? 0,
          paybackPeriodYears: c.paybackPeriodYears ?? null,
          monthlyUtilityBill: c.monthlyUtilityBill ?? null,
          lifetimeUtilityBill: c.lifetimeUtilityBill ?? null
        }
      }
    }

    // 3) If neither object exists, return empty defaults
    return {
      potential: {
        maxPanels: 0,
        yearlyEnergy: 0,
        sunshineHours: 0,
        suitabilityScore: "Unknown"
      },
      financials: {
        installationCost: 0,
        netSavings: 0,
        totalCostWithSolar: 0,
        costWithoutSolar: 0,
        paybackPeriodYears: null,
        monthlyUtilityBill: null,
        lifetimeUtilityBill: 0
      }
    }
  }

  // Load roof facet details safely
  const loadRoofFacetDetails = () => {
    // Check for EagleView data first
    if (analysisData.eagleViewData && analysisData.eagleViewData.facets) {
      return analysisData.eagleViewData.facets.map(
        (facet: any, index: number) => {
          return {
            id: facet.id || String.fromCharCode(65 + index), // A, B, C, etc.
            area: facet.area || 0,
            pitch: facet.pitch || "Unknown",
            orientation: facet.orientation || "Unknown"
          }
        }
      )
    }

    if (!reportData || !reportData.jsonData) return []

    const data = reportData.jsonData
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
      // Create PDF
      const pdf = new jsPDF("p", "mm", "a4")
      const pageWidth = pdf.internal.pageSize.getWidth()

      // Add logo
      const logoUrl =
        "https://uploads-ssl.webflow.com/64e9150f53771ac56ef528b7/64ee16bb300d3e08d25a03ac_rooftops-logo-gr-black.png"

      // First load the logo image
      const logoImg = new Image()
      logoImg.crossOrigin = "Anonymous"

      // Wait for the logo to load
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve
        logoImg.onerror = reject
        logoImg.src = logoUrl
      })

      // Calculate logo dimensions
      const logoWidth = 30
      const logoHeight = logoWidth * (logoImg.height / logoImg.width)

      // Add the logo
      pdf.addImage(logoImg, "PNG", 14, 10, logoWidth, logoHeight)

      // Add title
      pdf.setFontSize(16)
      pdf.text(`Property Report: ${getPropertyAddress()}`, 14, logoHeight + 20)
      pdf.setFontSize(10)
      pdf.text(`Generated on ${getGeneratedDate()}`, 14, logoHeight + 27)
      pdf.line(14, logoHeight + 30, pageWidth - 14, logoHeight + 30)

      // Capture entire report
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      })

      // Calculate scale to fit on page
      const imgWidth = pageWidth - 28
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      // Max content per page
      const maxHeightPerPage = 250

      // If image is too tall, split it into multiple pages
      let remainingHeight = imgHeight
      let sourceY = 0
      const pageHeight = pdf.internal.pageSize.getHeight()

      // Add first part to first page
      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.9),
        "JPEG",
        14,
        logoHeight + 35,
        imgWidth,
        Math.min(maxHeightPerPage, imgHeight)
      )

      sourceY +=
        Math.min(maxHeightPerPage, imgHeight) * (canvas.width / imgWidth)
      remainingHeight -= Math.min(maxHeightPerPage, imgHeight)

      // Add additional pages if needed
      while (remainingHeight > 0) {
        pdf.addPage()

        const currentHeight = Math.min(maxHeightPerPage, remainingHeight)

        // Create a temporary canvas for this slice
        const tempCanvas = document.createElement("canvas")
        tempCanvas.width = canvas.width
        tempCanvas.height = (currentHeight * canvas.width) / imgWidth
        const ctx = tempCanvas.getContext("2d")

        if (ctx) {
          // Draw portion of the original canvas
          ctx.drawImage(
            canvas,
            0,
            sourceY,
            canvas.width,
            tempCanvas.height,
            0,
            0,
            tempCanvas.width,
            tempCanvas.height
          )

          // Add to PDF
          pdf.addImage(
            tempCanvas.toDataURL("image/jpeg", 0.9),
            "JPEG",
            14,
            20,
            imgWidth,
            currentHeight
          )
        }

        sourceY += currentHeight * (canvas.width / imgWidth)
        remainingHeight -= currentHeight
      }

      // Add footer to last page
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
    } catch (error) {
      console.error("Error generating PDF:", error)
    } finally {
      setIsDownloading(false)
    }
  }

  // Load data using the safe methods
  const propertyDetails = loadPropertyDetails()
  // roofSummary is loaded earlier (before aiSummary) to avoid temporal dead zone error
  const solarInfo = loadSolarData()
  const facetDetails = loadRoofFacetDetails()
  const pitchData = loadPitchData()
  const wasteData = loadWasteData()

  // Get main representative image
  const mainImage = capturedImages.length > 0 ? capturedImages[0] : null

  return (
    <div
      ref={reportRef}
      className="mx-auto w-full max-w-5xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800"
    >
      {/* Sticky header with download button */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-2">
            <h2 className="hidden text-xl font-semibold text-gray-800 sm:block dark:text-gray-100">
              {getPropertyAddress()}
            </h2>
          </div>

          <Button
            onClick={downloadAsPDF}
            disabled={isDownloading}
            size="sm"
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isDownloading ? (
              <>
                <IconLoader2 className="mr-2 size-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <IconDownload className="mr-2 size-4" />
                <span>Download PDF</span>
              </>
            )}
          </Button>
        </div>

        {/* Mobile view address */}
        <div className="px-4 pb-2 sm:hidden">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {getPropertyAddress()}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Generated on {getGeneratedDate()}
          </p>
        </div>
      </div>

      <div className="p-2 sm:p-6">
        {/* AI Summary Card */}
        <div className="mb-6 overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="p-4 sm:p-6">
              <h3 className="mb-2 text-lg font-bold text-gray-800 sm:text-xl dark:text-gray-100">
                AI Analysis Summary
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {userSummary ?? "Sorry, no summary available."}
              </p>
            </div>

            {/* Main Image */}
            <div className="relative h-48 overflow-hidden bg-gray-100 sm:h-auto dark:bg-gray-900">
              {mainImage ? (
                <img
                  src={mainImage.imageData || mainImage.url || mainImage}
                  alt="Property overhead view"
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <IconBuildingSkyscraper size={48} className="text-gray-400" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Responsive Metric Cards */}
        <div className="my-4 grid grid-cols-3 gap-3">
          <Metric
            label="Facet Count"
            value={
              roofSummary.facetMin !== roofSummary.facetMax
                ? `${roofSummary.facetMin}–${roofSummary.facetMax}`
                : roofSummary.bestFacets
            }
          />
          <Metric
            label="Total Area"
            value={
              // build the number-or-range, then add “ sq. ft.” to the end
              `${
                roofSummary.areaMin !== roofSummary.areaMax
                  ? `${formatNumber(roofSummary.areaMin)}–${formatNumber(roofSummary.areaMax)}`
                  : formatNumber(roofSummary.bestArea)
              } sq.ft.`
            }
          />
          <Metric
            label="Roofing Squares"
            value={
              roofSummary.sqMin !== roofSummary.sqMax
                ? `${roofSummary.sqMin}–${roofSummary.sqMax}`
                : roofSummary.totalRoofSquares
            }
          />
        </div>

        {/* Images Section */}
        {capturedImages.length > 0 && (
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center text-lg font-medium text-gray-800 dark:text-gray-100">
                <IconPhoto
                  size={18}
                  className="mr-2 text-blue-500 dark:text-blue-400"
                />
                Analysis Images ({capturedImages.length})
              </h3>
            </div>

            {/* Selected Image Viewer */}
            <div className="mb-3 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-900">
              <img
                src={
                  capturedImages[selectedImageIndex]?.imageData ||
                  capturedImages[selectedImageIndex]?.url ||
                  capturedImages[selectedImageIndex]
                }
                alt={`View ${selectedImageIndex + 1}`}
                className="max-h-72 w-full object-contain"
              />
              <div className="border-t border-gray-200 bg-white p-2 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                {capturedImages[selectedImageIndex]?.viewName ||
                  `View ${selectedImageIndex + 1} - ${["Top", "North", "East", "South", "West", "Northeast", "Southeast", "Southwest", "Northwest"][selectedImageIndex] || "Enhanced"}`}
              </div>
            </div>

            {/* Image Thumbnails */}
            <div className="grid grid-cols-4 gap-2 overflow-x-auto sm:grid-cols-8">
              {capturedImages.map((img, idx) => (
                <div
                  key={idx}
                  className={`aspect-square cursor-pointer overflow-hidden rounded border-2 bg-gray-200 dark:bg-gray-700 ${selectedImageIndex === idx ? "border-blue-500" : "border-transparent"}`}
                  onClick={() => setSelectedImageIndex(idx)}
                >
                  <img
                    src={img.imageData || img.url || img}
                    alt={`View ${idx + 1}`}
                    className="size-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accordion Sections */}
        <Accordion
          type="multiple"
          defaultValue={["overview", "solar", "details", "recommendations"]}
          className="w-full"
        >
          {/* Overview Section */}
          <AccordionItem
            value="overview"
            className="mb-3 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <AccordionTrigger className="bg-gray-100 px-4 py-3 hover:bg-gray-50 dark:bg-gray-900/30 dark:hover:bg-gray-900/50">
              <div className="flex items-center">
                <IconBuildingSkyscraper
                  size={18}
                  className="mr-2 text-blue-500 dark:text-blue-400"
                />
                <span className="text-base font-medium">Overview</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 py-3">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* ── Property Details ───────────────────────────── */}
                <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                  <h3 className="mb-2 text-base font-medium text-gray-800 dark:text-gray-100">
                    Property Details
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Property Type:
                      </span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {propertyDetails.propertyType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Year Built:
                      </span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {propertyDetails.yearBuilt}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Ground Area:
                      </span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {typeof propertyDetails.groundArea === "number"
                          ? `${formatNumber(propertyDetails.groundArea)} sq ft`
                          : propertyDetails.groundArea}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Complexity:
                      </span>
                      <span
                        className={`font-medium capitalize ${getComplexityColor(structuredData?.complexity)}`}
                      >
                        {structuredData?.complexity || "Unknown"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Roof Summary ────────────────────────────────── */}
                <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                  <h3 className="mb-2 text-base font-medium text-gray-800 dark:text-gray-100">
                    Roof Summary
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Roof Area:
                      </span>
                      <span>
                        {roofSummary.areaMin !== roofSummary.areaMax
                          ? `${formatNumber(roofSummary.areaMin)}–${formatNumber(roofSummary.areaMax)}`
                          : `${formatNumber(roofSummary.bestArea)}`}{" "}
                        sq ft
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Roofing Squares:
                      </span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {roofSummary.totalRoofSquares}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Facets:
                      </span>
                      <span>
                        {roofSummary.facetMin !== roofSummary.facetMax
                          ? `${roofSummary.facetMin}–${roofSummary.facetMax}`
                          : roofSummary.bestFacets}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Pitch:
                      </span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {propertyDetails.mainPitch}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Waste Calculation */}
              {wasteData && wasteData.length > 0 && (
                <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                  <h3 className="border-b border-gray-200 bg-gray-50 p-4 text-base font-medium text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
                    Waste Calculation
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Waste %
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Area (sq ft)
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Squares
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                        {wasteData.map((waste, idx) => (
                          <tr
                            key={idx}
                            className={
                              idx === Math.floor(wasteData.length / 2)
                                ? "bg-blue-50 dark:bg-blue-900/20"
                                : ""
                            }
                          >
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {waste.percentage}%
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              {formatNumber(waste.area)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              {waste.squares}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="border-t border-gray-200 p-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    * Suggested waste percentage is highlighted. Additional
                    materials may be required.
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Solar Potential Section */}
          <AccordionItem
            value="solar"
            className="mb-3 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <AccordionTrigger className="bg-gray-100 px-4 py-3 hover:bg-gray-50 dark:bg-gray-900/30 dark:hover:bg-gray-900/50">
              <div className="flex items-center">
                <IconSun
                  size={18}
                  className="mr-2 text-blue-500 dark:text-blue-400"
                />
                <span className="text-base font-medium">Solar Potential</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 py-3">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Maximum Panels
                    </p>
                    <p className="text-xl font-bold text-gray-800 dark:text-gray-100">
                      {solarInfo.potential.maxPanels || 0}
                    </p>
                  </div>
                  <div className="rounded border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Yearly Energy
                    </p>
                    <p className="text-xl font-bold text-gray-800 dark:text-gray-100">
                      {formatNumber(solarInfo.potential.yearlyEnergy)} kWh
                    </p>
                  </div>
                  <div className="rounded border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Daily Sunshine
                    </p>
                    <p className="text-xl font-bold text-gray-800 dark:text-gray-100">
                      {formatNumber(
                        (solarInfo.potential.sunshineHours || 0) / 365,
                        1
                      )}{" "}
                      hrs/day
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/30">
                  <h3 className="mb-2 text-base font-medium text-gray-800 dark:text-gray-100">
                    Financial Analysis
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-blue-200 pb-2 dark:border-blue-800">
                      <span className="text-gray-600 dark:text-gray-400">
                        Upfront Cost of Solar Installation:
                      </span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        ${formatNumber(solarInfo.financials.installationCost)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-blue-200 pb-2 dark:border-blue-800">
                      <span className="text-gray-600 dark:text-gray-400">
                        Total Cost with Solar (20 Years):
                      </span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        ${formatNumber(solarInfo.financials.totalCostWithSolar)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-blue-200 pb-2 dark:border-blue-800">
                      <span className="text-gray-600 dark:text-gray-400">
                        Cost Without Solar (20 Years):
                      </span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        ${formatNumber(solarInfo.financials.costWithoutSolar)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-blue-200 pb-2 dark:border-blue-800">
                      <span className="text-gray-600 dark:text-gray-400">
                        Net Savings Over 20 Years:
                      </span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        ${formatNumber(solarInfo.financials.netSavings)}
                      </span>
                    </div>
                    {solarInfo.financials.paybackPeriodYears !== null &&
                      solarInfo.financials.paybackPeriodYears !== undefined && (
                        <div className="flex items-center justify-between border-b border-blue-200 pb-2 dark:border-blue-800">
                          <span className="text-gray-600 dark:text-gray-400">
                            Payback Period:
                          </span>
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            {formatNumber(
                              solarInfo.financials.paybackPeriodYears,
                              1
                            )}{" "}
                            years
                          </span>
                        </div>
                      )}
                    {solarInfo.financials.monthlyUtilityBill !== null &&
                      solarInfo.financials.monthlyUtilityBill !== undefined && (
                        <div className="flex items-center justify-between border-b border-blue-200 pb-2 dark:border-blue-800">
                          <span className="text-gray-600 dark:text-gray-400">
                            Monthly Utility Bill Savings:
                          </span>
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            $
                            {formatNumber(
                              solarInfo.financials.monthlyUtilityBill,
                              2
                            )}
                          </span>
                        </div>
                      )}
                  </div>
                </div>

                <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-900/30">
                  <h3 className="mb-2 text-base font-medium text-gray-800 dark:text-gray-100">
                    Solar Suitability
                  </h3>
                  <p
                    className={`font-medium ${
                      solarInfo.potential.suitabilityScore === "Great Fit"
                        ? "text-green-600 dark:text-green-400"
                        : solarInfo.potential.suitabilityScore === "Good Fit"
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    Based on our analysis, this property{" "}
                    {solarInfo.potential.suitabilityScore !== "Unknown"
                      ? `is a ${solarInfo.potential.suitabilityScore.toLowerCase()} for solar panel installation.`
                      : solarInfo.financials.netSavings > 0
                        ? "could benefit from solar panel installation."
                        : "may not be ideal for solar panel installation."}
                  </p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    With ${formatNumber(solarInfo.financials.netSavings)} in
                    estimated savings over 20 years.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Full Analysis Section */}
          <AccordionItem
            value="details"
            className="mb-3 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <AccordionTrigger className="bg-gray-100 px-4 py-3 hover:bg-gray-50 dark:bg-gray-900/30 dark:hover:bg-gray-900/50">
              <div className="flex items-center">
                <IconClipboardData
                  size={18}
                  className="mr-2 text-blue-500 dark:text-blue-400"
                />
                <span className="text-base font-medium">Analysis Details</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 py-3">
              {/* if you have @tailwindcss/typography installed */}
              <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg bg-white p-4 dark:bg-gray-800">
                {rawAnalysis
                  .split("\n\n") // split into paragraphs
                  .map((para, i) => (
                    <p key={i}>{para.trim()}</p>
                  ))}
              </div>

              {/* keep your debug info if you want */}
              {debug && (
                <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex flex-wrap gap-x-3">
                    <span>
                      <span className="font-medium">Model:</span>{" "}
                      {debug.modelUsed || "Unknown"}
                    </span>
                    <span>
                      <span className="font-medium">Time:</span>{" "}
                      {debug.responseTime}ms
                    </span>
                    <span>
                      <strong>Images:</strong>{" "}
                      {debug.imageCount || capturedImages.length}
                    </span>
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Recommendations Section */}
          <AccordionItem
            value="recommendations"
            className="mb-3 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <AccordionTrigger className="bg-gray-100 px-4 py-3 hover:bg-gray-50 dark:bg-gray-900/30 dark:hover:bg-gray-900/50">
              <div className="flex items-center">
                <IconBulb
                  size={18}
                  className="mr-2 text-blue-500 dark:text-blue-400"
                />
                <span className="text-base font-medium">Recommendations</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 py-3">
              <div className="space-y-4">
                <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                  <h3 className="mb-2 text-base font-medium text-gray-800 dark:text-gray-100">
                    Roofing Recommendations
                  </h3>
                  <div className="space-y-3">
                    {propertyDetails.yearBuilt !== "Unknown" &&
                      !isNaN(Number(propertyDetails.yearBuilt)) && (
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 size-5 shrink-0 text-blue-500 dark:text-blue-400">
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
                            <p className="font-medium text-gray-800 dark:text-gray-100">
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
                            <p className="text-sm text-gray-600 dark:text-gray-400">
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
                      <div className="mt-0.5 size-5 shrink-0 text-blue-500 dark:text-blue-400">
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
                        <p className="font-medium text-gray-800 dark:text-gray-100">
                          {structuredData?.complexity === "complex"
                            ? "Complex Design Considerations"
                            : structuredData?.complexity === "simple"
                              ? "Simple Design Advantages"
                              : "Moderate Complexity Assessment"}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {structuredData?.complexity === "complex"
                            ? "Your roof has a complex design with multiple facets and features. This requires specialized installation techniques and careful attention to waterproofing at joints and intersections."
                            : structuredData?.complexity === "simple"
                              ? "Your roof has a simple design which typically means lower installation costs and fewer potential failure points for water intrusion."
                              : "Your roof has moderate complexity with some architectural features that require attention during maintenance and replacement."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/30">
                  <h3 className="mb-2 text-base font-medium text-gray-800 dark:text-gray-100">
                    Next Steps
                  </h3>
                  <ol className="list-inside list-decimal space-y-2 pl-2 text-gray-700 dark:text-gray-300">
                    <li>
                      Schedule a professional inspection for a detailed roof
                      assessment
                    </li>
                    <li>
                      Request a customized quote for your specific roofing needs
                    </li>
                    <li>
                      Explore financing options and flexible payment plans
                    </li>
                    <li>
                      Consider combining roof repairs with solar installation
                      for maximum savings
                    </li>
                  </ol>

                  <div className="mt-4 border-t border-blue-200 pt-3 text-center dark:border-blue-800">
                    <button className="rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700">
                      Request Professional Inspection
                    </button>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 text-left text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        Powered by Rooftops AI • {new Date().toLocaleDateString()} This report
        has been generated using satellite imagery powered by Google and other
        technologies. Please account for a margin of error up to 15% between
        satellite generated data and final measurements. Elements such as tree
        coverage will impact accuracy. If at any point you are not satisfied
        with your Rooftops Pro account, please contact our team. Rooftops AI
        does not provide any guarantees, express or implied, nor does it make
        any representations or warranties regarding this document, its contents,
        or its utilization. This includes, but is not limited to, any warranties
        of quality, accuracy, completeness, dependability, or suitability for a
        given purpose, whether they arise by statute or otherwise.
      </div>
    </div>
  )
}

export default CombinedReport
