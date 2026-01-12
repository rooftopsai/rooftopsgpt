// components > explore > ExploreMap.tsx

"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { IconLoader2, IconInfoCircle, IconMapPin } from "@tabler/icons-react"
import html2canvas from "html2canvas"
import axios from "axios"
import {
  enhanceImageForRoofAnalysis,
  segmentRoofColors,
  enhanceRoofPitch,
  estimatePropertySize,
  calculateOptimalZoom,
  calculateZoomForAngle,
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
import PropertyReportViewer from "@/components/property/property-report-viewer"
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
  const [filteredModels, setFilteredModels] = useState(availableModels)
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null)
  const [reportMode, setReportMode] = useState<"instant" | "agent">("instant")

  // This is a direct reference to the map container div from the MapView component
  const mapContainerRef = useRef<HTMLDivElement | null>(null)

  // Add a mapRef here that will be set by MapView
  const mapRef = useRef<google.maps.Map | null>(null)
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)

  // Set better default image processing options for improved clarity
  const [imageProcessingOptions, setImageProcessingOptions] = useState({
    enhanceEdges: false, // Disable edge detection
    enhanceContrast: false, // Disable contrast enhancement
    addMeasurementGrid: true, // Keep measurement grid
    colorSegmentation: false,
    pitchEnhancement: false
  })

  const { showSidebar, setShowSidebar, setHasActiveExploreReport } =
    useChatbotUI()

  // Mark when we're on the client
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Update hasActiveExploreReport when reports are displayed or hidden
  useEffect(() => {
    if (!setHasActiveExploreReport) return

    const hasReport = !!(roofAnalysis || reportData)
    setHasActiveExploreReport(hasReport)

    // Clean up when component unmounts
    return () => {
      if (setHasActiveExploreReport) {
        setHasActiveExploreReport(false)
      }
    }
  }, [roofAnalysis, reportData, setHasActiveExploreReport])

  // Reusable function to fetch subscription info
  const fetchSubscriptionInfo = useCallback(async () => {
    try {
      const response = await fetch("/api/subscription/check")
      if (response.ok) {
        const data = await response.json()
        setSubscriptionInfo(data)

        // Filter models based on allowed models for this plan
        const allowed = availableModels.filter(model =>
          data.allowedModels.includes(model.value)
        )
        setFilteredModels(allowed)

        // If current selected model is not allowed, switch to first allowed model
        if (!data.allowedModels.includes(selectedModel) && allowed.length > 0) {
          setSelectedModel(allowed[0].value)
        }
      }
    } catch (error) {
      console.error("Error fetching subscription info:", error)
      // Default to showing all models if error
      setFilteredModels(availableModels)
    }
  }, [selectedModel])

  // Fetch subscription status and filter available models on mount
  useEffect(() => {
    fetchSubscriptionInfo()
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

    toast.info(
      !isDebugMode
        ? "Debug Mode Enabled - Detailed logging and API request/response information will be shown."
        : "Debug Mode Disabled - Debug information will be hidden."
    )
  }, [isDebugMode])

  // Toggle 3D mode
  const toggleIs3DMode = useCallback(() => {
    setIs3DMode(!is3DMode)
    logDebug(`3D mode ${!is3DMode ? "enabled" : "disabled"}`)

    toast.info(
      !is3DMode
        ? "3D Mode Enabled - Will capture perspective views with 45° tilt for better roof analysis."
        : "3D Mode Disabled - Will use standard overhead views for roof analysis."
    )
  }, [is3DMode, logDebug])

  // Check if user can use Agent Mode (Premium or Business only)
  const canUseAgentMode = useCallback(() => {
    if (!subscriptionInfo) return false
    const plan = subscriptionInfo.planType || "free"
    return plan === "premium" || plan === "business"
  }, [subscriptionInfo])

  // Toggle report mode with subscription check
  const handleReportModeChange = useCallback(
    (newMode: "instant" | "agent") => {
      if (newMode === "agent" && !canUseAgentMode()) {
        // Redirect free users to pricing page
        logDebug("User attempted to access Agent Mode without subscription")
        window.location.href = "/pricing"
        return
      }

      setReportMode(newMode)
      logDebug(`Report mode changed to: ${newMode}`)

      if (newMode === "instant") {
        toast.info(
          "Instant Mode: Fast reports using Solar API data only. Limited accuracy on condition and costs."
        )
      } else {
        toast.success(
          "Agent Mode: Comprehensive analysis with 4 AI specialists for maximum accuracy."
        )
      }
    },
    [canUseAgentMode, logDebug]
  )

  // Enhanced capture satellite views function with 3D mode option
  const captureSatelliteViews = async () => {
    if (!selectedLocation || !mapContainerRef.current) {
      console.error("Missing required data")
      return null
    }

    setIsAnalyzing(true)
    setCaptureProgress(0)
    setLivePreviewImages([])
    setCurrentCaptureStage("Initializing satellite imagery capture system...")

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
      // Reduced from 1200x800 to 640x480 to reduce payload size while maintaining quality
      const viewportWidth = mapContainerRef.current?.offsetWidth || 640
      const viewportHeight = mapContainerRef.current?.offsetHeight || 480

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
      // Calculate optimal zoom for overhead view (0° heading, 0° tilt)
      // Use existing viewportWidth/viewportHeight variables from above

      const optimalOverheadZoom = calculateZoomForAngle(
        propertySize.widthMeters,
        propertySize.heightMeters,
        0, // 0° heading for overhead
        0, // 0° tilt for overhead
        selectedLocation.lat,
        viewportWidth,
        viewportHeight,
        0.85 // 85% coverage
      )

      // Generate 2 meaningfully different zoom levels with significant difference
      // Context view: Standard high zoom for overall roof structure
      // Detail view: Maximum zoom (22) for precise facet counting and roof detail analysis
      const zoomLevels = [
        20, // Context (standard high zoom)
        22 // Detail (maximum zoom - zoom WAY in for facet counting)
      ]
      const zoomLabels = ["Context", "Detail"]

      logDebug(
        `Calculated overhead zoom levels: ${zoomLevels.join(", ")} (optimal: ${optimalOverheadZoom})`
      )

      for (let zoomIdx = 0; zoomIdx < zoomLevels.length; zoomIdx++) {
        const zoomLevel = zoomLevels[zoomIdx]
        const zoomLabel = zoomLabels[zoomIdx]

        setCurrentCaptureStage(`Capturing overhead view...`)
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
          `top-zoom${zoomLevel}`,
          {
            aggressiveMode: zoomLabel === "Detail" // Enable aggressive processing for Detail view
          }
        )
        if (topView) {
          topView.enhancementOptions = {
            enhanceEdges: imageProcessingOptions.enhanceEdges,
            enhanceContrast: imageProcessingOptions.enhanceContrast,
            addMeasurementGrid: imageProcessingOptions.addMeasurementGrid,
            aggressiveMode: zoomLabel === "Detail"
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

      // Capture views from all four cardinal directions: North, East, South, West
      // Each angle gets its own optimized zoom level based on property geometry
      const angles = [0, 90, 180, 270] // North, East, South, West
      for (let i = 0; i < angles.length; i++) {
        const angle = angles[i]
        setCaptureAngle(angle)
        setCurrentCaptureStage(
          `Capturing ${getDirectionName(angle).toUpperCase()} view...`
        )

        // Calculate optimal zoom for this specific angle and tilt, then add +1 to get closer
        const tiltAngle = is3DMode ? 60 : 0
        const calculatedZoom = calculateZoomForAngle(
          propertySize.widthMeters,
          propertySize.heightMeters,
          angle,
          tiltAngle,
          selectedLocation.lat,
          viewportWidth,
          viewportHeight,
          0.85 // 85% coverage for tight shots
        )
        const angleZoom = Math.min(22, calculatedZoom + 1) // Add +1 to get closer

        logDebug(
          `Capturing view at ${angle}° heading with optimized zoom ${angleZoom} (tilt: ${tiltAngle}°)`
        )

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

            // Set the optimized zoom for this angle
            mapRef.current.setZoom(angleZoom)

            // Add tilt in 3D mode for perspective views
            if (is3DMode) {
              mapRef.current.setTilt(60) // 60-degree tilt for better 3D perspective
            }
            logDebug(
              `Map settings adjusted for angle ${angle}°: zoom ${angleZoom}, tilt: ${tiltAngle}°`
            )
          } catch (e) {
            console.error(
              `Error setting map heading/tilt/zoom for angle ${angle}:`,
              e
            )
            logDebug(`Error setting map properties: ${e.message}`)
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
          view.zoomLevel = angleZoom // Store the optimized zoom for this angle
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
      setCurrentCaptureStage(
        "Imagery captured successfully! Preparing for AI analysis..."
      )

      // Send views to Multi-Agent system for comprehensive analysis
      const analysisResult = await sendToMultiAgentSystem(views, solarMetrics)

      // Store the captured views in the analysis result
      if (analysisResult) {
        analysisResult.capturedImages = views
        analysisResult.satelliteViews = views
      }

      setRoofAnalysis(analysisResult)
      setCaptureProgress(100)

      // Save the report to the database
      if (analysisResult && selectedLocation) {
        try {
          await savePropertyReport(analysisResult, views, solarMetrics)
          logDebug("Property report saved to database")

          // Refetch subscription info to update usage counts
          await fetchSubscriptionInfo()
        } catch (error) {
          console.error("Error saving property report:", error)
          logDebug(`Failed to save report: ${error.message}`)
        }
      }

      return analysisResult
    } catch (error) {
      console.error("Error capturing satellite views:", error)
      logDebug(`Error during capture: ${error.message}`)
      toast.error("Failed to capture satellite imagery for analysis")
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

  // Function to save property report to database
  const savePropertyReport = async (
    analysisData: any,
    capturedImages: any[],
    solarMetrics: any
  ) => {
    try {
      // Extract image metadata without the full base64 data to avoid timeout
      const imageMetadata =
        capturedImages?.map((img, index) => ({
          name: img.name || `View ${index + 1}`,
          angle: img.angle || 0,
          capturedAt: new Date().toISOString()
          // Exclude imageData to prevent huge payload
        })) || []

      // Create a clean copy of analysisData without the large image data
      const cleanAnalysisData = {
        ...analysisData,
        capturedImages: undefined, // Remove images from analysisData
        satelliteViews: undefined // Remove duplicate images
      }

      const response = await fetch("/api/property-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          workspaceId: workspaceId,
          address:
            selectedAddress ||
            `${selectedLocation?.lat.toFixed(6)}, ${selectedLocation?.lng.toFixed(6)}`,
          latitude: selectedLocation?.lat,
          longitude: selectedLocation?.lng,
          analysisData: cleanAnalysisData,
          capturedImages: imageMetadata,
          satelliteViews: imageMetadata,
          solarMetrics: solarMetrics,
          debugInfo: analysisData.debug
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to save report: ${response.statusText}`)
      }

      const savedReport = await response.json()
      return savedReport
    } catch (error) {
      console.error("Error in savePropertyReport:", error)
      throw error
    }
  }

  // Fixed captureMapView function with duplicate pitch enhancement removed
  const captureMapView = async (
    containerRef: React.RefObject<HTMLDivElement>,
    viewName: string,
    enhancementOptions?: { aggressiveMode?: boolean }
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
        scale: 1.5, // Reduced from 3.0 to 1.5 to optimize payload size (640x480 -> 960x720)
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

      // Convert canvas to base64 image with high quality
      // Increased from 0.6 to 0.85 to maintain accuracy with smaller dimensions
      let imageData = canvas.toDataURL("image/jpeg", 0.85)

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
        compensateShadows: false, // Disable shadow compensation
        sharpenImage: false, // Disable image sharpening
        aggressiveMode: false, // Disable aggressive mode
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

  // Function to send images to Multi-Agent system for comprehensive analysis
  const sendToMultiAgentSystem = async (
    satelliteViews,
    solarMetrics = null
  ) => {
    const startTime = Date.now()

    try {
      // Filter out any null views from failed captures
      const validViews = satelliteViews.filter(view => view !== null)

      if (validViews.length === 0) {
        throw new Error("No valid satellite images captured")
      }

      logDebug(`Sending ${validViews.length} images to Multi-Agent system`)
      logDebug("Using GPT-5.1-2025-11-13 for all 4 agents")

      // Update status: Starting multi-agent analysis
      setCurrentCaptureStage("Initializing Multi-Agent Analysis System...")
      await new Promise(resolve => setTimeout(resolve, 800))

      // Simulate agent progress with visual feedback
      const agentStatuses = [
        {
          step: 1,
          name: "Measurement Specialist",
          task: "Counting roof facets and calculating area",
          duration: 1200
        },
        {
          step: 2,
          name: "Condition Inspector",
          task: "Analyzing material type and condition",
          duration: 1000
        },
        {
          step: 3,
          name: "Cost Estimator",
          task: "Calculating material needs and costs",
          duration: 1000
        },
        {
          step: 4,
          name: "Quality Controller",
          task: "Validating and synthesizing results",
          duration: 1000
        }
      ]

      // Start the actual API call
      const responsePromise = fetch("/api/property-reports/multi-agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          capturedImages: validViews,
          solarData: solarMetrics,
          address:
            selectedAddress ||
            `${selectedLocation?.lat.toFixed(6)}, ${selectedLocation?.lng.toFixed(6)}`,
          location: selectedLocation,
          workspaceId: workspaceId
        })
      })

      // Show agent progress while API call is processing
      let currentAgentIndex = 0
      let qualityControlMessageIndex = 0

      // Rotating messages for Quality Controller stage
      const qualityControlMessages = [
        "Quality Control Agent Verifying...",
        "This may take up to 1-3 minutes",
        "Do not close this tab",
        "Trees or obstructions may limit accuracy",
        "Analyzing roof measurements for accuracy",
        "Cross-referencing data from multiple views",
        "Validating material identification",
        "Finalizing comprehensive roof analysis"
      ]

      const progressInterval = setInterval(() => {
        if (currentAgentIndex < agentStatuses.length) {
          const agent = agentStatuses[currentAgentIndex]

          // For Quality Controller (step 4), rotate through helpful messages
          if (agent.step === 4) {
            const message =
              qualityControlMessages[
                qualityControlMessageIndex % qualityControlMessages.length
              ]
            setCurrentCaptureStage(`Step 4/4: ${message}`)
            qualityControlMessageIndex++
            // Stay on step 4 and keep rotating messages
          } else {
            setCurrentCaptureStage(`Step ${agent.step}/4: ${agent.name}`)
            // Move to next agent for steps 1-3
            currentAgentIndex++
          }
        }
      }, 3000) // Update every 3 seconds

      // Wait for the actual response
      const response = await responsePromise
      clearInterval(progressInterval)

      if (!response.ok) {
        let errorData
        try {
          const errorText = await response.text()
          errorData = JSON.parse(errorText)
        } catch {
          errorData = {
            error: response.statusText,
            details: "Unable to parse error details"
          }
        }

        console.error("Multi-agent analysis failed:", errorData)

        // Create detailed error object for reporting
        const errorInfo = {
          status: response.status,
          agent: errorData.agent || "unknown",
          error: errorData.error || response.statusText,
          details: errorData.details || "No additional details",
          timestamp: errorData.timestamp || new Date().toISOString(),
          baseUrl: errorData.baseUrl || "unknown",
          address: selectedAddress || "unknown location"
        }

        // Throw error with stringified error info for better tracking
        const error = new Error(JSON.stringify(errorInfo))
        error.name = "MultiAgentAnalysisError"
        throw error
      }

      // Update status: Processing response
      setCurrentCaptureStage(
        "Compiling comprehensive analysis from all 4 agents..."
      )
      await new Promise(resolve => setTimeout(resolve, 500))

      const result = await response.json()
      const responseTime = Date.now() - startTime

      logDebug(`Multi-agent analysis completed in ${responseTime}ms`)
      logDebug(
        `Agent timings: ${JSON.stringify(result.performance?.agentTimings)}`
      )
      logDebug(`Quality score: ${result.metadata?.qualityScore}/100`)
      logDebug(`Overall confidence: ${result.overallConfidence?.combined}`)

      // Update status: Finalizing
      setCurrentCaptureStage(
        `Analysis Complete - Quality Score: ${result.metadata?.qualityScore || "N/A"}/100`
      )
      await new Promise(resolve => setTimeout(resolve, 800))

      // Format the result to match the expected structure
      const analysisResult = {
        // User-facing summary from Quality Controller
        analysis:
          result.finalReport?.recommendations?.primaryRecommendation ||
          result.executiveSummary,
        userSummary: result.executiveSummary,

        // Raw analysis for the Details tab - will be assigned from detailedAnalysis below
        rawAnalysis: null,

        // Structured data from Quality Controller's final report
        structuredData: {
          // Measurements from Agent 1 (validated by Agent 4)
          facetCount: result.finalReport?.measurements?.facets,
          roofArea: result.finalReport?.measurements?.roofArea,
          // Generate a reasonable range around the validated roof area (±5-10% for estimation variance)
          roofAreaRange: (() => {
            const area = result.finalReport?.measurements?.roofArea || 0
            const minVariance = Math.round(area * 0.95) // -5%
            const maxVariance = Math.round(area * 1.05) // +5%
            return [minVariance, maxVariance]
          })(),
          squares: result.finalReport?.measurements?.squares,
          pitch: result.finalReport?.measurements?.pitch,
          ridgeLength: result.finalReport?.measurements?.ridgeLength,
          valleyLength: result.finalReport?.measurements?.valleyLength,
          complexity: result.finalReport?.measurements?.complexity,

          // Condition from Agent 2 (validated by Agent 4)
          material: result.finalReport?.condition?.material,
          condition: result.finalReport?.condition?.overallCondition,
          estimatedAge: result.finalReport?.condition?.age,
          remainingLife: result.finalReport?.condition?.remainingLife,

          // Cost estimate from Agent 3 (validated by Agent 4)
          costEstimate: result.finalReport?.costEstimate,

          // Confidence and quality metrics from Agent 4
          confidence: result.overallConfidence?.combined,
          measurementConfidence: result.overallConfidence?.measurements,
          conditionConfidence: result.overallConfidence?.condition,
          costConfidence: result.overallConfidence?.costs,

          // Validation results
          validation: result.validation,
          flaggedIssues: result.flaggedIssues,

          // Detailed analysis from all agents
          detailedAnalysis: `
MULTI-AGENT PROPERTY ANALYSIS REPORT

${result.executiveSummary}

═══════════════════════════════════════════════════════════════════
📐 MEASUREMENTS (Agent 1: Measurement Specialist)
═══════════════════════════════════════════════════════════════════

• Roof Area: ${result.finalReport?.measurements?.roofArea} sq ft (${result.finalReport?.measurements?.squares} squares)
• Facet Count: ${result.finalReport?.measurements?.facets}
• Pitch: ${result.finalReport?.measurements?.pitch}
• Complexity: ${result.finalReport?.measurements?.complexity}

${result.finalReport?.measurements?.notes || ""}

═══════════════════════════════════════════════════════════════════
🔍 CONDITION ASSESSMENT (Agent 2: Condition Inspector)
═══════════════════════════════════════════════════════════════════

${result.agents?.condition?.professionalAssessment || ""}

• Material: ${result.finalReport?.condition?.material}
• Overall Condition: ${result.finalReport?.condition?.overallCondition}
• Estimated Age: ${result.finalReport?.condition?.age} years
• Remaining Life: ${result.finalReport?.condition?.remainingLife} years
• Urgency: ${result.finalReport?.condition?.urgency}

${result.finalReport?.condition?.notes || ""}

═══════════════════════════════════════════════════════════════════
💰 COST ESTIMATE (Agent 3: Cost Estimator)
═══════════════════════════════════════════════════════════════════

Recommended Material: ${result.finalReport?.costEstimate?.recommendedMaterial}

Estimated Cost Range: $${result.finalReport?.costEstimate?.estimatedCost?.low?.toLocaleString()} - $${result.finalReport?.costEstimate?.estimatedCost?.high?.toLocaleString()}

Cost Breakdown:
• Materials: $${result.finalReport?.costEstimate?.breakdown?.materials?.toLocaleString()}
• Labor: $${result.finalReport?.costEstimate?.breakdown?.labor?.toLocaleString()}
• Tear-Off/Disposal: $${result.finalReport?.costEstimate?.breakdown?.tearOff?.toLocaleString()}

Alternative Options:
${result.finalReport?.costEstimate?.alternativeOptions?.map(opt => `• ${opt.material}: ${opt.costRange} (${opt.expectedLife} years) ${opt.recommended ? "✓ Recommended" : ""}`).join("\n") || ""}

${result.finalReport?.costEstimate?.notes || ""}

═══════════════════════════════════════════════════════════════════
✅ QUALITY VALIDATION (Agent 4: Quality Controller)
═══════════════════════════════════════════════════════════════════

Overall Quality Score: ${result.metadata?.qualityScore}/100

Validation Status:
• Measurements: ${result.validation?.measurementValidation?.status}
• Condition Assessment: ${result.validation?.conditionAlignment?.status}
• Cost Estimate: ${result.validation?.costAlignment?.status}

═══════════════════════════════════════════════════════════════════
🎯 RECOMMENDATIONS
═══════════════════════════════════════════════════════════════════

${result.finalReport?.recommendations?.primaryRecommendation}

Timeline: ${result.finalReport?.recommendations?.timeline}

Priority Actions:
${result.finalReport?.recommendations?.priorityActions?.map((action, i) => `${i + 1}. ${action}`).join("\n") || ""}

${result.finalReport?.recommendations?.budgetGuidance || ""}

═══════════════════════════════════════════════════════════════════
📋 KEY FINDINGS
═══════════════════════════════════════════════════════════════════

${result.finalReport?.keyFindings?.map((finding, i) => `${i + 1}. ${finding}`).join("\n") || ""}

═══════════════════════════════════════════════════════════════════
⚠️ DISCLAIMERS
═══════════════════════════════════════════════════════════════════

${result.finalReport?.disclaimers?.map(disclaimer => `• ${disclaimer}`).join("\n") || ""}
          `
        },

        // Store full multi-agent results for advanced users
        multiAgentResults: {
          measurement: result.agents?.measurement,
          condition: result.agents?.condition,
          cost: result.agents?.cost,
          quality: result.agents?.quality
        },

        // Metadata
        debug: {
          modelUsed: "gpt-5.1-2025-11-13 (Multi-Agent)",
          responseTime,
          imageCount: validViews.length,
          agentsUsed: 4,
          agentTimings: result.performance?.agentTimings,
          qualityScore: result.metadata?.qualityScore,
          overallConfidence: result.overallConfidence,
          validation: result.validation,
          flaggedIssues: result.flaggedIssues
        }
      }

      // Assign the detailed analysis to rawAnalysis for the Details tab
      analysisResult.rawAnalysis =
        analysisResult.structuredData.detailedAnalysis

      return analysisResult
    } catch (error: any) {
      console.error("Error in multi-agent analysis:", error)
      logDebug(`Multi-agent analysis error: ${error.message}`)

      // Parse error details if available
      let errorInfo
      try {
        errorInfo = JSON.parse(error.message)
      } catch {
        errorInfo = {
          error: "Analysis failed",
          details: error.message || "Unknown error occurred",
          timestamp: new Date().toISOString()
        }
      }

      // Show user-friendly error with details and report option
      const errorMessage = `Property report failed: ${errorInfo.error}`
      const errorDetails = `Agent: ${errorInfo.agent || "Unknown"}\nDetails: ${errorInfo.details}\nTime: ${new Date(errorInfo.timestamp).toLocaleString()}`

      toast.error(
        <div className="flex flex-col gap-2">
          <div className="font-semibold">{errorMessage}</div>
          <div className="whitespace-pre-line text-xs text-gray-600 dark:text-gray-400">
            {errorDetails}
          </div>
          <button
            onClick={() => {
              // Copy error details to clipboard
              navigator.clipboard.writeText(JSON.stringify(errorInfo, null, 2))
              toast.success(
                "Error details copied to clipboard. Please email them to support@rooftopsai.com"
              )
            }}
            className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Report this problem
          </button>
        </div>,
        {
          duration: 10000, // Show for 10 seconds
          important: true
        }
      )

      return null
    }
  }

  // Legacy function to send images to single LLM for analysis (kept for backward compatibility)
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

      // Create expert roofer prompt with latest thinking
      const enhancedPrompt = `You are a master roofer with 30+ years of experience analyzing properties for estimates. You're looking at aerial imagery of a property at ${selectedAddress || `${selectedLocation?.lat.toFixed(6)}, ${selectedLocation?.lng.toFixed(6)}`}. Your goal is to provide the MOST ACCURATE roof analysis possible - as if you were standing on the ground with your crew preparing a bid.
${referenceSection}

  ═══════════════════════════════════════════════════════════════════
  🎯 YOUR MISSION AS AN EXPERT ROOFER
  ═══════════════════════════════════════════════════════════════════

  You've been provided 6 optimized aerial views of this property:
  • 2 overhead views (wide context + zoomed detail)
  • 4 angled views from each cardinal direction (N, E, S, W)

  Each view has been captured at the OPTIMAL ZOOM LEVEL to maximize detail while keeping the entire roof visible. The zoom levels were calculated based on the property's actual dimensions and viewing angle - so trust that you're seeing the best possible view from each perspective.

  IMAGE ENHANCEMENTS APPLIED:
  ✓ Edge detection highlighting roof planes and boundaries
  ✓ 10x10 measurement grid overlay for scale reference
  ✓ Bright yellow scale bar showing actual distance (20 meters / 65 feet)
  ✓ Shadow compensation to reveal features in dark areas
  ✓ Image sharpening for maximum clarity
  ✓ North arrow indicator for orientation

  ═══════════════════════════════════════════════════════════════════
  📋 REQUIRED OUTPUT FORMAT (MUST BE VALID JSON)
  ═══════════════════════════════════════════════════════════════════

  You MUST respond with ONLY this JSON structure (no markdown, no code blocks):
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

  ═══════════════════════════════════════════════════════════════════
  🔍 EXPERT ROOFER'S ANALYSIS WORKFLOW
  ═══════════════════════════════════════════════════════════════════

  Think like you're doing a site visit. You wouldn't just glance at the roof - you'd walk around the entire property, look from every angle, and mentally map out every plane, valley, and ridge. Do that same process with these 6 images.

  IMAGE SEQUENCE PROVIDED:
  1️⃣ Overhead Context - Wide view showing property in neighborhood
  2️⃣ Overhead Detail - Zoomed in for precise measurements (YOUR PRIMARY MEASUREMENT IMAGE)
  3️⃣ North View - 60° angled view from north side
  4️⃣ East View - 60° angled view from east side
  5️⃣ South View - 60° angled view from south side
  6️⃣ West View - 60° angled view from west side

  ═══════════════════════════════════════════════════════════════════
  📐 STEP 1: UNDERSTAND THE ROOF STRUCTURE
  ═══════════════════════════════════════════════════════════════════

  Start with Image #1 (Context View):
  As an expert roofer, first get the big picture. What are you looking at?

  Ask yourself:
  • Is this a simple gable, hip, or something more complex?
  • Do I see a garage? Is it attached or separate?
  • Are there dormers, additions, or multiple roof levels?
  • What's the overall roof style - traditional, modern, ranch?
  • Any obvious valleys, ridges, or architectural features?

  Make a mental note: "This looks like a [describe roof type] with approximately [X] major sections"

  ═══════════════════════════════════════════════════════════════════
  📏 STEP 2: COUNT EVERY SINGLE ROOF PLANE (FACET COUNTING)
  ═══════════════════════════════════════════════════════════════════

  Now go to Image #2 (Detail View) - THIS IS YOUR MONEY SHOT.
  This image was captured at the OPTIMAL zoom level to show every detail while keeping the whole roof visible.

  **AS AN EXPERT ROOFER, YOU KNOW:**
  A "facet" = any distinct flat surface on the roof. If two surfaces meet at a ridge, valley, or hip, they're DIFFERENT facets.

  SYSTEMATIC COUNTING METHOD (This is how a pro does it):
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

  After counting in Image #2, write down: "From overhead detail, I count EXACTLY [X] facets"

  ═══════════════════════════════════════════════════════════════════
  👁️ STEP 3: VERIFY FROM ALL ANGLES (CROSS-CHECK YOUR COUNT)
  ═══════════════════════════════════════════════════════════════════

  Now look at Images #3, #4, #5, #6 (the angled views). These were captured at OPTIMAL zoom levels based on the property geometry from each direction.

  **LIKE A REAL ROOFER walking around the property:**

  Image #3 (North View - 60° angle):
  • Can you see any facets that were hidden from overhead? (Back of dormers, etc.)
  • Does the pitch look consistent with what you saw overhead?
  • Any facets you need to add or subtract from your count?

  Image #4 (East View - 60° angle):
  • New facets visible from this side?
  • Does your count still make sense?
  • Can you see ridges/valleys that confirm your overhead analysis?

  Image #5 (South View - 60° angle):
  • What about the south-facing planes?
  • Any surprises or hidden features?
  • Still confident in your facet count?

  Image #6 (West View - 60° angle):
  • Final check from the west side
  • Do all 6 images tell the same story?
  • What's your FINAL, CONFIDENT facet count?

  **CROSS-VALIDATION CHECK:**
  If you counted 12 facets overhead but only see 9 from the angled views, something's wrong. Go back and recount. The numbers should align across all views.

  ═══════════════════════════════════════════════════════════════════
  📏 STEP 4: MEASURE THE ROOF AREA (LIKE BIDDING A JOB)
  ═══════════════════════════════════════════════════════════════════

  Back to Image #2 (Detail View). Use that BRIGHT YELLOW scale bar!

  **AS AN EXPERT ROOFER, you have two methods:**

  METHOD 1 - Use the Grid (Fastest)
  1. See that yellow scale bar? It's 20 meters (65 feet)
  2. The green grid is 10×10 squares
  3. Figure out what each grid square represents
  4. Count how many grid squares the roof footprint covers
  5. Multiply: squares × area per square = footprint area
  6. DON'T FORGET: This is FOOTPRINT. You need to adjust for pitch!

  METHOD 2 - Direct Measurement (Most Accurate)
  1. Use the scale bar to measure the longest roof dimension
  2. Measure the widest dimension
  3. Calculate approximate area
  4. Now look at the angled views - how steep is this roof?

  **PITCH MULTIPLIER (This is critical!):**
  Look at images #3-6. How much of the roof "side" can you see?
  • Low slope (4/12 or less): Add 5-8% to footprint
  • Medium (6/12): Add 12% to footprint
  • Medium-steep (8/12): Add 20% to footprint
  • Steep (10/12+): Add 30% or more

  **VERIFY YOUR MEASUREMENT:**
  Both methods should be within 15% of each other. If not, remeasure!

  Final note: "Roof footprint is approximately [X] sq ft. With [pitch] pitch, actual roof area is approximately [Y] sq ft = [Z] squares"

  ═══════════════════════════════════════════════════════════════════
  🔍 STEP 5: ASSESS CONDITION & MATERIAL (THE WALKTHROUGH)
  ═══════════════════════════════════════════════════════════════════

  **MATERIAL IDENTIFICATION (What's on this roof?):**
  Look closely at the detail view and angled views:
  • Asphalt shingles (3-tab or architectural)?
  • Metal roofing?
  • Tile (clay or concrete)?
  • Other?

  **CONDITION ASSESSMENT (What shape is it in?):**
  • Are the shingles intact or curling/missing?
  • Any visible wear, algae, or moss?
  • Sagging or waviness in the roof deck?
  • How old does it look?

  Rate it: New / Good / Fair / Poor / Failing

  **OTHER OBSERVATIONS:**
  • Trees overhanging? (Future maintenance issue)
  • Chimneys, vents, skylights? (Flashing to worry about)
  • Valleys and complex features? (More labor = higher cost)
  • Any obvious damage or concerns?

  ═══════════════════════════════════════════════════════════════════
  ✅ FINAL CHECKLIST (BEFORE YOU SUBMIT YOUR ANALYSIS)
  ═══════════════════════════════════════════════════════════════════

  **ACCURACY CHECK (This is your livelihood - be precise!):**

  ✓ FACET COUNT: Did you systematically count every plane?
  ✓ CROSS-VALIDATION: Do all 6 images tell the same story?
  ✓ MEASUREMENTS: Did you use the scale bar correctly?
  ✓ PITCH ADJUSTMENT: Did you add area for the pitch?
  ✓ DOUBLE-CHECK: Count your facets one more time
  ✓ CONFIDENCE: Are you high/medium/low confidence? Be honest.

  **IF YOU'RE UNSURE:**
  • Give a range instead of exact number ("24-28 facets" or "2,400-2,700 sq ft")
  • Explain what's unclear in your detailed analysis
  • Be conservative - better to undercount than overcount
  • The customer wants ACCURATE, not impressive numbers

  **YOUR CONFIDENCE LEVEL:**
  • HIGH: Crystal clear views, all measurements align, no obstructions
  • MEDIUM: Some trees/shadows but main structure is clear
  • LOW: Heavy obstruction, can't see key features, measurements uncertain

  ═══════════════════════════════════════════════════════════════════
  🎯 NOW WRITE YOUR PROFESSIONAL ANALYSIS
  ═══════════════════════════════════════════════════════════════════

  You're a master roofer. You've analyzed this property from every angle. You've counted facets, measured area, assessed pitch, checked condition.

  Now write your analysis like you're explaining it to the homeowner AND your crew.

  • User Summary: Plain English for the homeowner (2-3 sentences)
  • Structured Data: The numbers (facets, area, pitch, etc.)
  • Detailed Analysis: Your complete professional assessment with reasoning

  CRITICAL: Respond with ONLY valid JSON. No markdown formatting, no code blocks, just the raw JSON object starting with { and ending with }.`

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
      toast.error(error.message || "Could not complete roof analysis")
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

  // Generate instant mode report using only Solar API data
  const generateInstantReport = async () => {
    if (!selectedLocation || !mapContainerRef.current) return

    setIsLoading(true)
    setIsAnalyzing(true)
    setCurrentCaptureStage("Fetching Solar API data...")
    setCaptureProgress(10)

    try {
      logDebug("Starting instant mode report generation")

      // Fetch solar data first
      const solarResponse = await fetch("/api/solar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: selectedLocation.lat,
          lng: selectedLocation.lng
        })
      })

      if (!solarResponse.ok) {
        throw new Error("Failed to fetch Solar API data")
      }

      const solarData = await solarResponse.json()
      logDebug("Solar API data fetched successfully")

      setCurrentCaptureStage("Capturing property images...")
      setCaptureProgress(30)

      // Capture one overhead satellite image
      const capturedImages: any[] = []

      if (mapRef.current) {
        try {
          // Center map and set optimal zoom for overhead view
          mapRef.current.setCenter({
            lat: selectedLocation.lat,
            lng: selectedLocation.lng
          })
          mapRef.current.setZoom(21)
          mapRef.current.setTilt(0)
          mapRef.current.setHeading(0)

          // Wait for map to render
          await new Promise(resolve => setTimeout(resolve, 1500))

          // Capture overhead view
          const overheadView = await captureMapView(
            mapContainerRef,
            "overhead-instant",
            { aggressiveMode: false }
          )

          if (overheadView) {
            overheadView.viewName = "Overhead Satellite View"
            overheadView.zoomLevel = 21
            capturedImages.push(overheadView)
            logDebug("Overhead view captured for instant mode")
          }
        } catch (e) {
          console.error("Error capturing overhead view:", e)
          logDebug(`Failed to capture overhead view: ${e.message}`)
        }
      }

      setCaptureProgress(50)

      // Generate Google Street View URL
      const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=640x480&location=${selectedLocation.lat},${selectedLocation.lng}&fov=80&heading=0&pitch=10&key=${process.env.NEXT_PUBLIC_GOOGLEMAPS_API_KEY}`

      // Add street view as an image reference
      capturedImages.push({
        viewName: "Street View",
        url: streetViewUrl,
        type: "streetview",
        timestamp: new Date().toISOString()
      })

      logDebug("Street view URL generated")

      setCurrentCaptureStage("Generating instant report...")
      setCaptureProgress(70)

      // Generate instant report
      const instantResponse = await fetch("/api/property-reports/instant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          solarData,
          address:
            selectedAddress ||
            `${selectedLocation.lat}, ${selectedLocation.lng}`,
          location: selectedLocation
        })
      })

      if (!instantResponse.ok) {
        const errorData = await instantResponse.json()
        throw new Error(errorData.error || "Failed to generate instant report")
      }

      const instantReport = await instantResponse.json()
      logDebug("Instant report generated successfully")

      setCurrentCaptureStage("Complete!")
      setCaptureProgress(100)

      // Format for display
      const analysis = {
        analysis: instantReport.userSummary,
        userSummary: instantReport.userSummary,
        rawAnalysis: instantReport.structuredData.detailedAnalysis,
        structuredData: instantReport.structuredData,
        capturedImages, // Add captured images
        satelliteViews: capturedImages, // Also set as satelliteViews for compatibility
        mode: "instant"
      }

      setRoofAnalysis(analysis)

      // Prepare report data with proper solar data
      const reportData = {
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        address: selectedAddress || "Property Address",
        workspaceId,
        enhancedAnalysis: analysis,
        solar: instantReport.solar || null,
        solarMetrics: instantReport.solarMetrics || null,
        capturedImages, // Include images in report data
        mode: "instant"
      }

      setReportData({ jsonData: reportData })

      toast.success("Instant report generated successfully!")
      logDebug("Instant mode report displayed")
    } catch (error: any) {
      console.error("Error generating instant report:", error)
      logDebug(`Instant report error: ${error.message}`)

      toast.error(
        <div className="flex flex-col gap-2">
          <div className="font-semibold">Instant Report Failed</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {error.message || "An unexpected error occurred"}
          </div>
        </div>,
        {
          duration: 5000
        }
      )
    } finally {
      setIsLoading(false)
      setIsAnalyzing(false)
      setCaptureProgress(0)
      setCurrentCaptureStage("")
    }
  }

  // Complete reworked function to prevent tab switching and keep everything in one view
  const analyzeAndGenerateReport = async () => {
    if (!selectedLocation) return

    // Check which mode to use
    if (reportMode === "instant") {
      return generateInstantReport()
    }

    // Agent mode - existing flow
    setIsLoading(true)

    try {
      logDebug("Starting combined analysis and report generation")

      // First, capture satellite views and get LLM analysis
      const analysis = await captureSatelliteViews()

      if (!analysis) {
        // Error was already shown in captureSatelliteViews, just return
        return
      }

      // Store the analysis result
      setRoofAnalysis(analysis)

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
    } catch (error: any) {
      console.error("Error in combined analysis and report:", error)
      logDebug(`Combined process error: ${error.message}`)

      // Only show error if it's not a MultiAgentAnalysisError (already shown)
      if (error.name !== "MultiAgentAnalysisError") {
        toast.error(
          <div className="flex flex-col gap-2">
            <div className="font-semibold">Report generation failed</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {error.message || "An unexpected error occurred"}
            </div>
            <button
              onClick={() => {
                const errorInfo = {
                  error: error.message || "Unknown error",
                  stack: error.stack,
                  timestamp: new Date().toISOString(),
                  location: selectedAddress || "unknown"
                }
                navigator.clipboard.writeText(
                  JSON.stringify(errorInfo, null, 2)
                )
                toast.success(
                  "Error details copied. Please email them to support@rooftopsai.com"
                )
              }}
              className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              Report this problem
            </button>
          </div>,
          {
            duration: 10000,
            important: true
          }
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Handle analyze property click with validation
  const handleAnalyzePropertyClick = () => {
    if (!selectedLocation) {
      toast.error(
        "Please select a property location first by clicking on the map or searching for an address."
      )
      return
    }

    // Check subscription limits before starting analysis
    if (subscriptionInfo && !subscriptionInfo.propertyReports.canUse) {
      const { limit, currentUsage } = subscriptionInfo.propertyReports
      toast.error(
        `You've used ${currentUsage} of ${limit} reports this month. Upgrade your plan to generate more reports.`
      )
      // Redirect to pricing after a short delay
      setTimeout(() => {
        window.location.href = "/pricing"
      }, 2000)
      return
    }

    // Show proactive warning for free users with remaining reports
    if (
      subscriptionInfo &&
      subscriptionInfo.propertyReports.canUse &&
      subscriptionInfo.propertyReports.remainingUsage !== "unlimited"
    ) {
      const { remainingUsage, currentUsage, limit } =
        subscriptionInfo.propertyReports

      // Show warning toast if user has limited reports remaining
      if (typeof remainingUsage === "number" && remainingUsage <= 3) {
        if (remainingUsage === 1) {
          toast.warning(
            `This is your last free property report. Upgrade to Pro for unlimited reports.`
          )
        } else {
          toast.info(
            `You have ${remainingUsage} free property reports remaining this month (${currentUsage}/${limit} used).`
          )
        }
      }
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
          availableModels={filteredModels}
          onToggleDebugMode={toggleDebugMode}
          showSidebar={showSidebar}
          livePreviewImages={livePreviewImages}
          currentCaptureStage={currentCaptureStage}
          reportMode={reportMode}
          onReportModeChange={handleReportModeChange}
          canUseAgentMode={canUseAgentMode()}
          hasActiveReport={!!(roofAnalysis || reportData)}
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

      {/* Report Display - Shows in main content area */}
      {(roofAnalysis || reportData) && (
        <div className="absolute inset-0 z-20">
          <PropertyReportViewer
            reportData={roofAnalysis || reportData}
            solarData={reportData?.solar || reportData?.solarMetrics}
            images={
              roofAnalysis?.satelliteViews || reportData?.capturedImages || []
            }
            onClose={() => {
              setRoofAnalysis(null)
              setReportData(null)
            }}
          />
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
