#!/bin/bash

echo "🧪 Testando rotas da aplicação..."
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para testar rota
test_route() {
    local method=$1
    local url=$2
    local description=$3
    
    echo -n "Testando $description... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    else
        response=$(curl -s -X "$method" -o /dev/null -w "%{http_code}" "$url")
    fi
    
    if [ "$response" = "200" ] || [ "$response" = "201" ]; then
        echo -e "${GREEN}✓ OK (HTTP $response)${NC}"
        return 0
    else
        echo -e "${RED}✗ FALHOU (HTTP $response)${NC}"
        return 1
    fi
}

BASE_URL="http://localhost:3001"

echo "📍 Base URL: $BASE_URL"
echo ""

# Testar rotas
test_route "GET" "$BASE_URL/" "Landing Page (/)"
test_route "GET" "$BASE_URL/admin" "Admin Panel (/admin)"
test_route "GET" "$BASE_URL/admin.html" "Admin HTML (/admin.html)"
test_route "GET" "$BASE_URL/health" "Health Check (/health)"
test_route "GET" "$BASE_URL/health/stats?days=30" "Health Stats (/health/stats)"

echo ""
echo "✅ Testes concluídos!"
