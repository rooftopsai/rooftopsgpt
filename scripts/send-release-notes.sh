#!/bin/bash
# Send Release Notes via Email
# Usage: ./scripts/send-release-notes.sh [VERSION]

VERSION=${1:-"2026.02.02-1"}
GMAIL_USER="steeleagentic@gmail.com"
GMAIL_APP_PASS="hykthkubqorybvnb"  # No spaces
TO_EMAIL="sb@rooftops.ai"
CC_EMAIL="steeleagentic@gmail.com"

# Check if release notes file exists
RELEASE_FILE="RELEASE_NOTES_v${VERSION}.txt"
if [ ! -f "$RELEASE_FILE" ]; then
    echo "❌ Release notes file not found: $RELEASE_FILE"
    echo "Run: ./scripts/generate-release-notes.sh first"
    exit 1
fi

# Read release notes
RELEASE_CONTENT=$(cat "$RELEASE_FILE")

# Create email subject
SUBJECT="🚀 Rooftops AI Release Notes v${VERSION}"

# Send via Gmail SMTP using curl
echo "📧 Sending release notes to $TO_EMAIL..."

# Create MIME message
BOUNDARY="----=_Part_$(date +%s)"

{
echo "From: Rooftops AI Releases <$GMAIL_USER>"
echo "To: $TO_EMAIL"
echo "Cc: $CC_EMAIL"
echo "Subject: $SUBJECT"
echo "MIME-Version: 1.0"
echo "Content-Type: multipart/alternative; boundary=\"$BOUNDARY\""
echo ""
echo "--$BOUNDARY"
echo "Content-Type: text/plain; charset=UTF-8"
echo ""
echo "$RELEASE_CONTENT"
echo ""
echo "--$BOUNDARY"
echo "Content-Type: text/html; charset=UTF-8"
echo ""
echo "<html><body><pre style='font-family: monospace; white-space: pre-wrap;'>"
echo "$RELEASE_CONTENT" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g'
echo "</pre></body></html>"
echo ""
echo "--${BOUNDARY}--"
} | curl -s --url "smtps://smtp.gmail.com:465" \
    --ssl-reqd \
    --mail-from "$GMAIL_USER" \
    --mail-rcpt "$TO_EMAIL" \
    --mail-rcpt "$CC_EMAIL" \
    --user "$GMAIL_USER:$GMAIL_APP_PASS" \
    --upload-file -

if [ $? -eq 0 ]; then
    echo "✅ Release notes sent successfully!"
    echo "   To: $TO_EMAIL"
    echo "   Cc: $CC_EMAIL"
else
    echo "❌ Failed to send email. Check credentials."
    exit 1
fi