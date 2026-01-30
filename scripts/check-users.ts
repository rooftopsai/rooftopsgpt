// scripts/check-users.ts
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

async function check() {
  const { createClient } = await import("@supabase/supabase-js")
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get all auth users
  const { data: authUsers } = await supabase.auth.admin.listUsers()

  console.log("\n=== AUTH USERS ===")
  authUsers?.users.forEach(u => {
    console.log(`${u.id.substring(0,12)}... | ${u.email}`)
  })

  // Get all subscriptions
  const { data: subs } = await supabase.from("subscriptions").select("*")

  console.log("\n=== SUBSCRIPTIONS IN DB ===")
  if (subs && subs.length > 0) {
    subs.forEach(s => {
      console.log(`${s.user_id.substring(0,12)}... | ${s.plan_type} | ${s.status}`)
    })
  } else {
    console.log("No subscriptions found!")
  }

  // Check if any auth users are missing subscriptions
  console.log("\n=== USERS WITHOUT SUBSCRIPTIONS ===")
  const subUserIds = new Set(subs?.map(s => s.user_id) || [])
  authUsers?.users.forEach(u => {
    if (!subUserIds.has(u.id)) {
      console.log(`${u.id.substring(0,12)}... | ${u.email} | NO SUBSCRIPTION`)
    }
  })
}

check().catch(console.error)
