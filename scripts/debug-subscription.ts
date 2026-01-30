// scripts/debug-subscription.ts
import * as fs from "fs"
import * as path from "path"

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

loadEnvFile(path.join(process.cwd(), ".env"))
loadEnvFile(path.join(process.cwd(), ".env.local"))

async function debug() {
  const { createClient } = await import("@supabase/supabase-js")
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get all subscriptions with full details
  const { data: subs, error } = await supabase
    .from("subscriptions")
    .select("*")

  if (error) {
    console.error("Error fetching subscriptions:", error)
    return
  }

  console.log("\n=== FULL SUBSCRIPTION RECORDS ===\n")
  subs?.forEach(s => {
    console.log("User ID:", s.user_id)
    console.log("  plan_type:", JSON.stringify(s.plan_type), `(type: ${typeof s.plan_type})`)
    console.log("  tier:", JSON.stringify(s.tier), `(type: ${typeof s.tier})`)
    console.log("  status:", JSON.stringify(s.status), `(type: ${typeof s.status})`)
    console.log("  stripe_subscription_id:", s.stripe_subscription_id)
    console.log("  current_period_end:", s.current_period_end)
    console.log("---")
  })

  // Test what getUserTier would return
  console.log("\n=== SIMULATING getUserTier LOGIC ===\n")
  for (const sub of subs || []) {
    const rawTier = sub.tier || sub.plan_type || "free"
    const normalized = rawTier.toLowerCase()

    let tier = "free"
    if (normalized.startsWith("business")) tier = "business"
    else if (normalized.startsWith("premium")) tier = "premium"

    const statusOk = sub.status === "active" || sub.status === "trialing"

    console.log(`User ${sub.user_id.substring(0,8)}...`)
    console.log(`  rawTier: ${rawTier}`)
    console.log(`  normalized: ${normalized}`)
    console.log(`  status: ${sub.status}`)
    console.log(`  statusOk: ${statusOk}`)
    console.log(`  FINAL TIER: ${statusOk ? tier : "free (status not ok)"}`)
    console.log("---")
  }
}

debug().catch(console.error)
