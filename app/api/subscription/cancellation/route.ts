import { createClient } from "@/lib/supabase/server"
import { getCancellationInfo } from "@/lib/entitlements"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createClient()
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const cancellation = await getCancellationInfo(user.id)

    return NextResponse.json({ cancellation })
  } catch (error) {
    console.error("Error fetching cancellation info:", error)
    return NextResponse.json(
      { error: "Failed to fetch cancellation info" },
      { status: 500 }
    )
  }
}
