// app/api/subscription/route.ts

import { NextResponse } from 'next/server';
import { getServerProfile } from '@/lib/server/server-chat-helpers';
import { getSubscriptionByUserId } from '@/db/subscriptions';

export async function GET() {
  try {
    const profile = await getServerProfile();

    if (!profile?.user_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's subscription
    const subscription = await getSubscriptionByUserId(profile.user_id);

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
