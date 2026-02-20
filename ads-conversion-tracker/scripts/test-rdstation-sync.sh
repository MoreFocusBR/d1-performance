#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3001/api/sync-rdstation"

echo -e "${YELLOW}🧪 Testando endpoints de sincronização com RD Station${NC}\n"

# Test 1: Check health status
echo -e "${YELLOW}Test 1: Verificar status de configuração${NC}"
curl -s -X GET "$API_URL/health" | jq '.' || echo "Erro na requisição"
echo ""

# Test 2: Sync all new leads
echo -e "${YELLOW}Test 2: Sincronizar todos os leads com status 'novo'${NC}"
curl -s -X GET "$API_URL/" | jq '.' || echo "Erro na requisição"
echo ""

# Test 3: Sync specific lead (you need to replace LEAD_ID with an actual lead ID)
echo -e "${YELLOW}Test 3: Sincronizar um lead específico${NC}"
echo "Nota: Substitua LEAD_ID por um ID de lead real"
# curl -s -X POST "$API_URL/lead/LEAD_ID" | jq '.' || echo "Erro na requisição"

echo -e "\n${GREEN}✅ Testes concluídos!${NC}"
