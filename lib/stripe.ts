// lib/stripe.ts
// This file is for SERVER-SIDE ONLY usage (API routes, server components)
// For constants that can be used in client components, import from './stripe-config'

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
});

// Re-export constants for convenience (but they can also be imported from stripe-config)
export { STRIPE_PRICE_IDS, PLANS, type PlanType } from './stripe-config';