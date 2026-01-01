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

    // Build detailed analysis
    const detailedAnalysis = `
═══════════════════════════════════════════════════════════════════
INSTANT MODE PROPERTY REPORT
═══════════════════════════════════════════════════════════════════

Property Address: ${address || "Unknown"}
Report Generated: ${new Date().toLocaleString()}
Data Source: Google Solar API (Satellite Imagery)
Imagery Date: ${solarMetrics.imageryDate}
Imagery Quality: ${solarMetrics.imageryQuality}

═══════════════════════════════════════════════════════════════════
📐 ROOF MEASUREMENTS
═══════════════════════════════════════════════════════════════════

Total Roof Area: ${Math.round(solarMetrics.totalRoofAreaSqFt)} sq ft (${Math.round(solarMetrics.totalRoofArea)} sq meters)
Roofing Squares: ${solarMetrics.roofingSquares} squares (100 sq ft per square)
Building Footprint: ${Math.round(solarMetrics.buildingAreaSqFt)} sq ft

Number of Roof Sections: ${solarMetrics.roofSegmentCount} facets
Predominant Pitch: ${pitch}
Complexity Rating: ${complexity}

Pitch Distribution:
• Flat (0-2/12): ${solarMetrics.pitchCategories.flat} sections
• Low (3-5/12): ${solarMetrics.pitchCategories.low} sections
• Medium (6-8/12): ${solarMetrics.pitchCategories.medium} sections
• Steep (9+/12): ${solarMetrics.pitchCategories.steep} sections

═══════════════════════════════════════════════════════════════════
📊 DETAILED ROOF SECTIONS
═══════════════════════════════════════════════════════════════════

${solarMetrics.segments
  .map(
    (segment, idx) => `
Section ${idx + 1}:
  • Area: ${segment.areaSqFt} sq ft (${segment.areaSqMeters.toFixed(1)} sq meters)
  • Pitch: ${segment.pitchRatio} (${segment.pitchDegrees.toFixed(1)}°)
  • Orientation: ${segment.azimuthDegrees}° (${getCardinalDirection(segment.azimuthDegrees)})`
  )
  .join("\n")}

═══════════════════════════════════════════════════════════════════
⚠️ INSTANT MODE LIMITATIONS
═══════════════════════════════════════════════════════════════════

This Instant Mode report provides quick measurements but has significant limitations:

WHAT'S INCLUDED:
✓ Roof area measurements (from satellite data)
✓ Section/facet count and distribution
✓ Pitch angles across roof sections
✓ Building dimensions

WHAT'S MISSING (Available in Agent Mode):
✗ Roof Condition Assessment
   - Current age estimation
   - Wear and damage analysis
   - Remaining lifespan
   - Urgency recommendations

✗ Material Identification
   - Shingle type and quality
   - Material condition
   - Warranty information

✗ Cost Estimation
   - Accurate replacement costs
   - Material options and pricing
   - Labor estimates
   - Regional cost adjustments

✗ Quality Validation
   - Multi-agent verification
   - Confidence scores
   - Professional validation
   - Detailed recommendations

═══════════════════════════════════════════════════════════════════
🎯 UPGRADE TO AGENT MODE
═══════════════════════════════════════════════════════════════════

For comprehensive property analysis, upgrade to Premium or Business to unlock Agent Mode, which includes:

• 4 AI Specialist Agents working together
• Detailed condition assessment and material identification
• Accurate cost estimates with multiple material options
• Professional recommendations and timeline guidance
• Quality validation with confidence scoring
• Much higher accuracy on measurements and analysis

Agent Mode uses advanced AI to analyze your property like a team of professional roofers, providing the most accurate and comprehensive analysis available.

═══════════════════════════════════════════════════════════════════
📋 DISCLAIMERS
═══════════════════════════════════════════════════════════════════

• This instant analysis is based solely on Google Solar API satellite data
• Measurements are estimates and should be verified on-site
• No on-ground inspection has been performed
• Roof condition, material type, and damage cannot be assessed from this data
• Cost estimates require Agent Mode analysis with detailed condition assessment
• This report should be used for preliminary planning only
• Always obtain professional inspection before making final decisions
• Imagery date: ${solarMetrics.imageryDate} - property may have changed since then

═══════════════════════════════════════════════════════════════════

Report generated in ${Date.now() - startTime}ms using Instant Mode
For comprehensive analysis, switch to Agent Mode (Premium/Business subscribers)
`.trim()

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

        // Not available in instant mode
        material: "Not available in Instant Mode",
        condition: "Not available in Instant Mode",
        estimatedAge: null,
        remainingLife: null,
        costEstimate: null,

        // Confidence indicators
        confidence: "Medium - Based on satellite data only",
        measurementConfidence: "High - Direct satellite measurements",
        conditionConfidence: "N/A - Upgrade to Agent Mode",
        costConfidence: "N/A - Upgrade to Agent Mode",

        // Detailed analysis
        detailedAnalysis
      },

      // Solar metrics for reference
      solarMetrics,

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
