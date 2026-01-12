#!/bin/bash

# Quick Fix for user_usage Table Missing
# This script applies the migration to create the user_usage table

echo "======================================"
echo "Fixing user_usage table..."
echo "======================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running"
    echo ""
    echo "You have two options:"
    echo ""
    echo "OPTION 1 (Recommended): Push to Remote Database"
    echo "----------------------------------------------"
    echo "1. Make sure you have your Supabase database password"
    echo "2. Run: npx supabase db push"
    echo "3. Enter your password when prompted"
    echo ""
    echo "OPTION 2: Start Docker and run locally"
    echo "--------------------------------------"
    echo "1. Start Docker Desktop"
    echo "2. Run: npx supabase start"
    echo "3. Run: npm run dev"
    echo ""
    exit 1
fi

echo "✅ Docker is running"
echo ""
echo "Starting Supabase locally..."
echo "This will apply all migrations including user_usage table"
echo ""

npx supabase start

if [ $? -eq 0 ]; then
    echo ""
    echo "======================================"
    echo "✅ Success! Supabase is running locally"
    echo "======================================"
    echo ""
    echo "The user_usage table has been created."
    echo "Your usage tracking should now work properly."
    echo ""
    echo "Next steps:"
    echo "1. Run: npm run dev"
    echo "2. Test the usage tracking in your app"
    echo ""
else
    echo ""
    echo "======================================"
    echo "❌ Failed to start Supabase"
    echo "======================================"
    echo ""
    echo "Try pushing to your remote database instead:"
    echo "npx supabase db push"
    echo ""
fi
