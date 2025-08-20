#!/bin/bash

# Test script for the delivery platform API
# Make sure your development server is running on localhost:3000

echo "🚀 Testing Delivery Platform API"
echo "================================"

# Test quote creation
echo ""
echo "1. Creating a test quote..."
QUOTE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/quote \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+1234567890",
    "pickupAddress": "123 Main St, City, State",
    "dropoffAddress": "456 Oak Ave, City, State",
    "distanceMi": 5.5,
    "weightLb": 10
  }')

echo "Quote Response: $QUOTE_RESPONSE"

# Extract quote ID (requires jq for JSON parsing)
if command -v jq &> /dev/null; then
  QUOTE_ID=$(echo $QUOTE_RESPONSE | jq -r '.quoteId')
  echo "Quote ID: $QUOTE_ID"
  
  # Test checkout creation
  echo ""
  echo "2. Creating checkout session..."
  CHECKOUT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/checkout \
    -H "Content-Type: application/json" \
    -d "{\"quoteId\": \"$QUOTE_ID\"}")
  
  echo "Checkout Response: $CHECKOUT_RESPONSE"
  
  # Extract checkout URL
  CHECKOUT_URL=$(echo $CHECKOUT_RESPONSE | jq -r '.url')
  echo ""
  echo "✅ Success! Complete the test by:"
  echo "1. Opening this URL in your browser: $CHECKOUT_URL"
  echo "2. Use test card: 4242 4242 4242 4242"
  echo "3. Use any future expiry date and CVC"
  echo "4. After payment, check http://localhost:3000/dispatcher"
else
  echo ""
  echo "⚠️  Install 'jq' to parse JSON responses and continue testing"
  echo "   brew install jq  # macOS"
  echo "   apt install jq   # Ubuntu"
fi

echo ""
echo "🔍 Manual Testing Steps:"
echo "1. Open http://localhost:3000/quote"
echo "2. Fill out the form with test data"
echo "3. Complete Stripe checkout with test card 4242 4242 4242 4242"
echo "4. Verify order appears in http://localhost:3000/dispatcher"
