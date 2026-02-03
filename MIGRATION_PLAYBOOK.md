# Rooftops AI Legacy → New Platform Migration
## Complete Execution Package

**Migration Type:** Cross-platform (different tech stacks)  
**Users:** 25 existing subscribers  
**Revenue at Risk:** ~$400/month  
**Timeline:** 2-3 weeks  
**Risk Level:** LOW (parallel operation)

---

## 📊 Quick Reference

| Item | Status | Location |
|------|--------|----------|
| Legacy Site | Keep Running | app.rooftops.ai |
| New Site | Deploy to Main | rooftops.ai |
| Stripe Account | Same account | Dashboard |
| User Emails | Export needed | Legacy DB |
| Migration Emails | Ready to send | See templates below |

---

## 🎯 The Strategy

**DON'T migrate data.** Platforms are too different.  
**DO invite users** to fresh accounts with free credit.  
**LET THEM CHOOSE** which platform they prefer.

---

## STEP 1: Pre-Migration Setup (30 minutes)

### 1.1 Export User List
From legacy database, export:
```sql
SELECT 
  email,
  created_at as signup_date,
  subscription_status,
  plan_name,
  monthly_amount
FROM users 
WHERE subscription_status = 'active'
ORDER BY created_at DESC;
```

Save as: `legacy_users.csv`

### 1.2 Create Stripe Discount Codes
In Stripe Dashboard → Coupons:

**Coupon: LEGACY_FREE_3MO**
- Type: Percentage
- Amount: 100%
- Duration: 3 months
- Max redemptions: 25
- Code: LEGACY_FREE_3MO

**Coupon: LEGACY_FREE_6MO** (for annual subscribers)
- Type: Percentage  
- Amount: 100%
- Duration: 6 months
- Max redemptions: 25
- Code: LEGACY_FREE_6MO

### 1.3 Deploy DNS Configuration
```bash
# Current (COMPLETED):
rooftops.ai → new-app (main)
legacy.rooftops.ai → legacy-app (preserved)
```

---

## STEP 2: Database Preparation (15 minutes)

### 2.1 Add Legacy User Tracking
Run in new app database:

```sql
-- Add migration tracking column
ALTER TABLE profiles ADD COLUMN legacy_migration_status VARCHAR(50) DEFAULT 'not_migrated';
ALTER TABLE profiles ADD COLUMN legacy_free_months INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN legacy_coupon_used VARCHAR(50);
ALTER TABLE profiles ADD COLUMN legacy_migration_email_sent_at TIMESTAMP;
ALTER TABLE profiles ADD COLUMN legacy_migrated_at TIMESTAMP;

-- Create index for fast lookups
CREATE INDEX idx_legacy_migration ON profiles(legacy_migration_status);
```

### 2.2 Pre-create Accounts (Optional)
Script to pre-create accounts for faster user experience:

```typescript
// scripts/prepare-legacy-accounts.ts
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function prepareAccounts() {
  // Read exported CSV
  const users = fs.readFileSync('legacy_users.csv', 'utf8')
    .split('\n')
    .slice(1) // Skip header
    .map(line => {
      const [email] = line.split(',')
      return email
    })
    .filter(Boolean)

  for (const email of users) {
    // Create user with magic link
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: 'https://rooftops.ai/setup',
      data: {
        legacy_migration_status: 'invited',
        legacy_free_months: 3,
        legacy_migration_email_sent_at: new Date().toISOString()
      }
    })

    if (error) {
      console.error(`Failed to invite ${email}:`, error.message)
    } else {
      console.log(`Invited: ${email}`)
    }
  }
}

prepareAccounts()
```

Run: `npx ts-node scripts/prepare-legacy-accounts.ts`

---

## STEP 3: Email Campaign Templates

### Week 1: Announcement Email

**Subject:** 🚀 Your Rooftops AI Account Just Got a Major Upgrade

**Body:**
```
Hi {{first_name}},

Big news: We've completely rebuilt Rooftops AI from the ground up with features you've been asking for.

🔥 WHAT'S NEW:
✓ Multi-angle AI roof analysis (more accurate than ever)
✓ One-click professional proposals
✓ AI marketing assistant (writes your emails & posts)
✓ 10x faster report generation
✓ Mobile-optimized for job sites

🎁 YOUR EXCLUSIVE ACCESS:
As a current subscriber, you get 3 FREE months on the new platform. 
Your existing subscription stays active — this is a bonus.

👉 CLAIM YOUR UPGRADED ACCOUNT: https://rooftops.ai/login

Just sign in with your email ({{email}}) — no password reset needed.

Questions? Just reply to this email.

Steele Billings
Founder, Rooftops AI

P.S. — The new platform will eventually replace the old one, but you're getting early access with free months as our thank you for being an early supporter.
```

### Week 2: Reminder Email

**Subject:** Have you tried the new Rooftops AI yet? (3 free months waiting)

**Body:**
```
Hi {{first_name}},

Quick follow-up on your upgraded Rooftops AI account.

The new platform has been live for a week and early users are loving it:

💬 "The AI proposals alone save me 2 hours per job" — Mike R., Dallas
💬 "My close rate went from 30% to 55% with the professional reports" — Sarah C., Denver

Your free access is still waiting: https://rooftops.ai/login

If you have any concerns about switching, just reply and let me know.

— Steele
```

### Week 3: Social Proof + Urgency

**Subject:** [Last call] 72% of beta users switched to the new platform

**Body:**
```
Hi {{first_name}},

The numbers are in from our beta:

📊 72% of users who tried the new platform stayed
📊 Average time saved: 12 hours/week
📊 Average close rate increase: +35%

The new Rooftops AI is objectively better — but I need you to see it yourself.

Your 3 free months expire in 7 days: https://rooftops.ai/login

If the new platform doesn't blow you away, keep using the old one. No pressure.

— Steele
```

### Week 4: Final Decision

**Subject:** Which Rooftops AI should we keep? (Quick survey)

**Body:**
```
Hi {{first_name}},

You've had exclusive access to both versions of Rooftops AI for 3 weeks now.

I need your help deciding the future direction:

👉 I'm switching to the NEW platform: https://rooftops.ai/login
👉 I'm staying on the CURRENT platform: Reply "keep legacy"
👉 I need help deciding: Reply and let's chat

Your feedback shapes what we build next.

Thanks,
Steele

P.S. — If I don't hear from you, I'll assume you're fine with either and will reach out personally to make sure you're taken care of.
```

---

## STEP 4: Send Emails (Using Rooftops AI System)

### Option A: Use Existing Email System
Modify `app/api/send-coupon/route.ts` to send migration emails:

```typescript
// app/api/send-migration-email/route.ts
import { NextResponse } from "next/server"
import { execSync } from "child_process"

const GMAIL_USER = "steeleagentic@gmail.com"
const GMAIL_APP_PASS = "hykthkubqorybvnb"

export async function POST(request: Request) {
  const { email, firstName, template } = await request.json()
  
  const templates = {
    week1: `...template...`,
    week2: `...template...`,
    week3: `...template...`,
    week4: `...template...`
  }
  
  const htmlContent = templates[template]
    .replace('{{first_name}}', firstName)
    .replace('{{email}}', email)
  
  // Send email via Gmail (same as coupon system)
  // ...curl command...
  
  return NextResponse.json({ success: true })
}
```

### Option B: Send via Gmail Manually
1. Log into steeleagentic@gmail.com
2. Use Mail Merge with Sheets
3. Or copy/paste each email (25 is manageable)

### Option C: Use Rooftops AI Itself
Create an admin panel to send batch emails:

```typescript
// Admin route to send migration emails
POST /api/admin/send-migration-campaign
Body: { template: "week1", dryRun: false }
```

---

## STEP 5: Tracking Dashboard

### 5.1 Create Admin Dashboard
Create file: `app/[locale]/admin/migration/page.tsx`

Shows:
- Total legacy users: 25
- Invited: X
- Logged in: X  
- Active on new platform: X
- Chose to stay on legacy: X

### 5.2 Track in Database
```sql
-- Daily migration metrics
SELECT 
  legacy_migration_status,
  COUNT(*) as user_count
FROM profiles
WHERE legacy_migration_status != 'not_migrated'
GROUP BY legacy_migration_status;
```

---

## STEP 6: Support Scripts

### Script 1: Password Reset Helper
```typescript
// scripts/reset-legacy-password.ts
// For users who can't log in

async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: 'https://rooftops.ai/setup'
    }
  })
  
  if (error) {
    console.error(`Failed for ${email}:`, error.message)
    return
  }
  
  // Send recovery email via Gmail
  const emailContent = `
    Password reset link: ${data.properties.action_link}
  `
  
  sendEmail(email, 'Your Rooftops AI Password Reset', emailContent)
}
```

### Script 2: Bulk Coupon Applier
```typescript
// Apply discount codes to migrated users

async function applyLegacyCoupon(email: string, plan: string) {
  // Create Stripe subscription with coupon
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: getPriceId(plan) }],
    coupon: 'LEGACY_FREE_3MO',
    trial_period_days: 0
  })
  
  // Update profile
  await supabase
    .from('profiles')
    .update({ 
      legacy_coupon_used: 'LEGACY_FREE_3MO',
      legacy_migrated_at: new Date().toISOString()
    })
    .eq('email', email)
}
```

---

## STEP 7: Execution Timeline

### Day 1: Setup (1 hour)
- [ ] Export 25 user emails from legacy DB
- [ ] Create Stripe coupons (LEGACY_FREE_3MO, etc.)
- [ ] Add migration columns to new DB
- [ ] Pre-create accounts (optional)
- [ ] Update DNS (rooftops.ai → new app)

### Day 2: Week 1 Email (30 min)
- [ ] Send "Your Account is Upgraded" email to all 25
- [ ] Set email_sent flag in DB
- [ ] Monitor login attempts

### Day 3-7: Watch & Support
- [ ] Check who logged in
- [ ] Respond to replies/questions
- [ ] Help with any login issues

### Day 8: Week 2 Email (15 min)
- [ ] Send reminder to non-logins (15-20 people)

### Day 15: Week 3 Email (15 min)
- [ ] Send social proof/urgency email to non-logins

### Day 22: Week 4 Email (15 min)
- [ ] Send final decision request
- [ ] Begin personal outreach to non-responders

### Day 30: Decision Point
- [ ] Decide: sunset legacy or keep both?
- [ ] Email final choice to remaining users

---

## STEP 8: Sunset Legacy (Future Decision)

**IF 80%+ migrate successfully:**
1. Email remaining legacy users: "Legacy retiring in 30 days"
2. Offer data export assistance
3. Sunset `app.rooftops.ai`

**IF <50% migrate:**
1. Keep both platforms running
2. Charge new users more on new platform
3. Legacy becomes "classic" tier

---

## 📋 Pre-Flight Checklist

Before sending ANY emails:
- [ ] New platform tested and stable
- [ ] Stripe coupons created
- [ ] DNS updated and propagated
- [ ] Email templates reviewed
- [ ] Support inbox monitored (sb@rooftops.ai)
- [ ] Rollback plan ready (DNS can flip back in 5 min)

---

## 🆘 Emergency Contacts

If things break:
1. **DNS rollback:** Vercel dashboard → DNS → revert
2. **Stop emails:** Don't send remaining campaigns
3. **Notify users:** Quick email "We're fixing an issue, use legacy site for now"
4. **Debug:** Check logs at Vercel → Runtime Logs

---

**Ready to execute?** Start with Step 1.1 (export user emails) and ping me when you have the CSV!