-- Migration Database Schema Additions
-- Run this in your Supabase SQL editor

-- Add tracking columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS legacy_migration_status VARCHAR(50) DEFAULT 'not_migrated',
ADD COLUMN IF NOT EXISTS legacy_free_months INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS legacy_coupon_used VARCHAR(50),
ADD COLUMN IF NOT EXISTS legacy_migration_email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS legacy_migrated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS legacy_original_signup_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS legacy_original_plan VARCHAR(100);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_legacy_migration ON profiles(legacy_migration_status);

-- Create view for migration dashboard
CREATE OR REPLACE VIEW migration_dashboard AS
SELECT 
  legacy_migration_status,
  COUNT(*) as user_count,
  COUNT(CASE WHEN legacy_migration_email_sent_at IS NOT NULL THEN 1 END) as emails_sent,
  COUNT(CASE WHEN legacy_migrated_at IS NOT NULL THEN 1 END) as migrated,
  AVG(CASE WHEN legacy_migrated_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (legacy_migrated_at - legacy_migration_email_sent_at))/86400 
    ELSE NULL END) as avg_days_to_migrate
FROM profiles
WHERE legacy_migration_status != 'not_migrated'
GROUP BY legacy_migration_status;

-- Function to mark user as migrated
CREATE OR REPLACE FUNCTION mark_legacy_migrated(user_email TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET 
    legacy_migration_status = 'migrated',
    legacy_migrated_at = NOW()
  WHERE email = user_email;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON COLUMN profiles.legacy_migration_status IS 'not_migrated | invited | logged_in | active | migrated | chose_legacy';
COMMENT ON COLUMN profiles.legacy_free_months IS 'Number of free months granted to legacy users';
COMMENT ON COLUMN profiles.legacy_coupon_used IS 'Stripe coupon code applied during migration';