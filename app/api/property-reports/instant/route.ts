// @ts-nocheck
// Instant Mode Property Report
// Generates rapid property reports using only Google Solar API data
// No AI agents - just direct Solar API metrics with formatted output

import { NextRequest, NextResponse } from "next/server"
import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { extractSolarRoofMetrics } from "@/lib/solar-data-extractor"

export const maxDuration = 30 // 30 seconds max for instant reports

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Authentication
    const profile = await getServerProfile()
    if (!profile?.user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { solarData, address, location } = body

    if (!solarData) {
      return NextResponse.json(
        { error: "Solar API data is required for instant reports" },
        { status: 400 }
      )
    }

    console.log(`[Instant Mode] Generating instant report for ${address}`)

    // Extract metrics from Solar API
    const solarMetrics = extractSolarRoofMetrics(solarData)

    if (!solarMetrics) {
      return NextResponse.json(
        { error: "Failed to extract roof metrics from Solar API data" },
        { status: 400 }
      )
    }

    // Format pitch for display
    const pitch = solarMetrics.predominantPitch

    // Determine complexity
    let complexity = "Simple"
    if (solarMetrics.roofSegmentCount >= 15) complexity = "Complex"
    else if (solarMetrics.roofSegmentCount >= 8) complexity = "Moderate"

    // Generate user-friendly summary
    const userSummary = `This property has a ${complexity.toLowerCase()} roof with approximately ${Math.round(solarMetrics.totalRoofAreaSqFt)} square feet (${solarMetrics.roofingSquares} squares) across ${solarMetrics.roofSegmentCount} roof sections. The predominant pitch is ${pitch}. This instant analysis is based on Google Solar API satellite data and provides quick measurements for initial estimates.`

    // Generate executive summary
    const executiveSummary = `
INSTANT PROPERTY ANALYSIS
Based on Google Solar API Satellite Imagery
${address || "Property Location"}

Quick Overview:
This instant analysis provides rapid roof measurements extracted directly from Google's Solar API satellite data. While this provides useful preliminary information, it has limitations compared to our full AI-powered Agent Mode analysis.

Key Measurements:
• Total Roof Area: ${Math.round(solarMetrics.totalRoofAreaSqFt)} sq ft
• Roofing Squares: ${solarMetrics.roofingSquares} squares
• Roof Sections: ${solarMetrics.roofSegmentCount} facets
• Predominant Pitch: ${pitch}
• Complexity: ${complexity}

What This Analysis Includes:
✓ Accurate roof area measurements from satellite data
✓ Roof section/facet count
✓ Pitch estimation across roof sections
✓ Building footprint dimensions

What This Analysis Does NOT Include:
✗ Roof condition assessment (age, wear, damage)
✗ Material identification (shingle type, metal, tile, etc.)
✗ Detailed cost estimates with labor and materials
✗ Quality validation and confidence scores
✗ Professional recommendations and timeline

For comprehensive analysis including condition assessment, material identification, and accurate cost estimates, upgrade to Premium or Business for access to our AI-powered Agent Mode.
`.trim()

    // Build detailed analysis (minimal text - UI displays data in cards)
    const detailedAnalysis = `
INSTANT MODE PROPERTY REPORT
Generated: ${new Date().toLocaleString()}
Data Source: Google Solar API (Satellite Imagery)
Imagery Date: ${solarMetrics.imageryDate}
Imagery Quality: ${solarMetrics.imageryQuality}

All measurements and details are displayed in card format above.

Note: This instant analysis is based on Google Solar API satellite data. Measurements are estimates and should be verified on-site. For comprehensive condition assessment, material identification, and accurate cost estimates, upgrade to Agent Mode (Premium/Business subscribers).
`.trim()

    // Extract solar potential data
    const solarPotential = solarData.solarPotential || {}
    const maxPanelsCount = solarPotential.maxArrayPanelsCount || 0
    const yearlyEnergyDcKwh = solarPotential.maxArrayAreaMeters2
      ? (solarPotential.maxArrayAreaMeters2 * 160 * 0.2) / 1000 // Rough estimate: 160W/m² * 20% efficiency
      : 0
    const maxSunshineHours = solarPotential.maxSunshineHoursPerYear || 0
    const panelCapacityWatts = solarPotential.panelCapacityWatts || 400

    // Compile final instant report
    const instantReport = {
      success: true,
      instantMode: true,
      model: "Google Solar API",

      // User-facing summary
      userSummary,
      executiveSummary,

      // Structured data for report display
      structuredData: {
        // Measurements
        facetCount: solarMetrics.roofSegmentCount,
        roofArea: Math.round(solarMetrics.totalRoofAreaSqFt),
        roofAreaRange: [
          Math.round(solarMetrics.totalRoofAreaSqFt * 0.95),
          Math.round(solarMetrics.totalRoofAreaSqFt * 1.05)
        ],
        squares: solarMetrics.roofingSquares,
        pitch,
        ridgeLength: null, // Not available in instant mode
        valleyLength: null, // Not available in instant mode
        complexity: complexity.toLowerCase(),
        groundArea: Math.round(solarMetrics.buildingAreaSqFt), // Building footprint

        // Not available in instant mode
        material: "Not available in Instant Mode",
        condition: "Not available in Instant Mode",
        estimatedAge: null,
        remainingLife: null,
        costEstimate: null,
        propertyType: "Unknown", // Not available from Solar API
        yearBuilt: "Unknown", // Not available from Solar API

        // Confidence indicators
        confidence: "Medium - Based on satellite data only",
        measurementConfidence: "High - Direct satellite measurements",
        conditionConfidence: "N/A - Upgrade to Agent Mode",
        costConfidence: "N/A - Upgrade to Agent Mode",

        // Detailed analysis
        detailedAnalysis,

        // Roof segments for detailed display
        segments: solarMetrics.segments
      },

      // Solar metrics for reference
      solarMetrics,

      // Solar potential data
      solar: {
        potential: {
          maxPanels: maxPanelsCount,
          yearlyEnergy: Math.round(yearlyEnergyDcKwh),
          sunshineHours: Math.round(maxSunshineHours),
          panelCapacityWatts,
          maxArrayAreaMeters2: solarPotential.maxArrayAreaMeters2 || 0,
          suitabilityScore: maxPanelsCount > 0 ? "Available" : "Limited"
        },
        financials: null // Not calculated in instant mode
      },

      // Metadata
      metadata: {
        timestamp: new Date().toISOString(),
        address,
        location,
        mode: "instant",
        imageryDate: solarMetrics.imageryDate,
        imageryQuality: solarMetrics.imageryQuality,
        dataSource: "Google Solar API",
        processingTime: Date.now() - startTime,
        upgradePrompt:
          "Upgrade to Premium or Business for Agent Mode with full analysis"
      }
    }

    console.log(
      `[Instant Mode] Report generated successfully in ${Date.now() - startTime}ms`
    )

    return NextResponse.json(instantReport)
  } catch (error) {
    console.error("[Instant Mode] Error generating report:", error)
    return NextResponse.json(
      {
        error: "Instant report generation failed",
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Helper function to convert azimuth degrees to cardinal direction
function getCardinalDirection(azimuth: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
  const index = Math.round(azimuth / 45) % 8
  return directions[index]
}
