# Apply user_usage Table Migration

## Problem
The `user_usage` table doesn't exist in your database, causing the error:
```
[user-usage] Table user_usage not found. Run migrations: supabase start
```

## Solution

You have two options to apply the migration:

### Option 1: Push to Remote Database (Recommended)

If you're using a hosted Supabase project:

```bash
# Link your project if not already linked
npx supabase link --project-ref YOUR_PROJECT_REF

# Push the new migration to your remote database
npx supabase db push
```

### Option 2: Local Development

If you want to run Supabase locally:

```bash
# Make sure Docker Desktop is running, then:
npx supabase start

# This will:
# 1. Start local Supabase containers
# 2. Automatically apply all migrations including user_usage
# 3. Start the development server
```

## What the Migration Does

The migration file `20260112_add_tier_system_usage.sql` creates:

1. **user_usage table** with these fields:
   - `reports_generated` - Count of property reports
   - `chat_messages_premium` - Premium AI model usage
   - `chat_messages_free` - Free AI model usage
   - `web_searches` - Web search usage
   - `daily_chat_count` - Daily message count for free tier
   - `last_chat_date` - Date of last chat (for daily resets)

2. **Indexes** for fast queries
3. **RLS policies** for security
4. **Tier column** in subscriptions table

## Verify It Worked

After applying the migration, the usage tracking should work and you shouldn't see the warning messages anymore.

You can verify by checking:
```bash
# If using remote database
npx supabase db remote diff

# The output should show no pending migrations
```

## Troubleshooting

**"Docker daemon not running"**
- Start Docker Desktop
- Or use Option 1 (push to remote)

**"Project not linked"**
- Run `npx supabase link --project-ref YOUR_PROJECT_REF`
- Get your project ref from the Supabase dashboard URL

**Still seeing errors?**
- Check your database connection in `.env.local`
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
