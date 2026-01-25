// lib/stripe-config.ts
// This file contains constants that can be safely imported in both client and server components

// Stripe price IDs for your subscription plans (LIVE PRODUCTION MODE)
export const STRIPE_PRICE_IDS = {
  premium_monthly: "price_1SWUJsLa49gFMOt641Bw8rZw", // Rooftops AI Premium - $29/month
  premium_annual: "price_1SrqwALa49gFMOt6kzWLdoh2", // Rooftops AI Premium - $25/month billed annually ($300/year)
  business_monthly: "price_1SWUMvLa49gFMOt6AZ7XpwLO", // Rooftops AI Business - $99/month
  business_annual: "price_1SrqyXLa49gFMOt6pGxKOn5u", // Rooftops AI Business - $84/month billed annually ($1008/year)
  ai_employee_monthly: process.env.STRIPE_AI_EMPLOYEE_MONTHLY_PRICE_ID || "", // AI Employee Pro - $199/month (set in env)
  ai_employee_annual: process.env.STRIPE_AI_EMPLOYEE_ANNUAL_PRICE_ID || "", // AI Employee Pro - $169/month billed annually ($2028/year)
  // Backwards compatibility
  premium: "price_1SWUJsLa49gFMOt641Bw8rZw",
  business: "price_1SWUMvLa49gFMOt6AZ7XpwLO",
  ai_employee: process.env.STRIPE_AI_EMPLOYEE_MONTHLY_PRICE_ID || ""
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
  },
  AI_EMPLOYEE: {
    name: "AI Employee Pro",
    priceMonthly: 199,
    stripeId: "ai_employee",
    features: {
      chatMessages: "unlimited",
      propertyReports: "unlimited",
      weatherLookups: "unlimited",
      documentGenerations: "unlimited",
      teamMembers: "unlimited",
      // AI Employee specific features
      voiceMinutes: 500,
      smsMessages: 1000,
      followUpSequences: "unlimited",
      crmContacts: "unlimited",
      activeJobs: "unlimited",
      crewManagement: true,
      invoicePayments: true,
      reviewManagement: true,
      twoWayConversations: true,
      speedToLead: true,
      knowledgeBase: "unlimited"
    }
  }
} as const

export type PlanType = keyof typeof PLANS
