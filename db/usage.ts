// db/usage.ts
import { supabase } from '@/lib/supabase/service-role';
import { Tables, TablesInsert } from '@/supabase/types';

export type FeatureUsage = Tables<'feature_usage'>;
export type FeatureUsageInsert = TablesInsert<'feature_usage'>;

export type FeatureType = 
  | 'chat_messages'
  | 'property_reports'
  | 'weather_lookups'
  | 'document_creation';

export async function trackFeatureUsage(
  userId: string,
  feature: FeatureType,
  quantity: number = 1
): Promise<void> {
  const currentDate = new Date();
  const monthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const { error } = await supabase
    .from('feature_usage')
    .insert({
      user_id: userId,
      feature,
      quantity,
      month_year: monthYear,
    });

  if (error) {
    throw new Error(`Error tracking feature usage: ${error.message}`);
  }
}

export async function getMonthlyUsage(
  userId: string,
  feature: FeatureType,
  monthYear?: string
): Promise<number> {
  const currentDate = new Date();
  const targetMonthYear = monthYear || `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('feature_usage')
    .select('quantity')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('month_year', targetMonthYear);

  if (error) {
    throw new Error(`Error fetching usage: ${error.message}`);
  }

  return data.reduce((total, usage) => total + usage.quantity, 0);
}

export async function getAllMonthlyUsage(
  userId: string,
  monthYear?: string
): Promise<Record<FeatureType, number>> {
  const currentDate = new Date();
  const targetMonthYear = monthYear || `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('feature_usage')
    .select('feature, quantity')
    .eq('user_id', userId)
    .eq('month_year', targetMonthYear);

  if (error) {
    throw new Error(`Error fetching all usage: ${error.message}`);
  }

  const usage: Record<FeatureType, number> = {
    chat_messages: 0,
    property_reports: 0,
    weather_lookups: 0,
    document_creation: 0,
  };

  data.forEach((item) => {
    if (item.feature in usage) {
      usage[item.feature as FeatureType] += item.quantity;
    }
  });

  return usage;
}

export async function checkFeatureLimit(
  userId: string,
  feature: FeatureType,
  planLimits: Record<FeatureType, number | 'unlimited'>
): Promise<{
  canUse: boolean;
  currentUsage: number;
  limit: number | 'unlimited';
  remainingUsage: number | 'unlimited';
}> {
  const limit = planLimits[feature];
  
  if (limit === 'unlimited') {
    return {
      canUse: true,
      currentUsage: 0,
      limit: 'unlimited',
      remainingUsage: 'unlimited',
    };
  }

  const currentUsage = await getMonthlyUsage(userId, feature);
  const remainingUsage = Math.max(0, limit - currentUsage);
  
  return {
    canUse: currentUsage < limit,
    currentUsage,
    limit,
    remainingUsage,
  };
}