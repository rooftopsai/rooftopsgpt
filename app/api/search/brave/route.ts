import { NextRequest, NextResponse } from "next/server"

// Use Node.js runtime instead of Edge for better compatibility with external APIs
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { query, count = 10 } = await request.json()

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    const braveApiKey = process.env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_AI_API_KEY

    if (!braveApiKey) {
      console.error("Brave API key not found in environment")
      return NextResponse.json(
        { error: "Brave Search API key not configured" },
        { status: 500 }
      )
    }

    console.log("Brave API key found, length:", braveApiKey.length)

    // Call Brave Search API without timeout
    console.log("Calling Brave Search API for query:", query)
    console.log("API URL:", `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`)
    const startTime = Date.now()

    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`,
      {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": braveApiKey
        }
      }
    )

    const elapsed = Date.now() - startTime
    console.log(`Brave API response received after ${elapsed}ms, status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Brave Search API error:", errorText)
      return NextResponse.json(
        { error: "Brave Search API request failed" },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Transform results to a simpler format
    const results = data.web?.results?.map((result: any) => ({
      title: result.title,
      description: result.description,
      url: result.url,
      age: result.age,
      extra_snippets: result.extra_snippets
    })) || []

    return NextResponse.json({
      success: true,
      results,
      count: results.length
    })
  } catch (error: any) {
    console.error("Error in Brave search:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
