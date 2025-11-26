// app/api/chat/extract-location.ts

import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Helper function to clean and format the location
const cleanAndFormatLocation = (rawLocation: string): string => {
  if (!rawLocation) return ""

  // First check if it's a ZIP code
  const zipCodeMatch = rawLocation.match(/\b\d{5}(-\d{4})?\b/)
  if (zipCodeMatch) {
    // If it's a ZIP code, return just the ZIP code
    return zipCodeMatch[0]
  }

  // Clean but preserve state/province/country info
  // This is critical to make "cordova, tn" work correctly
  const cleaned = rawLocation
    .trim()
    // Remove any leading or trailing punctuation
    .replace(/^[\s,.;:]+|[\s,.;:]+$/g, "")
    // Remove any "weather in" or similar prefix
    .replace(/^(?:weather|forecast|conditions)\s+(?:in|at|for|of)\s+/i, "")
    .replace(
      /^(?:what'?s?|how'?s?|is|are)\s+the\s+weather\s+(?:in|at|for|of)\s+/i,
      ""
    )
    .trim()

  // Make sure we keep essential components like state/country codes
  // For US locations, preserve patterns like "City, ST" or "City, State"
  const cityStateMatch = cleaned.match(/^(.+?),\s*([A-Za-z]{2})$/i)
  if (cityStateMatch) {
    // Properly format city, state
    return `${cityStateMatch[1].trim()}, ${cityStateMatch[2].toUpperCase()}`
  }

  return cleaned
}

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json()

    if (!input) {
      return NextResponse.json(
        { error: "Missing input parameter" },
        { status: 400 }
      )
    }

    // First check for ZIP codes - highest priority and precision
    const zipMatch = input.match(/\b(\d{5}(?:-\d{4})?)\b/)
    if (zipMatch && zipMatch[1]) {
      // Verify it's likely a US ZIP code (basic validation)
      const zipNum = parseInt(zipMatch[1].substring(0, 5), 10)
      if (zipNum >= 501 && zipNum <= 99950) {
        return NextResponse.json({ location: zipMatch[1] })
      }
    }

    // Next check for explicit formats like "City, ST"
    const cityStateMatch = input.match(
      /\b([A-Za-z][A-Za-z\s,.'-]+),\s*([A-Z]{2})\b/
    )
    if (cityStateMatch) {
      const formattedLocation = `${cityStateMatch[1].trim()}, ${cityStateMatch[2]}`
      return NextResponse.json({ location: formattedLocation })
    }

    // If no quick matches, use AI for extraction
    const systemPrompt = `You are a location extraction assistant. Extract ONLY the location (city, state, ZIP code) from weather-related queries.
If it contains a full address, extract JUST the city, state, or ZIP code.
Return ONLY the extracted location as plain text - no explanations, no JSON formatting, just the location.
IMPORTANT: Always include state abbreviations like "TN" if present (e.g., "Cordova, TN" not just "Cordova").
If no location is found, respond with "LOCATION_NOT_FOUND".`

    const userPrompt = `Extract the location from this weather query: "${input}"`

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 30
    })

    // Get the extracted location
    let location = completion.choices[0].message.content?.trim()

    // Return error if location not found
    if (!location || location === "LOCATION_NOT_FOUND") {
      return NextResponse.json(
        { error: "Location not found in query" },
        { status: 404 }
      )
    }

    // Process and clean the location
    location = cleanAndFormatLocation(location)

    // Return the extracted location
    return NextResponse.json({ location })
  } catch (error: any) {
    console.error("Error in LLM location extraction:", error)
    return NextResponse.json(
      {
        error: "Failed to extract location",
        details: error.message
      },
      { status: 500 }
    )
  }
}
