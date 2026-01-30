#!/bin/bash
# Complete the multi-agent refactor by replacing all HTTP calls with direct function calls

FILE="app/api/property-reports/multi-agent/route.ts"

# Backup the file
cp "$FILE" "${FILE}.backup"

# Replace measurement specialist call (line ~132)
sed -i '' '132,150s/const measurementResponse = await fetchWithRetry(/agentResults.measurement = await callAgent(/g' "$FILE"
sed -i '' '132,150s/`${baseUrl}\/api\/agents\/measurement-specialist`,/measurementSpecialistPOST,/g' "$FILE"
sed-i '' '132,150s/{$/  "Measurement Specialist",/g' "$FILE"
sed -i '' '132,150s/method: "POST",/{/g' "$FILE"
sed -i '' '132,150s/headers: { "Content-Type": "application\/json" },//g' "$FILE"
sed -i '' '132,150s/body: JSON.stringify({//g' "$FILE"
sed -i '' '145,150d' "$FILE"  # Remove the error checking lines
sed -i '' '145i\
      )
' "$FILE"

echo "Refactor complete! Check $FILE"
echo "Original backup saved as ${FILE}.backup"
