#!/bin/bash
# Legacy User Migration Helper Script
# Usage: ./scripts/migrate-legacy-users.sh legacy_users.csv

set -e

CSV_FILE="${1:-legacy_users.csv}"

if [ ! -f "$CSV_FILE" ]; then
    echo "❌ Error: CSV file not found: $CSV_FILE"
    echo "Usage: ./scripts/migrate-legacy-users.sh path/to/users.csv"
    echo ""
    echo "CSV format: email,first_name,legacy_plan,monthly_amount"
    exit 1
fi

echo "🚀 Rooftops AI Legacy Migration Tool"
echo "======================================"
echo ""

# Count users
USER_COUNT=$(tail -n +2 "$CSV_FILE" | wc -l)
echo "📊 Found $USER_COUNT users in CSV"
echo ""

# Ask for confirmation
read -p "Send Week 1 migration emails to all users? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Cancelled"
    exit 0
fi

echo ""
echo "📧 Sending emails..."
echo ""

# Skip header, process each line
tail -n +2 "$CSV_FILE" | while IFS=',' read -r email first_name plan amount; do
    # Clean up email (remove whitespace)
    email=$(echo "$email" | xargs)
    first_name=$(echo "$first_name" | xargs)
    
    echo "→ Sending to: $email ($first_name)"
    
    # Call API to send email
    curl -s -X POST https://rooftopsdev.vercel.app/api/admin/send-migration-email \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"firstName\":\"$first_name\",\"template\":\"week1\"}" \
        > /dev/null
    
    # Small delay to avoid rate limits
    sleep 0.5
    
done

echo ""
echo "✅ All emails sent!"
echo ""
echo "📊 Check the migration dashboard:"
echo "   https://rooftopsdev.vercel.app/admin/migration"
echo ""
echo "⏰ Next steps:"
echo "   1. Monitor replies to sb@rooftops.ai"
echo "   2. Check who logs in (dashboard shows activity)"
echo "   3. Send Week 2 emails in 7 days"
echo "   4. Run: ./scripts/migration-week2.sh $CSV_FILE"