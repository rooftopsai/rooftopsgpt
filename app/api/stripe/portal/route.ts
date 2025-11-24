// app/api/stripe/portal/route.ts

import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getServerProfile } from '@/lib/server/server-chat-helpers';
import { getSubscriptionByUserId } from '@/db/subscriptions';

export async function POST() {
  try {
    const profile = await getServerProfile();

    if (!profile?.user_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get subscription to find Stripe customer ID
    const subscription = await getSubscriptionByUserId(profile.user_id);

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_URL}`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
