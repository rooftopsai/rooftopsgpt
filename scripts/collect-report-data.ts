// Script to collect all data used in property report generation
// Usage: npx tsx scripts/collect-report-data.ts

import * as fs from 'fs'
import * as path from 'path'

const TEST_ADDRESS = '9222 Wheatland Drive Germantown, TN 38139'

interface ReportData {
  metadata: {
    address: string
    timestamp: string
    mode: string
  }
  geocoding: {
    coordinates: { lat: number; lng: number }
    formattedAddress: string
  }
  solarApiData: any
  screenshots: {
    count: number
    angles: string[]
    descriptions: string[]
  }
  agentAnalysis?: {
    measurementSpecialist: any
    conditionInspector: any
    costEstimator: any
    qualityController: any
  }
  finalReport: any
}

async function geocodeAddress(address: string) {
  console.log('Step 1: Geocoding address...')
  const apiKey = process.env.GOOGLEMAPS_API_KEY
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`

  const response = await fetch(url)
  const data = await response.json()

  if (data.status === 'OK') {
    const result = data.results[0]
    return {
      coordinates: result.geometry.location,
      formattedAddress: result.formatted_address,
      rawResponse: data
    }
  }

  throw new Error(`Geocoding failed: ${data.status}`)
}

async function fetchSolarData(lat: number, lng: number) {
  console.log('Step 2: Fetching Google Solar API data via local proxy...')
  const url = `http://localhost:3000/api/solar`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ lat, lng })
  })

  const data = await response.json()

  if (response.ok) {
    return data
  }

  throw new Error(`Solar API failed: ${JSON.stringify(data)}`)
}

async function main() {
  try {
    // Use known coordinates for the test address
    const coordinates = { lat: 35.09263, lng: -89.75443 }

    const reportData: ReportData = {
      metadata: {
        address: TEST_ADDRESS,
        timestamp: new Date().toISOString(),
        mode: 'agent'
      },
      geocoding: {
        coordinates,
        formattedAddress: TEST_ADDRESS
      },
      solarApiData: {},
      screenshots: {
        count: 0,
        angles: [],
        descriptions: []
      },
      finalReport: {}
    }

    console.log('Step 1: Using coordinates for address')
    console.log(`✓ Address: ${TEST_ADDRESS}`)
    console.log(`✓ Coordinates: ${coordinates.lat}, ${coordinates.lng}`)

    // Step 2: Fetch Solar API data
    const solarData = await fetchSolarData(
      coordinates.lat,
      coordinates.lng
    )
    reportData.solarApiData = solarData
    console.log(`✓ Solar API data retrieved`)

    // Extract key metrics from solar data
    const solarPotential = solarData.solarPotential || {}
    console.log(`  - Max panels: ${solarPotential.maxArrayPanelsCount || 0}`)
    console.log(`  - Sunshine hours/year: ${solarPotential.maxSunshineHoursPerYear || 0}`)

    // Step 3: Note about screenshots (can't actually capture in Node.js)
    reportData.screenshots = {
      count: 6,
      angles: [
        'North (0°)',
        'Northeast (45°)',
        'East (90°)',
        'Southeast (135°)',
        'South (180°)',
        'Southwest (225°)'
      ],
      descriptions: [
        'Overhead view from north',
        'Overhead view from northeast',
        'Overhead view from east',
        'Overhead view from southeast',
        'Overhead view from south',
        'Overhead view from southwest'
      ]
    }
    console.log('✓ Screenshots info (normally captured from Google Maps)')

    // Step 4: Simulate agent analysis structure (would normally come from LLM agents)
    reportData.agentAnalysis = {
      measurementSpecialist: {
        role: 'Measurement Specialist',
        task: 'Analyze roof dimensions and geometry',
        expectedOutput: {
          facetCount: 'number of roof facets',
          totalArea: 'total roof area in sq ft',
          predominantPitch: 'roof pitch in X:12 format',
          roofingSquares: 'number of roofing squares',
          complexity: 'simple | moderate | complex',
          segments: 'array of individual roof segment details'
        }
      },
      conditionInspector: {
        role: 'Condition Inspector',
        task: 'Assess roof condition and identify material',
        expectedOutput: {
          material: 'asphalt_shingles | metal | tile | etc',
          condition: 'excellent | good | fair | poor',
          estimatedAge: 'years',
          remainingLife: 'years',
          visibleIssues: 'array of identified issues',
          recommendations: 'maintenance or replacement advice'
        }
      },
      costEstimator: {
        role: 'Cost Estimator',
        task: 'Calculate replacement costs',
        expectedOutput: {
          materialCost: 'estimated material cost',
          laborCost: 'estimated labor cost',
          totalCost: 'total replacement cost',
          costPerSquare: 'cost per roofing square',
          costRange: 'min-max cost range'
        }
      },
      qualityController: {
        role: 'Quality Controller',
        task: 'Validate all agent outputs',
        expectedOutput: {
          overallConfidence: 'high | medium | low',
          qualityScore: 'score out of 100',
          validationIssues: 'array of identified issues',
          recommendations: 'suggestions for improvement'
        }
      }
    }
    console.log('✓ Agent analysis structure documented')

    // Step 5: Note about final report generation
    reportData.finalReport = {
      note: 'Final report is generated by combining all above data',
      structure: {
        userSummary: 'Brief summary for homeowner',
        executiveSummary: 'Detailed executive summary',
        structuredData: {
          measurements: 'From measurement specialist',
          condition: 'From condition inspector',
          costs: 'From cost estimator',
          confidence: 'From quality controller'
        },
        solarMetrics: 'Extracted from Solar API',
        solarPotential: 'Solar installation potential',
        financials: 'Solar financial analysis (if applicable)'
      }
    }

    // Save all collected data to a file
    const outputPath = path.join(process.cwd(), 'scripts', 'report-data-output.json')
    fs.writeFileSync(outputPath, JSON.stringify(reportData, null, 2))

    console.log('\n✅ All data collected and saved to: scripts/report-data-output.json')
    console.log('\nData includes:')
    console.log('  - Address geocoding')
    console.log('  - Google Solar API response')
    console.log('  - Screenshot metadata')
    console.log('  - Agent analysis structure')
    console.log('  - Final report structure')

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
