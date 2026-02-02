-- Migration: AI Employee Waitlist Table
-- Stores email signups for the AI Employees feature waitlist

CREATE TABLE IF NOT EXISTS ai_employee_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'app_waitlist_page',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick lookups
CREATE INDEX ai_employee_waitlist_email_idx ON ai_employee_waitlist(email);
CREATE INDEX ai_employee_waitlist_created_at_idx ON ai_employee_waitlist(created_at DESC);

-- RLS
ALTER TABLE ai_employee_waitlist ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anyone (public waitlist)
CREATE POLICY "Anyone can join waitlist" ON ai_employee_waitlist
  FOR INSERT WITH CHECK (true);

-- Only admins/service role can view all entries
CREATE POLICY "Service role can view waitlist" ON ai_employee_waitlist
  FOR SELECT USING (auth.role() = 'service_role');

-- Users can see their own waitlist entry
CREATE POLICY "Users can view own waitlist entry" ON ai_employee_waitlist
  FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE ai_employee_waitlist IS 'Email signups for AI Employees feature waitlist';
