#!/bin/bash
# Script to reset subscription for testing

USER_ID="759d673b-f7e1-4bbb-b971-2d33c3973156"

echo "🗑️  Deleting subscription for user $USER_ID..."

/opt/homebrew/opt/postgresql@14/bin/psql "postgresql://postgres.hgmmcarutpmbxvkbsnpx:IB1N38cCCRbyOIDq@aws-1-us-east-1.pooler.supabase.com:5432/postgres" -c "DELETE FROM subscriptions WHERE user_id = '$USER_ID';"

echo ""
echo "✅ Verifying deletion..."

/opt/homebrew/opt/postgresql@14/bin/psql "postgresql://postgres.hgmmcarutpmbxvkbsnpx:IB1N38cCCRbyOIDq@aws-1-us-east-1.pooler.supabase.com:5432/postgres" -c "SELECT COUNT(*) as remaining_subscriptions FROM subscriptions WHERE user_id = '$USER_ID';"

echo ""
echo "✅ Done! Refresh your browser to see free tier UI:"
echo "   - 'Upgrade to Pro' button should appear"
echo "   - Crown icon should disappear from logo"
