// app/api/stripe/webhook/route.ts
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { createSubscription, updateSubscription, getSubscriptionByStripeId } from '@/db/subscriptions';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature') as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error(`⚠️  Webhook signature verification failed.`, error.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log(`🔔 Received ${event.type} event`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('💰 Checkout session completed:', session.id);

        if (session.mode === 'subscription') {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          await createSubscription({
            user_id: session.metadata?.userId!,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            plan_type: session.metadata?.planType || 'pro',
            current_period_start: new Date(subscription.current_period_start * 1000),
            current_period_end: new Date(subscription.current_period_end * 1000),
          });

          console.log('✅ Subscription created in database');
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log('🔄 Subscription updated:', subscription.id);

        await updateSubscription(subscription.id, {
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000),
          current_period_end: new Date(subscription.current_period_end * 1000),
          cancel_at_period_end: subscription.cancel_at_period_end,
        });

        console.log('✅ Subscription updated in database');
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('❌ Subscription canceled:', subscription.id);

        await updateSubscription(subscription.id, {
          status: 'canceled',
        });

        console.log('✅ Subscription canceled in database');
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        
        if (invoice.subscription) {
          console.log('💳 Payment succeeded for subscription:', invoice.subscription);
          
          // Update subscription to active if it was past_due
          const subscription = await getSubscriptionByStripeId(invoice.subscription as string);
          if (subscription && subscription.status !== 'active') {
            await updateSubscription(invoice.subscription as string, {
              status: 'active',
            });
            console.log('✅ Subscription reactivated');
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        
        if (invoice.subscription) {
          console.log('💸 Payment failed for subscription:', invoice.subscription);
          
          await updateSubscription(invoice.subscription as string, {
            status: 'past_due',
          });
          console.log('⚠️ Subscription marked as past_due');
        }
        break;
      }

      default:
        console.log(`🤷‍♀️ Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}