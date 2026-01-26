#!/bin/bash

# Test script for Ads Conversion Tracker API

BASE_URL="http://localhost:3001"

echo "🧪 Testing Ads Conversion Tracker API"
echo "======================================"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing Health Check..."
curl -s "$BASE_URL/health" | jq . || echo "❌ Health check failed"
echo ""

# Test 2: Create Lead
echo "2️⃣  Testing Lead Capture..."
LEAD_RESPONSE=$(curl -s -X POST "$BASE_URL/api/leads" \
  -H "Content-Type: application/json" \
  -d '{
    "telefone": "(11) 98765-4321",
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "summer_sale",
    "utm_content": "ad_1",
    "utm_term": "produto"
  }')

echo "$LEAD_RESPONSE" | jq .
LEAD_ID=$(echo "$LEAD_RESPONSE" | jq -r '.lead.id' 2>/dev/null)
echo ""

# Test 3: Get Lead
if [ ! -z "$LEAD_ID" ] && [ "$LEAD_ID" != "null" ]; then
  echo "3️⃣  Testing Get Lead..."
  PHONE=$(echo "$LEAD_RESPONSE" | jq -r '.lead.telefone' 2>/dev/null)
  curl -s "$BASE_URL/api/leads/$PHONE" | jq . || echo "❌ Get lead failed"
  echo ""
fi

# Test 4: Create Conversion
echo "4️⃣  Testing Conversion Creation..."
if [ ! -z "$LEAD_ID" ] && [ "$LEAD_ID" != "null" ]; then
  CONVERSION_RESPONSE=$(curl -s -X POST "$BASE_URL/api/conversions" \
    -H "Content-Type: application/json" \
    -d '{
      "codigo_venda": "VENDA-001-'$(date +%s)'",
      "valor_venda": 299.90,
      "observacoes": "Cliente (11) 98765-4321 - Produto XYZ",
      "canal": "comercial",
      "data_venda": "'$(date -u +'%Y-%m-%dT%H:%M:%SZ')'"
    }')
  
  echo "$CONVERSION_RESPONSE" | jq .
  CONVERSION_ID=$(echo "$CONVERSION_RESPONSE" | jq -r '.conversion.id' 2>/dev/null)
  echo ""
  
  # Test 5: Get Conversion
  if [ ! -z "$CONVERSION_ID" ] && [ "$CONVERSION_ID" != "null" ]; then
    echo "5️⃣  Testing Get Conversion..."
    curl -s "$BASE_URL/api/conversions/$CONVERSION_ID" | jq . || echo "❌ Get conversion failed"
    echo ""
  fi
fi

# Test 6: Get Stats
echo "6️⃣  Testing Statistics..."
curl -s "$BASE_URL/health/stats?days=30" | jq . || echo "❌ Stats failed"
echo ""

echo "✅ Tests completed!"
