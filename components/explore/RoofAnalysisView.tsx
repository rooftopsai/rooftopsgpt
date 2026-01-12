import React, { useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  IconBuildingSkyscraper,
  IconRuler,
  IconStar,
  IconSquare,
  IconTriangle,
  IconCamera
} from "@tabler/icons-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"

interface RoofAnalysisResultsProps {
  analysis: any
}

const RoofAnalysisResults: React.FC<RoofAnalysisResultsProps> = ({
  analysis
}) => {
  const [activeTab, setActiveTab] = useState("summary")
  const [expandedView, setExpandedView] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  if (!analysis) return null

  const { rawAnalysis, structuredData, debug } = analysis

  // Extract captured images if available
  const capturedImages =
    analysis.capturedImages || analysis.satelliteViews || []

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
        return "text-green-400"
      case "moderate":
        return "text-yellow-400"
      case "complex":
        return "text-orange-400"
      default:
        return "text-gray-400"
    }
  }

  return (
    <Card className="mb-6 overflow-hidden border-0 bg-gray-900 text-white shadow-lg">
      <CardHeader className="border-b border-gray-700 bg-gray-800 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-xl font-bold">
            <IconBuildingSkyscraper size={20} className="mr-2 text-blue-400" />
            Enhanced Roof Analysis
          </CardTitle>
          <Badge className={getConfidenceColor(structuredData?.confidence)}>
            {structuredData?.confidence
              ? `${structuredData.confidence} confidence`
              : "Analysis Complete"}
          </Badge>
        </div>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-gray-800 px-4 pt-2">
          <TabsList className="bg-gray-800">
            <TabsTrigger
              value="summary"
              className="data-[state=active]:bg-gray-700"
            >
              Summary
            </TabsTrigger>
            <TabsTrigger
              value="details"
              className="data-[state=active]:bg-gray-700"
            >
              Details
            </TabsTrigger>
            {capturedImages.length > 0 && (
              <TabsTrigger
                value="images"
                className="flex items-center data-[state=active]:bg-gray-700"
              >
                <IconCamera size={14} className="mr-1" />
                Images ({capturedImages.length})
              </TabsTrigger>
            )}
            {debug && (
              <TabsTrigger
                value="debug"
                className="data-[state=active]:bg-gray-700"
              >
                Debug
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <CardContent
          className={`p-4 ${expandedView ? "max-h-none" : "max-h-96 overflow-y-auto"}`}
        >
          <TabsContent value="summary" className="mt-2">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="flex flex-col rounded-lg bg-gray-800 p-3">
                <span className="mb-1 flex items-center text-xs font-medium text-blue-400">
                  <IconSquare size={14} className="mr-1" />
                  Roof Area
                </span>
                <span className="text-2xl font-bold">
                  {structuredData?.roofArea
                    ? `${structuredData.roofArea.toLocaleString()}`
                    : "N/A"}
                </span>
                <span className="text-xs text-gray-400">sq ft</span>
              </div>

              <div className="flex flex-col rounded-lg bg-gray-800 p-3">
                <span className="mb-1 flex items-center text-xs font-medium text-blue-400">
                  <IconSquare size={14} className="mr-1" />
                  Facet Count
                </span>
                <span className="text-2xl font-bold">
                  {structuredData?.facetCount || "N/A"}
                </span>
                <span className="text-xs text-gray-400">sections</span>
              </div>

              <div className="flex flex-col rounded-lg bg-gray-800 p-3">
                <span className="mb-1 flex items-center text-xs font-medium text-blue-400">
                  <IconTriangle size={14} className="mr-1" />
                  Pitch
                </span>
                <span className="text-2xl font-bold">
                  {structuredData?.pitch || "N/A"}
                </span>
                <span className="text-xs text-gray-400">ratio</span>
              </div>

              <div className="flex flex-col rounded-lg bg-gray-800 p-3">
                <span className="mb-1 flex items-center text-xs font-medium text-blue-400">
                  <IconTriangle size={14} className="mr-1" />
                  Complexity
                </span>
                <span
                  className={`text-2xl font-bold capitalize ${getComplexityColor(structuredData?.complexity)}`}
                >
                  {structuredData?.complexity || "N/A"}
                </span>
              </div>
            </div>

            {/* Summary of key findings */}
            <div className="mt-4 rounded-lg bg-gray-800 p-4">
              <h3 className="mb-2 text-sm font-medium text-blue-400">
                Key Findings
              </h3>
              <p className="text-sm text-gray-300">
                {extractSummary(rawAnalysis) ||
                  `This property has ${structuredData?.facetCount || "multiple"} roof facets with 
                  ${structuredData?.complexity || "varying"} complexity. 
                  ${
                    structuredData?.confidence === "high"
                      ? "The analysis has high confidence based on clear imagery."
                      : "Additional inspection may be needed for complete accuracy."
                  }`}
              </p>
            </div>

            {/* Preview of captured images if available */}
            {capturedImages.length > 0 && (
              <div className="mt-4 rounded-lg bg-gray-800 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-blue-400">
                    Captured Imagery
                  </h3>
                  <button
                    onClick={() => setActiveTab("images")}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    View all
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {capturedImages.slice(0, 4).map((img, idx) => (
                    <div
                      key={idx}
                      className="aspect-square cursor-pointer overflow-hidden rounded bg-gray-700"
                      onClick={() => {
                        setSelectedImageIndex(idx)
                        setActiveTab("images")
                      }}
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
          </TabsContent>

          <TabsContent value="details" className="mt-2">
            {/* Show roof segments in card format if available */}
            {structuredData?.segments &&
            Array.isArray(structuredData.segments) &&
            structuredData.segments.length > 0 ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-gray-800 p-4">
                  <h3 className="mb-3 text-sm font-medium text-blue-400">
                    Roof Section Measurements
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {structuredData.segments.map(
                      (segment: any, idx: number) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-gray-700 bg-gray-900 p-3 transition-all hover:border-blue-500"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <h4 className="font-semibold text-white">
                              Section {idx + 1}
                            </h4>
                            <Badge
                              variant="outline"
                              className="border-blue-500 text-blue-400"
                            >
                              {segment.pitchRatio}
                            </Badge>
                          </div>
                          <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Area:</span>
                              <span className="font-medium text-gray-200">
                                {segment.areaSqFt} sq ft
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Pitch:</span>
                              <span className="font-medium text-gray-200">
                                {segment.pitchDegrees.toFixed(1)}°
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">
                                Orientation:
                              </span>
                              <span className="font-medium text-gray-200">
                                {segment.azimuthDegrees}° (
                                {getCardinalDirection(segment.azimuthDegrees)})
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Detailed text analysis - parsed into sections */}
                {rawAnalysis && (
                  <div className="rounded-lg bg-gray-800 p-4">
                    <h3 className="mb-3 text-sm font-medium text-blue-400">
                      Detailed Analysis Report
                    </h3>
                    {parseAnalysisIntoSections(rawAnalysis).map(
                      (section, idx) => (
                        <div
                          key={idx}
                          className="mb-3 rounded-lg border border-blue-700/20 bg-gray-900 p-3"
                        >
                          {section.title && (
                            <h4 className="mb-2 text-sm font-semibold text-blue-300">
                              {section.title}
                            </h4>
                          )}
                          <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
                            {section.content}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            ) : rawAnalysis ? (
              <div className="rounded-lg bg-gray-800 p-4">
                <h3 className="mb-3 text-sm font-medium text-blue-400">
                  Detailed Analysis Report
                </h3>
                {parseAnalysisIntoSections(rawAnalysis).map((section, idx) => (
                  <div
                    key={idx}
                    className="mb-3 rounded-lg border border-blue-700/20 bg-gray-900 p-3"
                  >
                    {section.title && (
                      <h4 className="mb-2 text-sm font-semibold text-blue-300">
                        {section.title}
                      </h4>
                    )}
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
                      {section.content}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-gray-800 p-8 text-center">
                <IconBuildingSkyscraper
                  size={48}
                  className="mx-auto mb-3 text-gray-600"
                />
                <p className="text-sm text-gray-400">
                  No detailed analysis available.
                </p>
              </div>
            )}
          </TabsContent>

          {/* New Images Tab */}
          <TabsContent value="images" className="mt-2">
            {capturedImages.length > 0 ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-gray-800 p-4">
                  <h3 className="mb-3 text-sm font-medium text-blue-400">
                    Enhanced Satellite Images
                  </h3>
                  <div className="mb-4 grid grid-cols-4 gap-2">
                    {capturedImages.map((img, idx) => (
                      <div
                        key={idx}
                        className={`aspect-square cursor-pointer overflow-hidden rounded border-2 bg-gray-700 ${selectedImageIndex === idx ? "border-blue-500" : "border-transparent"}`}
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

                  {/* Selected Image Display */}
                  <div className="overflow-hidden rounded-lg bg-gray-700">
                    <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800 p-2">
                      <h4 className="font-medium text-gray-300">
                        {capturedImages[selectedImageIndex]?.viewName ||
                          `View ${selectedImageIndex + 1} - ${["Top", "North", "East", "South", "West", "Northeast", "Southeast", "Southwest", "Northwest"][selectedImageIndex] || "Enhanced"}`}
                      </h4>
                      <div className="text-xs text-gray-400">
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
                          capturedImages[selectedImageIndex]?.imageData ||
                          capturedImages[selectedImageIndex]?.url ||
                          capturedImages[selectedImageIndex]
                        }
                        alt={`Selected view ${selectedImageIndex + 1}`}
                        className="w-full rounded"
                      />
                    </div>
                    {capturedImages[selectedImageIndex]?.enhancementOptions && (
                      <div className="border-t border-gray-700 bg-gray-800 p-2 text-xs text-gray-400">
                        <div className="flex gap-x-4">
                          <span>
                            <span className="font-medium text-gray-300">
                              Edge Detection:
                            </span>{" "}
                            {capturedImages[selectedImageIndex]
                              ?.enhancementOptions?.enhanceEdges
                              ? "Enabled"
                              : "Disabled"}
                          </span>
                          <span>
                            <span className="font-medium text-gray-300">
                              Contrast:
                            </span>{" "}
                            {capturedImages[selectedImageIndex]
                              ?.enhancementOptions?.enhanceContrast
                              ? "Enhanced"
                              : "Standard"}
                          </span>
                          <span>
                            <span className="font-medium text-gray-300">
                              Measurement Grid:
                            </span>{" "}
                            {capturedImages[selectedImageIndex]
                              ?.enhancementOptions?.addMeasurementGrid
                              ? "Added"
                              : "None"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Information about the imagery */}
                <div className="rounded-lg bg-gray-800 p-4">
                  <h3 className="mb-2 text-sm font-medium text-blue-400">
                    About These Images
                  </h3>
                  <p className="mb-2 text-sm text-gray-300">
                    These satellite images have been enhanced to help the AI
                    analyze your roof&apos;s structure and features:
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-sm text-gray-400">
                    <li>
                      Edge detection highlights roof facets, ridges, and valleys
                    </li>
                    <li>
                      Contrast enhancement improves material identification
                    </li>
                    <li>
                      Measurement grid provides scale reference for accurate
                      area calculation
                    </li>
                    <li>
                      Multiple angles help identify all roof features and
                      complex geometries
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-gray-800 p-8 text-center">
                <IconCamera size={32} className="mx-auto mb-3 text-gray-500" />
                <h3 className="mb-1 text-sm font-medium text-gray-300">
                  No Images Available
                </h3>
                <p className="text-xs text-gray-400">
                  The analysis was completed without storing the enhanced
                  satellite imagery.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="debug" className="mt-2">
            {debug && (
              <div className="space-y-3">
                <div className="rounded-lg bg-gray-800 p-4">
                  <h3 className="mb-2 text-sm font-medium text-blue-400">
                    Request Information
                  </h3>
                  <div className="space-y-2 text-xs text-gray-300">
                    <div>
                      <span className="font-medium text-blue-300">
                        Model Used:
                      </span>{" "}
                      {debug.model || "Unknown"}
                    </div>
                    {debug.requestTime && (
                      <div>
                        <span className="font-medium text-blue-300">
                          Request Time:
                        </span>{" "}
                        {debug.requestTime}ms
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-blue-300">
                        Images Sent:
                      </span>{" "}
                      {debug.imageCount || "Unknown"}
                    </div>
                    {debug.promptLength && (
                      <div>
                        <span className="font-medium text-blue-300">
                          Prompt Length:
                        </span>{" "}
                        {debug.promptLength} chars
                      </div>
                    )}
                  </div>
                </div>

                {debug.prompt && (
                  <div className="rounded-lg bg-gray-800 p-4">
                    <h3 className="mb-2 text-sm font-medium text-blue-400">
                      Prompt Used
                    </h3>
                    <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs text-gray-300">
                      {debug.prompt}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </CardContent>
      </Tabs>

      <CardFooter className="border-t border-gray-700 bg-gray-800 px-4 py-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpandedView(!expandedView)}
          className="border-gray-700 bg-gray-800 text-xs hover:bg-gray-700"
        >
          {expandedView ? "Show Less" : "Show More"}
        </Button>
      </CardFooter>
    </Card>
  )
}

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

// Helper function to parse analysis into structured sections for better display
const parseAnalysisIntoSections = (
  analysisText: string
): Array<{ title: string | null; content: string }> => {
  if (!analysisText) return []

  const sections: Array<{ title: string | null; content: string }> = []

  // Split by common section headers (lines with all caps or ending with colon)
  const lines = analysisText.split("\n")
  let currentSection: { title: string | null; content: string } | null = null

  for (const line of lines) {
    // Check if this line is a section header
    const isHeader =
      line.trim().endsWith(":") ||
      (line.trim().length > 0 &&
        line.trim() === line.trim().toUpperCase() &&
        line.trim().length < 100) ||
      line.match(/^={3,}/) // Lines with === separators

    if (isHeader && !line.match(/^={3,}/)) {
      // Save previous section if exists
      if (currentSection && currentSection.content.trim()) {
        sections.push(currentSection)
      }
      // Start new section
      currentSection = {
        title: line.trim().replace(/:$/, ""),
        content: ""
      }
    } else if (line.match(/^={3,}/) || line.match(/^─{3,}/)) {
      // Skip separator lines
      continue
    } else {
      // Add content to current section
      if (!currentSection) {
        currentSection = { title: null, content: "" }
      }
      if (line.trim()) {
        currentSection.content += line + "\n"
      } else {
        currentSection.content += "\n"
      }
    }
  }

  // Add the last section
  if (currentSection && currentSection.content.trim()) {
    sections.push(currentSection)
  }

  // If no sections were found, return the entire text as one section
  if (sections.length === 0) {
    return [{ title: null, content: analysisText.trim() }]
  }

  return sections
}

// Helper function to convert azimuth degrees to cardinal direction
const getCardinalDirection = (azimuth: number): string => {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
  const index = Math.round(azimuth / 45) % 8
  return directions[index]
}

export default RoofAnalysisResults
