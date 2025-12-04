/**
 * Google Solar API Data Extractor
 * Extracts accurate roof measurements from Google Solar API response
 * to use as ground truth instead of LLM visual estimates
 */

export interface SolarRoofMetrics {
  // Building dimensions
  buildingArea: number // sq meters
  buildingAreaSqFt: number // sq feet

  // Roof data
  roofSegmentCount: number // Number of individual roof segments/facets
  totalRoofArea: number // sq meters
  totalRoofAreaSqFt: number // sq feet
  roofingSquares: number // For contractor estimates

  // Individual segments
  segments: Array<{
    pitchDegrees: number
    pitchRatio: string // e.g., "6/12"
    azimuthDegrees: number
    areaSqMeters: number
    areaSqFt: number
  }>

  // Aggregated pitch info
  predominantPitch: string // Most common pitch ratio
  pitchCategories: {
    flat: number // count
    low: number // 3/12 - 5/12
    medium: number // 6/12 - 8/12
    steep: number // 9/12+
  }

  // Quality indicators
  dataQuality: "HIGH" | "MEDIUM" | "LOW"
  imageryDate: string
  imageryQuality: string
}

/**
 * Extract roof metrics from Google Solar API response
 */
export function extractSolarRoofMetrics(
  solarData: any
): SolarRoofMetrics | null {
  try {
    if (!solarData || !solarData.solarPotential) {
      console.warn("No solar potential data available")
      return null
    }

    const potential = solarData.solarPotential
    const roofSegments = potential.roofSegmentStats || []

    // Extract building area
    const buildingArea = potential.wholeRoofStats?.areaMeters2 || 0
    const buildingAreaSqFt = buildingArea * 10.7639 // Convert m² to ft²

    // Count actual roof segments
    const roofSegmentCount = roofSegments.length

    // Calculate total roof area from segments
    let totalRoofArea = 0
    const segments: any[] = []
    const pitchCounts = { flat: 0, low: 0, medium: 0, steep: 0 }

    roofSegments.forEach((segment: any) => {
      const areaSqMeters = segment.stats?.areaMeters2 || 0
      const areaSqFt = areaSqMeters * 10.7639
      const pitchDegrees = segment.pitchDegrees || 0
      const azimuthDegrees = segment.azimuthDegrees || 0

      totalRoofArea += areaSqMeters

      // Convert pitch degrees to ratio (e.g., 26.57° ≈ 6/12)
      // Formula: rise/run = tan(angle), for 12" run: rise = 12 * tan(angle)
      const pitchRise = Math.round(
        12 * Math.tan((pitchDegrees * Math.PI) / 180)
      )
      const pitchRatio = `${pitchRise}/12`

      // Categorize pitch
      if (pitchRise <= 2) pitchCounts.flat++
      else if (pitchRise <= 5) pitchCounts.low++
      else if (pitchRise <= 8) pitchCounts.medium++
      else pitchCounts.steep++

      segments.push({
        pitchDegrees,
        pitchRatio,
        azimuthDegrees,
        areaSqMeters,
        areaSqFt: Math.round(areaSqFt)
      })
    })

    const totalRoofAreaSqFt = totalRoofArea * 10.7639
    const roofingSquares = Math.ceil(totalRoofAreaSqFt / 100)

    // Determine predominant pitch (most common category)
    let predominantPitch = "6/12" // default
    const maxCount = Math.max(
      pitchCounts.flat,
      pitchCounts.low,
      pitchCounts.medium,
      pitchCounts.steep
    )
    if (pitchCounts.flat === maxCount) predominantPitch = "2/12"
    else if (pitchCounts.low === maxCount) predominantPitch = "4/12"
    else if (pitchCounts.medium === maxCount) predominantPitch = "7/12"
    else if (pitchCounts.steep === maxCount) predominantPitch = "10/12"

    // Extract quality indicators
    const dataQuality = solarData.imageryQuality?.value || "MEDIUM"
    const imageryDate = solarData.imageryDate?.year
      ? `${solarData.imageryDate.year}-${String(solarData.imageryDate.month || 1).padStart(2, "0")}-${String(solarData.imageryDate.day || 1).padStart(2, "0")}`
      : "Unknown"

    return {
      buildingArea,
      buildingAreaSqFt: Math.round(buildingAreaSqFt),
      roofSegmentCount,
      totalRoofArea,
      totalRoofAreaSqFt: Math.round(totalRoofAreaSqFt),
      roofingSquares,
      segments,
      predominantPitch,
      pitchCategories: pitchCounts,
      dataQuality: dataQuality as any,
      imageryDate,
      imageryQuality: solarData.imageryQuality?.description || "Unknown"
    }
  } catch (error) {
    console.error("Error extracting solar roof metrics:", error)
    return null
  }
}

/**
 * Generate property size estimate from Solar API data for zoom calculation
 */
export function estimatePropertySizeFromSolar(solarMetrics: SolarRoofMetrics): {
  widthMeters: number
  heightMeters: number
} {
  // Use building area to estimate dimensions
  // Assume roughly square building for simplicity
  const sideLengthMeters = Math.sqrt(solarMetrics.buildingArea)

  return {
    widthMeters: Math.ceil(sideLengthMeters * 1.2), // Add 20% buffer for property bounds
    heightMeters: Math.ceil(sideLengthMeters * 1.2)
  }
}

/**
 * Format roof metrics for display in report
 */
export function formatRoofMetricsForReport(metrics: SolarRoofMetrics): {
  area: number
  facetCount: number
  pitch: string
  squares: number
  complexity: string
} {
  // Determine complexity based on segment count
  let complexity = "simple"
  if (metrics.roofSegmentCount >= 15) complexity = "complex"
  else if (metrics.roofSegmentCount >= 8) complexity = "moderate"

  return {
    area: metrics.totalRoofAreaSqFt,
    facetCount: metrics.roofSegmentCount,
    pitch: metrics.predominantPitch,
    squares: metrics.roofingSquares,
    complexity
  }
}
