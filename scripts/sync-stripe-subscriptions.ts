// scripts/sync-stripe-subscriptions.ts
// Run with: npx tsx scripts/sync-stripe-subscriptions.ts

import * as fs from "fs"
import * as path from "path"

// Load env files manually BEFORE any other imports
function loadEnvFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    const envContent = fs.readFileSync(filePath, "utf-8")
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith("#")) {
        const eqIndex = trimmed.indexOf("=")
        if (eqIndex > 0) {
          const key = trimmed.substring(0, eqIndex)
          let value = trimmed.substring(eqIndex + 1)
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
          }
          process.env[key] = value
        }
      }
    }
  }
}

// Load both .env and .env.local (local overrides base)
loadEnvFile(path.join(process.cwd(), ".env"))
loadEnvFile(path.join(process.cwd(), ".env.local"))

// Now run the main function with dynamic imports
async function main() {
  const Stripe = (await import("stripe")).default
  const { createClient } = await import("@supabase/supabase-js")

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-04-10" as any
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("Missing STRIPE_SECRET_KEY")
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Price IDs to plan type mapping
  const PRICE_TO_PLAN: Record<string, string> = {
    "price_1SWUJsLa49gFMOt641Bw8rZw": "premium", // Premium monthly
    "price_1SrqwALa49gFMOt6kzWLdoh2": "premium", // Premium annual
    "price_1SWUMvLa49gFMOt6AZ7XpwLO": "business", // Business monthly
    "price_1SrqyXLa49gFMOt6pGxKOn5u": "business"  // Business annual
  }

  console.log("\n🔄 Syncing Stripe subscriptions to database...\n")

  // Get all auth users to map emails to user IDs
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

  if (authError) {
    console.error("Error fetching auth users:", authError.message)
    process.exit(1)
  }

  const emailToUserId = new Map<string, string>()
  authUsers.users.forEach((user: any) => {
    if (user.email) {
      emailToUserId.set(user.email.toLowerCase(), user.id)
    }
  })

  console.log(`Found ${emailToUserId.size} users in auth database\n`)

  // Fetch all active/trialing subscriptions from Stripe
  const subscriptions = await stripe.subscriptions.list({
    status: "all",
    limit: 100,
    expand: ["data.customer"]
  })

  console.log(`Found ${subscriptions.data.length} subscriptions in Stripe\n`)

  let synced = 0
  let skipped = 0
  let errors = 0

  for (const sub of subscriptions.data) {
    // Skip canceled subscriptions
    if (sub.status === "canceled" || sub.status === "incomplete_expired") {
      console.log(`⏭️  Skipping ${sub.id} - status: ${sub.status}`)
      skipped++
      continue
    }

    const customer = sub.customer as any
    const customerEmail = customer.email?.toLowerCase()

    if (!customerEmail) {
      console.log(`⚠️  Subscription ${sub.id} - no customer email`)
      skipped++
      continue
    }

    const userId = emailToUserId.get(customerEmail)

    if (!userId) {
      console.log(`⚠️  Subscription ${sub.id} - no user found for email: ${customerEmail}`)
      skipped++
      continue
    }

    // Get plan type from price ID
    const priceId = sub.items.data[0]?.price?.id
    let planType = priceId ? PRICE_TO_PLAN[priceId] : null

    if (!planType) {
      // Try to detect from price nickname or product
      const priceName = (sub.items.data[0]?.price as any)?.nickname?.toLowerCase() || ""
      if (priceName.includes("business")) {
        planType = "business"
      } else if (priceName.includes("premium")) {
        planType = "premium"
      } else {
        planType = "premium" // Default to premium for paid subscriptions
      }
    }

    console.log(`\n📝 Processing: ${customerEmail}`)
    console.log(`   User ID: ${userId}`)
    console.log(`   Stripe Sub: ${sub.id}`)
    console.log(`   Customer: ${customer.id}`)
    console.log(`   Plan: ${planType}`)
    console.log(`   Status: ${sub.status}`)

    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .upsert({
          user_id: userId,
          stripe_customer_id: customer.id,
          stripe_subscription_id: sub.id,
          status: sub.status,
          plan_type: planType,
          tier: planType, // Also set tier field to match plan_type
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end
        }, {
          onConflict: "user_id"
        })
        .select()
        .single()

      if (error) {
        console.log(`   ❌ Error: ${error.message}`)
        errors++
      } else {
        console.log(`   ✅ Synced successfully`)
        synced++
      }
    } catch (err: any) {
      console.log(`   ❌ Exception: ${err.message}`)
      errors++
    }
  }

  console.log("\n" + "=".repeat(50))
  console.log("📊 SYNC SUMMARY")
  console.log("=".repeat(50))
  console.log(`✅ Synced: ${synced}`)
  console.log(`⏭️  Skipped: ${skipped}`)
  console.log(`❌ Errors: ${errors}`)
  console.log("")

  // Show current state of subscriptions table
  console.log("\n📋 Current subscriptions in database:")
  const { data: currentSubs } = await supabase
    .from("subscriptions")
    .select("*")
    .in("status", ["active", "trialing", "past_due"])

  if (currentSubs && currentSubs.length > 0) {
    console.table(currentSubs.map((s: any) => ({
      user_id: s.user_id.substring(0, 8) + "...",
      plan: s.plan_type,
      status: s.status,
      period_end: new Date(s.current_period_end).toLocaleDateString()
    })))
  } else {
    console.log("No active subscriptions found in database")
  }
}

main().catch(console.error)
