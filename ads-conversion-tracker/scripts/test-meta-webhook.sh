#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="http://localhost:3001/webhooks/meta-leads"
VERIFY_TOKEN="${META_VERIFY_TOKEN:-test-verify-token}"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Testes de Webhook Meta Lead Ads${NC}"
echo -e "${BLUE}============================================${NC}\n"

# Test 1: Health check
echo -e "${YELLOW}Test 1: Verificar saúde da integração Meta${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Status: $HTTP_CODE"
else
  echo -e "${RED}❌ FAIL${NC} - Status: $HTTP_CODE"
fi
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

# Test 2: Verificação do webhook (GET) - Token válido
echo -e "${YELLOW}Test 2: Verificação do webhook (GET) - Token válido${NC}"
CHALLENGE="test_challenge_12345"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/?hub.mode=subscribe&hub.verify_token=$VERIFY_TOKEN&hub.challenge=$CHALLENGE")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)
if [ "$HTTP_CODE" = "200" ] && [ "$BODY" = "$CHALLENGE" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Status: $HTTP_CODE, Challenge retornado corretamente"
else
  echo -e "${RED}❌ FAIL${NC} - Status: $HTTP_CODE, Body: $BODY"
fi
echo ""

# Test 3: Verificação do webhook (GET) - Token inválido
echo -e "${YELLOW}Test 3: Verificação do webhook (GET) - Token inválido${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=$CHALLENGE")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)
if [ "$HTTP_CODE" = "403" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Status: $HTTP_CODE (Forbidden, como esperado)"
else
  echo -e "${RED}❌ FAIL${NC} - Status: $HTTP_CODE (esperado 403)"
fi
echo ""

# Test 4: POST sem assinatura
echo -e "${YELLOW}Test 4: POST sem assinatura (deve rejeitar)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/" \
  -H "Content-Type: application/json" \
  -d '{"object":"page","entry":[]}')
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)
if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Status: $HTTP_CODE (Unauthorized, como esperado)"
else
  echo -e "${RED}❌ FAIL${NC} - Status: $HTTP_CODE (esperado 401)"
fi
echo ""

# Test 5: Estatísticas
echo -e "${YELLOW}Test 5: Obter estatísticas dos webhooks${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/stats")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Status: $HTTP_CODE"
else
  echo -e "${RED}❌ FAIL${NC} - Status: $HTTP_CODE"
fi
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Testes concluídos!${NC}"
echo -e "${BLUE}============================================${NC}"
