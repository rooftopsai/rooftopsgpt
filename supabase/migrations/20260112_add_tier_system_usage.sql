-- Migration: Add tier system usage tracking table
-- This table tracks monthly usage for tier limits (reports, chat messages, web searches)
-- Complements the existing feature_usage table with tier-specific tracking

-- Create user_usage table for tier system
CREATE TABLE IF NOT EXISTS user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- Format: YYYY-MM for easy querying
  reports_generated INTEGER NOT NULL DEFAULT 0,
  chat_messages_premium INTEGER NOT NULL DEFAULT 0,
  chat_messages_free INTEGER NOT NULL DEFAULT 0,
  web_searches INTEGER NOT NULL DEFAULT 0,
  last_chat_date DATE,
  daily_chat_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, month)
);

-- Create indexes for performance
CREATE INDEX user_usage_user_id_idx ON user_usage (user_id);
CREATE INDEX user_usage_month_idx ON user_usage (month);
CREATE INDEX user_usage_user_month_idx ON user_usage (user_id, month);
CREATE INDEX user_usage_last_chat_date_idx ON user_usage (last_chat_date);

-- Create trigger to update updated_at
CREATE TRIGGER update_user_usage_updated_at
  BEFORE UPDATE ON user_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_usage
CREATE POLICY "Users can view their own usage" ON user_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage" ON user_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage" ON user_usage
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all usage" ON user_usage
  FOR ALL USING (auth.role() = 'service_role');

-- Add tier column to subscriptions if it doesn't exist (for consistency with PRD terminology)
-- This is an alias for plan_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'tier'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN tier TEXT;
    -- Copy plan_type values to tier
    UPDATE subscriptions SET tier = plan_type;
    -- Make tier NOT NULL with default
    ALTER TABLE subscriptions ALTER COLUMN tier SET DEFAULT 'free';
    ALTER TABLE subscriptions ALTER COLUMN tier SET NOT NULL;
  END IF;
END $$;

-- Create index on tier
CREATE INDEX IF NOT EXISTS subscriptions_tier_idx ON subscriptions (tier);

-- Update subscriptions table to ensure proper status values
-- Status should be: 'active', 'cancelled', 'past_due' (not 'free')
-- For free tier users, status should be 'active' and tier should be 'free'
UPDATE subscriptions
SET status = 'active'
WHERE status = 'free';

-- Add comment to clarify the difference between status and tier
COMMENT ON COLUMN subscriptions.status IS 'Subscription status: active, cancelled, past_due';
COMMENT ON COLUMN subscriptions.tier IS 'Subscription tier: free, premium, business';
COMMENT ON COLUMN subscriptions.plan_type IS 'DEPRECATED: Use tier instead. Kept for backward compatibility.';
