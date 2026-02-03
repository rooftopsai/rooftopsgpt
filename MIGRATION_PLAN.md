# Rooftops AI Migration Plan

**Goal:** Move 25 existing subscribers from legacy app to new app without disrupting revenue

---

## Phase 1: Data Audit & Prep (1-2 days)

### 1.1 Assess Current State
```sql
-- Run on production database
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as paying_users,
  SUM(monthly_revenue) as mrr
FROM users;
```

**Questions to answer:**
- What database are you using? (Supabase, PostgreSQL, etc.)
- Are subscriptions in Stripe or your database?
- Any custom user data that needs migration?

### 1.2 Stripe Configuration Check
- Confirm new app uses same Stripe account
- Verify price IDs match between apps
- Test webhook endpoints

---

## Phase 2: Database Migration (1 day)

### Option A: Direct Migration (if same schema)
```bash
# Export prod data
pg_dump $PROD_DATABASE_URL > migration.sql

# Import to dev
psql $DEV_DATABASE_URL < migration.sql
```

### Option B: Script Migration (if schema changed)
Create migration script:
```typescript
// scripts/migrate-users.ts
import { createClient } from '@supabase/supabase-js'

async function migrateUsers() {
  const prod = createClient(prodUrl, prodKey)
  const dev = createClient(devUrl, devKey)
  
  // Get all users from prod
  const { data: users } = await prod
    .from('users')
    .select('*')
  
  // Transform if needed
  const transformedUsers = users.map(u => ({
    ...u,
    // Map old fields to new schema
    created_at: u.created_at,
    stripe_customer_id: u.stripe_customer_id,
    // etc.
  }))
  
  // Insert to dev
  await dev.from('users').upsert(transformedUsers)
}
```

---

## Phase 3: Testing (1-2 days)

### 3.1 Test Existing User Login
1. Pick 2-3 friendly customers
2. Give them rooftops.ai access
3. Have them test login, access reports, billing

### 3.2 Verify Stripe Integration
- Check subscription status displays correctly
- Test upgrade/downgrade flows
- Confirm webhook handling

### 3.3 Load Test
- Simulate all 25 users logging in simultaneously
- Verify database handles load

---

## Phase 4: Deploy Strategy

### Option A: Blue-Green (Recommended)

**COMPLETED:**
- DNS: `rooftops.ai` → new app (main)
- DNS: `legacy.rooftops.ai` → old app (preserved)

**Current Phase:** Production testing and validation
- DNS: `rooftops.ai` → new app
- Keep `legacy.rooftops.ai` for 30 days

### Option B: Gradual Migration

**Week 1:** New signups only
- New users: new app
- Existing: old app
- Both share database

**Week 2-3:** Invite existing users
- Email campaign: "Try the new experience"
- One-click migration button

**Week 4:** Full cutover
- All traffic to new app

---

## Phase 5: Rollback Plan

**If things go wrong:**
1. DNS flip `rooftops.ai` → old app (5 minutes)
2. Investigate issue
3. Fix and retry

**Database safety:**
- Keep prod database as read-only backup
- Don't delete anything for 30 days
- Monitor Stripe for failed payments

---

## Pre-Migration Checklist

- [ ] Export production database
- [ ] Verify Stripe webhooks work on new app
- [ ] Test login with 2-3 existing accounts on beta
- [ ] Confirm all 25 subscriptions show correctly
- [ ] Set up monitoring/alerts
- [ ] Prepare rollback DNS change
- [ ] Notify users of "enhanced experience" (not migration)

---

## Post-Migration Monitoring

**Watch for 48 hours:**
- Failed logins
- Subscription payment failures
- Support tickets
- User complaints

**Metrics to track:**
- Login success rate (target: >99%)
- Subscription churn (target: <5%)
- Page load times
- Error rates

---

## Risk Mitigation

**Biggest risks:**
1. **Users can't login** → Have manual password reset ready
2. **Subscriptions break** → Stripe dashboard to fix manually
3. **Data loss** → Keep backups, don't delete old app immediately

**Insurance:**
- Run both apps in parallel for 1 week
- Keep old app as `legacy.` subdomain
- Daily database backups

---

## Recommendation

**Do this:**
1. **Today:** Export prod database, import to dev
2. **Tomorrow:** Test 3 existing accounts on beta
3. **Day 3:** If tests pass, plan cutover for low-traffic time (Sunday morning)
4. **Day 4:** Execute cutover with rollback ready

**Don't do this:**
- Migrate Friday afternoon (weekend issues)
- Delete old app immediately
- Migrate without testing existing accounts first

---

## Questions for You

1. What's your current database? (Supabase, Postgres, etc.)
2. Are you using Stripe for subscriptions?
3. When's your lowest traffic time?
4. Do you have 2-3 friendly users who could test beta?

Once I know this, I can write the exact migration scripts.