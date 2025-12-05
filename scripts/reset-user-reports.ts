import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

// Load environment variables from .env
const envFile = fs.readFileSync('.env', 'utf8')
const envVars: Record<string, string> = {}
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

console.log('Supabase URL:', supabaseUrl ? 'Loaded' : 'Missing')
console.log('Service Key:', supabaseServiceKey ? 'Loaded' : 'Missing')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  console.error('Available env vars:', Object.keys(envVars))
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function resetUserReports(userId: string) {
  try {
    console.log(`Resetting property reports for user: ${userId}`)

    // Get current month-year
    const currentDate = new Date()
    const monthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
    console.log(`Current month: ${monthYear}`)

    // Get current usage for property_reports
    const { data: usageData, error: usageError } = await supabase
      .from('feature_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('feature', 'property_reports')
      .eq('month_year', monthYear)

    if (usageError) {
      console.error('Error fetching usage:', usageError)
      return
    }

    console.log(`Current usage records:`, usageData)

    if (!usageData || usageData.length === 0) {
      console.log('✅ No usage records found - user already has full quota')
      return
    }

    // Delete all property_reports usage for this user this month
    const { error: deleteError } = await supabase
      .from('feature_usage')
      .delete()
      .eq('user_id', userId)
      .eq('feature', 'property_reports')
      .eq('month_year', monthYear)

    if (deleteError) {
      console.error('Error deleting usage:', deleteError)
      return
    }

    console.log('✅ Successfully reset property reports usage!')
    console.log('User now has full quota for this month')
  } catch (error) {
    console.error('Error:', error)
  }
}

// Get user ID from command line argument
const userId = process.argv[2]

if (!userId) {
  console.error('Please provide a user ID as an argument')
  console.error('Usage: npx tsx scripts/reset-user-reports.ts <user-id>')
  process.exit(1)
}

resetUserReports(userId)
