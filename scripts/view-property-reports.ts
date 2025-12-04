/**
 * Script to view all property reports in the database
 *
 * Run with: npx tsx scripts/view-property-reports.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables from .env and .env.local
const loadEnvFile = (filename: string) => {
  const envPath = path.resolve(process.cwd(), filename)
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim()
        if (!process.env[key]) {
          process.env[key] = value
        }
      }
    })
  }
}

loadEnvFile('.env')
loadEnvFile('.env.local')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

// Use service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function viewReports() {
  console.log('\n📊 Fetching all property reports...\n')

  try {
    const { data: reports, error } = await supabase
      .from('property_reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching reports:', error.message)
      return
    }

    if (!reports || reports.length === 0) {
      console.log('📭 No property reports found in the database.\n')
      return
    }

    console.log(`✅ Found ${reports.length} report(s):\n`)

    reports.forEach((report, index) => {
      console.log(`\n${'='.repeat(80)}`)
      console.log(`Report #${index + 1}`)
      console.log(`${'='.repeat(80)}`)
      console.log(`ID: ${report.id}`)
      console.log(`User ID: ${report.user_id}`)
      console.log(`Workspace ID: ${report.workspace_id}`)
      console.log(`Address: ${report.address}`)
      console.log(`Location: ${report.latitude}, ${report.longitude}`)
      console.log(`Created: ${new Date(report.created_at).toLocaleString()}`)
      console.log(`Updated: ${new Date(report.updated_at).toLocaleString()}`)

      console.log('\n--- Structured Data ---')
      console.log(`Facet Count: ${report.facet_count ?? 'N/A'}`)
      console.log(`Roof Area: ${report.roof_area ?? 'N/A'}`)
      console.log(`Squares: ${report.squares ?? 'N/A'}`)
      console.log(`Pitch: ${report.pitch ?? 'N/A'}`)
      console.log(`Ridge Length: ${report.ridge_length ?? 'N/A'}`)
      console.log(`Valley Length: ${report.valley_length ?? 'N/A'}`)
      console.log(`Complexity: ${report.complexity ?? 'N/A'}`)
      console.log(`Confidence: ${report.confidence ?? 'N/A'}`)
      console.log(`Material: ${report.material ?? 'N/A'}`)
      console.log(`Condition: ${report.condition ?? 'N/A'}`)

      if (report.user_summary) {
        console.log('\n--- User Summary ---')
        console.log(report.user_summary)
      }

      if (report.analysis_data) {
        console.log('\n--- Analysis Data Keys ---')
        console.log(Object.keys(report.analysis_data).join(', '))
      }

      if (report.solar_metrics) {
        console.log('\n--- Solar Metrics ---')
        console.log(JSON.stringify(report.solar_metrics, null, 2))
      }

      if (report.captured_images) {
        const imageCount = Array.isArray(report.captured_images)
          ? report.captured_images.length
          : Object.keys(report.captured_images).length
        console.log(`\n--- Captured Images: ${imageCount} ---`)
      }

      if (report.satellite_views) {
        const viewCount = Array.isArray(report.satellite_views)
          ? report.satellite_views.length
          : Object.keys(report.satellite_views).length
        console.log(`--- Satellite Views: ${viewCount} ---`)
      }
    })

    console.log(`\n${'='.repeat(80)}`)
    console.log(`\nTotal: ${reports.length} report(s)\n`)

  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message)
  }
}

viewReports()
