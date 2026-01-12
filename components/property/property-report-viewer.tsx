// components/property/property-report-viewer.tsx
"use client"

import React, { useState } from "react"
import { toast } from "sonner"

// ============================================================================
// ROOFTOPS AI - INTERACTIVE ROOF REPORT VIEWER
// Mobile-first, professional roof analysis tool for roofers
// ============================================================================

interface PropertyReportViewerProps {
  reportData: any
  solarData?: any
  images?: any[]
  onClose: () => void
}

const PropertyReportViewer: React.FC<PropertyReportViewerProps> = ({
  reportData,
  solarData,
  images = [],
  onClose
}) => {
  // Active tab state
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null)
  const [showSegmentModal, setShowSegmentModal] = useState(false)

  // Estimate builder state
  const [estimateItems, setEstimateItems] = useState<any[]>([])
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({})
  const [showPriceEditor, setShowPriceEditor] = useState<string | null>(null)

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: string; content: string }>
  >([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI roof assistant. Ask me anything about this property - measurements, condition, pricing, materials, or recommendations."
    }
  ])
  const [chatInput, setChatInput] = useState("")
  const [isLoadingChat, setIsLoadingChat] = useState(false)

  // Materials customization state
  const [selectedMaterialPreset, setSelectedMaterialPreset] =
    useState("architectural")
  const [materialPrices, setMaterialPrices] = useState<Record<string, number>>({
    shingles: 120
  })
  const [materialQuantities, setMaterialQuantities] = useState<
    Record<string, number>
  >({})
  const [materialWasteFactor, setMaterialWasteFactor] = useState(10)
  const [customMaterials, setCustomMaterials] = useState<any[]>([])
  const [editingMaterial, setEditingMaterial] = useState<string | null>(null)
  const [showAddMaterial, setShowAddMaterial] = useState(false)
  const [newMaterialName, setNewMaterialName] = useState("")
  const [newMaterialQty, setNewMaterialQty] = useState("")
  const [newMaterialUnit, setNewMaterialUnit] = useState("")
  const [newMaterialPrice, setNewMaterialPrice] = useState("")

  // Image gallery state
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [showFullscreenImage, setShowFullscreenImage] = useState(false)

  // Theme colors matching Rooftops AI
  const theme = {
    primary: "#0D9488",
    primaryLight: "#14B8A6",
    primaryDark: "#0F766E",
    primaryBg: "#F0FDFA",
    accent: "#F59E0B",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    gray50: "#F9FAFB",
    gray100: "#F3F4F6",
    gray200: "#E5E7EB",
    gray300: "#D1D5DB",
    gray400: "#9CA3AF",
    gray500: "#6B7280",
    gray600: "#4B5563",
    gray700: "#374151",
    gray800: "#1F2937",
    gray900: "#111827",
    white: "#FFFFFF"
  }

  // Extract data from reportData with safe fallbacks
  const roofData = React.useMemo(() => {
    // Check if this is agent mode data (multi-agent analysis)
    const isAgentMode = reportData?.multiAgent || reportData?.agents

    // For agent mode, extract from agent results
    const measurements = isAgentMode
      ? reportData?.agents?.measurement?.roofMetrics ||
        reportData?.finalReport?.roofMetrics ||
        {}
      : reportData?.structuredData || reportData?.measurements || {}

    const segments = isAgentMode
      ? reportData?.agents?.measurement?.roofSegments ||
        reportData?.finalReport?.roofSegments ||
        solarData?.solarPotential?.roofSegmentStats ||
        []
      : reportData?.roofSegments ||
        solarData?.solarPotential?.roofSegmentStats ||
        []

    const condition = isAgentMode
      ? reportData?.agents?.condition ||
        reportData?.finalReport?.roofCondition ||
        {}
      : reportData?.roofCondition || {}

    const estimate = isAgentMode
      ? reportData?.agents?.cost || reportData?.finalReport?.costEstimate || {}
      : reportData?.costEstimate || {}

    const solar = solarData?.solarPotential || reportData?.solarPotential || {}

    return {
      property: {
        address:
          reportData?.metadata?.address ||
          reportData?.address ||
          "Property Address",
        coordinates: reportData?.metadata?.location ||
          reportData?.location || { lat: 0, lng: 0 },
        imageDate: reportData?.imageryDate?.year
          ? `${reportData.imageryDate.year}-${String(reportData.imageryDate.month).padStart(2, "0")}-${String(reportData.imageryDate.day).padStart(2, "0")}`
          : "2024"
      },
      images:
        images.length > 0
          ? images
          : [
              {
                id: "placeholder",
                label: "Property Image",
                type: "overhead",
                url: "/placeholder-roof.jpg"
              }
            ],
      measurements: {
        totalArea: {
          sqft: measurements.roofArea || measurements.totalArea?.sqft || 0,
          sqm: measurements.totalArea?.sqm || 0
        },
        roofingSquares: Math.ceil((measurements.roofArea || 0) / 100),
        groundFootprint: {
          sqft: measurements.groundFootprint?.sqft || 0,
          sqm: measurements.groundFootprint?.sqm || 0
        },
        segmentCount: measurements.facetCount || segments.length || 0,
        predominantPitch: measurements.predominantPitch || "8:12",
        pitchCategory: measurements.pitchCategory || "Moderate",
        complexity: measurements.complexity || "Moderate",
        ridgeLength: measurements.ridgeLength || 100,
        valleyLength: measurements.valleyLength || 30
      },
      segments: segments.map((seg: any, idx: number) => ({
        id: idx + 1,
        name: `Segment ${idx + 1}`,
        direction: getDirectionFromAzimuth(seg.azimuthDegrees || 0),
        azimuth: seg.azimuthDegrees || 0,
        pitch: seg.pitchDegrees
          ? `${((seg.pitchDegrees / 12) * 12).toFixed(1)}:12`
          : "8:12",
        pitchDeg: seg.pitchDegrees || 35,
        area: seg.stats?.areaMeters2
          ? Math.round(seg.stats.areaMeters2 * 10.764)
          : 0,
        solarQuality:
          seg.stats?.sunshineQuantiles?.[5] > 1400
            ? "Excellent"
            : seg.stats?.sunshineQuantiles?.[5] > 1200
              ? "Good"
              : "Moderate",
        color: ["#0D9488", "#14B8A6", "#2DD4BF", "#5EEAD4", "#99F6E4"][idx % 5]
      })),
      condition: {
        overall: condition.condition || "Good",
        score: condition.conditionScore || 7,
        age: condition.estimatedAge || 8,
        remainingLife: condition.remainingLife || 12,
        material: condition.material || "Asphalt Shingles",
        issues:
          condition.visibleIssues?.map((issue: string) => ({
            item: issue,
            severity: "low",
            location: "Various"
          })) || []
      },
      estimate: {
        base: estimate.totalCost || estimate.total || 20000,
        low: estimate.low || estimate.totalCost * 0.9 || 18000,
        high: estimate.high || estimate.totalCost * 1.1 || 22000,
        perSquare: estimate.costPerSquare || 650
      },
      solar: {
        maxPanels: solar.maxArrayPanelsCount || solar.maxPanels || 0,
        systemKw: (solar.maxArrayPanelsCount || 0) * 0.4,
        annualProduction: solar.maxArrayPanelsCount
          ? solar.maxArrayPanelsCount * 400 * 1.6
          : 0,
        monthlyAverage: solar.maxArrayPanelsCount
          ? Math.round((solar.maxArrayPanelsCount * 400 * 1.6) / 12)
          : 0,
        paybackYears: 7.4,
        co2Offset: solar.maxArrayPanelsCount
          ? solar.maxArrayPanelsCount * 400 * 1.6 * 0.7
          : 0
      },
      materials: {
        shingles: {
          bundles: Math.ceil(((measurements.roofArea || 0) / 100) * 3),
          cost: Math.ceil(((measurements.roofArea || 0) / 100) * 3) * 50
        },
        underlayment: {
          rolls: Math.ceil((measurements.roofArea || 0) / 1000),
          cost: Math.ceil((measurements.roofArea || 0) / 1000) * 60
        },
        starterStrip: { bundles: 8, cost: 320 },
        ridgeCap: { bundles: 5, cost: 300 },
        nails: { boxes: 6, cost: 180 },
        iceWater: { rolls: 4, cost: 400 },
        dripEdge: {
          feet: measurements.ridgeLength * 2 || 200,
          cost: (measurements.ridgeLength * 2 || 200) * 2
        },
        flashingKit: { sets: 1, cost: 350 },
        ventilation: { units: 4, cost: 320 },
        pipeBoots: { units: 3, cost: 90 }
      }
    }
  }, [reportData, solarData, images])

  // Helper function to convert azimuth to cardinal direction
  function getDirectionFromAzimuth(azimuth: number): string {
    if (azimuth >= 337.5 || azimuth < 22.5) return "North"
    if (azimuth >= 22.5 && azimuth < 67.5) return "Northeast"
    if (azimuth >= 67.5 && azimuth < 112.5) return "East"
    if (azimuth >= 112.5 && azimuth < 157.5) return "Southeast"
    if (azimuth >= 157.5 && azimuth < 202.5) return "South"
    if (azimuth >= 202.5 && azimuth < 247.5) return "Southwest"
    if (azimuth >= 247.5 && azimuth < 292.5) return "West"
    return "Northwest"
  }

  // ==========================================================================
  // ESTIMATE BUILDER ITEMS
  // ==========================================================================
  const estimateCategories = [
    {
      name: "Tear-Off & Disposal",
      icon: "🗑️",
      items: [
        {
          id: "tearoff",
          name: "Tear-Off Labor",
          unit: "sq",
          qty: roofData.measurements.roofingSquares,
          defaultPrice: 75,
          description: "Remove existing shingles"
        },
        {
          id: "disposal",
          name: "Disposal/Dumpster",
          unit: "job",
          qty: 1,
          defaultPrice: 650,
          description: "Haul away old materials"
        },
        {
          id: "cleanup",
          name: "Final Cleanup",
          unit: "job",
          qty: 1,
          defaultPrice: 300,
          description: "Magnetic sweep & debris removal"
        }
      ]
    },
    {
      name: "Materials",
      icon: "📦",
      items: [
        {
          id: "shingles",
          name: "Architectural Shingles",
          unit: "sq",
          qty: roofData.measurements.roofingSquares,
          defaultPrice: 150,
          description: "30-year warranty grade"
        },
        {
          id: "underlayment",
          name: "Synthetic Underlayment",
          unit: "sq",
          qty: roofData.measurements.roofingSquares,
          defaultPrice: 30,
          description: "Premium moisture barrier"
        },
        {
          id: "starter",
          name: "Starter Strip",
          unit: "sq",
          qty: roofData.measurements.roofingSquares,
          defaultPrice: 10,
          description: "Eave & rake starter"
        },
        {
          id: "ridgecap",
          name: "Ridge Cap Shingles",
          unit: "lf",
          qty: roofData.measurements.ridgeLength,
          defaultPrice: 3,
          description: "Color-matched hip & ridge"
        },
        {
          id: "icewater",
          name: "Ice & Water Shield",
          unit: "lf",
          qty:
            roofData.measurements.ridgeLength +
            roofData.measurements.valleyLength,
          defaultPrice: 4,
          description: "Valleys, eaves, penetrations"
        },
        {
          id: "drip",
          name: "Drip Edge",
          unit: "lf",
          qty: roofData.measurements.ridgeLength * 2,
          defaultPrice: 2,
          description: "Aluminum edge protection"
        },
        {
          id: "vents",
          name: "Roof Vents",
          unit: "ea",
          qty: 4,
          defaultPrice: 85,
          description: "Box or ridge vents"
        },
        {
          id: "pipeboots",
          name: "Pipe Boots",
          unit: "ea",
          qty: 3,
          defaultPrice: 35,
          description: "Plumbing penetration seals"
        },
        {
          id: "flashing",
          name: "Step Flashing",
          unit: "set",
          qty: 1,
          defaultPrice: 350,
          description: "Chimney & wall flashing"
        },
        {
          id: "nails",
          name: "Roofing Nails",
          unit: "box",
          qty: 6,
          defaultPrice: 35,
          description: "Coil nails for gun"
        }
      ]
    },
    {
      name: "Labor",
      icon: "👷",
      items: [
        {
          id: "install",
          name: "Installation Labor",
          unit: "sq",
          qty: roofData.measurements.roofingSquares,
          defaultPrice: 185,
          description: "Crew install (steep pitch rate)"
        },
        {
          id: "complexity",
          name: "Complexity Upcharge",
          unit: "job",
          qty: 1,
          defaultPrice: 1200,
          description: "Dormers, valleys, penetrations"
        },
        {
          id: "steeppitch",
          name: "Steep Pitch Premium",
          unit: "sq",
          qty: roofData.measurements.roofingSquares,
          defaultPrice: 35,
          description: "Safety equipment & slower pace"
        }
      ]
    },
    {
      name: "Optional Upgrades",
      icon: "⬆️",
      items: [
        {
          id: "premium_shingle",
          name: "Upgrade to Premium",
          unit: "sq",
          qty: roofData.measurements.roofingSquares,
          defaultPrice: 45,
          description: "50-year designer shingles"
        },
        {
          id: "gutters",
          name: "Gutter Replacement",
          unit: "lf",
          qty: Math.round(roofData.measurements.ridgeLength * 1.5),
          defaultPrice: 12,
          description: '6" seamless aluminum'
        },
        {
          id: "skylights",
          name: "Skylight Flashing",
          unit: "ea",
          qty: 0,
          defaultPrice: 450,
          description: "Per skylight re-flash"
        },
        {
          id: "chimney",
          name: "Chimney Cap",
          unit: "ea",
          qty: 1,
          defaultPrice: 350,
          description: "Stainless steel cap"
        },
        {
          id: "attic_vent",
          name: "Solar Attic Fan",
          unit: "ea",
          qty: 0,
          defaultPrice: 550,
          description: "Powered ventilation"
        }
      ]
    }
  ]

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================
  const getPrice = (itemId: string, defaultPrice: number) => {
    return customPrices[itemId] !== undefined
      ? customPrices[itemId]
      : defaultPrice
  }

  const toggleEstimateItem = (item: any) => {
    const exists = estimateItems.find(i => i.id === item.id)
    if (exists) {
      setEstimateItems(estimateItems.filter(i => i.id !== item.id))
    } else {
      setEstimateItems([...estimateItems, item])
    }
  }

  const isItemSelected = (itemId: string) => {
    return estimateItems.some(i => i.id === itemId)
  }

  const calculateEstimateTotal = () => {
    return estimateItems.reduce((total, item) => {
      const price = getPrice(item.id, item.defaultPrice)
      return total + price * item.qty
    }, 0)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // ==========================================================================
  // AI CHAT HANDLER WITH REAL API
  // ==========================================================================
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isLoadingChat) return

    const userMessage = chatInput.trim()
    setChatMessages(prev => [...prev, { role: "user", content: userMessage }])
    setChatInput("")
    setIsLoadingChat(true)

    try {
      const response = await fetch("/api/chat/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatSettings: {
            model: "gpt-4o",
            temperature: 0.7
          },
          messages: [
            {
              role: "system",
              content: `You are an AI roof assistant helping with property analysis. Here's the property data:

Address: ${roofData.property.address}
Roof Area: ${roofData.measurements.totalArea.sqft} sq ft
Pitch: ${roofData.measurements.predominantPitch}
Condition: ${roofData.condition.overall} (${roofData.condition.score}/10)
Estimated Cost: ${formatCurrency(roofData.estimate.base)}
Age: ${roofData.condition.age} years
Remaining Life: ${roofData.condition.remainingLife} years
Solar Potential: ${roofData.solar.maxPanels} panels

Answer questions about this property clearly and concisely. Use specific numbers from the data.`
            },
            ...chatMessages.slice(1),
            { role: "user", content: userMessage }
          ]
        })
      })

      if (!response.ok) throw new Error("Failed to get response")

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let aiResponse = ""

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.choices?.[0]?.delta?.content) {
                  aiResponse += data.choices[0].delta.content
                  setChatMessages(prev => {
                    const newMessages = [...prev]
                    if (
                      newMessages[newMessages.length - 1].role === "assistant"
                    ) {
                      newMessages[newMessages.length - 1].content = aiResponse
                    } else {
                      newMessages.push({
                        role: "assistant",
                        content: aiResponse
                      })
                    }
                    return newMessages
                  })
                }
              } catch (e) {
                // Ignore JSON parse errors
              }
            }
          }
        }
      }

      if (!aiResponse) {
        throw new Error("No response received")
      }
    } catch (error) {
      console.error("Chat error:", error)
      setChatMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again."
        }
      ])
    } finally {
      setIsLoadingChat(false)
    }
  }

  // ==========================================================================
  // SHARE ESTIMATE HANDLER
  // ==========================================================================
  const handleShareEstimate = () => {
    if (estimateItems.length === 0) {
      toast.error("Add items to your estimate first")
      return
    }

    const estimateData = {
      property: roofData.property.address,
      date: new Date().toISOString(),
      items: estimateItems.map(item => ({
        name: item.name,
        qty: item.qty,
        unit: item.unit,
        price: getPrice(item.id, item.defaultPrice),
        total: getPrice(item.id, item.defaultPrice) * item.qty
      })),
      total: calculateEstimateTotal()
    }

    const encodedData = btoa(JSON.stringify(estimateData))
    const shareUrl = `${window.location.origin}/estimate/${encodedData}`

    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        toast.success("Estimate link copied to clipboard!")
      })
      .catch(() => {
        toast.error("Failed to copy link")
      })
  }

  // Quick question chips
  const quickQuestions = [
    "What's the total area?",
    "How steep is the pitch?",
    "What will it cost?",
    "What's the condition?",
    "Solar potential?",
    "Materials needed?"
  ]

  // Disclaimer component
  const Disclaimer = () => (
    <div className="mt-6 rounded-lg border-l-4 border-gray-300 bg-gray-50 p-3">
      <p className="m-0 text-xs leading-relaxed text-gray-500">
        Data in this report is AI gathered and AI generated. There may be
        mistakes. Check important data against other sources.
      </p>
    </div>
  )

  // Material presets for materials tab
  const materialPresets = [
    {
      id: "basic",
      name: "3-Tab Basic",
      icon: "🏠",
      description: "20-year shingles",
      shinglePrice: 85,
      laborMult: 1.0
    },
    {
      id: "architectural",
      name: "Architectural",
      icon: "🏡",
      description: "30-year dimensional",
      shinglePrice: 120,
      laborMult: 1.0
    },
    {
      id: "premium",
      name: "Premium Designer",
      icon: "🏰",
      description: "50-year luxury",
      shinglePrice: 185,
      laborMult: 1.15
    },
    {
      id: "metal",
      name: "Standing Seam",
      icon: "🔩",
      description: "Metal roofing",
      shinglePrice: 350,
      laborMult: 1.4
    }
  ]

  const defaultMaterials = [
    {
      id: "shingles",
      name: "Roofing Material",
      icon: "🏠",
      qty: roofData.measurements.roofingSquares,
      unit: "sq",
      price: materialPrices.shingles || 120,
      editable: true,
      category: "primary"
    },
    {
      id: "underlayment",
      name: "Synthetic Underlayment",
      icon: "📜",
      qty: Math.ceil(roofData.measurements.roofingSquares),
      unit: "rolls",
      price: materialPrices.underlayment || 65,
      editable: true,
      category: "primary"
    },
    {
      id: "starter",
      name: "Starter Strip",
      icon: "📏",
      qty: Math.ceil(roofData.measurements.ridgeLength / 30),
      unit: "bundles",
      price: materialPrices.starter || 45,
      editable: true,
      category: "primary"
    },
    {
      id: "ridgecap",
      name: "Ridge Cap",
      icon: "🔺",
      qty: Math.ceil(roofData.measurements.ridgeLength / 20),
      unit: "bundles",
      price: materialPrices.ridgecap || 55,
      editable: true,
      category: "primary"
    },
    {
      id: "icewater",
      name: "Ice & Water Shield",
      icon: "🧊",
      qty: 4,
      unit: "rolls",
      price: materialPrices.icewater || 110,
      editable: true,
      category: "protection"
    },
    {
      id: "drip",
      name: "Drip Edge",
      icon: "📐",
      qty: 20,
      unit: "pcs (10ft)",
      price: materialPrices.drip || 12,
      editable: true,
      category: "protection"
    },
    {
      id: "vents",
      name: "Roof Vents",
      icon: "🌀",
      qty: 4,
      unit: "units",
      price: materialPrices.vents || 85,
      editable: true,
      category: "ventilation"
    },
    {
      id: "pipeboots",
      name: "Pipe Boots",
      icon: "🔌",
      qty: 3,
      unit: "units",
      price: materialPrices.pipeboots || 35,
      editable: true,
      category: "ventilation"
    },
    {
      id: "flashing",
      name: "Step Flashing Kit",
      icon: "🔧",
      qty: 1,
      unit: "kit",
      price: materialPrices.flashing || 150,
      editable: true,
      category: "flashing"
    },
    {
      id: "nails",
      name: "Roofing Nails",
      icon: "📌",
      qty: 6,
      unit: "boxes",
      price: materialPrices.nails || 35,
      editable: true,
      category: "fasteners"
    }
  ]

  const allMaterials = [...defaultMaterials, ...customMaterials]

  const totalMaterialCost = allMaterials.reduce((sum, m) => {
    const price =
      materialPrices[m.id] !== undefined ? materialPrices[m.id] : m.price
    const qty =
      materialQuantities[m.id] !== undefined ? materialQuantities[m.id] : m.qty
    return sum + price * qty
  }, 0)

  const totalWithWaste = totalMaterialCost * (1 + materialWasteFactor / 100)

  return (
    <div className="mx-auto min-h-screen max-w-full bg-white pb-20 font-sans">
      {/* Header */}
      <header
        className="sticky top-0 z-[100] p-4 pb-5"
        style={{
          background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 100%)`,
          color: theme.white
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex size-8 items-center justify-center rounded-lg text-lg"
              style={{ background: theme.white }}
            >
              🏠
            </div>
            <span className="text-lg font-bold tracking-tight">
              rooftops<span style={{ color: "#5EEAD4" }}>ai</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-2xl text-white transition-colors hover:bg-white/20"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            ×
          </button>
        </div>
        <div className="mb-1 text-sm font-medium opacity-95">
          {roofData.property.address}
        </div>
        <div className="text-xs opacity-80">
          Property Report • Generated{" "}
          {new Date().toLocaleDateString("en-US", {
            month: "short",
            year: "numeric"
          })}
        </div>
      </header>

      {/* Image Gallery */}
      {roofData.images.length > 0 && (
        <div className="relative bg-gray-900">
          <div className="relative">
            <img
              src={roofData.images[activeImageIndex].url}
              alt={roofData.images[activeImageIndex].label}
              className="block h-[220px] w-full cursor-pointer object-cover"
              onClick={() => setShowFullscreenImage(true)}
              onError={(e: any) => {
                e.target.style.background = theme.gray700
              }}
            />
            <div className="absolute inset-x-3 bottom-[60px] flex items-center justify-between">
              <div
                className="rounded-md px-3 py-1.5 text-xs font-semibold text-white"
                style={{ background: "rgba(0,0,0,0.7)" }}
              >
                {roofData.images[activeImageIndex].type === "street"
                  ? "🏘️"
                  : "📷"}{" "}
                {roofData.images[activeImageIndex].label}
              </div>
              <div
                className="rounded-md px-2.5 py-1.5 text-[11px] text-white"
                style={{ background: "rgba(0,0,0,0.7)" }}
              >
                {activeImageIndex + 1} / {roofData.images.length}
              </div>
            </div>
          </div>

          <div
            className="flex gap-2 overflow-x-auto bg-gray-900 p-2.5"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {roofData.images.map((img: any, idx: number) => (
              <img
                key={img.id}
                src={img.url}
                alt={img.label}
                className="size-14 shrink-0 cursor-pointer rounded-lg object-cover transition-all"
                style={{
                  border:
                    activeImageIndex === idx
                      ? `3px solid ${theme.primary}`
                      : "3px solid transparent",
                  opacity: activeImageIndex === idx ? 1 : 0.7
                }}
                onClick={() => setActiveImageIndex(idx)}
                onError={(e: any) => {
                  e.target.style.background = theme.gray600
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Image Modal */}
      {showFullscreenImage && (
        <div
          className="fixed inset-0 z-[300] flex flex-col items-center justify-center"
          style={{ background: "rgba(0,0,0,0.95)" }}
          onClick={() => setShowFullscreenImage(false)}
        >
          <button
            className="absolute right-4 top-4 flex size-10 cursor-pointer items-center justify-center rounded-full text-2xl text-white"
            style={{ background: "rgba(255,255,255,0.2)" }}
            onClick={() => setShowFullscreenImage(false)}
          >
            ×
          </button>
          <img
            src={roofData.images[activeImageIndex].url}
            alt={roofData.images[activeImageIndex].label}
            className="max-h-[80vh] max-w-full object-contain"
            onClick={e => e.stopPropagation()}
          />
          <div className="mt-3 text-sm font-semibold text-white">
            {roofData.images[activeImageIndex].label}
          </div>
          <div className="mt-4 flex gap-4">
            <button
              className="cursor-pointer rounded-lg px-6 py-3 text-sm font-semibold text-white"
              style={{ background: "rgba(255,255,255,0.2)" }}
              onClick={e => {
                e.stopPropagation()
                setActiveImageIndex(prev =>
                  prev === 0 ? roofData.images.length - 1 : prev - 1
                )
              }}
            >
              ← Previous
            </button>
            <button
              className="cursor-pointer rounded-lg px-6 py-3 text-sm font-semibold text-white"
              style={{ background: "rgba(255,255,255,0.2)" }}
              onClick={e => {
                e.stopPropagation()
                setActiveImageIndex(prev =>
                  prev === roofData.images.length - 1 ? 0 : prev + 1
                )
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav
        className="flex gap-1 overflow-x-auto border-b px-4 py-3"
        style={{
          background: theme.gray50,
          borderColor: theme.gray200,
          WebkitOverflowScrolling: "touch"
        }}
      >
        {[
          { id: "overview", label: "Overview" },
          { id: "roof", label: "Roof" },
          { id: "estimate", label: "Estimate" },
          { id: "ai", label: "AI Chat" },
          { id: "solar", label: "Solar" },
          { id: "materials", label: "Materials" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="cursor-pointer whitespace-nowrap rounded-full px-4 py-2.5 text-[13px] font-semibold transition-all"
            style={{
              background: activeTab === tab.id ? theme.primary : theme.white,
              color: activeTab === tab.id ? theme.white : theme.gray700,
              boxShadow:
                activeTab === tab.id ? "none" : `0 1px 3px ${theme.gray200}`
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="p-4">
        {/* OVERVIEW TAB - Continued in next message due to size limit */}
        {activeTab === "overview" && (
          <div>
            {/* Roof Summary */}
            <div
              className="mb-4 rounded-2xl border bg-white p-5 shadow-sm"
              style={{ borderColor: theme.gray100 }}
            >
              <div className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
                <span>📊</span> Roof Summary
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-gray-50 p-3.5">
                  <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
                    Total Area
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {roofData.measurements.totalArea.sqft.toLocaleString()}
                    <span className="text-xs font-medium text-gray-500">
                      {" "}
                      sq ft
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3.5">
                  <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
                    Squares
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {roofData.measurements.roofingSquares}
                    <span className="text-xs font-medium text-gray-500">
                      {" "}
                      sq
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3.5">
                  <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
                    Pitch
                  </div>
                  <div className="mb-1 text-xl font-bold text-gray-900">
                    {roofData.measurements.predominantPitch}
                  </div>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{ background: "#FEF3C7", color: "#92400E" }}
                  >
                    {roofData.measurements.pitchCategory}
                  </span>
                </div>
                <div className="rounded-xl bg-gray-50 p-3.5">
                  <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
                    Segments
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {roofData.measurements.segmentCount}
                  </div>
                </div>
              </div>
            </div>

            {/* Condition Card */}
            <div
              className="mb-4 rounded-2xl border bg-white p-5 shadow-sm"
              style={{ borderColor: theme.gray100 }}
            >
              <div className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
                <span>🔍</span> Roof Condition
              </div>
              <div className="mb-4 flex items-center gap-4">
                <div
                  className="flex size-16 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(${theme.success} ${roofData.condition.score * 10}%, ${theme.gray200} 0%)`
                  }}
                >
                  <div
                    className="flex size-[52px] flex-col items-center justify-center rounded-full"
                    style={{ background: theme.white }}
                  >
                    <span className="text-lg font-bold text-gray-900">
                      {roofData.condition.score}
                    </span>
                    <span className="text-[10px] text-gray-500">/10</span>
                  </div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">
                    {roofData.condition.overall}
                  </div>
                  <div className="text-[13px] text-gray-500">
                    {roofData.condition.material}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-gray-50 p-3.5">
                  <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
                    Estimated Age
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    ~{roofData.condition.age}{" "}
                    <span className="text-xs font-medium text-gray-500">
                      years
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3.5">
                  <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
                    Remaining Life
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    ~{roofData.condition.remainingLife}{" "}
                    <span className="text-xs font-medium text-gray-500">
                      years
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Estimate Preview */}
            <div
              className="mb-4 rounded-2xl border-2 p-5 shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${theme.primaryBg} 0%, ${theme.white} 100%)`,
                borderColor: theme.primaryLight
              }}
            >
              <div className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
                <span>💰</span> Replacement Estimate
              </div>
              <div className="mb-4 text-center">
                <div
                  className="text-[32px] font-extrabold"
                  style={{ color: theme.primary }}
                >
                  {formatCurrency(roofData.estimate.base)}
                </div>
                <div className="text-[13px] text-gray-500">
                  Range: {formatCurrency(roofData.estimate.low)} -{" "}
                  {formatCurrency(roofData.estimate.high)}
                </div>
              </div>
              <button
                onClick={() => setActiveTab("estimate")}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl p-3.5 text-[15px] font-bold"
                style={{
                  background: theme.primary,
                  color: theme.white,
                  border: "none"
                }}
              >
                <span>📝</span> Build Custom Estimate
              </button>
            </div>

            {/* Quick Actions */}
            <div
              className="mb-4 rounded-2xl border bg-white p-5 shadow-sm"
              style={{ borderColor: theme.gray100 }}
            >
              <div className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
                <span>⚡</span> Quick Actions
              </div>
              <div className="flex flex-col gap-2.5">
                {[
                  {
                    icon: "📐",
                    label: "View Roof Segments",
                    tab: "roof",
                    color: theme.primary
                  },
                  {
                    icon: "🤖",
                    label: "Ask AI Questions",
                    tab: "ai",
                    color: theme.primaryLight
                  },
                  {
                    icon: "☀️",
                    label: "Solar Analysis",
                    tab: "solar",
                    color: theme.accent
                  },
                  {
                    icon: "📦",
                    label: "Materials List",
                    tab: "materials",
                    color: theme.success
                  }
                ].map((action, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTab(action.tab)}
                    className="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all hover:shadow-md"
                    style={{
                      border: `1px solid ${theme.gray200}`,
                      background: theme.white
                    }}
                  >
                    <span
                      className="flex size-10 items-center justify-center rounded-lg text-lg"
                      style={{
                        background: `${action.color}15`
                      }}
                    >
                      {action.icon}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-gray-900">
                      {action.label}
                    </span>
                    <span className="text-gray-400">→</span>
                  </button>
                ))}
              </div>
            </div>

            <Disclaimer />
          </div>
        )}

        {/* ROOF SEGMENTS TAB */}
        {activeTab === "roof" && (
          <div>
            {/* Totals Summary */}
            <div
              className="mb-4 rounded-2xl border bg-white p-5 shadow-sm"
              style={{ borderColor: theme.gray100 }}
            >
              <div className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
                <span>📐</span> Roof Measurements
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-gray-50 p-3.5">
                  <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
                    Total Area
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {roofData.measurements.totalArea.sqft.toLocaleString()}{" "}
                    <span className="text-xs font-medium text-gray-500">
                      sq ft
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3.5">
                  <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
                    Segments
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {roofData.measurements.segmentCount}
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3.5">
                  <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
                    Ridge Length
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    ~{roofData.measurements.ridgeLength}{" "}
                    <span className="text-xs font-medium text-gray-500">
                      ft
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3.5">
                  <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
                    Valley Length
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    ~{roofData.measurements.valleyLength}{" "}
                    <span className="text-xs font-medium text-gray-500">
                      ft
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Segment List */}
            <div
              className="mb-4 rounded-2xl border bg-white p-5 shadow-sm"
              style={{ borderColor: theme.gray100 }}
            >
              <div className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
                <span>📋</span> Segment Details
              </div>
              <div className="flex flex-col gap-2.5">
                {roofData.segments.map((seg: any) => (
                  <button
                    key={seg.id}
                    onClick={() => {
                      setSelectedSegment(seg.id)
                      setShowSegmentModal(true)
                    }}
                    className="flex cursor-pointer items-center gap-3 rounded-xl p-3 text-left"
                    style={{
                      border: `1px solid ${theme.gray200}`,
                      background: theme.white
                    }}
                  >
                    <div
                      className="flex size-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                      style={{ background: seg.color }}
                    >
                      {seg.id}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900">
                        {seg.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {seg.area.toLocaleString()} sq ft • {seg.pitch} pitch
                      </div>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                      style={{
                        background:
                          seg.solarQuality === "Excellent"
                            ? "#DCFCE7"
                            : seg.solarQuality === "Good"
                              ? theme.primaryBg
                              : "#FEF3C7",
                        color:
                          seg.solarQuality === "Excellent"
                            ? "#166534"
                            : seg.solarQuality === "Good"
                              ? theme.primaryDark
                              : "#92400E"
                      }}
                    >
                      {seg.direction}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Segment Modal */}
            {showSegmentModal && selectedSegment && (
              <div
                className="fixed inset-0 z-[200] flex items-end"
                style={{ background: "rgba(0,0,0,0.5)" }}
                onClick={() => setShowSegmentModal(false)}
              >
                <div
                  className="max-h-[70vh] w-full overflow-auto rounded-t-3xl bg-white p-6"
                  onClick={e => e.stopPropagation()}
                >
                  {(() => {
                    const seg = roofData.segments.find(
                      (s: any) => s.id === selectedSegment
                    )
                    if (!seg) return null
                    return (
                      <>
                        <div className="mb-5 flex items-center gap-3">
                          <div
                            className="flex size-12 items-center justify-center rounded-xl text-lg font-bold text-white"
                            style={{ background: seg.color }}
                          >
                            {seg.id}
                          </div>
                          <div className="flex-1">
                            <h3 className="m-0 text-xl font-bold text-gray-900">
                              {seg.name}
                            </h3>
                            <p className="m-0 text-sm text-gray-500">
                              {seg.direction}-facing segment
                            </p>
                          </div>
                          <button
                            onClick={() => setShowSegmentModal(false)}
                            className="flex size-9 cursor-pointer items-center justify-center rounded-full text-lg"
                            style={{
                              background: theme.gray100,
                              border: "none"
                            }}
                          >
                            ×
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-gray-50 p-3.5">
                            <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
                              Area
                            </div>
                            <div className="text-xl font-bold text-gray-900">
                              {seg.area.toLocaleString()}{" "}
                              <span className="text-xs font-medium text-gray-500">
                                sq ft
                              </span>
                            </div>
                          </div>
                          <div className="rounded-xl bg-gray-50 p-3.5">
                            <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
                              Pitch
                            </div>
                            <div className="text-xl font-bold text-gray-900">
                              {seg.pitch}
                            </div>
                          </div>
                          <div className="rounded-xl bg-gray-50 p-3.5">
                            <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
                              Azimuth
                            </div>
                            <div className="text-xl font-bold text-gray-900">
                              {seg.azimuth.toFixed(1)}°
                            </div>
                          </div>
                          <div className="rounded-xl bg-gray-50 p-3.5">
                            <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
                              Solar Quality
                            </div>
                            <span
                              className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                              style={{
                                background:
                                  seg.solarQuality === "Excellent"
                                    ? "#DCFCE7"
                                    : theme.primaryBg,
                                color:
                                  seg.solarQuality === "Excellent"
                                    ? "#166534"
                                    : theme.primaryDark
                              }}
                            >
                              {seg.solarQuality}
                            </span>
                          </div>
                        </div>
                        <div className="mt-5 rounded-lg bg-gray-50 p-3">
                          <div className="mb-1 text-xs text-gray-500">
                            Angle from horizontal
                          </div>
                          <div className="text-base font-semibold text-gray-900">
                            {seg.pitchDeg.toFixed(1)}° ({seg.pitch})
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
            )}

            <Disclaimer />
          </div>
        )}

        {/* ESTIMATE BUILDER TAB - Implementation continues with full estimate builder */}
        {activeTab === "estimate" && (
          <div>
            {/* Estimate Total Header */}
            <div
              className="sticky top-[85px] z-50 mb-4 rounded-2xl p-5 shadow-sm"
              style={{
                background:
                  estimateItems.length > 0
                    ? `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 100%)`
                    : theme.gray100,
                color: estimateItems.length > 0 ? theme.white : theme.gray900
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="mb-1 text-xs opacity-90">
                    Your Estimate Total
                  </div>
                  <div className="text-[28px] font-extrabold">
                    {formatCurrency(calculateEstimateTotal())}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] opacity-80">
                    {estimateItems.length} items
                  </div>
                  <div className="text-xs opacity-90">
                    {roofData.measurements.roofingSquares} squares
                  </div>
                </div>
              </div>
              {estimateItems.length > 0 && (
                <div
                  className="mt-3 flex gap-2 pt-3"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.2)" }}
                >
                  <button
                    onClick={() => setEstimateItems([])}
                    className="flex-1 cursor-pointer rounded-lg p-2.5 text-[13px] font-semibold"
                    style={{
                      border: "1px solid rgba(255,255,255,0.3)",
                      background: "transparent",
                      color: theme.white
                    }}
                  >
                    Clear All
                  </button>
                  <button
                    onClick={handleShareEstimate}
                    className="flex-[2] cursor-pointer rounded-lg p-2.5 text-[13px] font-bold"
                    style={{
                      background: theme.white,
                      color: theme.primary,
                      border: "none"
                    }}
                  >
                    Share Estimate →
                  </button>
                </div>
              )}
            </div>

            {/* Quick Add Buttons */}
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  const essentials = estimateCategories
                    .flatMap(c => c.items)
                    .filter(i =>
                      [
                        "tearoff",
                        "disposal",
                        "shingles",
                        "underlayment",
                        "starter",
                        "ridgecap",
                        "drip",
                        "install"
                      ].includes(i.id)
                    )
                  setEstimateItems(essentials)
                }}
                className="cursor-pointer rounded-full px-4 py-2.5 text-[13px] font-semibold"
                style={{
                  border: `1px solid ${theme.primary}`,
                  background: theme.primaryBg,
                  color: theme.primary
                }}
              >
                + Basic Replacement
              </button>
              <button
                onClick={() => {
                  const all = estimateCategories
                    .flatMap(c => c.items)
                    .filter(i => i.qty > 0)
                  setEstimateItems(all)
                }}
                className="cursor-pointer rounded-full px-4 py-2.5 text-[13px] font-semibold"
                style={{
                  border: `1px solid ${theme.gray300}`,
                  background: theme.white,
                  color: theme.gray700
                }}
              >
                + Full Package
              </button>
            </div>

            {/* Categories */}
            {estimateCategories.map((category, catIdx) => (
              <div
                key={catIdx}
                className="mb-4 rounded-2xl border bg-white p-5 shadow-sm"
                style={{ borderColor: theme.gray100 }}
              >
                <div className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
                  <span>{category.icon}</span> {category.name}
                </div>
                <div className="flex flex-col gap-2">
                  {category.items.map(item => {
                    const selected = isItemSelected(item.id)
                    const price = getPrice(item.id, item.defaultPrice)
                    const lineTotal = price * item.qty

                    return (
                      <div key={item.id}>
                        <div
                          className="flex cursor-pointer items-center gap-2.5 rounded-lg p-3 transition-all"
                          style={{
                            border: `2px solid ${selected ? theme.primary : theme.gray200}`,
                            background: selected ? theme.primaryBg : theme.white
                          }}
                          onClick={() => toggleEstimateItem(item)}
                        >
                          {/* Checkbox */}
                          <div
                            className="flex size-6 shrink-0 items-center justify-center rounded-md"
                            style={{
                              border: `2px solid ${selected ? theme.primary : theme.gray300}`,
                              background: selected ? theme.primary : theme.white
                            }}
                          >
                            {selected && (
                              <span className="text-sm text-white">✓</span>
                            )}
                          </div>

                          {/* Item Info */}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-gray-900">
                              {item.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.description}
                            </div>
                            <div className="mt-0.5 text-[11px] text-gray-400">
                              {item.qty} {item.unit} × ${price.toFixed(2)}/
                              {item.unit}
                            </div>
                          </div>

                          {/* Price */}
                          <div className="shrink-0 text-right">
                            <div
                              className="text-[15px] font-bold"
                              style={{
                                color: selected ? theme.primary : theme.gray700
                              }}
                            >
                              {formatCurrency(lineTotal)}
                            </div>
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                setShowPriceEditor(
                                  showPriceEditor === item.id ? null : item.id
                                )
                              }}
                              className="cursor-pointer px-1 py-0.5 text-[11px]"
                              style={{
                                color: theme.primary,
                                background: "none",
                                border: "none"
                              }}
                            >
                              Edit Price
                            </button>
                          </div>
                        </div>

                        {/* Price Editor */}
                        {showPriceEditor === item.id && (
                          <div className="mt-3 rounded-lg bg-gray-50 p-3">
                            <div className="mb-2 text-[13px] font-semibold">
                              Custom price for: {item.name}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">$</span>
                              <input
                                type="number"
                                value={getPrice(item.id, item.defaultPrice)}
                                onChange={e =>
                                  setCustomPrices({
                                    ...customPrices,
                                    [item.id]: parseFloat(e.target.value) || 0
                                  })
                                }
                                className="flex-1 rounded-lg p-2.5 text-base outline-none"
                                style={{ border: `1px solid ${theme.gray300}` }}
                              />
                              <span className="text-[13px] text-gray-500">
                                /{item.unit}
                              </span>
                              <button
                                onClick={() => {
                                  const newPrices = { ...customPrices }
                                  delete newPrices[item.id]
                                  setCustomPrices(newPrices)
                                }}
                                className="cursor-pointer rounded-lg px-3 py-2.5 text-xs"
                                style={{
                                  background: theme.gray200,
                                  border: "none"
                                }}
                              >
                                Reset
                              </button>
                              <button
                                onClick={() => setShowPriceEditor(null)}
                                className="cursor-pointer rounded-lg px-3 py-2.5 text-xs text-white"
                                style={{
                                  background: theme.primary,
                                  border: "none"
                                }}
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            <Disclaimer />
          </div>
        )}

        {/* AI CHAT TAB - Already implemented with streaming */}
        {activeTab === "ai" && (
          <div
            className="flex flex-col"
            style={{ height: "calc(100vh - 200px)" }}
          >
            {/* Quick Questions */}
            <div className="mb-3 flex flex-wrap gap-2">
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setChatInput(q)}
                  className="cursor-pointer rounded-2xl px-3 py-2 text-xs"
                  style={{
                    border: `1px solid ${theme.gray200}`,
                    background: theme.white,
                    color: theme.gray700
                  }}
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Chat Messages */}
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto pb-3">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className="flex"
                  style={{
                    justifyContent:
                      msg.role === "user" ? "flex-end" : "flex-start"
                  }}
                >
                  <div
                    className="max-w-[85%] whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed"
                    style={{
                      borderRadius:
                        msg.role === "user"
                          ? "16px 16px 4px 16px"
                          : "16px 16px 16px 4px",
                      background:
                        msg.role === "user" ? theme.primary : theme.gray100,
                      color: msg.role === "user" ? theme.white : theme.gray900
                    }}
                  >
                    {msg.content
                      .split("**")
                      .map((part, j) =>
                        j % 2 === 0 ? part : <strong key={j}>{part}</strong>
                      )}
                  </div>
                </div>
              ))}
              {isLoadingChat && (
                <div className="flex justify-start">
                  <div
                    className="rounded-2xl px-4 py-3 text-sm"
                    style={{ background: theme.gray100, color: theme.gray900 }}
                  >
                    Thinking...
                  </div>
                </div>
              )}
              <Disclaimer />
            </div>

            {/* Input Area */}
            <div
              className="sticky bottom-[70px] flex gap-2 p-3"
              style={{
                background: theme.white,
                borderTop: `1px solid ${theme.gray200}`
              }}
            >
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyPress={e => e.key === "Enter" && handleSendMessage()}
                placeholder="Ask about this roof..."
                className="flex-1 rounded-3xl px-4 py-3 text-[15px] outline-none"
                style={{ border: `1px solid ${theme.gray300}` }}
                disabled={isLoadingChat}
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || isLoadingChat}
                className="flex size-12 cursor-pointer items-center justify-center rounded-full text-lg"
                style={{
                  background:
                    chatInput.trim() && !isLoadingChat
                      ? theme.primary
                      : theme.gray200,
                  color: theme.white,
                  border: "none",
                  cursor:
                    chatInput.trim() && !isLoadingChat ? "pointer" : "default"
                }}
              >
                ↑
              </button>
            </div>
          </div>
        )}

        {/* SOLAR TAB */}
        {activeTab === "solar" && (
          <div>
            {roofData.solar.maxPanels > 0 ? (
              <>
                {/* System Overview */}
                <div
                  className="mb-4 rounded-2xl border bg-white p-5 shadow-sm"
                  style={{ borderColor: theme.gray100 }}
                >
                  <div className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
                    <span>☀️</span> Solar System Potential
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-gray-50 p-3.5">
                      <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
                        Max Panels
                      </div>
                      <div className="text-xl font-bold text-gray-900">
                        {roofData.solar.maxPanels}
                      </div>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3.5">
                      <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
                        System Size
                      </div>
                      <div className="text-xl font-bold text-gray-900">
                        {roofData.solar.systemKw.toFixed(1)}{" "}
                        <span className="text-xs font-medium text-gray-500">
                          kW
                        </span>
                      </div>
                    </div>
                    <div className="col-span-2 rounded-xl bg-gray-50 p-3.5">
                      <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
                        Annual Production
                      </div>
                      <div className="text-xl font-bold text-gray-900">
                        {roofData.solar.annualProduction.toLocaleString()}{" "}
                        <span className="text-xs font-medium text-gray-500">
                          kWh/year
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        ~{roofData.solar.monthlyAverage.toLocaleString()}{" "}
                        kWh/month
                      </div>
                    </div>
                  </div>
                </div>

                {/* ROI Card */}
                <div
                  className="mb-4 rounded-2xl border-2 p-5 shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${theme.accent}15 0%, ${theme.white} 100%)`,
                    borderColor: theme.accent
                  }}
                >
                  <div className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
                    <span>💰</span> Return on Investment
                  </div>
                  <div className="mb-3 text-center">
                    <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
                      Payback Period
                    </div>
                    <div
                      className="text-[32px] font-extrabold"
                      style={{ color: theme.accent }}
                    >
                      {roofData.solar.paybackYears}{" "}
                      <span className="text-lg">years</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-white p-3.5">
                    <div className="mb-2 text-xs text-gray-500">
                      20-Year Savings Timeline
                    </div>
                    <div
                      className="h-2 overflow-hidden rounded-full"
                      style={{ background: theme.gray200 }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          background: theme.accent,
                          width: `${(roofData.solar.paybackYears / 20) * 100}%`
                        }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] text-gray-500">
                      <span>Year 0</span>
                      <span>
                        Break-even: Year {roofData.solar.paybackYears}
                      </span>
                      <span>Year 20</span>
                    </div>
                  </div>
                </div>

                {/* Environmental Impact */}
                <div
                  className="mb-4 rounded-2xl border bg-white p-5 shadow-sm"
                  style={{ borderColor: theme.gray100 }}
                >
                  <div className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
                    <span>🌱</span> Environmental Impact
                  </div>
                  <div className="flex flex-col gap-3">
                    <div
                      className="flex items-center gap-3 rounded-xl p-3"
                      style={{ background: theme.gray50 }}
                    >
                      <span className="text-2xl">🍃</span>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900">
                          CO₂ Offset
                        </div>
                        <div className="text-xs text-gray-500">Per year</div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-gray-900">
                          {Math.round(
                            roofData.solar.co2Offset
                          ).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-gray-500">kg CO₂</div>
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-3 rounded-xl p-3"
                      style={{ background: theme.gray50 }}
                    >
                      <span className="text-2xl">🌳</span>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900">
                          Equivalent Trees
                        </div>
                        <div className="text-xs text-gray-500">
                          Planted per year
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-gray-900">
                          {Math.round(
                            roofData.solar.co2Offset / 22
                          ).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-gray-500">trees</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Best Segments for Solar */}
                <div
                  className="mb-4 rounded-2xl border bg-white p-5 shadow-sm"
                  style={{ borderColor: theme.gray100 }}
                >
                  <div className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
                    <span>⭐</span> Best Segments for Solar
                  </div>
                  <div className="flex flex-col gap-2">
                    {roofData.segments
                      .filter(
                        (seg: any) =>
                          seg.solarQuality === "Excellent" ||
                          seg.solarQuality === "Good"
                      )
                      .slice(0, 3)
                      .map((seg: any) => (
                        <div
                          key={seg.id}
                          className="flex items-center gap-3 rounded-xl p-3"
                          style={{ border: `1px solid ${theme.gray200}` }}
                        >
                          <div
                            className="flex size-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                            style={{ background: seg.color }}
                          >
                            {seg.id}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-900">
                              {seg.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {seg.direction}-facing • {seg.pitch}
                            </div>
                          </div>
                          <span
                            className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                            style={{
                              background:
                                seg.solarQuality === "Excellent"
                                  ? "#DCFCE7"
                                  : theme.primaryBg,
                              color:
                                seg.solarQuality === "Excellent"
                                  ? "#166534"
                                  : theme.primaryDark
                            }}
                          >
                            {seg.solarQuality}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            ) : (
              <div
                className="rounded-2xl border bg-white p-8 text-center shadow-sm"
                style={{ borderColor: theme.gray100 }}
              >
                <div className="mb-4 text-4xl">☀️</div>
                <div className="mb-2 text-lg font-bold text-gray-900">
                  No Solar Data Available
                </div>
                <div className="text-sm text-gray-500">
                  Solar analysis requires roof data from the Solar API
                </div>
              </div>
            )}

            <Disclaimer />
          </div>
        )}

        {/* MATERIALS TAB */}
        {activeTab === "materials" && (
          <div>
            {/* Total Cost Header */}
            <div
              className="mb-4 rounded-2xl border-2 p-5 shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${theme.success}15 0%, ${theme.white} 100%)`,
                borderColor: theme.success
              }}
            >
              <div className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
                <span>📦</span> Materials Cost
              </div>
              <div className="text-center">
                <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
                  Total with {materialWasteFactor}% waste
                </div>
                <div
                  className="text-[32px] font-extrabold"
                  style={{ color: theme.success }}
                >
                  {formatCurrency(totalWithWaste)}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Base: {formatCurrency(totalMaterialCost)} + $
                  {(totalWithWaste - totalMaterialCost).toFixed(0)} waste
                </div>
              </div>
            </div>

            {/* Material Type Presets */}
            <div
              className="mb-4 rounded-2xl border bg-white p-5 shadow-sm"
              style={{ borderColor: theme.gray100 }}
            >
              <div className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
                <span>🏠</span> Material Type
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {materialPresets.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setSelectedMaterialPreset(preset.id)
                      setMaterialPrices({
                        ...materialPrices,
                        shingles: preset.shinglePrice
                      })
                    }}
                    className="cursor-pointer rounded-xl p-3.5 text-left transition-all"
                    style={{
                      border: `2px solid ${selectedMaterialPreset === preset.id ? theme.primary : theme.gray200}`,
                      background:
                        selectedMaterialPreset === preset.id
                          ? theme.primaryBg
                          : theme.white
                    }}
                  >
                    <div className="mb-2 text-2xl">{preset.icon}</div>
                    <div className="mb-0.5 text-sm font-bold text-gray-900">
                      {preset.name}
                    </div>
                    <div className="mb-2 text-[11px] text-gray-500">
                      {preset.description}
                    </div>
                    <div
                      className="text-xs font-semibold"
                      style={{ color: theme.primary }}
                    >
                      ${preset.shinglePrice}/sq
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Waste Factor Slider */}
            <div
              className="mb-4 rounded-2xl border bg-white p-5 shadow-sm"
              style={{ borderColor: theme.gray100 }}
            >
              <div className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
                <span>📐</span> Waste Factor
              </div>
              <div className="mb-3 flex items-center gap-4">
                <input
                  type="range"
                  min="5"
                  max="25"
                  value={materialWasteFactor}
                  onChange={e =>
                    setMaterialWasteFactor(parseInt(e.target.value))
                  }
                  className="flex-1"
                  style={{ accentColor: theme.primary }}
                />
                <div className="w-16 text-right text-2xl font-bold text-gray-900">
                  {materialWasteFactor}%
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>5% (simple roof)</span>
                <span>15% (complex)</span>
                <span>25% (very complex)</span>
              </div>
            </div>

            {/* Materials List */}
            <div
              className="mb-4 rounded-2xl border bg-white p-5 shadow-sm"
              style={{ borderColor: theme.gray100 }}
            >
              <div className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
                <span>📋</span> Materials List
              </div>
              <div className="flex flex-col gap-2">
                {allMaterials.map(mat => {
                  const price =
                    materialPrices[mat.id] !== undefined
                      ? materialPrices[mat.id]
                      : mat.price
                  const qty =
                    materialQuantities[mat.id] !== undefined
                      ? materialQuantities[mat.id]
                      : mat.qty
                  const total = price * qty
                  const isEditing = editingMaterial === mat.id

                  return (
                    <div
                      key={mat.id}
                      className="rounded-xl border p-3"
                      style={{ borderColor: theme.gray200 }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{mat.icon}</span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">
                            {mat.name}
                          </div>
                          {!isEditing ? (
                            <div className="text-xs text-gray-500">
                              {qty} {mat.unit} × ${price.toFixed(2)}/{mat.unit}
                            </div>
                          ) : (
                            <div className="mt-2 flex gap-2">
                              <input
                                type="number"
                                value={qty}
                                onChange={e =>
                                  setMaterialQuantities({
                                    ...materialQuantities,
                                    [mat.id]: parseFloat(e.target.value) || 0
                                  })
                                }
                                className="w-20 rounded px-2 py-1 text-xs outline-none"
                                style={{ border: `1px solid ${theme.gray300}` }}
                                placeholder="Qty"
                              />
                              <input
                                type="number"
                                value={price}
                                onChange={e =>
                                  setMaterialPrices({
                                    ...materialPrices,
                                    [mat.id]: parseFloat(e.target.value) || 0
                                  })
                                }
                                className="flex-1 rounded px-2 py-1 text-xs outline-none"
                                style={{ border: `1px solid ${theme.gray300}` }}
                                placeholder="Price"
                              />
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900">
                            {formatCurrency(total)}
                          </div>
                          {mat.editable && (
                            <button
                              onClick={() =>
                                setEditingMaterial(isEditing ? null : mat.id)
                              }
                              className="cursor-pointer px-1 py-0.5 text-[11px]"
                              style={{
                                color: theme.primary,
                                background: "none",
                                border: "none"
                              }}
                            >
                              {isEditing ? "Done" : "Edit"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Add Custom Material */}
            {!showAddMaterial ? (
              <button
                onClick={() => setShowAddMaterial(true)}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold"
                style={{
                  border: `2px dashed ${theme.gray300}`,
                  background: theme.white,
                  color: theme.gray700
                }}
              >
                <span className="text-lg">+</span> Add Custom Material
              </button>
            ) : (
              <div
                className="rounded-2xl border-2 bg-white p-5 shadow-sm"
                style={{ borderColor: theme.primary }}
              >
                <div className="mb-4 text-base font-bold text-gray-900">
                  Add Custom Material
                </div>
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={newMaterialName}
                    onChange={e => setNewMaterialName(e.target.value)}
                    placeholder="Material name"
                    className="rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={{ border: `1px solid ${theme.gray300}` }}
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={newMaterialQty}
                      onChange={e => setNewMaterialQty(e.target.value)}
                      placeholder="Quantity"
                      className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none"
                      style={{ border: `1px solid ${theme.gray300}` }}
                    />
                    <input
                      type="text"
                      value={newMaterialUnit}
                      onChange={e => setNewMaterialUnit(e.target.value)}
                      placeholder="Unit"
                      className="w-24 rounded-lg px-3 py-2.5 text-sm outline-none"
                      style={{ border: `1px solid ${theme.gray300}` }}
                    />
                  </div>
                  <input
                    type="number"
                    value={newMaterialPrice}
                    onChange={e => setNewMaterialPrice(e.target.value)}
                    placeholder="Price per unit"
                    className="rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={{ border: `1px solid ${theme.gray300}` }}
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => {
                        setShowAddMaterial(false)
                        setNewMaterialName("")
                        setNewMaterialQty("")
                        setNewMaterialUnit("")
                        setNewMaterialPrice("")
                      }}
                      className="flex-1 cursor-pointer rounded-lg px-3 py-2.5 text-sm font-semibold"
                      style={{
                        background: theme.gray100,
                        color: theme.gray700,
                        border: "none"
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (
                          newMaterialName &&
                          newMaterialQty &&
                          newMaterialUnit &&
                          newMaterialPrice
                        ) {
                          const newMat = {
                            id: `custom_${Date.now()}`,
                            name: newMaterialName,
                            icon: "📦",
                            qty: parseFloat(newMaterialQty),
                            unit: newMaterialUnit,
                            price: parseFloat(newMaterialPrice),
                            editable: true,
                            category: "custom"
                          }
                          setCustomMaterials([...customMaterials, newMat])
                          setShowAddMaterial(false)
                          setNewMaterialName("")
                          setNewMaterialQty("")
                          setNewMaterialUnit("")
                          setNewMaterialPrice("")
                          toast.success("Material added!")
                        }
                      }}
                      className="flex-1 cursor-pointer rounded-lg px-3 py-2.5 text-sm font-bold text-white"
                      style={{
                        background: theme.primary,
                        border: "none"
                      }}
                    >
                      Add Material
                    </button>
                  </div>
                </div>
              </div>
            )}

            <Disclaimer />
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-[100] flex justify-around py-2"
        style={{
          background: theme.white,
          borderTop: `1px solid ${theme.gray200}`,
          paddingBottom: "max(8px, env(safe-area-inset-bottom))"
        }}
      >
        {[
          { id: "overview", icon: "📊", label: "Overview" },
          { id: "roof", icon: "🏠", label: "Roof" },
          { id: "estimate", icon: "💰", label: "Estimate" },
          { id: "ai", icon: "🤖", label: "AI" },
          { id: "solar", icon: "☀️", label: "Solar" }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className="flex cursor-pointer flex-col items-center gap-1 px-4 py-2 transition-all"
            style={{
              background: "transparent",
              border: "none",
              color: activeTab === item.id ? theme.primary : theme.gray500
            }}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-[10px] font-semibold">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export default PropertyReportViewer
