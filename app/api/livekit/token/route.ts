import { AccessToken } from "livekit-server-sdk"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const roomName = searchParams.get("roomName") || `voice-room-${Date.now()}`
    const participantName =
      searchParams.get("participantName") || `user-${Date.now()}`

    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      return NextResponse.json(
        { error: "LiveKit credentials not configured" },
        { status: 500 }
      )
    }

    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: participantName,
        ttl: "10h"
      }
    )

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true
    })

    const token = await at.toJwt()

    return NextResponse.json({
      token,
      url: process.env.LIVEKIT_URL,
      roomName,
      participantName
    })
  } catch (error: any) {
    console.error("Error generating LiveKit token:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate token" },
      { status: 500 }
    )
  }
}
