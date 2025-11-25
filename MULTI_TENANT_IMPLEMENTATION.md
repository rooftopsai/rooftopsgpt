# Multi-Tenant SaaS Implementation Plan

## Overview
Converting Rooftops AI to a multi-tenant SaaS with Stripe subscriptions and global API keys.

## Infrastructure Status
✅ Database schema exists (subscriptions, feature_usage tables)
✅ Stripe client configured
✅ Subscription CRUD operations implemented
✅ Usage tracking functions implemented
✅ Stripe webhook handling implemented
✅ Plan definitions configured

## Implementation Steps

### 1. Global API Keys (IN PROGRESS)
- Move all LLM API keys to environment variables
- Remove API key fields from user profile
- Update all 8 chat routes to use env keys

### 2. Subscription Management
- Fix Stripe checkout to use Supabase auth (currently uses next-auth)
- Create subscription helper utilities
- Create customer portal route for managing subscriptions

### 3. Usage Tracking & Limits
- Add usage tracking to all chat API endpoints
- Create middleware to check subscription limits
- Implement paywall UI when limits are hit

### 4. Free Tier Friction Points
- Free: 20 messages/month, 5 weather lookups
- Pro: 1000 messages/month, unlimited weather, 20 property reports
- Team: 5000 messages/month, unlimited everything

### 5. UI Components
- Upgrade prompts/modals
- Pricing page
- Billing settings page
- Usage dashboard

## Environment Variables Needed
```
# Global LLM API Keys
GLOBAL_OPENAI_API_KEY=
GLOBAL_ANTHROPIC_API_KEY=
GLOBAL_GOOGLE_GEMINI_API_KEY=
GLOBAL_GROQ_API_KEY=
GLOBAL_MISTRAL_API_KEY=
GLOBAL_PERPLEXITY_API_KEY=
GLOBAL_OPENROUTER_API_KEY=
GLOBAL_AZURE_OPENAI_API_KEY=
GLOBAL_AZURE_OPENAI_ENDPOINT=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_MONTHLY_PRICE_ID=
STRIPE_PRO_YEARLY_PRICE_ID=
STRIPE_TEAM_MONTHLY_PRICE_ID=
STRIPE_TEAM_YEARLY_PRICE_ID=
```

## Files to Modify
- All 8 chat API routes (use global keys)
- components/utility/profile-settings.tsx (hide API key section)
- app/api/stripe/checkout/route.ts (fix auth)
- Create: lib/subscription-helpers.ts
- Create: components/paywall/upgrade-modal.tsx
- Create: app/[locale]/[workspaceid]/pricing/page.tsx
- Create: middleware for subscription checking
