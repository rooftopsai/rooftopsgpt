# Rooftops AI Codebase Patterns

## Tech Stack

- **Framework**: Next.js 14 with App Router (`/app` directory)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Auth**: Supabase Auth (`@supabase/ssr` for server-side auth)
- **Styling**: Tailwind CSS with custom configuration
- **Components**: Shadcn UI (Radix UI primitives) + custom components
- **State Management**: Zustand for global state
- **Forms**: React Hook Form with Zod validation
- **Payments**: Stripe (already integrated with webhooks)
- **TypeScript**: Full TypeScript codebase

## File Organization

- **Components**: `/components` directory
  - UI primitives: `/components/ui` (dialog, button, toast, etc.)
  - Feature components: Organized by feature (chat, explore, property, agents, etc.)
- **Services/Utils**: `/lib` directory
  - Database queries: `/db` directory with typed queries
  - Supabase clients: `/lib/supabase` (server, browser-client, service-role)
  - Helper utilities: Various files in `/lib` (api-helpers, subscription-utils, etc.)
- **API Routes**: `/app/api` directory (Next.js App Router API routes)
  - Stripe: `/app/api/stripe` (checkout, webhook, portal, create-subscription)
- **Pages**: `/app/[locale]` directory (internationalized with i18next)
  - Dynamic routes: `[workspaceid]`, setup, login, pricing, etc.
- **Types**: `/types` directory for TypeScript type definitions
- **Database Migrations**: `/supabase/migrations` (SQL migration files)
- **Context**: `/context` directory for React Context providers

## Key Patterns

### Modal Pattern
- **Library**: Radix UI Dialog (`@radix-ui/react-dialog`)
- **Implementation**: `/components/ui/dialog.tsx` exports Dialog primitives:
  - `Dialog` (root component)
  - `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`
  - `DialogTitle`, `DialogDescription`
- **Styling**: Custom gradient backgrounds with backdrop blur
- **Usage**: Import from `@/components/ui/dialog` and compose modals

### Auth Pattern
- **Server-side**: Use `createClient()` from `/lib/supabase/server.ts` with cookies
- **Client-side**: Use client from `/lib/supabase/browser-client.ts`
- **Check auth**: `const { data: { user } } = await supabase.auth.getUser()`
- **User ID**: Available as `user.id` or `auth.uid()` in RLS policies

### Database Pattern
- **Queries**: Organized in `/db` directory by table (e.g., `/db/subscriptions.ts`)
- **Client**: Import Supabase client based on context (server vs browser)
- **Types**: Generated types in `/supabase/types.ts` using `npm run db-types`
- **Migrations**: SQL files in `/supabase/migrations` directory
- **RLS**: Row Level Security enabled on all user tables

### API Response Pattern
- **Success**: `return NextResponse.json({ data, success: true })`
- **Error**: `return NextResponse.json({ error: "message" }, { status: 400 })`
- **Retry Logic**: Use `fetchWithRetry()` from `/lib/api-helpers.ts` for resilience

### Toast Pattern
- **Library**: Sonner (`sonner` package)
- **Component**: `/components/ui/sonner.tsx` and `/components/ui/toaster.tsx`
- **Usage**: Import `toast` from `sonner` and call `toast.success()`, `toast.error()`, etc.

## Existing Subscription System

### Database Tables
- **subscriptions**: Already exists with fields:
  - `user_id`, `stripe_customer_id`, `stripe_subscription_id`
  - `status`, `plan_type` (free/premium/business)
  - `current_period_start`, `current_period_end`
  - `cancel_at_period_end`, `created_at`, `updated_at`
- **feature_usage**: Already exists with fields:
  - `user_id`, `feature`, `quantity`, `month_year`, `created_at`
  - Indexed on `(user_id, feature, month_year)` for performance

### Subscription Utils
- **File**: `/lib/subscription-utils.ts`
- **Types**: `PlanType`, `FeatureType`
- **Limits**: `PLAN_LIMITS` constant defines limits per plan
- **Current Limits** (in codebase):
  - Free: 20 chat messages, 1 report, 5 weather lookups
  - Premium: 1000 messages, 10 reports, unlimited weather
  - Business: 5000 messages, unlimited reports, unlimited weather

### Stripe Integration
- **Checkout**: `/app/api/stripe/checkout/route.ts`
- **Webhook**: `/app/api/stripe/webhook/route.ts` (handles subscription events)
- **Portal**: `/app/api/stripe/portal/route.ts` (customer portal session)
- **Create Subscription**: `/app/api/stripe/create-subscription/route.ts`

## Component Patterns

### Button Component
- **File**: `/components/ui/button.tsx`
- **Variants**: default, destructive, outline, secondary, ghost, link
- **Sizes**: default, sm, lg, icon

### Card Component
- **File**: `/components/ui/card.tsx`
- **Parts**: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter

### Form Pattern
- **Library**: React Hook Form + Zod
- **Components**: `/components/ui/form.tsx` exports Form primitives
- **Validation**: Use Zod schemas for validation

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (server-side only)
- Stripe keys (to be confirmed in .env)

## Testing
- **Framework**: Jest with React Testing Library
- **Config**: `jest.config.ts`
- **Tests**: `__tests__` directory
- **Run**: `npm test`

## Build & Development
- **Dev**: `npm run dev`
- **Build**: `npm run build`
- **Type Check**: `npm run type-check`
- **Lint**: `npm run lint` or `npm run lint:fix`
- **Format**: `npm run format:write`

## Notes for Implementation

1. **Adapt to existing patterns**: Use Supabase, not Prisma/Drizzle
2. **Use existing tables**: `subscriptions` and `feature_usage` tables already exist
3. **Follow modal pattern**: Use Radix Dialog with existing styling
4. **Use existing Stripe setup**: Webhook and checkout already configured
5. **Match file structure**: Put services in `/lib`, queries in `/db`, components in `/components`
6. **Use TypeScript types**: Reference `/supabase/types.ts` and create custom types in `/types`
7. **Follow API patterns**: Use NextResponse.json for API routes
8. **Use existing toast system**: Sonner is already set up
9. **Maintain consistency**: Follow existing naming conventions and code style
