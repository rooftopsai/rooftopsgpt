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
  enhanceRoofPitch
} from "@/lib/image-processing"
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

// Available OpenAI models for roof analysis
const availableModels = [
  { value: "gpt-5.1", label: "GPT-5.1 (Recommended)", provider: "openai" },
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

      // CRITICAL FIX: First re-center the map on the selected property
      if (mapRef.current && selectedLocation) {
        try {
          // Center the map on the selected location before starting captures
          mapRef.current.setCenter({
            lat: selectedLocation.lat,
            lng: selectedLocation.lng
          })

          // Set appropriate zoom level for capturing property details
          mapRef.current.setZoom(20)

          logDebug(
            "Map centered on selected property at " +
              selectedLocation.lat.toFixed(6) +
              ", " +
              selectedLocation.lng.toFixed(6)
          )

          // Add a brief delay to ensure the map is properly centered before starting captures
          await new Promise(resolve => setTimeout(resolve, 800))
        } catch (e) {
          console.error("Error centering map on property:", e)
          logDebug(`Error centering map: ${e.message}`)
        }
      }

      // === TOP VIEW (directly overhead) ===
      setCurrentCaptureStage("Capturing overhead view...")
      logDebug("Capturing top view")

      // Check if we have the map reference before trying to use it
      if (mapRef.current) {
        try {
          // Set map to default tilt (0) for overhead view
          mapRef.current.setTilt(0)
          // Set zoom level appropriate for roof details
          mapRef.current.setZoom(20)
          // Reset heading to north (0 degrees)
          mapRef.current.setHeading(0)
          logDebug("Map settings adjusted for top view")
        } catch (e) {
          console.error("Error setting map properties:", e)
          logDebug(`Error setting map properties: ${e.message}`)
        }
      } else {
        logDebug("Map reference is not available for manipulation")
      }

      // Allow time for map to render with new settings
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Capture top view
      const topView = await captureMapView(mapContainerRef, "top")
      if (topView) {
        topView.enhancementOptions = {
          enhanceEdges: imageProcessingOptions.enhanceEdges,
          enhanceContrast: imageProcessingOptions.enhanceContrast,
          addMeasurementGrid: imageProcessingOptions.addMeasurementGrid
        }
        views.push(topView)
        setLivePreviewImages(prev => [...prev, topView])
        setCaptureProgress(10)
      }

      // Capture views from multiple angles with tilt if 3D mode is enabled
      // FIXED: Removed 0 from the angles array to avoid duplication with top view
      const angles = [45, 90, 180]
      for (let i = 0; i < angles.length; i++) {
        const angle = angles[i]
        setCaptureAngle(angle)
        setCurrentCaptureStage(`Capturing view from ${getDirectionName(angle)}...`)

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
              mapRef.current.setTilt(45) // 45-degree tilt for 3D view
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
          view.tilt = is3DMode ? 45 : 0
          views.push(view)
          setLivePreviewImages(prev => [...prev, view])
          setCaptureProgress(10 + ((i + 1) / angles.length) * 80)
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

      // Send views to LLM for analysis
      const analysisResult = await sendToLLMForAnalysis(views)

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

      // Improved html2canvas settings for higher quality captures
      const canvas = await html2canvas(containerRef.current, {
        useCORS: true,
        allowTaint: true,
        logging: isDebugMode,
        scale: 2.5, // Increased scale for higher quality (was 2)
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

      // Convert canvas to base64 image with higher quality
      let imageData = canvas.toDataURL("image/jpeg", 0.97) // Increased quality (was 0.95)

      // Apply image enhancements with improved settings
      logDebug(`Enhancing ${viewName} view with image processing...`)

      // Apply main enhancements (edges, contrast, grid) with adjusted settings for better clarity
      imageData = await enhanceImageForRoofAnalysis(imageData, {
        enhanceEdges: imageProcessingOptions.enhanceEdges,
        enhanceContrast: imageProcessingOptions.enhanceContrast, // This will often be false now
        addMeasurementGrid: imageProcessingOptions.addMeasurementGrid,
        dimensions: {
          width: canvas.width,
          height: canvas.height
        }
      })

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
        enhanced: true
      }
    } catch (error) {
      console.error(`Error capturing ${viewName} view:`, error)
      logDebug(`Failed to capture ${viewName} view: ${error.message}`)
      return null
    }
  }

  // Function to send images to LLM for analysis
  const sendToLLMForAnalysis = async satelliteViews => {
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

      // Create a more detailed prompt that explains the enhancements and measurement grid
      const enhancedPrompt = `As an expert roofing analyst, I need your detailed assessment of a property at ${selectedAddress || `${selectedLocation?.lat.toFixed(6)}, ${selectedLocation?.lng.toFixed(6)}`}. Focus on the property most centered in these images and compare all images to determine the most accurate details about the subject property. We are pursuing highly accurate number of facets and square footage of the roof so that we can determine the number of squares needed to replace the subject roof.

  IMPORTANT MEASUREMENT INFORMATION:
  - The images have been enhanced with edge detection to highlight roof facets and boundaries
  - A measurement grid has been added for reference (approximately 10x10 grid)
  - A scale bar shows approximately 10 meters / 30 feet
  - North direction is indicated in the top right corner

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

  Please analyze the following aspects with the highest possible accuracy:

  1. PRECISE ROOF MEASUREMENTS:
     - Total roof area in square feet (be as precise as possible)
     - Count all distinct roof facets/planes (be exact)
     - Measure the pitch of each major facet (e.g. 4/12, 6/12, etc.)
     - Identify and measure ridge lines, valleys, hips, and dormers
     - Where possible, provide dimensions of each major section

  2. MATERIAL ASSESSMENT:
     - Identify probable roofing material and condition
     - Note signs of aging, damage, or maintenance issues
     - Evaluate solar potential based on orientation and shading

  3. INSTALLATION CONSIDERATIONS:
     - Identify access challenges or safety concerns
     - Note complex features requiring special attention
     - Estimate total ridge and valley lengths (in linear feet)

  Use the measurement grid and scale bar to make the most accurate assessments possible. The grid cells are approximately equal in size, and the scale bar represents approximately 10 meters or 30 feet.

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

      // Send to OpenAI chat API (Anthropic models removed)
      const response = await axios.post("/api/chat/openai", payload)

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
              analysisResult = {
                analysis: parsed.detailedAnalysis || responseText,
                structuredData: {
                  ...parsed.structuredData,
                  userSummary: parsed.userSummary
                },
                capturedImages: validViews,
                satelliteViews: validViews,
                debug: {
                  modelUsed: selectedModel,
                  responseTime: Date.now() - Date.now(),
                  imageCount: validViews.length
                }
              }
              logDebug("Successfully parsed structured JSON response")
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
              responseTime: Date.now() - Date.now(),
              imageCount: validViews.length,
              parsingMethod: "text_extraction"
            }
          }

          logDebug("Used text parsing fallback to extract metrics")
        }
      } else {
        // Response is already an object
        analysisResult = response.data
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
