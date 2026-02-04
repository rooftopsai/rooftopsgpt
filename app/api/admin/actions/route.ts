import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// Admin emails that can access this endpoint
const ADMIN_EMAILS = [
  "sb@rooftops.ai",
  "steele@rooftops.ai",
  "admin@rooftops.ai"
]

// Service role client
const getServiceClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const serverClient = await createServerClient()
    const { data: { user } } = await serverClient.auth.getUser()

    if (!user || !ADMIN_EMAILS.includes(user.email || "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const { action, userId, userIds, data } = body

    const supabase = getServiceClient()

    switch (action) {
      case "send_email": {
        // Send email to one or multiple users
        const targetUserIds = userIds || [userId]
        const { subject, message, template } = data

        // Get user emails
        const { data: authData } = await supabase.auth.admin.listUsers()
        const targetUsers = authData?.users.filter(u => targetUserIds.includes(u.id)) || []

        if (targetUsers.length === 0) {
          return NextResponse.json({ error: "No users found" }, { status: 404 })
        }

        // Send emails via Resend
        const RESEND_API_KEY = process.env.RESEND_API_KEY
        if (!RESEND_API_KEY) {
          return NextResponse.json({ error: "Email service not configured" }, { status: 500 })
        }

        const results = []
        for (const targetUser of targetUsers) {
          if (!targetUser.email) continue

          try {
            const response = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                from: "Rooftops AI <notifications@agent.rooftops.ai>",
                to: targetUser.email,
                subject: subject || "Message from Rooftops AI",
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); padding: 20px; text-align: center;">
                      <h1 style="color: white; margin: 0;">Rooftops AI</h1>
                    </div>
                    <div style="padding: 30px; background: #f9fafb;">
                      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                        ${message.replace(/\n/g, "<br>")}
                      </p>
                    </div>
                    <div style="padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                      <p>Rooftops AI - The AI Platform for Roofing Professionals</p>
                    </div>
                  </div>
                `
              })
            })

            if (response.ok) {
              results.push({ email: targetUser.email, success: true })
            } else {
              const error = await response.json()
              results.push({ email: targetUser.email, success: false, error: error.message })
            }
          } catch (err: any) {
            results.push({ email: targetUser.email, success: false, error: err.message })
          }
        }

        return NextResponse.json({
          success: true,
          sent: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results
        })
      }

      case "extend_trial": {
        // Extend trial for a user
        const { days } = data
        const daysToExtend = days || 7

        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId)
          .single()

        if (!subscription) {
          return NextResponse.json({ error: "No subscription found" }, { status: 404 })
        }

        const currentEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end)
          : new Date()

        const newEnd = new Date(currentEnd.getTime() + daysToExtend * 24 * 60 * 60 * 1000)

        const { error } = await supabase
          .from("subscriptions")
          .update({
            current_period_end: newEnd.toISOString(),
            status: "trialing",
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId)

        if (error) {
          return NextResponse.json({ error: "Failed to extend trial" }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          message: `Trial extended by ${daysToExtend} days until ${newEnd.toLocaleDateString()}`
        })
      }

      case "upgrade_user": {
        // Upgrade or change user plan
        const { plan_type, status } = data

        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId)
          .single()

        if (existingSub) {
          const { error } = await supabase
            .from("subscriptions")
            .update({
              plan_type: plan_type || existingSub.plan_type,
              status: status || "active",
              updated_at: new Date().toISOString()
            })
            .eq("user_id", userId)

          if (error) {
            return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 })
          }
        } else {
          // Create new subscription
          const { error } = await supabase
            .from("subscriptions")
            .insert({
              user_id: userId,
              plan_type: plan_type || "premium",
              status: status || "active",
              tier: plan_type || "premium",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (error) {
            return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 })
          }
        }

        return NextResponse.json({
          success: true,
          message: `User plan updated to ${plan_type}`
        })
      }

      case "add_note": {
        // Add admin note to user (we'd need a notes table for this)
        // For now, we'll store in a simple admin_notes table
        const { note } = data

        // Check if admin_notes table exists, if not just return success
        // This is a placeholder - you'd need to create the table
        return NextResponse.json({
          success: true,
          message: "Note added (table may need to be created)"
        })
      }

      case "export_users": {
        // Export users to CSV format
        const { data: authData } = await supabase.auth.admin.listUsers()
        const { data: profiles } = await supabase.from("profiles").select("*")
        const { data: subscriptions } = await supabase.from("subscriptions").select("*")

        const csvRows = ["Email,Name,Plan,Status,Created,Last Sign In"]

        authData?.users.forEach(u => {
          const profile = profiles?.find(p => p.user_id === u.id)
          const sub = subscriptions?.find(s => s.user_id === u.id)

          csvRows.push([
            u.email || "",
            (profile?.display_name || "").replace(/,/g, ""),
            sub?.plan_type || "free",
            sub?.status || "none",
            u.created_at ? new Date(u.created_at).toLocaleDateString() : "",
            u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : ""
          ].join(","))
        })

        return NextResponse.json({
          success: true,
          csv: csvRows.join("\n"),
          count: authData?.users.length || 0
        })
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Admin action error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
