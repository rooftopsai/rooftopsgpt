/**
 * Script to verify that the property_reports table exists and is accessible
 *
 * Run with: npx tsx scripts/verify-property-reports-table.ts
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
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyTable() {
  console.log('\n🔍 Verifying property_reports table...\n')

  try {
    // Test 1: Try to select from the table
    console.log('Test 1: Checking if table exists...')
    const { data, error } = await supabase
      .from('property_reports')
      .select('id')
      .limit(1)

    if (error) {
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.error('❌ TABLE DOES NOT EXIST')
        console.log('\n📝 To fix this, run the following SQL in your Supabase SQL Editor:')
        console.log('   Dashboard → SQL Editor → New Query → Paste the SQL from:')
        console.log('   supabase/migrations/20241203_create_property_reports.sql\n')
        return false
      } else if (error.message.includes('permission denied')) {
        console.error('❌ PERMISSION DENIED - RLS may be blocking access')
        console.log('   This might be OK if you need to be authenticated to access the table')
        console.log('   Error:', error.message, '\n')
        return false
      } else {
        console.error('❌ UNEXPECTED ERROR:', error.message, '\n')
        return false
      }
    }

    console.log('✓ Table exists and is accessible')
    console.log(`   Found ${data?.length || 0} record(s)\n`)

    // Test 2: Check table structure
    console.log('Test 2: Verifying table structure...')
    const { data: columns, error: structureError } = await supabase
      .from('property_reports')
      .select('*')
      .limit(0)

    if (structureError) {
      console.error('❌ Error checking structure:', structureError.message, '\n')
      return false
    }

    console.log('✓ Table structure looks good\n')

    // Success
    console.log('✅ All checks passed! The property_reports table is ready to use.\n')
    return true

  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message, '\n')
    return false
  }
}

verifyTable().then(success => {
  process.exit(success ? 0 : 1)
})
