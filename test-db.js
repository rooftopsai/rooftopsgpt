// test-db.js - Run this to test your database setup
// Create this file in your project root temporarily

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for testing

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabase() {
  console.log('🧪 Testing database setup...')
  
  try {
    // Test 1: Check if tables exist
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .limit(1)
    
    if (subError) {
      console.error('❌ Subscriptions table error:', subError.message)
      return
    }
    console.log('✅ Subscriptions table exists')
    
    const { data: usage, error: usageError } = await supabase
      .from('feature_usage')
      .select('*')
      .limit(1)
    
    if (usageError) {
      console.error('❌ Feature usage table error:', usageError.message)
      return
    }
    console.log('✅ Feature usage table exists')
    
    // Test 2: Try inserting test data (we'll delete it right after)
    const testUserId = '12345678-1234-1234-1234-123456789012' // Fake UUID for testing
    
    const { data: testSub, error: insertError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: testUserId,
        status: 'free',
        plan_type: 'free'
      })
      .select()
    
    if (insertError) {
      console.error('❌ Insert test failed:', insertError.message)
      return
    }
    console.log('✅ Can insert into subscriptions table')
    
    // Clean up test data
    await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', testUserId)
    
    console.log('✅ Database setup is working correctly!')
    console.log('🎉 Ready to move to the next step!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testDatabase()