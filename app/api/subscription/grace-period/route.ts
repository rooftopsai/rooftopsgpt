import { createClient } from "@/lib/supabase/server"
import { getGracePeriodInfo } from "@/lib/entitlements"
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

    const gracePeriod = await getGracePeriodInfo(user.id)

    return NextResponse.json({ gracePeriod })
  } catch (error) {
    console.error("Error fetching grace period:", error)
    return NextResponse.json(
      { error: "Failed to fetch grace period info" },
      { status: 500 }
    )
  }
}
