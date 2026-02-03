#!/bin/bash

# Script para testar suporte a shopify_data nos endpoints

API_URL="http://localhost:3001/api/external"
API_KEY="default-api-key-change-in-production"

echo "🧪 Testando suporte a shopify_data"
echo "===================================="
echo ""

# Test 1: Criar lead com shopify_data
echo "📋 Teste 1: Criar lead com shopify_data"
echo "POST /api/external/leads com shopify_data"
curl -s -X POST "$API_URL/leads" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "telefone": "(11) 99999-9999",
    "utm_source": "shopify",
    "utm_medium": "organic",
    "utm_campaign": "shopify_integration",
    "shopify_data": {
      "customer_id": "gid://shopify/Customer/123456789",
      "customer_email": "customer@example.com",
      "customer_name": "João Silva",
      "order_id": "gid://shopify/Order/987654321",
      "order_number": "#1001",
      "total_price": "299.90",
      "currency": "BRL",
      "tags": ["vip", "newsletter", "repeat-customer"],
      "source": "shopify_storefront"
    }
  }' | jq '.'
echo ""
echo ""

# Test 2: Criar múltiplos leads com shopify_data
echo "📋 Teste 2: Criar múltiplos leads com shopify_data"
echo "POST /api/external/leads/batch com shopify_data"
curl -s -X POST "$API_URL/leads/batch" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "leads": [
      {
        "telefone": "(21) 98888-8888",
        "utm_campaign": "shopify_batch_1",
        "shopify_data": {
          "customer_id": "cust_001",
          "order_id": "order_001",
          "total_price": "150.00"
        }
      },
      {
        "telefone": "(31) 97777-7777",
        "utm_campaign": "shopify_batch_2",
        "shopify_data": {
          "customer_id": "cust_002",
          "order_id": "order_002",
          "total_price": "250.00"
        }
      }
    ]
  }' | jq '.'
echo ""
echo ""

# Test 3: Validação - shopify_data inválido (array em vez de objeto)
echo "📋 Teste 3: Validação - shopify_data inválido (array)"
echo "POST /api/external/leads com shopify_data inválido"
curl -s -X POST "$API_URL/leads" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "telefone": "(41) 96666-6666",
    "shopify_data": ["invalid", "array"]
  }' | jq '.'
echo ""
echo ""

# Test 4: Listar leads e verificar shopify_data
echo "📋 Teste 4: Listar leads e verificar shopify_data"
echo "GET /api/external/leads?status=novo&limit=3"
curl -s -X GET "$API_URL/leads?status=novo&limit=3" \
  -H "X-API-Key: $API_KEY" | jq '.leads[] | {telefone, shopify_data}'
echo ""
echo ""

# Test 5: Buscar lead específico com shopify_data
echo "📋 Teste 5: Buscar lead específico com shopify_data"
echo "GET /api/external/leads/11999999999"
curl -s -X GET "$API_URL/leads/11999999999" \
  -H "X-API-Key: $API_KEY" | jq '.lead | {telefone, shopify_data}'
echo ""
echo ""

echo "✅ Testes de shopify_data concluídos!"
