// components > explore > ExploreMap.tsx

"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { IconLoader2, IconInfoCircle, IconMapPin } from "@tabler/icons-react"
import html2canvas from "html2canvas"
import axios from "axios"
import {
  enhanceImageForRoofAnalysis,
  segmentRoofColors,
  enhanceRoofPitch,
  estimatePropertySize,
  calculateOptimalZoom,
  validatePropertyFitsInFrame
} from "@/lib/image-processing"
import {
  extractSolarRoofMetrics,
  estimatePropertySizeFromSolar,
  formatRoofMetricsForReport
} from "@/lib/solar-data-extractor"
import { useChatbotUI } from "@/context/context"

// Import our components
import MapView from "./MapView"
import CombinedReport from "@/components/property/combined-report"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"

// Available models for roof analysis
const availableModels = [
  { value: "gpt-5.1", label: "GPT-5.1 (Recommended)", provider: "openai" },
  {
    value: "claude-sonnet-4-5-20250929",
    label: "Claude Sonnet 4.5 (Latest)",
    provider: "anthropic"
  },
  {
    value: "grok-2-vision-1212",
    label: "Grok 2 Vision (xAI)",
    provider: "xai"
  },
  { value: "gpt-4o", label: "GPT-4o (Balanced)", provider: "openai" },
  { value: "o4-mini-2025-04-16", label: "GPT-o4-mini", provider: "openai" },
  { value: "gpt-4.1-2025-04-14", label: "GPT-4.1", provider: "openai" }
]

interface ExploreMapProps {
  onPropertySelect: (propertyData: any) => void
  workspaceId: string
}

const ExploreMap: React.FC<ExploreMapProps> = ({
  onPropertySelect,
  workspaceId
}) => {
  const [isClient, setIsClient] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number
    lng: number
  } | null>(null)
  const [selectedAddress, setSelectedAddress] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [measuredArea, setMeasuredArea] = useState<string | null>(null)
  const [measuredDistance, setMeasuredDistance] = useState<string | null>(null)
  const [roofAnalysis, setRoofAnalysis] = useState(null)
  const [reportData, setReportData] = useState(null)
  const [selectedModel, setSelectedModel] = useState("gpt-5.1")
  const [isDebugMode, setIsDebugMode] = useState(false)
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const [captureAngle, setCaptureAngle] = useState(0)
  const [is3DMode, setIs3DMode] = useState(true)
  const [captureProgress, setCaptureProgress] = useState(0)
  const [livePreviewImages, setLivePreviewImages] = useState<any[]>([])
  const [currentCaptureStage, setCurrentCaptureStage] = useState("")

  // This is a direct reference to the map container div from the MapView component
  const mapContainerRef = useRef<HTMLDivElement | null>(null)

  // Add a mapRef here that will be set by MapView
  const mapRef = useRef<google.maps.Map | null>(null)
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)

  // Set better default image processing options for improved clarity
  const [imageProcessingOptions, setImageProcessingOptions] = useState({
    enhanceEdges: true, // Keep edge detection
    enhanceContrast: true, // Disable contrast enhancement by default
    addMeasurementGrid: true, // Keep measurement grid
    colorSegmentation: false,
    pitchEnhancement: false
  })

  const { toast } = useToast()
  const { showSidebar, setShowSidebar } = useChatbotUI()

  // Mark when we're on the client
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Auto-collapse sidebar when report opens
  useEffect(() => {
    if ((roofAnalysis || reportData) && showSidebar) {
      setShowSidebar(false)
      localStorage.setItem("showSidebar", "false")
    }
  }, [roofAnalysis, reportData, showSidebar, setShowSidebar])

  // Debug logging function
  const logDebug = useCallback(
    (message: string) => {
      if (isDebugMode) {
        console.log(`[Debug] ${message}`)
        setDebugLogs(prev => [
          ...prev,
          `${new Date().toLocaleTimeString()}: ${message}`
        ])
      }
    },
    [isDebugMode]
  )

  // Toggle debug mode
  const toggleDebugMode = useCallback(() => {
    setIsDebugMode(!isDebugMode)
    setDebugLogs([])

    toast({
      title: !isDebugMode ? "Debug Mode Enabled" : "Debug Mode Disabled",
      description: !isDebugMode
        ? "Detailed logging and API request/response information will be shown."
        : "Debug information will be hidden.",
      duration: 3000
    })
  }, [isDebugMode, toast])

  // Toggle 3D mode
  const toggleIs3DMode = useCallback(() => {
    setIs3DMode(!is3DMode)
    logDebug(`3D mode ${!is3DMode ? "enabled" : "disabled"}`)

    toast({
      title: !is3DMode ? "3D Mode Enabled" : "3D Mode Disabled",
      description: !is3DMode
        ? "Will capture perspective views with 45° tilt for better roof analysis."
        : "Will use standard overhead views for roof analysis.",
      duration: 3000
    })
  }, [is3DMode, logDebug, toast])

  // Enhanced capture satellite views function with 3D mode option
  const captureSatelliteViews = async () => {
    if (!selectedLocation || !mapContainerRef.current) {
      console.error("Missing required data")
      return null
    }

    setIsAnalyzing(true)
    setCaptureProgress(0)
    setLivePreviewImages([])
    setCurrentCaptureStage("Initializing capture...")

    try {
      logDebug(
        `Starting satellite view capture for ${selectedAddress || "selected location"}`
      )

      // Create the views array to store our captures
      const views = []

      // === FETCH SOLAR API DATA FIRST (FOR ACCURATE MEASUREMENTS) ===
      logDebug("Fetching Solar API data for accurate roof measurements...")

      let solarMetrics: any = null
      let propertySize: any

      try {
        const solarResponse = await fetch("/api/solar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: selectedLocation.lat,
            lng: selectedLocation.lng
          })
        })

        if (solarResponse.ok) {
          const solarData = await solarResponse.json()
          solarMetrics = extractSolarRoofMetrics(solarData)

          if (solarMetrics) {
            logDebug(`✓ Solar API data received:`)
            logDebug(`  - Roof Area: ${solarMetrics.totalRoofAreaSqFt} sq ft`)
            logDebug(`  - Facet Count: ${solarMetrics.roofSegmentCount}`)
            logDebug(`  - Predominant Pitch: ${solarMetrics.predominantPitch}`)
            logDebug(
              `  - Building Area: ${solarMetrics.buildingAreaSqFt} sq ft`
            )

            // Use Solar API data to estimate property size for zoom
            propertySize = estimatePropertySizeFromSolar(solarMetrics)
            logDebug(
              `Calculated property size from Solar API: ${propertySize.widthMeters}m x ${propertySize.heightMeters}m`
            )
          } else {
            logDebug(
              "⚠ Could not extract solar metrics, using default estimate"
            )
            propertySize = estimatePropertySize(
              selectedLocation.lat,
              selectedLocation.lng
            )
          }
        } else {
          logDebug(
            "⚠ Solar API call failed, using default property size estimate"
          )
          propertySize = estimatePropertySize(
            selectedLocation.lat,
            selectedLocation.lng
          )
        }
      } catch (error) {
        console.error("Error fetching Solar API data:", error)
        logDebug("⚠ Solar API error, using default property size estimate")
        propertySize = estimatePropertySize(
          selectedLocation.lat,
          selectedLocation.lng
        )
      }

      // === DYNAMIC ZOOM CALCULATION (USING SOLAR API DATA) ===
      logDebug("Calculating optimal zoom for property...")
      logDebug(
        `Property size for zoom calc: ${propertySize.widthMeters}m x ${propertySize.heightMeters}m`
      )

      // Get viewport dimensions (approximate map container size)
      const viewportWidth = mapContainerRef.current?.offsetWidth || 1200
      const viewportHeight = mapContainerRef.current?.offsetHeight || 800

      const zoomCalc = calculateOptimalZoom(
        propertySize.widthMeters,
        propertySize.heightMeters,
        selectedLocation.lat,
        viewportWidth,
        viewportHeight,
        0.7 // Property fills 70% of frame
      )

      logDebug(
        `Optimal zoom: ${zoomCalc.optimalZoom}, Using levels: ${zoomCalc.zoomLevels.join(", ")}`
      )
      logDebug(
        `Scale at optimal zoom: ${zoomCalc.metersPerPixel.toFixed(3)}m/pixel`
      )

      // Validate each zoom level
      zoomCalc.zoomLevels.forEach((zoom, idx) => {
        const validation = validatePropertyFitsInFrame(
          propertySize.widthMeters,
          propertySize.heightMeters,
          zoom,
          selectedLocation.lat,
          viewportWidth,
          viewportHeight
        )
        logDebug(
          `Zoom ${zoom}: Coverage ${(validation.coveragePercent * 100).toFixed(0)}%${validation.warning ? ` - ${validation.warning}` : ""}`
        )
      })

      // CRITICAL FIX: First re-center the map on the selected property with optimal zoom
      if (mapRef.current && selectedLocation) {
        try {
          // Center the map on the selected location before starting captures
          mapRef.current.setCenter({
            lat: selectedLocation.lat,
            lng: selectedLocation.lng
          })

          // Set OPTIMAL zoom level for capturing property details
          mapRef.current.setZoom(zoomCalc.optimalZoom)

          logDebug(
            `Map centered on property at ${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)} with optimal zoom ${zoomCalc.optimalZoom}`
          )

          // Add a brief delay to ensure the map is properly centered before starting captures
          await new Promise(resolve => setTimeout(resolve, 800))
        } catch (e) {
          console.error("Error centering map on property:", e)
          logDebug(`Error centering map: ${e.message}`)
        }
      }

      // === MULTI-ZOOM TOP VIEWS (3 dynamically calculated zoom levels) ===
      const zoomLevels = zoomCalc.zoomLevels
      const zoomLabels = ["Context", "Standard", "Detail"]

      for (let zoomIdx = 0; zoomIdx < zoomLevels.length; zoomIdx++) {
        const zoomLevel = zoomLevels[zoomIdx]
        const zoomLabel = zoomLabels[zoomIdx]

        setCurrentCaptureStage(
          `Capturing overhead view (${zoomLabel} - Zoom ${zoomLevel})...`
        )
        logDebug(`Capturing top view at zoom ${zoomLevel} (${zoomLabel})`)

        // Check if we have the map reference before trying to use it
        if (mapRef.current) {
          try {
            // Set map to default tilt (0) for overhead view
            mapRef.current.setTilt(0)
            // Reset heading to north (0 degrees)
            mapRef.current.setHeading(0)

            // Set zoom level and wait for tiles to load
            const map = mapRef.current
            map.setZoom(zoomLevel)

            // Wait for tiles to finish loading using Google Maps tilesloaded event
            await new Promise(resolve => {
              const tilesLoadedListener = map.addListener("tilesloaded", () => {
                google.maps.event.removeListener(tilesLoadedListener)
                resolve()
              })
              // Fallback timeout in case tilesloaded doesn't fire
              setTimeout(() => {
                google.maps.event.removeListener(tilesLoadedListener)
                resolve()
              }, 5000)
            })

            // Additional delay to ensure rendering is complete
            await new Promise(resolve => setTimeout(resolve, 1000))

            logDebug(
              `Map settings adjusted and tiles loaded for zoom ${zoomLevel}`
            )
          } catch (e) {
            console.error("Error setting map properties:", e)
            logDebug(`Error setting map properties: ${e.message}`)
          }
        } else {
          logDebug("Map reference is not available for manipulation")
        }

        // Allow extra time for final rendering
        await new Promise(resolve => setTimeout(resolve, 500))

        // Capture top view at this zoom level
        const topView = await captureMapView(
          mapContainerRef,
          `top-zoom${zoomLevel}`
        )
        if (topView) {
          topView.enhancementOptions = {
            enhanceEdges: imageProcessingOptions.enhanceEdges,
            enhanceContrast: imageProcessingOptions.enhanceContrast,
            addMeasurementGrid: imageProcessingOptions.addMeasurementGrid
          }
          topView.zoomLevel = zoomLevel
          topView.zoomLabel = zoomLabel
          // Update view name to be more descriptive
          topView.viewName = `Overhead (${zoomLabel})`
          views.push(topView)
          setLivePreviewImages(prev => [...prev, topView])
          setCaptureProgress(5 + ((zoomIdx + 1) / zoomLevels.length) * 15)
        }
      }

      // Reset to optimal zoom for angled views
      if (mapRef.current) {
        try {
          mapRef.current.setZoom(zoomCalc.optimalZoom)
          logDebug(
            `Reset to optimal zoom ${zoomCalc.optimalZoom} for angled views`
          )
        } catch (e) {
          console.error("Error resetting zoom:", e)
        }
      }

      // Capture views from all four cardinal directions: North, East, South, West
      const angles = [0, 90, 180, 270] // North, East, South, West
      for (let i = 0; i < angles.length; i++) {
        const angle = angles[i]
        setCaptureAngle(angle)
        setCurrentCaptureStage(
          `Capturing view from ${getDirectionName(angle)}...`
        )

        logDebug(`Capturing view at ${angle}° heading`)

        // Check if we have the map reference before trying to use it
        if (mapRef.current) {
          try {
            // Re-center the map before each rotation angle to ensure property stays in view
            mapRef.current.setCenter({
              lat: selectedLocation.lat,
              lng: selectedLocation.lng
            })

            // Set map to the current angle
            mapRef.current.setHeading(angle)

            // Add tilt in 3D mode for perspective views
            if (is3DMode) {
              mapRef.current.setTilt(60) // 60-degree tilt for better 3D perspective
            }
            logDebug(
              `Map settings adjusted for angle ${angle}°, tilt: ${is3DMode ? "45°" : "0°"}`
            )
          } catch (e) {
            console.error(
              `Error setting map heading/tilt for angle ${angle}:`,
              e
            )
            logDebug(`Error setting map heading/tilt: ${e.message}`)
          }
        } else {
          logDebug("Map reference is not available for manipulation")
        }

        // Allow time for map to render with new orientation
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Get the direction name based on the angle
        const directionName = getDirectionName(angle)

        // Capture view with current angle
        const view = await captureMapView(mapContainerRef, directionName)
        if (view) {
          view.enhancementOptions = {
            enhanceEdges: imageProcessingOptions.enhanceEdges,
            enhanceContrast: imageProcessingOptions.enhanceContrast,
            addMeasurementGrid: imageProcessingOptions.addMeasurementGrid
          }
          view.angle = angle
          view.tilt = is3DMode ? 60 : 0
          views.push(view)
          setLivePreviewImages(prev => [...prev, view])
          // Update progress: 20% done after zoom levels, 80% for angled views
          setCaptureProgress(20 + ((i + 1) / angles.length) * 70)
        }
      }

      // Reset map to original state
      if (mapRef.current) {
        try {
          mapRef.current.setHeading(0)
          mapRef.current.setTilt(0)
          logDebug("Map reset to original state")
        } catch (e) {
          console.error("Error resetting map properties:", e)
          logDebug(`Error resetting map: ${e.message}`)
        }
      }

      logDebug(`Successfully captured ${views.length} views`)
      setCaptureProgress(90)
      setCurrentCaptureStage("Analyzing images with AI...")

      // Send views to LLM for analysis (with Solar API ground truth if available)
      const analysisResult = await sendToLLMForAnalysis(views, solarMetrics)

      // Store the captured views in the analysis result
      if (analysisResult) {
        analysisResult.capturedImages = views
        analysisResult.satelliteViews = views
      }

      setRoofAnalysis(analysisResult)
      setCaptureProgress(100)

      return analysisResult
    } catch (error) {
      console.error("Error capturing satellite views:", error)
      logDebug(`Error during capture: ${error.message}`)
      toast({
        title: "Error",
        description: "Failed to capture satellite imagery for analysis",
        variant: "destructive"
      })
      return null
    } finally {
      // Always restore default map view when done
      if (mapRef.current) {
        try {
          mapRef.current.setHeading(0)
          mapRef.current.setTilt(0)
        } catch (e) {
          console.error("Error in finally block:", e)
        }
      }
      setIsAnalyzing(false)
      setCaptureAngle(0)
      setCurrentCaptureStage("")
      // Don't clear livePreviewImages here - let them stay visible until next capture
    }
  }

  // Get direction name based on angle
  const getDirectionName = (angle: number): string => {
    const directions = [
      "north",
      "northeast",
      "east",
      "southeast",
      "south",
      "southwest",
      "west",
      "northwest"
    ]
    return directions[Math.round(angle / 45) % 8]
  }

  // Fixed captureMapView function with duplicate pitch enhancement removed
  const captureMapView = async (
    containerRef: React.RefObject<HTMLDivElement>,
    viewName: string
  ) => {
    if (!containerRef.current) {
      console.error(`Cannot capture ${viewName} view - container ref is null`)
      return null
    }

    // Store original container styles for restoration (outside try block for catch access)
    const isMobile = window.innerWidth < 768
    const originalWidth = containerRef.current.style.width
    const originalHeight = containerRef.current.style.height
    const originalPosition = containerRef.current.style.position

    try {
      logDebug(`Capturing ${viewName} view...`)

      // IMPORTANT FIX: First hide any Google Maps info windows/tooltips before capture
      if (mapRef.current) {
        try {
          // Close any open info windows
          if (infoWindowRef.current) {
            infoWindowRef.current.close()
          }
        } catch (e) {
          console.error("Error closing info windows:", e)
        }
      }

      // Hide Google Maps UI elements temporarily
      const mapControls = containerRef.current.querySelectorAll(
        ".gm-style-iw, .gm-ui-hover-effect, .gm-style-iw-t"
      )
      mapControls.forEach((control: HTMLElement) => {
        control.style.display = "none"
      })

      // Adjust container aspect ratio for portrait screenshots on mobile

      if (isMobile) {
        // Force portrait aspect ratio (9:16) for mobile screenshots
        const targetWidth = Math.min(window.innerWidth, 720) // Max 720px width
        const targetHeight = (targetWidth / 9) * 16 // 9:16 aspect ratio

        containerRef.current.style.width = `${targetWidth}px`
        containerRef.current.style.height = `${targetHeight}px`
        containerRef.current.style.position = "relative"

        logDebug(
          `Mobile detected - resizing container to portrait: ${targetWidth}x${targetHeight}`
        )

        // Wait for map to adjust
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      // Improved html2canvas settings for higher quality captures
      const canvas = await html2canvas(containerRef.current, {
        useCORS: true,
        allowTaint: true,
        logging: isDebugMode,
        scale: 3.0, // Maximum scale for highest resolution and accuracy
        backgroundColor: null, // Preserve transparency
        imageTimeout: 0, // No timeout for better handling of complex maps
        removeContainer: false, // Keep the original container
        ignoreElements: element => {
          // Ignore Google Maps tooltips and UI controls
          return (
            element.classList.contains("gm-style-iw") ||
            element.classList.contains("gm-ui-hover-effect") ||
            element.classList.contains("gm-style-iw-t")
          )
        }
      })

      // Restore Google Maps UI elements
      mapControls.forEach((control: HTMLElement) => {
        control.style.display = ""
      })

      // Restore original container size if we modified it for mobile
      if (isMobile && containerRef.current) {
        containerRef.current.style.width = originalWidth
        containerRef.current.style.height = originalHeight
        containerRef.current.style.position = originalPosition
        logDebug("Restored original container size after mobile capture")
      }

      // Convert canvas to base64 image with maximum quality
      let imageData = canvas.toDataURL("image/jpeg", 0.98) // Near-lossless quality for accuracy

      // Apply image enhancements with improved settings + metadata
      logDebug(`Enhancing ${viewName} view with image processing v2.0...`)

      // Get current map metadata
      const currentZoom = mapRef.current?.getZoom() || 20
      const currentLat = selectedLocation?.lat || 0
      const currentLng = selectedLocation?.lng || 0
      const currentTilt = mapRef.current?.getTilt() || 0
      const currentHeading = mapRef.current?.getHeading() || 0

      // Apply main enhancements (edges, contrast, grid) with metadata
      const enhancedResult = await enhanceImageForRoofAnalysis(imageData, {
        enhanceEdges: imageProcessingOptions.enhanceEdges,
        enhanceContrast: imageProcessingOptions.enhanceContrast,
        addMeasurementGrid: imageProcessingOptions.addMeasurementGrid,
        compensateShadows: true, // NEW: Shadow compensation
        sharpenImage: true, // NEW: Image sharpening
        dimensions: {
          width: canvas.width,
          height: canvas.height
        },
        zoom: currentZoom,
        latitude: currentLat
      })

      // Extract enhanced image data and metadata
      imageData = enhancedResult.imageData
      const metadata = enhancedResult.metadata
      const qualityScore = enhancedResult.qualityScore

      logDebug(`Image quality score: ${qualityScore}/100`)
      logDebug(
        `Scale: ${metadata.metersPerPixel.toFixed(3)}m/pixel at zoom ${currentZoom}`
      )

      // Apply color segmentation if enabled
      if (imageProcessingOptions.colorSegmentation) {
        try {
          const segmentedImage = await segmentRoofColors(imageData)
          logDebug(`Generated color segmentation variant for ${viewName}`)
          // Set the processed image as the current imageData
          imageData = segmentedImage
        } catch (error) {
          console.error(
            `Error during color segmentation for ${viewName}:`,
            error
          )
          logDebug(
            `Color segmentation failed, continuing without it: ${error.message}`
          )
        }
      }

      // Apply pitch enhancement if enabled
      if (imageProcessingOptions.pitchEnhancement) {
        try {
          const pitchImage = await enhanceRoofPitch(imageData)
          logDebug(`Generated pitch enhancement variant for ${viewName}`)
          // Set the processed image as the current imageData
          imageData = pitchImage
        } catch (error) {
          console.error(
            `Error during pitch enhancement for ${viewName}:`,
            error
          )
          logDebug(
            `Pitch enhancement failed, continuing without it: ${error.message}`
          )
        }
      }

      logDebug(
        `${viewName} view captured and enhanced (${Math.round(imageData.length / 1024)} KB)`
      )

      return {
        imageData,
        viewName,
        timestamp: new Date().toISOString(),
        enhanced: true,
        metadata: {
          ...metadata,
          tilt: currentTilt,
          heading: currentHeading,
          lng: currentLng
        },
        qualityScore
      }
    } catch (error) {
      console.error(`Error capturing ${viewName} view:`, error)
      logDebug(`Failed to capture ${viewName} view: ${error.message}`)

      // Restore original container size in case of error
      if (containerRef.current && isMobile) {
        containerRef.current.style.width = originalWidth
        containerRef.current.style.height = originalHeight
        containerRef.current.style.position = originalPosition
        logDebug("Restored original container size after error")
      }

      return null
    }
  }

  // Function to send images to LLM for analysis
  const sendToLLMForAnalysis = async (satelliteViews, solarMetrics = null) => {
    const startTime = Date.now() // Track response time

    try {
      // Filter out any null views from failed captures
      const validViews = satelliteViews.filter(view => view !== null)

      if (validViews.length === 0) {
        throw new Error("No valid satellite images captured")
      }

      // Get the selected model's provider
      const selectedModelInfo = availableModels.find(
        model => model.value === selectedModel
      )
      const provider = selectedModelInfo?.provider || "anthropic"

      logDebug(
        `Sending ${validViews.length} enhanced views to ${provider} model ${selectedModel} for analysis`
      )

      // Build reference section if Solar API data is available (for comparison only)
      let referenceSection = ""
      if (solarMetrics) {
        referenceSection = `
  ═══════════════════════════════════════════════════════════════════
  📊 SOLAR API REFERENCE DATA (For Comparison - DO NOT USE AS FINAL VALUES)
  ═══════════════════════════════════════════════════════════════════

  Google Solar API estimates (these may NOT be accurate - you must verify visually):
  - Estimated Roof Area: ${solarMetrics.totalRoofAreaSqFt} sq ft (verify from images)
  - Estimated Facet Count: ${solarMetrics.roofSegmentCount} segments (recount from images)
  - Estimated Pitch: ${solarMetrics.predominantPitch} (verify from shadows and angles)

  ⚠️ IMPORTANT: These Solar API values are ESTIMATES ONLY. You must:
  1. Carefully count facets yourself from the multiple angle images
  2. Use the scale bar and grid to measure actual roof area
  3. Verify pitch from visible shadows and roof angles
  4. Your visual analysis should OVERRIDE these estimates if you see discrepancies
  ═══════════════════════════════════════════════════════════════════`
      }

      // Create a more detailed prompt that explains the enhancements and measurement grid
      const enhancedPrompt = `As an expert roofing analyst, I need your detailed assessment of a property at ${selectedAddress || `${selectedLocation?.lat.toFixed(6)}, ${selectedLocation?.lng.toFixed(6)}`}. Focus on the property most centered in these images and compare all images to determine the most accurate details about the subject property.
${referenceSection}

  IMPORTANT VISUAL ENHANCEMENT INFORMATION:
  - The images have been enhanced with edge detection to highlight roof facets and boundaries
  - A measurement grid has been added for reference (approximately 10x10 grid)
  - A scale bar shows the actual zoom level and meters per pixel
  - North direction is indicated in the top right corner
  - Shadow compensation has been applied to reveal features in shadowed areas
  - Image sharpening has been applied for better detail visibility

  CRITICAL: You MUST respond with valid JSON in this exact format:
  {
    "userSummary": "A 2-3 sentence executive summary for the property owner describing the roof in plain language",
    "structuredData": {
      "facetCount": <number of distinct roof planes>,
      "roofArea": <total area in square feet>,
      "roofAreaRange": [<min_estimate>, <max_estimate>],
      "squares": <roofing squares (area/100)>,
      "pitch": "<dominant pitch like 6/12 or 8/12>",
      "ridgeLength": <linear feet of ridges>,
      "valleyLength": <linear feet of valleys>,
      "complexity": "<simple|moderate|complex>",
      "confidence": "<low|medium|high>",
      "material": "<observed roofing material>",
      "condition": "<observed condition>"
    },
    "detailedAnalysis": "Your complete technical analysis with all measurements, observations, and recommendations"
  }

  SYSTEMATIC MULTI-VIEW ANALYSIS PROTOCOL:

  You have 6 images provided in this order:
  1. Overhead Context (zoomed out for full property view)
  2. Overhead Detail (zoomed in for precise measurements)
  3. Angled View - North
  4. Angled View - East
  5. Angled View - South
  6. Angled View - West

  ANALYSIS WORKFLOW - Follow this exact sequence:

  📋 PHASE 1 - Individual Image Analysis:

  IMAGE 1 (Overhead Context - Wide View):
  - Identify the complete building footprint and property boundaries
  - Count all separate structures (main house, garage, shed, addition, etc.)
  - Identify main roof sections and their basic geometry
  - Look for the overall roof TYPE: Gable, Hip, Dutch Hip, Mansard, Gambrel, etc.
  - Note any complex features like dormers, valleys, or multiple levels
  - Initial facet estimate: Count ONLY the major distinct planes you can clearly see
  - Write down: "From context view, I see approximately X major roof planes"

  IMAGE 2 (Overhead Detail - Maximum Zoom):
  ⚠️ THIS IS YOUR PRIMARY MEASUREMENT IMAGE - BE EXTREMELY CAREFUL HERE ⚠️

  SYSTEMATIC FACET COUNTING METHOD:
  Step 1: Start with the MAIN ROOF structure
    - Identify if it's a simple gable (2 planes) or hip (4+ planes)
    - Count each distinct flat surface as ONE facet
    - Mark mentally or note: "Main roof has X planes"

  Step 2: Count EACH DORMER separately
    - A typical gable dormer = 3 facets (front + 2 sides)
    - A shed dormer = 1 facet (flat front)
    - A hip dormer = 3-4 facets
    - Mark: "Found Y dormers with Z total facets"

  Step 3: Look for GARAGE/ATTACHMENT roofs
    - Count garage roof planes separately
    - Check if garage is under main roof or separate
    - Mark: "Garage adds W facets"

  Step 4: Check for PORCHES/OVERHANGS
    - Front porch roof, back deck cover, bay window roofs
    - Mark: "Porches/overhangs add V facets"

  Step 5: Look for VALLEYS between sections
    - Valleys indicate where two roof planes meet
    - Each valley connects exactly 2 facets

  Step 6: VERIFY your count
    - Add up all sections: X + Z + W + V = TOTAL
    - Look at the image again - did you miss anything?
    - Check the grid: use the measurement grid to systematically scan each section

  ⚠️ USE THE BRIGHT YELLOW SCALE BAR for measurements:
  - The scale bar shows 20 meters (65 feet)
  - Count grid squares to estimate dimensions
  - Each grid cell represents approximately [calculate from scale]

  Final note for Image 2: "After systematic analysis, I count EXACTLY [number] distinct roof facets"

  IMAGE 3 (Angled North View):
  - Look for facets hidden from overhead view
  - Observe roof pitch from the visible slope
  - Check for features obscured by trees or shadows in overhead views
  - Note: [Did you find any additional facets?]

  IMAGE 4 (Angled East View):
  - Cross-validate facets seen in previous views
  - Look for facets on different sides of the building
  - Verify pitch consistency across different roof sections
  - Note: [Did you find any additional facets?]

  IMAGE 5 (Angled South View):
  - Cross-validate facets seen in previous views
  - Look for facets on the south side of the building
  - Check for any missed features
  - Note: [Did you find any additional facets?]

  IMAGE 6 (Angled West View):
  - Final cross-validation of all facets from all angles
  - Ensure you haven't double-counted any facets
  - Verify your complete understanding of the roof structure
  - Note: [Final facet count after all 6 views]

  📊 PHASE 2 - Cross-Validation:
  - Compare your facet counts from all 6 images
  - If counts differ, investigate why (hidden facets? double counting? viewing angle?)
  - Reconcile discrepancies by re-examining specific views
  - Arrive at your final, confident facet count

  📐 PHASE 3 - Measurements:
  - Use the measurement scale from Image 2 (Detail zoom) for area calculations
  - Count grid squares and multiply by scale to estimate square footage
  - Measure ridge and valley lengths using the scale bar
  - Estimate pitch from the angled views (Images 3-6)

  📏 AREA MEASUREMENT METHODOLOGY:

  METHOD 1 - Grid Square Counting (Primary Method):
  1. Look at the BRIGHT YELLOW scale bar at the bottom of Image 2
  2. Note that the scale bar = 20 meters (approximately 65 feet)
  3. The green grid divides the image into 10x10 squares
  4. Calculate: If image width is ~200m, each grid square ≈ 20m x 20m = 400 sq meters = 4,300 sq ft
  5. Count how many grid squares the entire roof footprint covers
  6. Multiply: (grid squares) × (area per square) = Total roof area
  7. Convert to squares: Total sq ft ÷ 100 = Roofing squares

  METHOD 2 - Direct Measurement:
  1. Measure the longest roof dimension using the scale bar
  2. Measure the widest roof dimension
  3. Calculate approximate area: length × width
  4. Adjust for roof pitch (steeper roofs = more area)
  5. Add ~10-20% for pitch depending on steepness

  METHOD 3 - Cross-Validation:
  - Compare Method 1 and Method 2 results
  - They should be within 15% of each other
  - If different, re-examine your measurements
  - Use the average of both methods for final estimate

  ⚠️ REMEMBER TO ACCOUNT FOR PITCH:
  - The overhead view shows FOOTPRINT, not actual roof surface area
  - A 4/12 pitch adds ~5% area
  - A 6/12 pitch adds ~12% area
  - An 8/12 pitch adds ~20% area
  - A 10/12 pitch adds ~30% area
  - Use the angled views (Images 3-6) to estimate pitch

  📐 PITCH DETECTION:
  - Look at the angled views to see the slope of the roof
  - Steeper slopes cast longer shadows and show more "side" of the roof
  - Compare visible height vs width to estimate pitch ratio
  - Common pitches: 4/12 (low), 6/12 (medium), 8/12 (medium-steep), 10/12+ (steep)
  - Check shadow patterns - steeper roofs have more pronounced shadows

  🏠 MATERIAL & CONDITION ASSESSMENT:
  - Identify roofing material type (asphalt shingles, metal, tile, etc.)
  - Assess visible condition (new, good, fair, poor, failing)
  - Note any visible damage, wear patterns, or missing shingles
  - Identify moss, algae, or biological growth
  - Check for sagging, waviness, or structural concerns
  - Look for proper flashing around chimneys, vents, skylights

  🌲 ARCHITECTURAL FEATURES:
  - Identify dormers, valleys, hips, ridges
  - Note chimneys, vents, skylights, and penetrations
  - Assess roof complexity (simple gable, complex multi-hip, etc.)
  - Identify any unusual features or challenges
  - Note tree coverage and shading patterns

  ⚠️ CRITICAL ACCURACY REQUIREMENTS:

  1. FACET COUNTING (Most Important):
     - Use the systematic 6-step method described above
     - Count EVERY distinct flat surface as one facet
     - Don't guess - if you can't see it clearly in the detail view, check angled views
     - A facet is a continuous flat surface - if there's a ridge, hip, or valley, it's a different facet
     - Re-count at least twice to verify

  2. AREA MEASUREMENT:
     - Use BOTH grid counting AND direct measurement
     - Results should match within 15%
     - If they don't match, re-measure
     - Account for pitch using the angled views
     - Provide a range if uncertain: "2,400 - 2,700 sq ft"

  3. CONFIDENCE LEVELS:
     - High confidence: Clear visibility, distinct features, measurements cross-validate
     - Medium confidence: Some shadows/trees, but main structure clear
     - Low confidence: Heavy obstruction, unclear features, measurements don't align

  4. CROSS-VALIDATION:
     - Image 1 context should match Image 2 detail
     - Facet count from overhead should match what you see in angled views
     - If you count 8 facets overhead but only see 6 from angles, re-examine
     - The number of valleys + ridges should match the facet geometry

  5. IF IN DOUBT:
     - Provide a range instead of a single number
     - Explain what's unclear: "Unable to confirm if dormer has 2 or 3 facets due to shadows"
     - Be conservative - it's better to undercount than overcount
     - Use the detail image as the authoritative source

  Take your time. Accuracy over speed. You're a roofing professional analyzing this for a real customer.

  REMEMBER: Respond ONLY with valid JSON. No markdown, no code blocks, just the JSON object.`

      // Format payload to match OpenAI chat API expectations
      const addressStr =
        selectedAddress ||
        `${selectedLocation?.lat.toFixed(6)}, ${selectedLocation?.lng.toFixed(6)}`

      // Build the message content with images
      const messageContent: any[] = [
        {
          type: "text",
          text: `${enhancedPrompt}\n\nProperty Address: ${addressStr}`
        }
      ]

      // Add satellite images to message content
      validViews.forEach((view, index) => {
        messageContent.push({
          type: "image_url",
          image_url: {
            url: view.imageData,
            detail: "high"
          }
        })
      })

      const payload = {
        chatSettings: {
          model: selectedModel,
          temperature: 0.7
        },
        messages: [
          {
            role: "system",
            content:
              "You are a roofing expert analyzing satellite imagery to assess roof conditions."
          },
          {
            role: "user",
            content: messageContent
          }
        ],
        workspaceId: workspaceId
      }

      if (isDebugMode) {
        // Log payload size
        const payloadSize = JSON.stringify(payload).length
        logDebug(
          `API payload size: ${Math.round((payloadSize / 1024 / 1024) * 100) / 100} MB`
        )
        logDebug(
          `Sending ${validViews.length} images to model: ${selectedModel}`
        )
      }

      // Send to appropriate chat API based on provider
      const apiEndpoint =
        provider === "anthropic"
          ? "/api/chat/anthropic"
          : provider === "xai"
            ? "/api/chat/xai"
            : "/api/chat/openai"
      logDebug(`Sending request to ${apiEndpoint}`)
      const response = await axios.post(apiEndpoint, payload)

      logDebug("Analysis completed successfully")

      // Parse the response - try to extract JSON first
      let analysisResult: any = {}

      if (typeof response.data === "string") {
        const responseText = response.data.trim()

        // Try to parse as JSON (GPT-4o should return JSON per our prompt)
        try {
          // Remove markdown code blocks if present
          const jsonMatch =
            responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) ||
            responseText.match(/(\{[\s\S]*\})/)

          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[1])

            // Validate the structure
            if (parsed.structuredData && parsed.userSummary) {
              // Extract detailed analysis from multiple possible locations
              const detailedAnalysisText =
                parsed.detailedAnalysis ||
                parsed.structuredData?.detailedAnalysis ||
                parsed.analysis ||
                responseText

              analysisResult = {
                analysis: detailedAnalysisText,
                structuredData: {
                  ...parsed.structuredData,
                  userSummary: parsed.userSummary,
                  detailedAnalysis: detailedAnalysisText
                },
                capturedImages: validViews,
                satelliteViews: validViews,
                debug: {
                  modelUsed: selectedModel,
                  responseTime: Date.now() - startTime,
                  imageCount: validViews.length,
                  hasDetailedAnalysis: !!detailedAnalysisText
                }
              }
              logDebug("Successfully parsed structured JSON response", {
                hasDetailedAnalysis: !!detailedAnalysisText,
                analysisLength: detailedAnalysisText?.length || 0
              })
            } else {
              throw new Error("Invalid JSON structure")
            }
          } else {
            throw new Error("No JSON found in response")
          }
        } catch (parseError) {
          console.warn(
            "Could not parse JSON, falling back to text parsing:",
            parseError
          )

          // Fallback: Try to extract metrics from text
          const metrics = {
            facetCount: null as number | null,
            roofArea: null as number | null,
            roofAreaRange: null as [number, number] | null,
            squares: null as number | null,
            pitch: null as string | null,
            ridgeLength: null as number | null,
            valleyLength: null as number | null,
            complexity: null as string | null,
            confidence: null as string | null,
            material: null as string | null,
            condition: null as string | null
          }

          // Extract facet count
          const facetMatch = responseText.match(
            /(\d+)\s*(?:distinct\s*)?(?:roof\s*)?(?:facets?|planes?)/i
          )
          if (facetMatch) metrics.facetCount = parseInt(facetMatch[1])

          // Extract roof area
          const areaMatch = responseText.match(
            /(\d{1,3}(?:,\d{3})*|\d+)\s*(?:square\s*)?(?:feet|ft|sq\.?\s*ft)/i
          )
          if (areaMatch)
            metrics.roofArea = parseInt(areaMatch[1].replace(/,/g, ""))

          // Extract area range
          const rangeMatch = responseText.match(
            /(\d{1,3}(?:,\d{3})*|\d+)\s*[-–]\s*(\d{1,3}(?:,\d{3})*|\d+)\s*(?:square\s*)?(?:feet|ft|sq\.?\s*ft)/i
          )
          if (rangeMatch) {
            metrics.roofAreaRange = [
              parseInt(rangeMatch[1].replace(/,/g, "")),
              parseInt(rangeMatch[2].replace(/,/g, ""))
            ]
          }

          // Extract squares
          const squaresMatch = responseText.match(
            /(\d+)\s*(?:roofing\s*)?squares?/i
          )
          if (squaresMatch) metrics.squares = parseInt(squaresMatch[1])
          else if (metrics.roofArea)
            metrics.squares = Math.round(metrics.roofArea / 100)

          // Extract pitch
          const pitchMatch =
            responseText.match(/(\d+)\/12\s*pitch/i) ||
            responseText.match(/pitch\s*(?:of\s*)?(\d+)\/12/i)
          if (pitchMatch) metrics.pitch = `${pitchMatch[1]}/12`

          // Extract ridge length
          const ridgeMatch = responseText.match(
            /ridge.*?(\d+)\s*(?:linear\s*)?(?:feet|ft)/i
          )
          if (ridgeMatch) metrics.ridgeLength = parseInt(ridgeMatch[1])

          // Extract valley length
          const valleyMatch = responseText.match(
            /valley.*?(\d+)\s*(?:linear\s*)?(?:feet|ft)/i
          )
          if (valleyMatch) metrics.valleyLength = parseInt(valleyMatch[1])

          // Extract complexity
          if (/complex/i.test(responseText)) metrics.complexity = "complex"
          else if (/moderate/i.test(responseText))
            metrics.complexity = "moderate"
          else if (/simple/i.test(responseText)) metrics.complexity = "simple"

          // Extract confidence
          if (/high\s*confidence/i.test(responseText))
            metrics.confidence = "high"
          else if (/medium\s*confidence/i.test(responseText))
            metrics.confidence = "medium"
          else if (/low\s*confidence/i.test(responseText))
            metrics.confidence = "low"

          // Generate a summary from the first paragraph
          const paragraphs = responseText
            .split("\n\n")
            .filter(p => p.trim().length > 50)
          const userSummary =
            paragraphs[0]?.substring(0, 300) ||
            "AI analysis completed. Review the detailed analysis section for measurements and recommendations."

          analysisResult = {
            analysis: responseText,
            structuredData: {
              ...metrics,
              userSummary
            },
            capturedImages: validViews,
            satelliteViews: validViews,
            debug: {
              modelUsed: selectedModel,
              responseTime: Date.now() - startTime,
              imageCount: validViews.length,
              parsingMethod: "text_extraction"
            }
          }

          logDebug("Used text parsing fallback to extract metrics")
        }
      } else {
        // Response is already an object
        analysisResult = response.data

        // Ensure debug info is included even when response is pre-structured
        if (!analysisResult.debug) {
          analysisResult.debug = {
            modelUsed: selectedModel,
            responseTime: Date.now() - startTime,
            imageCount: validViews.length
          }
        }
      }

      // Ensure all required fields are present
      // Try multiple sources for the detailed analysis text
      if (!analysisResult.analysis) {
        analysisResult.analysis =
          analysisResult.structuredData?.detailedAnalysis ||
          analysisResult.structuredData?.userSummary ||
          "Analysis completed successfully. Review the structured data above for measurements."
      }

      // Also store in structuredData for consistency
      if (
        analysisResult.structuredData &&
        !analysisResult.structuredData.detailedAnalysis
      ) {
        analysisResult.structuredData.detailedAnalysis = analysisResult.analysis
      }

      return analysisResult
    } catch (error) {
      console.error("Error in LLM analysis:", error)
      logDebug(`Analysis error: ${error.message}`)
      toast({
        title: "Analysis Failed",
        description: error.message || "Could not complete roof analysis",
        variant: "destructive"
      })
      return null
    }
  }

  // Image processing options toggle handler
  const toggleImageProcessingOption = (option: string) => {
    setImageProcessingOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }))

    // Log the change if in debug mode
    if (isDebugMode) {
      logDebug(`Toggled ${option} to ${!imageProcessingOptions[option]}`)
    }
  }

  // Complete reworked function to prevent tab switching and keep everything in one view
  const analyzeAndGenerateReport = async () => {
    if (!selectedLocation) return

    setIsLoading(true)

    try {
      logDebug("Starting combined analysis and report generation")

      // First, capture satellite views and get LLM analysis
      const analysis = await captureSatelliteViews()

      if (!analysis) {
        throw new Error("Roof analysis failed")
      }

      // Store the analysis result
      setRoofAnalysis(analysis)

      toast({
        title: "Analysis Complete",
        description:
          "AI roof analysis has been completed successfully. Generating report..."
      })

      // Extract address from analysis text if necessary
      let addressToUse = selectedAddress
      if (!addressToUse && analysis.rawAnalysis) {
        // Direct extraction from the analysis text
        const addressMatch = analysis.rawAnalysis.match(
          /(\d+\s+[A-Za-z]+\s+(?:Dr|St|Ave|Road|Boulevard|Blvd|Lane|Ln|Court|Ct|Circle|Cir|Way|Place|Pl|Drive)[.,\s]*(?:[A-Za-z]+(?:,\s*[A-Za-z]+)?\s*\d{5})?)/i
        )
        if (addressMatch && addressMatch[1]) {
          addressToUse = addressMatch[1].trim()
          logDebug(`Extracted address from analysis: ${addressToUse}`)
        }
      }

      // Prepare a complete report object that we'll use regardless of API success/failure
      const reportData = {
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        address: addressToUse || "Property Address",
        workspaceId,
        enhancedAnalysis: {
          ...analysis
        },
        // Include captured images
        capturedImages:
          analysis.capturedImages || analysis.satelliteViews || [],
        // Extract key data from analysis
        propertyData: {
          address: { fullAddress: addressToUse || "Property Address" },
          details: {
            propertyType: "Unknown",
            yearBuilt: "Unknown",
            squareFeet: "Unknown",
            lotSize: "Unknown"
          },
          roof: {
            summary: {
              area: analysis.structuredData?.area || 0,
              facets: analysis.structuredData?.facetCount || 0,
              pitch: analysis.structuredData?.pitch || "Unknown",
              complexity: analysis.structuredData?.complexity || "Unknown"
            }
          }
        },
        // Additional structured data from analysis
        structuredData: analysis.structuredData || {}
      }

      try {
        const solarResponse = await fetch("/api/solar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: selectedLocation.lat,
            lng: selectedLocation.lng
          })
        })

        if (solarResponse.ok) {
          const solarData = await solarResponse.json()
          console.log("SOLAR API SUCCESS:", solarData)

          // Extract values directly from the correct paths
          const solarPotential = solarData.solarPotential || {}

          // Get panel count directly from the API response
          const panelCount = solarPotential.maxArrayPanelsCount || 0

          // Get yearly energy production
          // Formula: panels × capacity × sunshine hours / 1000 = kWh per year
          const panelCapacityWatts = solarPotential.panelCapacityWatts || 400
          const sunshineHours = solarPotential.maxSunshineHoursPerYear || 0
          const yearlyEnergy = Math.round(
            (panelCount * panelCapacityWatts * sunshineHours) / 1000
          )

          // Calculate financials
          const costPerKwh = 0.12
          const installationCost = Math.round(panelCount * 800) // $800 per panel
          const lifetimeYears = solarPotential.panelLifetimeYears || 20
          const costWithoutSolar = Math.round(
            yearlyEnergy * costPerKwh * lifetimeYears
          )
          const totalCostWithSolar = installationCost
          const netSavings = costWithoutSolar - totalCostWithSolar

          // Determine suitability score
          let suitabilityScore = "Unknown"
          if (yearlyEnergy > 0 && panelCount > 0) {
            const kwhPerYearPerKw =
              yearlyEnergy / ((panelCount * panelCapacityWatts) / 1000)
            if (kwhPerYearPerKw > 1300) suitabilityScore = "Great Fit"
            else if (kwhPerYearPerKw > 1000) suitabilityScore = "Good Fit"
            else suitabilityScore = "Moderate Fit"
          }

          // Log all extracted values for debugging
          console.log("SOLAR EXTRACTION:", {
            panelCount,
            yearlyEnergy,
            sunshineHours,
            installationCost,
            netSavings,
            suitabilityScore
          })

          // Create the solar data structure explicitly
          reportData.solar = {
            potential: {
              maxPanels: panelCount,
              yearlyEnergy: yearlyEnergy,
              sunshineHours: sunshineHours,
              suitabilityScore: suitabilityScore
            },
            financials: {
              installationCost: installationCost,
              netSavings: netSavings,
              totalCostWithSolar: totalCostWithSolar,
              costWithoutSolar: costWithoutSolar,
              paybackPeriodYears:
                yearlyEnergy > 0
                  ? Math.round(
                      installationCost / (yearlyEnergy * costPerKwh * 10)
                    ) / 10
                  : null
            }
          }

          console.log("PROCESSED SOLAR DATA:", reportData.solar)
        } else {
          console.log("SOLAR API ERROR:", await solarResponse.text())
        }
      } catch (solarError) {
        console.error("Error fetching solar data:", solarError)
      }

      // Try the API call, but don't depend on it
      try {
        const response = await fetch("/api/explore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: selectedLocation.lat,
            lng: selectedLocation.lng,
            address: addressToUse,
            workspaceId,
            enhancedAnalysis: analysis
          })
        })

        if (response.ok) {
          const apiData = await response.json()
          // Merge API data with our local report data
          Object.assign(reportData, apiData)
          logDebug("API data successfully merged with report")
        } else {
          const errorData = await response.text()
          logDebug(`API error: ${errorData}`)
        }
      } catch (apiError) {
        console.error("API error:", apiError)
        logDebug(`API error: ${apiError.message}`)
      }

      // Always set report data, even if API failed
      setReportData({
        jsonData: {
          ...reportData,
          // Make sure solar is explicitly set at the top level of jsonData
          solar: reportData.solar
        }
      })

      console.log("FINAL REPORT DATA STRUCTURE:", {
        jsonData: {
          ...reportData,
          solar: reportData.solar
        }
      })

      logDebug("Property report generated and displayed in map view")

      toast({
        title: "Report Generated",
        description: `Property report for ${addressToUse || "selected location"} is ready.`
      })
    } catch (error) {
      console.error("Error in combined analysis and report:", error)
      logDebug(`Combined process error: ${error.message}`)
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to complete analysis and report generation",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle analyze property click with validation
  const handleAnalyzePropertyClick = () => {
    if (!selectedLocation) {
      toast({
        title: "No Location Selected",
        description:
          "Please select a property location first by clicking on the map or searching for an address.",
        variant: "destructive"
      })
      return
    }

    // Start the analysis process
    analyzeAndGenerateReport()
  }

  // Render the main component
  return (
    <div className="explore-map-container relative flex h-full flex-col">
      {/* Map Component - Full Screen */}
      <div className="absolute inset-0 overflow-hidden">
        <MapView
          workspaceId={workspaceId}
          selectedLocation={selectedLocation}
          setSelectedLocation={setSelectedLocation}
          selectedAddress={selectedAddress}
          setSelectedAddress={setSelectedAddress}
          isAnalyzing={isAnalyzing}
          captureProgress={captureProgress}
          captureAngle={captureAngle}
          is3DMode={is3DMode}
          toggleIs3DMode={toggleIs3DMode}
          isDebugMode={isDebugMode}
          logDebug={logDebug}
          measuredArea={measuredArea}
          setMeasuredArea={setMeasuredArea}
          measuredDistance={measuredDistance}
          setMeasuredDistance={setMeasuredDistance}
          captureMapView={captureMapView}
          onAnalyzePropertyClick={handleAnalyzePropertyClick}
          setMapContainerRef={el => {
            mapContainerRef.current = el
            console.log("Map container ref set:", el ? "success" : "null")
          }}
          setMapRef={map => {
            mapRef.current = map
            console.log("Map reference set:", map ? "success" : "null")
          }}
          setInfoWindowRef={infoWindow => {
            infoWindowRef.current = infoWindow
          }}
          imageProcessingOptions={imageProcessingOptions}
          onToggleImageProcessingOption={toggleImageProcessingOption}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          availableModels={availableModels}
          onToggleDebugMode={toggleDebugMode}
          showSidebar={showSidebar}
          livePreviewImages={livePreviewImages}
          currentCaptureStage={currentCaptureStage}
        />
      </div>

      {/* Image Enhancement Controls */}
      {/* <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Image Enhancement Options
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-4 gap-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700 dark:text-gray-300 mr-2">Edge Detection</label>
                <Button 
                  variant={imageProcessingOptions.enhanceEdges ? "default" : "outline"}
                  size="sm"
                  className={`h-7 ${imageProcessingOptions.enhanceEdges ? 'bg-blue-600' : ''}`}
                  onClick={() => toggleImageProcessingOption('enhanceEdges')}
                >
                  {imageProcessingOptions.enhanceEdges ? 'On' : 'Off'}
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700 dark:text-gray-300 mr-2">Contrast</label>
                <Button 
                  variant={imageProcessingOptions.enhanceContrast ? "default" : "outline"}
                  size="sm"
                  className={`h-7 ${imageProcessingOptions.enhanceContrast ? 'bg-blue-600' : ''}`}
                  onClick={() => toggleImageProcessingOption('enhanceContrast')}
                >
                  {imageProcessingOptions.enhanceContrast ? 'On' : 'Off'}
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700 dark:text-gray-300 mr-2">Grid</label>
                <Button 
                  variant={imageProcessingOptions.addMeasurementGrid ? "default" : "outline"}
                  size="sm"
                  className={`h-7 ${imageProcessingOptions.addMeasurementGrid ? 'bg-blue-600' : ''}`}
                  onClick={() => toggleImageProcessingOption('addMeasurementGrid')}
                >
                  {imageProcessingOptions.addMeasurementGrid ? 'On' : 'Off'}
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700 dark:text-gray-300 mr-2">Color Segmentation</label>
                <Button 
                  variant={imageProcessingOptions.colorSegmentation ? "default" : "outline"}
                  size="sm"
                  className={`h-7 ${imageProcessingOptions.colorSegmentation ? 'bg-blue-600' : ''}`}
                  onClick={() => toggleImageProcessingOption('colorSegmentation')}
                >
                  {imageProcessingOptions.colorSegmentation ? 'On' : 'Off'}
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700 dark:text-gray-300 mr-2">Pitch Enhancement</label>
                <Button 
                  variant={imageProcessingOptions.pitchEnhancement ? "default" : "outline"}
                  size="sm"
                  className={`h-7 ${imageProcessingOptions.pitchEnhancement ? 'bg-blue-600' : ''}`}
                  onClick={() => toggleImageProcessingOption('pitchEnhancement')}
                >
                  {imageProcessingOptions.pitchEnhancement ? 'On' : 'Off'}
                </Button>
              </div>
            </div>
          </div> */}

      {/* Report Modal Overlay */}
      {(roofAnalysis || reportData) && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white dark:bg-gray-900">
          {/* Modal Header with Close Button */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            {/* Rooftops AI Logo */}
            <img
              src="https://uploads-ssl.webflow.com/64e9150f53771ac56ef528b7/64ee16bb300d3e08d25a03ac_rooftops-logo-gr-black.png"
              alt="Rooftops AI"
              className="h-7 w-auto dark:invert"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setRoofAnalysis(null)
                setReportData(null)
              }}
              className="size-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </Button>
          </div>

          {/* Modal Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4">
            <CombinedReport
              analysisData={roofAnalysis}
              reportData={reportData}
            />
          </div>
        </div>
      )}

      {/* Debug Logs */}
      {isDebugMode && debugLogs.length > 0 && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Debug Logs
          </h3>
          <div className="h-32 overflow-y-auto rounded bg-white p-2 font-mono text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {debugLogs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ExploreMap
