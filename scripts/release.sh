#!/bin/bash
# Complete Release Workflow: Generate + Send
# Usage: ./scripts/release.sh [VERSION]

VERSION=${1:-$(date +"%Y.%m.%d")-1}

echo "🚀 Rooftops AI Release Workflow"
echo "================================"
echo "Version: $VERSION"
echo ""

# Step 1: Generate release notes
echo "📋 Step 1: Generating release notes..."
./scripts/generate-release-notes.sh > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️  Using existing release notes"
fi

# Step 2: Send email
echo "📧 Step 2: Sending release notes via email..."
./scripts/send-release-notes.sh "$VERSION"

# Step 3: Summary
echo ""
echo "✅ Release workflow complete!"
echo ""
echo "📊 Summary:"
echo "   Version: $VERSION"
echo "   Release notes: RELEASE_NOTES_v${VERSION}.txt"
echo "   Recipients: sb@rooftops.ai, steeleagentic@gmail.com"
echo "   Environment: https://rooftopsdev.vercel.app"
echo ""
echo "🎯 Next: Monitor conversion metrics for 48-72 hours"