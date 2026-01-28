#!/bin/bash

# Script para testar endpoints externos da API

API_URL="http://localhost:3001/api/external"
API_KEY="default-api-key-change-in-production"

echo "🧪 Testando endpoints externos da API"
echo "======================================"
echo ""

# Test 1: Health check (sem autenticação)
echo "📋 Teste 1: Health check (sem autenticação)"
echo "GET /api/external/health"
curl -s -X GET "$API_URL/health" | jq '.'
echo ""
echo ""

# Test 2: Criar um novo lead
echo "📋 Teste 2: Criar um novo lead"
echo "POST /api/external/leads"
curl -s -X POST "$API_URL/leads" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "telefone": "(11) 98765-4321",
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "teste_api_externa",
    "utm_content": "anuncio_1"
  }' | jq '.'
echo ""
echo ""

# Test 3: Criar lead sem API key (deve falhar)
echo "📋 Teste 3: Criar lead sem API key (deve falhar)"
echo "POST /api/external/leads (sem autenticação)"
curl -s -X POST "$API_URL/leads" \
  -H "Content-Type: application/json" \
  -d '{
    "telefone": "(21) 99999-8888"
  }' | jq '.'
echo ""
echo ""

# Test 4: Criar múltiplos leads em batch
echo "📋 Teste 4: Criar múltiplos leads em batch"
echo "POST /api/external/leads/batch"
curl -s -X POST "$API_URL/leads/batch" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "leads": [
      {
        "telefone": "(31) 98888-7777",
        "utm_campaign": "batch_teste_1"
      },
      {
        "telefone": "(41) 99999-6666",
        "utm_campaign": "batch_teste_2"
      },
      {
        "telefone": "(51) 98765-5555",
        "utm_campaign": "batch_teste_3"
      }
    ]
  }' | jq '.'
echo ""
echo ""

# Test 5: Listar leads
echo "📋 Teste 5: Listar leads"
echo "GET /api/external/leads?status=novo&limit=5"
curl -s -X GET "$API_URL/leads?status=novo&limit=5" \
  -H "X-API-Key: $API_KEY" | jq '.'
echo ""
echo ""

# Test 6: Buscar lead por telefone
echo "📋 Teste 6: Buscar lead por telefone"
echo "GET /api/external/leads/11987654321"
curl -s -X GET "$API_URL/leads/11987654321" \
  -H "X-API-Key: $API_KEY" | jq '.'
echo ""
echo ""

# Test 7: Validação - telefone inválido
echo "📋 Teste 7: Validação - telefone inválido"
echo "POST /api/external/leads (telefone muito curto)"
curl -s -X POST "$API_URL/leads" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "telefone": "123"
  }' | jq '.'
echo ""
echo ""

# Test 8: API key via query parameter
echo "📋 Teste 8: API key via query parameter"
echo "GET /api/external/leads?api_key=$API_KEY&status=novo&limit=2"
curl -s -X GET "$API_URL/leads?api_key=$API_KEY&status=novo&limit=2" | jq '.'
echo ""
echo ""

echo "✅ Testes concluídos!"
