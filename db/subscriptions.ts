// db/subscriptions.ts
import { supabase } from '@/lib/supabase/service-role';
import { Tables, TablesInsert, TablesUpdate } from '@/supabase/types';

export type Subscription = Tables<'subscriptions'>;
export type SubscriptionInsert = TablesInsert<'subscriptions'>;
export type SubscriptionUpdate = TablesUpdate<'subscriptions'>;

export async function getSubscriptionByUserId(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Error fetching subscription: ${error.message}`);
  }

  return data;
}

export async function getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Error fetching subscription: ${error.message}`);
  }

  return data;
}

export async function createSubscription(subscription: SubscriptionInsert): Promise<Subscription> {
  const { data, error } = await supabase
    .from('subscriptions')
    .insert(subscription)
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating subscription: ${error.message}`);
  }

  return data;
}

export async function updateSubscription(
  stripeSubscriptionId: string,
  updates: SubscriptionUpdate
): Promise<Subscription> {
  const { data, error } = await supabase
    .from('subscriptions')
    .update(updates)
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Error updating subscription: ${error.message}`);
  }

  return data;
}

export async function upsertSubscription(subscription: SubscriptionInsert): Promise<Subscription> {
  const { data, error } = await supabase
    .from('subscriptions')
    .upsert(subscription, {
      onConflict: 'user_id',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Error upserting subscription: ${error.message}`);
  }

  return data;
}