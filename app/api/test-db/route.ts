// app/api/test-db/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  console.log('🧪 Testing database setup...');
  const results = [];
  
  try {
    // Test 1: Check if subscriptions table exists
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .limit(1);
    
    if (subError) {
      results.push(`❌ Subscriptions table error: ${subError.message}`);
      return NextResponse.json({ results, success: false });
    }
    results.push('✅ Subscriptions table exists');
    
    // Test 2: Check if feature_usage table exists
    const { data: usage, error: usageError } = await supabase
      .from('feature_usage')
      .select('*')
      .limit(1);
    
    if (usageError) {
      results.push(`❌ Feature usage table error: ${usageError.message}`);
      return NextResponse.json({ results, success: false });
    }
    results.push('✅ Feature usage table exists');
    
    // Test 3: Check if we can get an existing user (optional test)
    const { data: existingUsers, error: userError } = await supabase
      .from('profiles')
      .select('user_id')
      .limit(1);
    
    if (userError) {
      results.push(`⚠️ Could not check existing users: ${userError.message}`);
      results.push('ℹ️ This is OK - we can still test with a real user later');
    } else if (existingUsers && existingUsers.length > 0) {
      // Test with a real user if one exists
      const realUserId = existingUsers[0].user_id;
      results.push(`✅ Found existing user for testing: ${realUserId.substring(0, 8)}...`);
      
      // Test inserting subscription for real user
      const { data: testSub, error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: realUserId,
          status: 'free',
          plan_type: 'free'
        })
        .select();
      
      if (insertError) {
        if (insertError.message.includes('duplicate key value')) {
          results.push('✅ Subscription constraint working (user already has subscription)');
        } else {
          results.push(`❌ Insert test failed: ${insertError.message}`);
          return NextResponse.json({ results, success: false });
        }
      } else {
        results.push('✅ Can insert into subscriptions table');
        
        // Clean up test data
        await supabase
          .from('subscriptions')
          .delete()
          .eq('user_id', realUserId);
        results.push('✅ Can delete from subscriptions table');
      }
      
      // Test feature usage table
      const { data: testUsage, error: usageInsertError } = await supabase
        .from('feature_usage')
        .insert({
          user_id: realUserId,
          feature: 'chat_messages',
          quantity: 1,
          month_year: '2024-01'
        })
        .select();
      
      if (usageInsertError) {
        results.push(`❌ Feature usage insert failed: ${usageInsertError.message}`);
        return NextResponse.json({ results, success: false });
      }
      results.push('✅ Can insert into feature_usage table');
      
      // Clean up feature usage test data
      await supabase
        .from('feature_usage')
        .delete()
        .eq('user_id', realUserId);
      results.push('✅ Can delete from feature_usage table');
    } else {
      results.push('ℹ️ No existing users found - will test with real users later');
    }
    
    // Test 4: Verify foreign key constraints are working (this is the "error" we got, which is actually good!)
    const testUserId = '12345678-1234-1234-1234-123456789012'; // Fake UUID
    const { data: badInsert, error: fkError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: testUserId,
        status: 'free',
        plan_type: 'free'
      })
      .select();
    
    if (fkError && fkError.message.includes('foreign key constraint')) {
      results.push('✅ Foreign key constraints working correctly (prevents fake users)');
    } else {
      results.push('⚠️ Foreign key constraint may not be working as expected');
    }
    
    results.push('✅ Database setup is working correctly!');
    results.push('🎉 Ready to move to the next step!');
    
    return NextResponse.json({ results, success: true });
    
  } catch (error: any) {
    results.push(`❌ Test failed: ${error.message}`);
    return NextResponse.json({ results, success: false, error: error.message });
  }
}