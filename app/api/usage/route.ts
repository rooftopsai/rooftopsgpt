// app/api/usage/route.ts

import { NextResponse } from 'next/server';
import { getServerProfile } from '@/lib/server/server-chat-helpers';
import { checkUserFeatureAccess } from '@/lib/subscription-helpers';
import { FeatureType } from '@/types/subscription';

export async function GET() {
  try {
    const profile = await getServerProfile();

    if (!profile?.user_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get usage for all features
    const features: FeatureType[] = ['chat_messages', 'property_reports', 'weather_lookups', 'document_creation'];
    const usageData: Record<string, { used: number; limit: number | string }> = {};

    for (const feature of features) {
      const check = await checkUserFeatureAccess(profile.user_id, feature);
      usageData[feature] = {
        used: check.currentUsage,
        limit: check.limit
      };
    }

    return NextResponse.json(usageData);
  } catch (error) {
    console.error('Error fetching usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage' },
      { status: 500 }
    );
  }
}
