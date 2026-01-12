# Tier System End-to-End Testing Checklist

**Purpose**: Verify that all tier-based subscription features work correctly with demo accounts.

**Prerequisites**:
1. Demo accounts created via `supabase/seed_demo_accounts.sql`
2. Local or staging environment running
3. Database migrations applied
4. Environment variables configured

**Testing Date**: _____________
**Tester**: _____________
**Environment**: _____________

---

## 🔧 Setup

### 1. Seed Demo Accounts

Run the seed script in Supabase SQL Editor:

```sql
-- Execute supabase/seed_demo_accounts.sql
-- Verify success messages in output
```

**✅ Verification:**
- [ ] All 3 accounts created successfully
- [ ] No SQL errors in output
- [ ] User IDs displayed in NOTICE messages

---

## 👤 TEST SUITE 1: FREE TIER

**Account:** `demo-free@rooftops.test` / `demo123`

### Login & Initial State

- [ ] **Login successful**
  - Navigate to login page
  - Enter credentials: `demo-free@rooftops.test` / `demo123`
  - Click "Sign In"
  - Expected: Redirected to home/explore page

- [ ] **Usage counters display correctly**
  - Check sidebar usage stats component
  - Expected: Shows "1/1 Reports" or similar (at limit)
  - Expected: Daily chat counter visible

### Property Report Generation

- [ ] **First report already used**
  - Navigate to Explore page
  - Attempt to analyze a property
  - Expected: Upgrade modal appears immediately OR analysis works but saves increment fails
  - Error message: "You've reached your report generation limit"

- [ ] **Upgrade modal functionality**
  - Click "Upgrade" button in modal
  - Expected: Redirected to pricing page
  - Expected: Premium and Business tiers displayed

### Chat Functionality

- [ ] **Send messages (3 used, 2 remaining)**
  - Navigate to Chat page
  - Send message: "What is a roofing square?"
  - Expected: Response received, counter updates to 4/5
  - Send message: "What are common roof materials?"
  - Expected: Response received, counter updates to 5/5

- [ ] **Daily limit reached**
  - Send message: "Tell me more about asphalt shingles"
  - Expected: Limit modal appears
  - Error message: "You've reached your chat limit for this period"
  - Expected: "Upgrade for more messages!" CTA

- [ ] **Model switching (unlimited GPT-4o)**
  - After limit reached, free tier should still allow GPT-4o messages
  - Verify no additional blocking after initial limit

### Web Search

- [ ] **Web search disabled**
  - Navigate to chat settings or search toggle
  - Expected: Web search toggle disabled or shows "Premium feature"
  - Attempting search shows upgrade prompt

### Agent Library

- [ ] **Lock icons on agents**
  - Navigate to Agent Library (Creator page)
  - Expected: Lock overlay or badge on agent cards
  - Expected: "Premium" or "Upgrade Required" badge visible

- [ ] **Clicking agent shows upgrade modal**
  - Click on any agent card
  - Expected: Upgrade modal appears instead of agent opening
  - Modal explains: "Agent library requires Premium or Business tier"

### Summary

**Free Tier Results:**
- [ ] Report limit enforced correctly
- [ ] Chat daily limit enforced correctly
- [ ] Web search access denied
- [ ] Agent library access denied
- [ ] Upgrade modals appear at correct times
- [ ] Upgrade flow navigates to pricing page

---

## 💎 TEST SUITE 2: PREMIUM TIER

**Account:** `demo-premium@rooftops.test` / `demo123`

### Login & Initial State

- [ ] **Login successful**
  - Enter credentials: `demo-premium@rooftops.test` / `demo123`
  - Expected: Redirected to home/explore page

- [ ] **Usage counters display correctly**
  - Check sidebar usage stats component
  - Expected: Shows "8/20 Reports"
  - Expected: Shows "450/1000 Messages" (or "450/1,000")
  - Expected: Shows "22/50 Searches"
  - Format: Should be clear and readable

### Property Report Generation

- [ ] **Generate a property report**
  - Navigate to Explore page
  - Select a property and start analysis
  - Wait for report generation to complete
  - Expected: Report generated successfully
  - Expected: Counter updates from 8/20 to 9/20

- [ ] **Usage counter updates**
  - Refresh page or check sidebar
  - Expected: Counter shows 9/20 after report generation
  - Expected: Counter persists across page refreshes

### Chat Functionality

- [ ] **Send premium messages**
  - Navigate to Chat page
  - Send message: "Analyze the roof condition for 123 Main St"
  - Expected: Response received
  - Expected: Counter updates from 450/1000 to 451/1000

- [ ] **Message counter increments**
  - Send 2-3 more messages
  - Expected: Counter updates for each message
  - Expected: Uses GPT-4.5-mini (premium model)

- [ ] **Model switching after premium quota**
  - Note: Premium tier has 1000 premium messages, then unlimited GPT-4o
  - To test fully, would need to exhaust 1000 messages (skip for now)
  - Expected behavior: Automatic switch to GPT-4o after 1000 premium messages

### Web Search

- [ ] **Web search enabled**
  - Navigate to chat settings
  - Enable web search toggle
  - Expected: Toggle enabled without errors

- [ ] **Perform web search**
  - Ask question requiring web search: "What are the current metal roofing prices in 2026?"
  - Expected: Web search executes
  - Expected: Sources displayed in chat response
  - Expected: Counter updates from 22/50 to 23/50

- [ ] **Search counter updates**
  - Verify sidebar counter shows 23/50
  - Perform another search
  - Expected: Counter updates to 24/50

### Agent Library

- [ ] **Full agent access**
  - Navigate to Agent Library
  - Expected: No lock icons on agents
  - Expected: All agents clickable and accessible

- [ ] **Generate custom agent**
  - Click "Create Agent" or similar
  - Fill in agent details
  - Generate agent
  - Expected: Agent created successfully
  - Expected: No upgrade prompts

### Usage Warnings

- [ ] **Warning at 80% usage**
  - Manually update usage to 81% (16/20 reports):
    ```sql
    UPDATE user_usage
    SET reports_generated = 16
    WHERE user_id = (SELECT user_id FROM profiles WHERE username = 'demo-premium');
    ```
  - Refresh app
  - Expected: Toast warning appears: "You've used 80% of your report limit"
  - Expected: Warning shows upgrade CTA

- [ ] **Warning at 90% usage**
  - Manually update to 91% (18/20):
    ```sql
    UPDATE user_usage
    SET reports_generated = 18
    WHERE user_id = (SELECT user_id FROM profiles WHERE username = 'demo-premium');
    ```
  - Refresh app
  - Expected: More urgent warning appears

### Billing Dashboard

- [ ] **Navigate to billing settings**
  - Go to Settings → Billing
  - Expected: Shows "Premium" tier
  - Expected: Shows current usage stats
  - Expected: "Manage Subscription" button visible

### Summary

**Premium Tier Results:**
- [ ] Report generation works and counts correctly
- [ ] Chat messages count correctly (premium model)
- [ ] Web search works and counts correctly
- [ ] Agent library fully accessible
- [ ] Usage warnings appear at 80%/90%
- [ ] Billing dashboard shows correct tier

---

## 🏢 TEST SUITE 3: BUSINESS TIER

**Account:** `demo-business@rooftops.test` / `demo123`

### Login & Initial State

- [ ] **Login successful**
  - Enter credentials: `demo-business@rooftops.test` / `demo123`
  - Expected: Redirected to home/explore page

- [ ] **Usage counters display correctly**
  - Check sidebar usage stats component
  - Expected: Shows "45/100 Reports"
  - Expected: Shows "2300/5000 Messages" (or "2,300/5,000")
  - Expected: Shows "120/250 Searches"

### Higher Limits Verification

- [ ] **Report limit display**
  - Verify counter shows "/100" (not /20)
  - Generate a report
  - Expected: Counter updates from 45/100 to 46/100

- [ ] **Message limit display**
  - Verify counter shows "/5000" (not /1000)
  - Send a chat message
  - Expected: Counter updates from 2300/5000 to 2301/5000

- [ ] **Search limit display**
  - Verify counter shows "/250" (not /50)
  - Perform a web search
  - Expected: Counter updates from 120/250 to 121/250

### All Features Accessible

- [ ] **Property reports work**
  - Generate multiple reports if time permits
  - Expected: All succeed without upgrade prompts

- [ ] **Chat works**
  - Send multiple messages
  - Expected: Premium model (GPT-4.5-mini) used
  - Expected: No daily limits

- [ ] **Web search works**
  - Perform multiple searches
  - Expected: All execute successfully

- [ ] **Agent library works**
  - Access all agents
  - Create custom agents
  - Expected: Full access with no restrictions

### Billing Dashboard

- [ ] **Navigate to billing settings**
  - Go to Settings → Billing
  - Expected: Shows "Business" tier
  - Expected: Shows higher usage stats
  - Expected: "Manage Subscription" button visible

### Summary

**Business Tier Results:**
- [ ] All higher limits display correctly
- [ ] All features work without restrictions
- [ ] Usage counters update correctly
- [ ] No upgrade prompts appear
- [ ] Billing dashboard shows correct tier

---

## 🔄 CROSS-TIER TESTS

### Tier Switching

- [ ] **Upgrade flow (Free → Premium)**
  - Log in as demo-free
  - Click upgrade button
  - Navigate through pricing page
  - Expected: Stripe checkout or upgrade modal
  - Note: Cannot complete without real Stripe setup

- [ ] **Downgrade detection**
  - Manually update subscription tier in database
  - Expected: System detects and handles appropriately

### Usage Reset

- [ ] **Monthly reset behavior**
  - Manually update month in user_usage table
  - Expected: Counters reset for new month
  - Previous month data preserved

### Grace Period (if applicable)

- [ ] **Past due subscriptions**
  - Manually set subscription status to 'past_due'
  - Expected: Grace period banner appears
  - Expected: Features remain accessible during grace period

---

## 🐛 ISSUES FOUND

Document any issues discovered during testing:

### Issue 1: [Title]
- **Severity:** Critical / High / Medium / Low
- **Tier:** Free / Premium / Business / All
- **Steps to Reproduce:**
  1.
  2.
  3.
- **Expected Behavior:**
- **Actual Behavior:**
- **Screenshots/Logs:**

### Issue 2: [Title]
- **Severity:**
- **Tier:**
- **Steps to Reproduce:**
  1.
  2.
  3.
- **Expected Behavior:**
- **Actual Behavior:**
- **Screenshots/Logs:**

---

## ✅ SIGN-OFF

### Test Results Summary

| Test Suite | Total Tests | Passed | Failed | Blocked | Notes |
|------------|-------------|--------|--------|---------|-------|
| Free Tier | | | | | |
| Premium Tier | | | | | |
| Business Tier | | | | | |
| Cross-Tier | | | | | |
| **TOTAL** | | | | | |

### Blockers

List any blockers preventing complete testing:

1.
2.
3.

### Recommendations

Based on testing results:

1.
2.
3.

### Approval

- [ ] All critical tests passed
- [ ] Known issues documented
- [ ] System ready for [next phase]

**Tested By:** _____________
**Date:** _____________
**Sign-off:** _____________

---

## 📝 NOTES

Additional observations or context:

