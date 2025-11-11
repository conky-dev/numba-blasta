#!/bin/bash

# Templates API Testing Script
# Usage: ./test-templates-api.sh YOUR_JWT_TOKEN

TOKEN=$1

if [ -z "$TOKEN" ]; then
  echo "❌ Error: JWT token is required"
  echo "Usage: ./test-templates-api.sh YOUR_JWT_TOKEN"
  echo ""
  echo "To get a token:"
  echo "1. Sign up or log in at http://localhost:3000"
  echo "2. Open browser console"
  echo "3. Run: localStorage.getItem('auth_token')"
  exit 1
fi

API_URL="http://localhost:3000/api/templates"

echo "🧪 Testing Templates API"
echo "========================"
echo ""

# Test 1: List templates (should be empty initially)
echo "📋 Test 1: List all templates"
curl -s -X GET "$API_URL" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""
echo ""

# Test 2: Create a template
echo "✨ Test 2: Create a new template"
TEMPLATE_DATA='{
  "name": "Welcome Message",
  "content": "Hi {{firstName}}, welcome to {{companyName}}! Reply STOP to unsubscribe."
}'

CREATE_RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$TEMPLATE_DATA")

echo "$CREATE_RESPONSE" | jq '.'
TEMPLATE_ID=$(echo "$CREATE_RESPONSE" | jq -r '.template.id')
echo ""
echo "Created template ID: $TEMPLATE_ID"
echo ""
echo ""

# Test 3: Get single template
echo "🔍 Test 3: Get template by ID"
curl -s -X GET "$API_URL/$TEMPLATE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""
echo ""

# Test 4: Update template
echo "✏️  Test 4: Update template"
UPDATE_DATA='{
  "name": "Updated Welcome Message",
  "content": "Hello {{firstName}}, thanks for joining {{companyName}}! 🎉"
}'

curl -s -X PATCH "$API_URL/$TEMPLATE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_DATA" | jq '.'
echo ""
echo ""

# Test 5: Preview template (no auth needed)
echo "👁️  Test 5: Preview template with sample data"
PREVIEW_DATA='{
  "content": "Hi {{firstName}}, your order #{{orderNumber}} has shipped!",
  "sampleData": {
    "firstName": "John",
    "orderNumber": "12345"
  }
}'

curl -s -X POST "$API_URL/preview" \
  -H "Content-Type: application/json" \
  -d "$PREVIEW_DATA" | jq '.'
echo ""
echo ""

# Test 6: Search templates
echo "🔎 Test 6: Search templates"
curl -s -X GET "$API_URL?search=welcome" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""
echo ""

# Test 7: List templates again (should show our template)
echo "📋 Test 7: List all templates (after creation)"
curl -s -X GET "$API_URL" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""
echo ""

# Test 8: Delete template
echo "🗑️  Test 8: Delete template"
curl -s -X DELETE "$API_URL/$TEMPLATE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""
echo ""

# Test 9: Verify deletion
echo "✅ Test 9: Verify template was deleted"
curl -s -X GET "$API_URL/$TEMPLATE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""
echo ""

echo "========================"
echo "✅ All tests complete!"
echo ""
echo "Next steps:"
echo "1. Run the SQL migrations in Supabase (04_organizations.sql, 05_sms_templates.sql)"
echo "2. Sign up for a new account or use an existing one"
echo "3. Go to http://localhost:3000/dashboard/sms/templates"
echo "4. Create, edit, and delete templates in the UI!"

