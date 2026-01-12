-- Seed Demo Accounts for Tier Testing
-- This script creates 3 demo accounts with different tier levels and usage patterns
-- Run this manually via Supabase SQL Editor or using: psql -h localhost -U postgres -d postgres -f seed_demo_accounts.sql

-- Note: This script requires SUPERUSER privileges to insert into auth.users
-- In production Supabase, you may need to use the Supabase Dashboard or Auth API instead

DO $$
DECLARE
  demo_free_id UUID;
  demo_premium_id UUID;
  demo_business_id UUID;
  current_month TEXT;
BEGIN
  -- Get current month in YYYY-MM format
  current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

  -- ============================================================================
  -- DEMO ACCOUNT 1: FREE TIER
  -- ============================================================================

  -- Create auth user for demo-free (password: demo123)
  -- encrypted_password is bcrypt hash of 'demo123'
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'demo-free@rooftops.test',
    crypt('demo123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ) RETURNING id INTO demo_free_id;

  -- Wait for trigger to create profile and workspace
  PERFORM pg_sleep(0.1);

  -- Update profile with demo-specific details
  UPDATE profiles
  SET
    username = 'demo-free',
    display_name = 'Demo Free User',
    bio = 'Free tier demo account for testing',
    has_onboarded = true
  WHERE user_id = demo_free_id;

  -- Create subscription record (free tier)
  INSERT INTO subscriptions (user_id, status, plan_type, tier)
  VALUES (demo_free_id, 'active', 'free', 'free');

  -- Create usage record (1 report used, 3 chat messages today)
  INSERT INTO user_usage (
    user_id,
    month,
    reports_generated,
    chat_messages_premium,
    chat_messages_free,
    web_searches,
    last_chat_date,
    daily_chat_count
  ) VALUES (
    demo_free_id,
    current_month,
    1,  -- 1 report used (limit: 1)
    0,  -- No premium messages on free tier
    3,  -- 3 chat messages today (limit: 5/day)
    0,  -- No web searches on free tier
    CURRENT_DATE,
    3
  );

  RAISE NOTICE 'Created demo-free@rooftops.test (User ID: %)', demo_free_id;

  -- ============================================================================
  -- DEMO ACCOUNT 2: PREMIUM TIER
  -- ============================================================================

  -- Create auth user for demo-premium (password: demo123)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'demo-premium@rooftops.test',
    crypt('demo123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ) RETURNING id INTO demo_premium_id;

  -- Wait for trigger to create profile and workspace
  PERFORM pg_sleep(0.1);

  -- Update profile with demo-specific details
  UPDATE profiles
  SET
    username = 'demo-premium',
    display_name = 'Demo Premium User',
    bio = 'Premium tier demo account for testing ($29/mo plan)',
    has_onboarded = true
  WHERE user_id = demo_premium_id;

  -- Create subscription record (premium tier)
  INSERT INTO subscriptions (
    user_id,
    status,
    plan_type,
    tier,
    current_period_start,
    current_period_end,
    cancel_at_period_end
  ) VALUES (
    demo_premium_id,
    'active',
    'premium',
    'premium',
    DATE_TRUNC('month', CURRENT_DATE),
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month',
    false
  );

  -- Create usage record (8/20 reports, 450/1000 messages, 22/50 searches)
  INSERT INTO user_usage (
    user_id,
    month,
    reports_generated,
    chat_messages_premium,
    chat_messages_free,
    web_searches,
    last_chat_date,
    daily_chat_count
  ) VALUES (
    demo_premium_id,
    current_month,
    8,    -- 8/20 reports used
    450,  -- 450/1000 premium messages used
    0,    -- No free messages (using premium)
    22,   -- 22/50 searches used
    CURRENT_DATE,
    12    -- 12 messages today
  );

  RAISE NOTICE 'Created demo-premium@rooftops.test (User ID: %)', demo_premium_id;

  -- ============================================================================
  -- DEMO ACCOUNT 3: BUSINESS TIER
  -- ============================================================================

  -- Create auth user for demo-business (password: demo123)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'demo-business@rooftops.test',
    crypt('demo123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ) RETURNING id INTO demo_business_id;

  -- Wait for trigger to create profile and workspace
  PERFORM pg_sleep(0.1);

  -- Update profile with demo-specific details
  UPDATE profiles
  SET
    username = 'demo-business',
    display_name = 'Demo Business User',
    bio = 'Business tier demo account for testing ($99/mo plan)',
    has_onboarded = true
  WHERE user_id = demo_business_id;

  -- Create subscription record (business tier)
  INSERT INTO subscriptions (
    user_id,
    status,
    plan_type,
    tier,
    current_period_start,
    current_period_end,
    cancel_at_period_end
  ) VALUES (
    demo_business_id,
    'active',
    'business',
    'business',
    DATE_TRUNC('month', CURRENT_DATE),
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month',
    false
  );

  -- Create usage record (45/100 reports, 2300/5000 messages, 120/250 searches)
  INSERT INTO user_usage (
    user_id,
    month,
    reports_generated,
    chat_messages_premium,
    chat_messages_free,
    web_searches,
    last_chat_date,
    daily_chat_count
  ) VALUES (
    demo_business_id,
    current_month,
    45,   -- 45/100 reports used
    2300, -- 2300/5000 premium messages used
    0,    -- No free messages (using premium)
    120,  -- 120/250 searches used
    CURRENT_DATE,
    87    -- 87 messages today
  );

  RAISE NOTICE 'Created demo-business@rooftops.test (User ID: %)', demo_business_id;

  -- ============================================================================
  -- SUMMARY
  -- ============================================================================

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Demo Accounts Created Successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '1. FREE TIER (demo-free@rooftops.test)';
  RAISE NOTICE '   Password: demo123';
  RAISE NOTICE '   Usage: 1/1 reports, 3 messages today';
  RAISE NOTICE '';
  RAISE NOTICE '2. PREMIUM TIER (demo-premium@rooftops.test)';
  RAISE NOTICE '   Password: demo123';
  RAISE NOTICE '   Usage: 8/20 reports, 450/1000 messages, 22/50 searches';
  RAISE NOTICE '';
  RAISE NOTICE '3. BUSINESS TIER (demo-business@rooftops.test)';
  RAISE NOTICE '   Password: demo123';
  RAISE NOTICE '   Usage: 45/100 reports, 2300/5000 messages, 120/250 searches';
  RAISE NOTICE '';
  RAISE NOTICE 'All accounts are ready for testing!';
  RAISE NOTICE '========================================';

END $$;
