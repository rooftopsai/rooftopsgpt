// app/api/stripe/create-subscription/route.ts
// DEVELOPMENT ONLY - Workaround for webhooks not working on localhost
// In production, subscription creation happens via webhook

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getServerProfile } from '@/lib/server/server-chat-helpers';
import { upsertSubscription } from '@/db/subscriptions';

export async function POST(req: NextRequest) {
  try {
    const profile = await getServerProfile();

    if (!profile?.user_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    if (!session.subscription || typeof session.subscription === 'string') {
      return NextResponse.json(
        { error: 'No subscription found in session' },
        { status: 400 }
      );
    }

    const subscription = session.subscription;
    const customer = session.customer;

    // Determine plan type from the price ID
    const priceId = subscription.items.data[0]?.price.id;
    let planType: 'premium' | 'business' = 'premium';

    if (priceId === 'price_1SWUdKLa49gFMOt6ij7fwsyl') {
      planType = 'business';
    }

    const subscriptionData = {
      user_id: profile.user_id,
      stripe_customer_id: typeof customer === 'string' ? customer : customer?.id || '',
      stripe_subscription_id: subscription.id,
      plan_type: planType,
      status: subscription.status as 'active' | 'canceled' | 'past_due' | 'trialing',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    };

    // Upsert will create or update based on user_id
    const savedSubscription = await upsertSubscription(subscriptionData);

    return NextResponse.json({
      success: true,
      subscription: savedSubscription
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
