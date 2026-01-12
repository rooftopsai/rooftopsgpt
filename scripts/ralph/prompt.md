# ROOFTOPS AI TIER SYSTEM - RALPH AUTONOMOUS IMPLEMENTATION

## MISSION
Implement a complete tier-based subscription system for Rooftops AI across 36 user stories. Work autonomously, iterating until all stories are complete.

---

## CRITICAL: ADAPTIVE APPROACH

**YOU MUST ADAPT TO THE ACTUAL CODEBASE YOU FIND**

This PRD provides goals and outcomes, NOT rigid implementation details.

### Before ANY Implementation:
1. **Examine the actual codebase structure**
2. **Identify existing patterns**: database (Supabase/Prisma/Drizzle?), auth (NextAuth/Supabase/Clerk?), components, API routes
3. **Create CODEBASE-PATTERNS.md** documenting what you discover
4. **Adapt ALL subsequent work** to match existing patterns

### For EVERY Story:
- Check CODEBASE-PATTERNS.md first
- Use existing file structures (don't force `/lib/` if codebase uses `/utils/`)
- Use existing component patterns (don't create new modal system if one exists)
- Follow existing naming conventions
- Integrate with existing auth/database/API patterns

**When PRD says "Create /lib/entitlements.ts" → Find where services live, create there**
**When PRD says "Use Supabase" → Check actual DB, use what's there (Prisma/etc)**

---

## TIER STRUCTURE

### Free Tier ($0)
- 1 property report (requires account creation)
- 5 chat messages per day (GPT-4o)
- View-only agent library (locked)
- No web search

### Premium Tier ($29/month)
- 20 property reports per month
- 1000 chat messages per month (GPT-4.5-mini)
- Unlimited GPT-4o after premium messages used
- 50 web searches per month
- Full agent library access

### Business Tier ($99/month)
- 100 property reports per month
- 5000 chat messages per month (GPT-4.5-mini)
- Unlimited GPT-4o after premium messages used
- 250 web searches per month
- Full agent library access

---

## USER STORIES (36 Total)

### PRIORITY 0: DISCOVERY (START HERE)

**US-0: Codebase Discovery and Pattern Analysis**

Before implementing ANYTHING, thoroughly examine the rooftopsgpt codebase:

1. **Identify tech stack:**
   - Framework: Next.js? Pages router or App router?
   - Database: Supabase? Prisma? Drizzle? MongoDB?
   - Auth: NextAuth? Supabase Auth? Clerk? Custom?
   - Styling: Tailwind? CSS Modules? Styled Components?
   - Components: Shadcn? Radix? MUI? Custom?

2. **Document file structure:**
   - Where are components? `/components/`? `/app/components/`?
   - Where are utils/services? `/lib/`? `/utils/`? `/services/`?
   - Where are API routes? `/app/api/`? `/pages/api/`?
   - Where are types? `/types/`? `/lib/types/`?
   - How are tests organized?

3. **Identify existing patterns:**
   - How are modals implemented?
   - How is auth checked?
   - How are database queries made?
   - How are API responses formatted?
   - What's the error handling pattern?

4. **Create CODEBASE-PATTERNS.md** with findings:
   ```markdown
   # Rooftops AI Codebase Patterns
   
   ## Tech Stack
   - Framework: [discovered]
   - Database: [discovered]
   - Auth: [discovered]
   
   ## File Organization
   - Components: [location]
   - Services: [location]
   - API routes: [location]
   
   ## Key Patterns
   - Modal pattern: [how implemented]
   - Auth pattern: [how checked]
   - Database pattern: [how queried]
   ```

**Commit:** `git commit -m "US-0: Codebase discovery and pattern documentation"`

---

### PRIORITY 1: FOUNDATION

**US-1: Database Schema & Migrations**

Reference CODEBASE-PATTERNS.md → Use the existing database system.

Create tables for subscription tracking and usage monitoring:

**user_subscriptions table:**
- user_id (references users)
- tier (text: 'free', 'premium', 'business')
- stripe_customer_id (nullable text)
- stripe_subscription_id (nullable text)
- status (text: 'active', 'cancelled', 'past_due')
- current_period_start (timestamp)
- current_period_end (timestamp)
- created_at, updated_at (timestamps)

**user_usage table:**
- user_id (references users)
- month (text: 'YYYY-MM')
- reports_generated (integer, default 0)
- chat_messages_premium (integer, default 0)
- chat_messages_free (integer, default 0)
- web_searches (integer, default 0)
- last_chat_date (date)
- daily_chat_count (integer, default 0)
- created_at, updated_at (timestamps)

Add indexes on user_id and month for performance.

Follow existing migration patterns (Prisma migrate? Supabase migration? SQL file?).

**Commit:** `git commit -m "US-1: Add subscription and usage tracking tables"`

---

**US-2: Tier Management Service**

Create entitlement service in appropriate location (check CODEBASE-PATTERNS.md).

Implement these functions:

```typescript
// Returns user's current tier or 'free' as default
async function getUserTier(userId: string): Promise<'free' | 'premium' | 'business'>

// Check if user can generate another report
async function checkReportLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
}>

// Check if user can send chat message
async function checkChatLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  model: 'gpt-4o' | 'gpt-4.5-mini';
}>

// Check if user can use web search
async function checkWebSearchLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
}>

// Check if user can access agents
async function checkAgentAccess(userId: string): Promise<boolean>
```

Handle month rollover (reset counters on 1st of month).
Handle daily rollover for free tier chat (reset at midnight).

Use TypeScript types consistent with existing codebase.

**Commit:** `git commit -m "US-2: Add tier management and entitlement checks"`

---

**US-3: Usage Tracking Utilities**

Create usage tracking functions in appropriate location.

Implement these functions:

```typescript
// Increment report usage for user
async function incrementReportUsage(userId: string): Promise<UsageStats>

// Increment chat usage (tracks by model)
async function incrementChatUsage(
  userId: string, 
  model: 'gpt-4o' | 'gpt-4.5-mini'
): Promise<UsageStats>

// Increment web search usage
async function incrementWebSearchUsage(userId: string): Promise<UsageStats>
```

All functions should:
- Update user_usage table atomically
- Create new month record if doesn't exist
- Handle daily chat reset for free users
- Return updated usage counts

**Commit:** `git commit -m "US-3: Add usage tracking functions"`

---

### PRIORITY 2: REPORT FLOW & PAYWALLS

**US-4: Signup Modal Component**

Examine existing modal patterns → Create signup modal following those patterns.

Modal should:
- Show when unauthenticated user clicks "Analyze Property"
- Display: "Create a free account to view your report"
- Integrate with existing auth system (discovered in US-0)
- Provide login/signup UI (match existing auth UI if present)
- Include close button
- On success: close modal and show report
- Follow existing responsive design patterns

Location: Match existing modal component location.

**Commit:** `git commit -m "US-4: Add signup modal for unauthenticated users"`

---

**US-5: Report Generation with Limit Check**

Modify report generation to check entitlements.

Before generating report:
1. Check if user authenticated → if not, show signup modal
2. Call `checkReportLimit(userId)`
3. If not allowed → show upgrade modal
4. If allowed → generate report, call `incrementReportUsage(userId)`

Show remaining count in UI: "X reports remaining this month"

Free users: After first report, show upgrade modal for subsequent attempts.

**Commit:** `git commit -m "US-5: Add report limit enforcement"`

---

**US-6: Upgrade Modal Component**

Create modal following existing modal patterns.

Props: `reason` ('report_limit' | 'chat_limit' | 'web_search_limit' | 'agent_access')

Dynamic messaging:
- report_limit: "You've used your free report. Upgrade to generate 20/month!"
- chat_limit: "Daily chat limit reached. Upgrade for 1000 messages/month!"
- web_search_limit: "Upgrade to Premium for 50 web searches/month"
- agent_access: "Agents are available on Premium. Upgrade now!"

Show pricing comparison: Free vs Premium ($29) vs Business ($99)

CTAs: "Upgrade to Premium" and "Upgrade to Business" → link to /pricing

**Commit:** `git commit -m "US-6: Add upgrade modal with tier comparison"`

---

### PRIORITY 3: CHAT & SEARCH

**US-7: Chat Limit Enforcement**

Add entitlement checks to chat functionality.

Before sending message:
1. Call `checkChatLimit(userId)`
2. Free tier: Allow 5/day on GPT-4o, then show upgrade modal
3. Premium tier: Allow 1000/month on GPT-4.5-mini
   - After 1000 → auto-switch to GPT-4o (unlimited)
   - Show banner: "Switched to GPT-4o (Premium messages used)"
4. Business tier: Allow 5000/month on GPT-4.5-mini, then auto-switch

After successful message: `incrementChatUsage(userId, model)`

Show counter in UI: "X/Y messages remaining this month"

**Commit:** `git commit -m "US-7: Add chat message limit enforcement"`

---

**US-8: Model Indicator in Chat**

Add badge to chat interface showing current model.

Badge displays: "GPT-4o" or "GPT-4.5-mini"
Color-coded: Green for premium model, Gray for free
Updates when switched due to limit
Include tooltip explaining model

**Commit:** `git commit -m "US-8: Add model indicator badge to chat"`

---

**US-9: Web Search Toggle with Limit**

Add web search toggle to chat interface if not present.

Before enabling:
1. Call `checkWebSearchLimit(userId)`
2. Free tier: Disabled with tooltip "Upgrade to Premium for 50 searches/month"
3. Premium: 50/month with counter, disabled after 50
4. Business: 250/month with counter

When search used: `incrementWebSearchUsage(userId)`

**Commit:** `git commit -m "US-9: Add web search limit enforcement"`

---

### PRIORITY 4-5: AGENTS

**US-10: Agent Library Paywall UI**

Add premium indicators to agent cards.

- Add "Premium" badge to all agents in library
- Free users: Cards have opacity overlay + lock icon
- Clicking agent → show upgrade modal (reason: 'agent_access')
- Premium/Business: Works normally

**Commit:** `git commit -m "US-10: Add premium badges to agent library"`

---

**US-11: Agent Usage Check**

Add backend enforcement.

Before agent execution:
1. Call `checkAgentAccess(userId)`
2. If free tier → return error: {error: 'PREMIUM_REQUIRED'}
3. Frontend catches error → show upgrade modal
4. Premium/Business → proceed normally

**Commit:** `git commit -m "US-11: Add agent access enforcement"`

---

### PRIORITY 6: STRIPE INTEGRATION

**US-12: Pricing Page Component**

Create /pricing page (check CODEBASE-PATTERNS.md for page location).

Three-column layout showing:

**Free ($0):**
- 1 report
- 5 chat/day (GPT-4o)
- 0 web searches
- View agents only

**Premium ($29/mo) - Highlighted:**
- 20 reports
- 1000 GPT-4.5-mini messages + unlimited GPT-4o
- 50 web searches
- Full agents

**Business ($99/mo):**
- 100 reports
- 5000 GPT-4.5-mini messages + unlimited GPT-4o
- 250 web searches
- Full agents

Show "Current Plan" badge if user on that tier.
CTAs: "Get Started" (Free), "Upgrade to Premium", "Upgrade to Business"
Responsive: Stack on mobile
Add FAQ section

**Commit:** `git commit -m "US-12: Add pricing comparison page"`

---

**US-13: Stripe Integration Setup**

Check for existing Stripe code first.

Create Stripe products in dashboard (can use dummy for now):
- "Rooftops Premium" - $29/month recurring
- "Rooftops Business" - $99/month recurring

Store price IDs in environment variables (follow existing naming convention).

Create checkout session API endpoint (follow existing API patterns):
- Accepts: priceId
- Requires: Authentication
- Returns: checkout session URL
- Configure success_url and cancel_url

**Commit:** `git commit -m "US-13: Add Stripe checkout session creation"`

---

**US-14: Checkout Flow**

Upgrade buttons call checkout API:
1. Call /api/create-checkout-session with priceId
2. Show loading spinner
3. Redirect to Stripe checkout URL
4. success_url: /checkout/success?session_id={CHECKOUT_SESSION_ID}
5. cancel_url: /pricing?canceled=true

Handle errors with user-friendly messages.

**Commit:** `git commit -m "US-14: Implement Stripe checkout redirect flow"`

---

**US-15: Webhook Handler for Subscriptions**

Create Stripe webhook endpoint (follow existing API patterns).

Handle raw body parsing, verify signature.

Process events:
- checkout.session.completed → Create subscription record
- customer.subscription.updated → Update status/dates
- customer.subscription.deleted → Mark cancelled
- invoice.payment_failed → Mark past_due

Update user_subscriptions table with tier, stripe IDs, status, dates.

Configure webhook URL in Stripe dashboard.

**Commit:** `git commit -m "US-15: Add Stripe webhook handler"`

---

**US-16: Checkout Success Page**

Create /checkout/success page.

Show: "Welcome to Rooftops [Premium/Business]!"
Display tier features with checkmarks
Add confetti animation (optional)
CTA: "Start Analyzing Properties" → /explore

Fetch subscription details from Stripe to show correct tier.

**Commit:** `git commit -m "US-16: Add checkout success page"`

---

### PRIORITY 7: DASHBOARD

**US-17: Usage Counter Component**

Create usage counter component following existing patterns.

Create /api/usage endpoint to fetch user usage.

Display:
- Reports: X/Y (progress bar)
- Chat: X/Y (progress bar)
- Searches: X/Y (progress bar)

Color-coded: Green (<75%), Yellow (75-90%), Red (>90%)
Update optimistically after actions
Place in header or sidebar

**Commit:** `git commit -m "US-17: Add usage counter display"`

---

**US-18: Account Settings Page**

Create /account page.

Show:
- Current tier badge
- Billing cycle
- Next billing date
- Payment method (last 4)
- Usage summary

Buttons:
- "Update Payment Method" → Stripe portal
- "Cancel Subscription" → confirmation → Stripe cancel
- "View Billing History" → Stripe portal

If free tier: Show "Upgrade" CTA

**Commit:** `git commit -m "US-18: Add account settings page"`

---

**US-19: Stripe Customer Portal Integration**

Create /api/create-portal-session endpoint.

Create Stripe billing portal session.
Set return_url to /account.

Configure portal to allow:
- Update payment method
- Cancel subscription
- View invoices

**Commit:** `git commit -m "US-19: Add Stripe customer portal integration"`

---

### PRIORITY 8: UX ENHANCEMENTS

**US-20: Usage Limit Warning Toasts**

Add toast notifications (use existing toast system or install react-hot-toast).

Show toasts at:
- 80% report limit: "You've used 16/20 reports. Upgrade for more!"
- 90% chat limit: "You've used 900/1000 messages"
- 80% search limit: "You've used 40/50 searches"

Include "Upgrade" link in toast.
Show once per session (use localStorage).

**Commit:** `git commit -m "US-20: Add usage warning toasts"`

---

**US-21: Empty States for Features**

Add helpful empty states:

- Explore page (no reports): Show illustration + "Analyze your first property"
- Chat page (no messages): Show example prompts
- Agent library (free user): "Upgrade to unlock AI agents"

**Commit:** `git commit -m "US-21: Add empty states with CTAs"`

---

**US-22: Onboarding Flow for New Users**

After signup, show welcome modal:

Steps:
1. "Analyze your first property" → /explore
2. "Try the AI chat" → /chat
3. "Explore pricing" → /pricing

Can skip or dismiss.
Mark completed in user profile.

**Commit:** `git commit -m "US-22: Add onboarding welcome modal"`

---

**US-23: Loading States During Generation**

Add professional loading indicators:

- Report generation: Spinner + "Analyzing property..."
- Chat: Typing indicator with animated dots
- Agent: "Agent working..." with spinner
- Checkout: "Redirecting to secure checkout..."

Use skeleton loaders where appropriate.

**Commit:** `git commit -m "US-23: Add loading states for async operations"`

---

### PRIORITY 9: EDGE CASES

**US-24: Payment Failure Handling**

When subscription status is 'past_due':
- Show banner: "Payment failed. Update payment method"
- Allow tier access for 7 days grace period
- After 7 days → downgrade to free tier

Banner has "Update Payment Method" button → Stripe portal.

**Commit:** `git commit -m "US-24: Add payment failure grace period"`

---

**US-25: Subscription Cancellation Flow**

When user cancels:
- Keep tier active until current_period_end
- Show message: "Your [tier] plan is active until [date]"
- After end date → auto-downgrade to free
- Allow reactivation before end date

**Commit:** `git commit -m "US-25: Handle subscription cancellations"`

---

**US-26: Upgrade/Downgrade Logic**

Handle tier changes:

Upgrading Premium → Business:
- Pro-rate remaining time
- Apply credit automatically (Stripe handles)
- Update limits immediately

Downgrading Business → Premium:
- Change at end of period
- Show: "Downgrade scheduled for [date]"

**Commit:** `git commit -m "US-26: Handle tier upgrades and downgrades"`

---

### PRIORITY 10: EXISTING FEATURE FIXES

**US-27: Fix Property Report Image Loading**

Examine why images don't load in reports.

Check:
- Are images Base64? URLs? Blob storage?
- CORS issues?
- Path issues?
- How are they passed to report component?

Fix root cause:
- Ensure images from all sources load correctly
- Handle errors with placeholders
- Test with multiple properties

**Commit:** `git commit -m "US-27: Fix property report image loading"`

---

**US-28: Replace Roof Segments with AI Summary**

On Roof tab:
- Remove Solar API segment details (don't match agent data)
- Find AI-generated summary from agent analysis
- Display summary instead: condition, findings, recommendations
- Keep valuable data: area, pitch, complexity

**Commit:** `git commit -m "US-28: Replace roof segments with AI summary"`

---

**US-29: Fix AI Chat Functionality**

Debug why chat returns "Sorry I encountered an error".

Check:
- API configuration
- API keys
- Endpoints
- Authentication
- CORS
- Request format

Fix root cause.
Add proper error handling with specific messages.

**Commit:** `git commit -m "US-29: Fix AI chat error handling"`

---

**US-30: Fix Solar Tab Data Display**

Solar tab shows "no data available" but API has data.

Parse Solar API response:
- Extract: system size (kW), production (kWh), savings
- Display metrics properly formatted
- Show segment-level suitability if available
- Handle cases where data truly unavailable

**Commit:** `git commit -m "US-30: Display solar data from API response"`

---

### PRIORITY 11: TESTING INFRASTRUCTURE

**US-31: Create Demo Accounts for Testing**

Create seed script or database entries for test accounts.

Create 3 demo accounts:
- demo-free@rooftops.test (tier: 'free', 1 report used, 3 chat messages today)
- demo-premium@rooftops.test (tier: 'premium', 8/20 reports, 450/1000 messages, 22/50 searches)
- demo-business@rooftops.test (tier: 'business', 45/100 reports, 2300/5000 messages, 120/250 searches)

Set simple passwords or use passwordless auth.
stripe_customer_id and stripe_subscription_id can be NULL.

Document credentials in README.

**Commit:** `git commit -m "US-31: Add demo accounts for tier testing"`

---

**US-32: End-to-End Testing with Demo Accounts**

Test all three tiers:

**As demo-free:**
- Generate 1 report → works
- Try 2nd report → upgrade modal
- Send 5 messages → limit modal
- Try agents → premium badges + upgrade modal

**As demo-premium:**
- Check usage counters (8/20, 450/1000, 22/50)
- Generate reports → counter decrements
- Use chat → counter decrements
- Use search → counter decrements
- Use agents → works

**As demo-business:**
- Verify higher limits (45/100, 2300/5000, 120/250)
- All features work

Document any issues in progress.txt.

**Commit:** `git commit -m "US-32: Verify tier system with demo accounts"`

---

### PRIORITY 12: POLISH

**US-33: Mobile Responsiveness Check**

Test at 375px width:
- Pricing page stacks vertically
- Modals: full width, proper padding
- Usage counters: visible and readable
- Account settings: readable
- No horizontal scroll
- Touch targets: 44px minimum

**Commit:** `git commit -m "US-33: Verify mobile responsiveness"`

---

**US-34: Accessibility Audit**

Ensure accessibility:
- Modals: keyboard accessible (ESC, TAB, ENTER)
- Usage counters: aria-labels
- Premium badges: aria-labels
- Color contrast: WCAG AA (4.5:1)
- Focus indicators visible
- Run Lighthouse: Accessibility 90+

**Commit:** `git commit -m "US-34: Accessibility improvements"`

---

**US-35: Performance Optimization**

Optimize for performance:
- Cache entitlement checks (5 minutes)
- Usage counters: optimistic updates
- Lazy load Stripe checkout script
- Pricing page: <2 seconds
- Entitlement checks: <100ms
- Run Lighthouse: Performance 85+

**Commit:** `git commit -m "US-35: Performance optimizations"`

---

**US-36: Final Verification**

Verify all 36 stories complete:

1. ✅ Property report images load
2. ✅ Roof tab shows AI summary
3. ✅ AI Chat works
4. ✅ Solar tab displays data
5. ✅ Free tier: 1 report, 5 chat/day, locked agents
6. ✅ Premium tier: 20 reports, 1000 messages, 50 searches, agents
7. ✅ Business tier: 100 reports, 5000 messages, 250 searches, agents
8. ✅ Pricing page works
9. ✅ Usage counters update
10. ✅ All limits enforce properly
11. ✅ Mobile responsive
12. ✅ Accessible
13. ✅ No console errors
14. ✅ TypeScript compiles

**Commit:** `git commit -m "US-36: Final verification complete"`

---

## ITERATION INSTRUCTIONS

After completing each story:

1. **Type Check:** Ensure TypeScript compiles without errors
2. **Test:** Run tests if test suite exists (tests must pass)
3. **Commit:** `git commit -m "US-X: [story title]"`
4. **Log Progress:** Update progress.txt with:
   - What was implemented
   - Which patterns were used
   - Any adaptations made
   - Learnings for future stories
5. **Continue:** Move to next story in priority order

If stuck after 5 attempts on same story:
- Document blocker in progress.txt
- Mark story as "NEEDS_MANUAL_FIX"
- Move to next story
- Continue until all stories attempted

---

## COMPLETION SIGNAL

When all 36 stories are complete and verified, output:

**<promise>TIER_SYSTEM_COMPLETE</promise>**

This signals successful completion of the entire tier system implementation.

---

## FILES TO REFERENCE

- **This prompt:** Contains all 36 stories
- **CODEBASE-PATTERNS.md:** Your discoveries from US-0 (create this first!)
- **progress.txt:** Your running log of what's been done

---

## REMEMBER

- **Adapt to actual codebase** - Don't force suggested patterns
- **Commit after each story** - Keep git history clean
- **Document adaptations** - Future you will thank you
- **Test as you go** - Don't wait until the end
- **Focus on outcomes** - Working features > perfect implementation

---

You have 50 iterations to complete this mission. Go!
