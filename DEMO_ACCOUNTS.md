# Demo Accounts for Tier Testing

This document provides credentials and details for demo accounts used to test the tier-based subscription system.

## 📋 Quick Reference

| Account | Email | Password | Tier | Usage Status |
|---------|-------|----------|------|--------------|
| Free | `demo-free@rooftops.test` | `demo123` | Free | 1/1 reports, 3/5 messages today |
| Premium | `demo-premium@rooftops.test` | `demo123` | Premium ($29/mo) | 8/20 reports, 450/1000 messages, 22/50 searches |
| Business | `demo-business@rooftops.test` | `demo123` | Business ($99/mo) | 45/100 reports, 2300/5000 messages, 120/250 searches |

---

## 🔧 Setup Instructions

### Option 1: Using Supabase SQL Editor (Recommended)

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `supabase/seed_demo_accounts.sql`
5. Click **Run**
6. Verify success messages in the output

### Option 2: Using Supabase CLI

```bash
# Run the seed script
supabase db execute < supabase/seed_demo_accounts.sql

# Or if connected to a specific project
supabase db execute --db-url "postgresql://..." < supabase/seed_demo_accounts.sql
```

### Option 3: Using psql (Local Development)

```bash
psql -h localhost -U postgres -d postgres -f supabase/seed_demo_accounts.sql
```

---

## 👤 Account Details

### 1. Free Tier Account

**Email:** `demo-free@rooftops.test`
**Password:** `demo123`
**Username:** `demo-free`

**Subscription:**
- Tier: Free
- Status: Active
- Limits:
  - 1 property report per month (1 used ❌ - at limit)
  - 5 chat messages per day (3 used ⚠️ - 2 remaining)
  - No web search access ❌
  - No agent library access ❌

**Expected Behavior:**
- Cannot generate more reports (upgrade modal shown)
- Can send 2 more chat messages today
- Web search toggle disabled or shows upgrade prompt
- Agent library shows lock icons with upgrade modals

---

### 2. Premium Tier Account

**Email:** `demo-premium@rooftops.test`
**Password:** `demo123`
**Username:** `demo-premium`

**Subscription:**
- Tier: Premium ($29/month)
- Status: Active
- Billing Period: Current month
- Limits:
  - 20 property reports per month (8 used ✅ - 12 remaining)
  - 1000 premium chat messages per month (450 used ✅ - 550 remaining)
  - 50 web searches per month (22 used ✅ - 28 remaining)
  - Full agent library access ✅

**Expected Behavior:**
- Can generate 12 more reports this month
- Can send 550 more premium messages (GPT-4.5-mini)
- Unlimited GPT-4o messages after premium quota exhausted
- Can perform 28 more web searches
- Full access to agent library
- Warning toasts at 80% usage (16 reports, 800 messages, 40 searches)

---

### 3. Business Tier Account

**Email:** `demo-business@rooftops.test`
**Password:** `demo123`
**Username:** `demo-business`

**Subscription:**
- Tier: Business ($99/month)
- Status: Active
- Billing Period: Current month
- Limits:
  - 100 property reports per month (45 used ✅ - 55 remaining)
  - 5000 premium chat messages per month (2300 used ✅ - 2700 remaining)
  - 250 web searches per month (120 used ✅ - 130 remaining)
  - Full agent library access ✅

**Expected Behavior:**
- Can generate 55 more reports this month
- Can send 2700 more premium messages
- Unlimited GPT-4o messages after premium quota exhausted
- Can perform 130 more web searches
- Full access to agent library
- Warning toasts at 80% usage (80 reports, 4000 messages, 200 searches)

---

## 🧪 Testing Scenarios

### Test 1: Free Tier Limits

1. Log in as `demo-free@rooftops.test`
2. Try to generate a 2nd property report
   - ✅ Expected: Upgrade modal appears
3. Navigate to chat and send 3 messages (total 6 for the day)
   - ✅ Expected: After 5th message, limit modal appears
4. Try to access agent library
   - ✅ Expected: Lock icons on agents, upgrade modal on click
5. Check if web search is available
   - ✅ Expected: Disabled or shows upgrade prompt

### Test 2: Premium Tier Usage

1. Log in as `demo-premium@rooftops.test`
2. Check sidebar usage counters
   - ✅ Expected: Shows "8/20 reports", "450/1000 messages", "22/50 searches"
3. Generate a property report
   - ✅ Expected: Counter updates to 9/20
4. Send a chat message
   - ✅ Expected: Counter updates to 451/1000
5. Perform a web search
   - ✅ Expected: Counter updates to 23/50
6. Access agent library
   - ✅ Expected: Full access, no lock icons

### Test 3: Business Tier Usage

1. Log in as `demo-business@rooftops.test`
2. Check sidebar usage counters
   - ✅ Expected: Shows "45/100 reports", "2300/5000 messages", "120/250 searches"
3. Verify higher limits are displayed correctly
4. Test all features work as expected

### Test 4: Usage Warnings

1. Manually update usage to trigger warnings:
   ```sql
   -- Set premium user to 81% usage (16/20 reports)
   UPDATE user_usage
   SET reports_generated = 16
   WHERE user_id = (SELECT user_id FROM profiles WHERE username = 'demo-premium');
   ```
2. Refresh the app
   - ✅ Expected: Toast warning appears: "You've used 80% of your report limit"

---

## 🔄 Resetting Demo Accounts

### Reset Usage Counters

```sql
-- Reset to original usage levels
UPDATE user_usage
SET
  reports_generated = 1,
  chat_messages_premium = 0,
  chat_messages_free = 3,
  web_searches = 0,
  daily_chat_count = 3
WHERE user_id = (SELECT user_id FROM profiles WHERE username = 'demo-free');

UPDATE user_usage
SET
  reports_generated = 8,
  chat_messages_premium = 450,
  chat_messages_free = 0,
  web_searches = 22,
  daily_chat_count = 12
WHERE user_id = (SELECT user_id FROM profiles WHERE username = 'demo-premium');

UPDATE user_usage
SET
  reports_generated = 45,
  chat_messages_premium = 2300,
  chat_messages_free = 0,
  web_searches = 120,
  daily_chat_count = 87
WHERE user_id = (SELECT user_id FROM profiles WHERE username = 'demo-business');
```

### Delete Demo Accounts

```sql
-- This will cascade delete profiles, subscriptions, and usage records
DELETE FROM auth.users
WHERE email IN (
  'demo-free@rooftops.test',
  'demo-premium@rooftops.test',
  'demo-business@rooftops.test'
);
```

---

## 📝 Notes

- **Passwords:** All demo accounts use the password `demo123` (bcrypt hashed in database)
- **Stripe Integration:** Demo accounts have NULL `stripe_customer_id` and `stripe_subscription_id` (not required for testing core tier features)
- **Monthly Reset:** Usage counters are tied to the current month (YYYY-MM format). They will reset at the start of each new month.
- **Daily Chat Limits:** Free tier daily chat limits reset based on `last_chat_date` field
- **RLS Policies:** Demo accounts respect all Row Level Security policies
- **Onboarding:** All demo accounts have `has_onboarded = true` to skip the onboarding flow

---

## 🐛 Troubleshooting

### "User already exists" error

If you see this error when running the seed script:

```sql
-- Delete existing demo accounts first
DELETE FROM auth.users
WHERE email IN (
  'demo-free@rooftops.test',
  'demo-premium@rooftops.test',
  'demo-business@rooftops.test'
);
```

Then re-run the seed script.

### Cannot log in with demo accounts

1. Verify the accounts exist:
   ```sql
   SELECT email, created_at FROM auth.users
   WHERE email LIKE '%@rooftops.test';
   ```

2. Check email confirmation status:
   ```sql
   UPDATE auth.users
   SET email_confirmed_at = NOW()
   WHERE email LIKE '%@rooftops.test';
   ```

### Usage counters not updating

1. Verify usage records exist:
   ```sql
   SELECT u.month, u.reports_generated, u.chat_messages_premium, p.username
   FROM user_usage u
   JOIN profiles p ON u.user_id = p.user_id
   WHERE p.username LIKE 'demo-%';
   ```

2. Check if current month record exists (may need to create for new month)

---

## 🔒 Security Note

**⚠️ IMPORTANT:** These are demo accounts with known credentials. They should **NEVER** be deployed to production environments. Use them only in:
- Local development
- Staging environments
- Demo/testing instances

For production testing, create separate test accounts with secure passwords and proper user management.
