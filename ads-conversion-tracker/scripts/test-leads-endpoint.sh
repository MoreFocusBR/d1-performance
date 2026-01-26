#!/bin/bash

echo "🧪 Testando endpoint de leads..."
echo ""

BASE_URL="http://localhost:3001"

echo "📍 Base URL: $BASE_URL"
echo ""

# Teste 1: Capturar um novo lead
echo "1️⃣ Capturando novo lead..."
LEAD_RESPONSE=$(curl -s -X POST "$BASE_URL/api/leads" \
  -H "Content-Type: application/json" \
  -d '{
    "telefone": "(11) 98765-4321",
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "test_campaign"
  }')

echo "Resposta: $LEAD_RESPONSE"
echo ""

# Teste 2: Listar todos os leads pendentes
echo "2️⃣ Listando leads pendentes..."
LEADS_RESPONSE=$(curl -s "$BASE_URL/api/leads?status=novo&limit=10")

echo "Resposta: $LEADS_RESPONSE"
echo ""

# Teste 3: Verificar se a resposta tem sucesso
if echo "$LEADS_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Endpoint de leads funcionando corretamente!"
else
    echo "❌ Erro ao carregar leads"
fi

echo ""
echo "✅ Testes concluídos!"
