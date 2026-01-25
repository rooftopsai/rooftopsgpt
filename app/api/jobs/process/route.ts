// app/api/jobs/process/route.ts
// Endpoint to process background jobs
// This can be called by a cron job (Vercel, Railway, etc.)

import { NextResponse } from "next/server"
import { runJobProcessor } from "@/lib/jobs/processor"

// Verify the request is from a trusted source
function verifyRequest(request: Request): boolean {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  // If no secret is set, allow in development
  if (!cronSecret && process.env.NODE_ENV === "development") {
    return true
  }

  // Check authorization header
  if (authHeader === `Bearer ${cronSecret}`) {
    return true
  }

  // Check for Vercel Cron header
  const vercelCronHeader = request.headers.get("x-vercel-cron")
  if (vercelCronHeader && process.env.VERCEL) {
    return true
  }

  return false
}

export async function POST(request: Request) {
  // Verify the request
  if (!verifyRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await runJobProcessor()

    return NextResponse.json({
      success: true,
      processed: result.processed,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("Job processor error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

// GET endpoint for health checks
export async function GET(request: Request) {
  return NextResponse.json({
    status: "ok",
    service: "job-processor",
    timestamp: new Date().toISOString()
  })
}
