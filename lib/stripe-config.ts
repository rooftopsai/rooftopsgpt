// lib/stripe-config.ts
// This file contains constants that can be safely imported in both client and server components

// Stripe price IDs for your subscription plans (TEST MODE)
export const STRIPE_PRICE_IDS = {
  premium: "price_1SWUd2La49gFMOt6XzOeOePh", // Rooftops AI Premium - $29/month
  business: "price_1SWUdKLa49gFMOt6ij7fwsyl" // Rooftops AI Business - $99/month
}

// Plan configurations
export const PLANS = {
  FREE: {
    name: "Free",
    price: 0,
    features: {
      chatMessages: 20,
      propertyReports: 1, // 1 free report
      weatherLookups: 5,
      documentGenerations: 0,
      teamMembers: 1
    }
  },
  PREMIUM: {
    name: "Premium",
    priceMonthly: 29,
    stripeId: "premium",
    features: {
      chatMessages: 1000,
      propertyReports: 10, // 10 reports per month on $29 plan
      weatherLookups: "unlimited",
      documentGenerations: 50,
      teamMembers: 1
    }
  },
  BUSINESS: {
    name: "Business",
    priceMonthly: 99,
    stripeId: "business",
    features: {
      chatMessages: 5000,
      propertyReports: "unlimited", // Unlimited reports on $99 plan
      weatherLookups: "unlimited",
      documentGenerations: "unlimited",
      teamMembers: 10
    }
  }
} as const

export type PlanType = keyof typeof PLANS
