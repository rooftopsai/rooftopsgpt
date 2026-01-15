# Local Development - Stripe Portal Setup

## Issue
You're using a **live Stripe key** locally but your local database has no matching subscription data.

## Solution: Use Test Mode Locally

### Step 1: Get Your Stripe Test Key
1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your **Secret key** (starts with `sk_test_...`)

### Step 2: Update .env.local
Replace the live key with test key:
```bash
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_KEY_HERE
```

### Step 3: Create a Test Subscription
You have two options:

#### Option A: Use Stripe CLI (Easiest)
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Create a test customer
stripe customers create --email="test@example.com" --name="Test User"

# Note the customer ID (cus_xxxxx)
# Then manually add this to your local database subscriptions table
```

#### Option B: Go Through Checkout Flow
1. Start your local dev server: `npm run dev`
2. Go to http://localhost:3000/pricing
3. Click "Subscribe" 
4. Use Stripe test card: `4242 4242 4242 4242`
5. Use any future expiry date and any CVC
6. Complete checkout

### Step 4: Verify It Works
1. Go to My Account
2. Click "Manage Subscription"
3. Should open Stripe test portal

## Alternative: Use Production Data Locally (Advanced)

If you need to test with real subscriptions:

1. Keep the live Stripe key
2. Connect to production database (not recommended) OR
3. Copy specific subscription records from production to local:
   ```sql
   -- In production DB
   SELECT * FROM subscriptions WHERE user_id = 'your_user_id';
   
   -- Copy the results and insert into local DB
   ```

## Troubleshooting

**Error: "No Stripe customer ID"**
- Your local user account doesn't have a subscription in the database
- Create one using Option A or B above

**Error: "No such customer"**  
- Using live key with test customer ID (or vice versa)
- Make sure key mode matches your data

**Error: "test mode / live mode mismatch"**
- Stripe customer was created in test mode but you're using live key
- Use test key (`sk_test_...`) with test customers
