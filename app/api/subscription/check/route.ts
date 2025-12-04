import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
  getUserSubscriptionStatus,
  checkUserFeatureAccess,
  getAllowedModels
} from "@/lib/subscription-helpers"

// GET - Check user's subscription status and feature access
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Get subscription status
    const subscriptionStatus = await getUserSubscriptionStatus(user.id)

    // Get property reports feature access
    const propertyReportsAccess = await checkUserFeatureAccess(
      user.id,
      "property_reports"
    )

    // Get allowed models for this plan
    const allowedModels = getAllowedModels(subscriptionStatus.planType)

    return NextResponse.json({
      planType: subscriptionStatus.planType,
      isActive: subscriptionStatus.isActive,
      allowedModels,
      propertyReports: {
        canUse: propertyReportsAccess.canUse,
        currentUsage: propertyReportsAccess.currentUsage,
        limit: propertyReportsAccess.limit,
        remainingUsage: propertyReportsAccess.remainingUsage
      }
    })
  } catch (error: any) {
    console.error("Error checking subscription:", error)
    return new NextResponse(error.message, { status: 500 })
  }
}
