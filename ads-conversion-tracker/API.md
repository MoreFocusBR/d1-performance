# Documentação da API - Ads Conversion Tracker

## Base URL

```
http://localhost:3001
```

## Autenticação

Atualmente, a API não requer autenticação. Para produção, recomenda-se implementar:
- API Keys
- JWT Tokens
- OAuth 2.0

## Endpoints

### 1. Captura de Lead

**Endpoint:** `POST /api/leads`

Captura um novo lead com dados de UTM e redireciona para WhatsApp.

**Request:**
```bash
curl -X POST http://localhost:3001/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "telefone": "(11) 98765-4321",
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "summer_sale",
    "utm_content": "ad_1",
    "utm_term": "produto",
    "gclid": "CjwKCAiA...",
    "fbclid": "IwAR0..."
  }'
```

**Parâmetros:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| telefone | string | Sim | Telefone do cliente (formato: (XX) XXXXX-XXXX ou variações) |
| utm_source | string | Não | Origem da campanha (ex: google, facebook) |
| utm_medium | string | Não | Meio da campanha (ex: cpc, display, email) |
| utm_campaign | string | Não | Nome da campanha |
| utm_content | string | Não | Identificador do conteúdo/anúncio |
| utm_term | string | Não | Termo de busca (para campanhas de busca) |
| gclid | string | Não | Google Click ID (capturado automaticamente do URL) |
| fbclid | string | Não | Facebook Click ID (capturado automaticamente do URL) |

**Response (201 Created):**
```json
{
  "success": true,
  "lead": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "telefone": "encrypted_value",
    "telefone_hash": "abc123...",
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "summer_sale",
    "utm_content": "ad_1",
    "utm_term": "produto",
    "gclid": null,
    "fbclid": null,
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "created_at": "2024-01-26T10:00:00Z",
    "status": "novo"
  },
  "whatsapp_link": "https://wa.me/5511987654321?text=Olá%21%20Gostaria%20de%20falar..."
}
```

**Erros:**

```json
{
  "success": false,
  "error": "Telefone inválido. Por favor, verifique o formato."
}
```

**Status Codes:**
- `201 Created` - Lead capturado com sucesso
- `400 Bad Request` - Telefone inválido ou dados incompletos
- `500 Internal Server Error` - Erro no servidor

---

### 2. Obter Lead por Telefone

**Endpoint:** `GET /api/leads/:phone`

Recupera informações de um lead usando o número de telefone.

**Request:**
```bash
curl http://localhost:3001/api/leads/11987654321
```

**Response (200 OK):**
```json
{
  "success": true,
  "lead": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "telefone": "encrypted_value",
    "utm_source": "google",
    "utm_campaign": "summer_sale",
    "status": "novo",
    "created_at": "2024-01-26T10:00:00Z"
  }
}
```

**Erros:**
```json
{
  "success": false,
  "error": "Lead not found"
}
```

**Status Codes:**
- `200 OK` - Lead encontrado
- `404 Not Found` - Lead não encontrado
- `500 Internal Server Error` - Erro no servidor

---

### 3. Processar Venda e Criar Conversão

**Endpoint:** `POST /api/conversions`

Processa uma venda registrada no sistema comercial e vincula ao lead correspondente.

**Request:**
```bash
curl -X POST http://localhost:3001/api/conversions \
  -H "Content-Type: application/json" \
  -d '{
    "codigo_venda": "VENDA-001",
    "valor_venda": 299.90,
    "observacoes": "Cliente (11) 98765-4321 - Produto XYZ - Entrega em 2 dias",
    "canal": "comercial",
    "data_venda": "2024-01-26T10:30:00Z"
  }'
```

**Parâmetros:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| codigo_venda | string | Sim | Código/ID único da venda no sistema |
| valor_venda | number | Sim | Valor total da venda em reais |
| observacoes | string | Sim | Observações da venda (deve conter o telefone do cliente) |
| canal | string | Não | Canal de venda (padrão: "comercial") |
| data_venda | string | Não | Data/hora da venda (padrão: agora) |

**Response (201 Created):**
```json
{
  "success": true,
  "conversion": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "lead_id": "550e8400-e29b-41d4-a716-446655440000",
    "codigo_venda": "VENDA-001",
    "valor_venda": 299.90,
    "canal": "comercial",
    "data_venda": "2024-01-26T10:30:00Z",
    "google_ads_enviado": false,
    "meta_ads_enviado": false,
    "created_at": "2024-01-26T10:30:05Z"
  }
}
```

**Erros:**

```json
{
  "success": false,
  "error": "Telefone não encontrado nas observações"
}
```

```json
{
  "success": false,
  "error": "Lead não encontrado para este telefone"
}
```

**Status Codes:**
- `201 Created` - Conversão criada com sucesso
- `400 Bad Request` - Dados inválidos ou incompletos
- `500 Internal Server Error` - Erro no servidor

---

### 4. Obter Detalhes da Conversão

**Endpoint:** `GET /api/conversions/:id`

Recupera informações completas de uma conversão incluindo dados do lead.

**Request:**
```bash
curl http://localhost:3001/api/conversions/660e8400-e29b-41d4-a716-446655440001
```

**Response (200 OK):**
```json
{
  "success": true,
  "conversion": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "lead_id": "550e8400-e29b-41d4-a716-446655440000",
    "codigo_venda": "VENDA-001",
    "valor_venda": 299.90,
    "canal": "comercial",
    "data_venda": "2024-01-26T10:30:00Z",
    "google_ads_enviado": false,
    "meta_ads_enviado": false,
    "created_at": "2024-01-26T10:30:05Z",
    "lead": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "utm_source": "google",
      "utm_campaign": "summer_sale",
      "status": "convertido"
    }
  }
}
```

**Status Codes:**
- `200 OK` - Conversão encontrada
- `404 Not Found` - Conversão não encontrada
- `500 Internal Server Error` - Erro no servidor

---

### 5. Listar Conversões Pendentes

**Endpoint:** `GET /api/conversions`

Lista conversões que ainda não foram enviadas para Google Ads ou Meta Ads.

**Request:**
```bash
curl http://localhost:3001/api/conversions
```

**Response (200 OK):**
```json
{
  "success": true,
  "conversions": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "lead_id": "550e8400-e29b-41d4-a716-446655440000",
      "codigo_venda": "VENDA-001",
      "valor_venda": 299.90,
      "google_ads_enviado": false,
      "meta_ads_enviado": false,
      "lead": {
        "utm_source": "google",
        "utm_campaign": "summer_sale"
      }
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Lista retornada com sucesso
- `500 Internal Server Error` - Erro no servidor

---

### 6. Marcar Conversão como Enviada para Google Ads

**Endpoint:** `POST /api/conversions/:id/google-sent`

Marca uma conversão como enviada para Google Ads.

**Request:**
```bash
curl -X POST http://localhost:3001/api/conversions/660e8400-e29b-41d4-a716-446655440001/google-sent
```

**Response (200 OK):**
```json
{
  "success": true
}
```

**Status Codes:**
- `200 OK` - Conversão marcada com sucesso
- `500 Internal Server Error` - Erro no servidor

---

### 7. Marcar Conversão como Enviada para Meta Ads

**Endpoint:** `POST /api/conversions/:id/meta-sent`

Marca uma conversão como enviada para Meta Ads.

**Request:**
```bash
curl -X POST http://localhost:3001/api/conversions/660e8400-e29b-41d4-a716-446655440001/meta-sent
```

**Response (200 OK):**
```json
{
  "success": true
}
```

**Status Codes:**
- `200 OK` - Conversão marcada com sucesso
- `500 Internal Server Error` - Erro no servidor

---

### 8. Health Check

**Endpoint:** `GET /health`

Verifica a saúde do servidor e conexão com banco de dados.

**Request:**
```bash
curl http://localhost:3001/health
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-26T10:00:00Z",
  "uptime": 3600.5
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "error",
  "error": "Database connection failed"
}
```

**Status Codes:**
- `200 OK` - Servidor e banco de dados estão saudáveis
- `503 Service Unavailable` - Erro na conexão com banco de dados

---

### 9. Obter Estatísticas

**Endpoint:** `GET /health/stats?days=30`

Retorna estatísticas de conversões para um período específico.

**Query Parameters:**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| days | integer | 30 | Número de dias para análise |

**Request:**
```bash
curl "http://localhost:3001/health/stats?days=30"
```

**Response (200 OK):**
```json
{
  "success": true,
  "stats": {
    "total_conversoes": 150,
    "valor_total": "45000.00",
    "valor_medio": "300.00",
    "google_enviadas": 120,
    "meta_enviadas": 130
  },
  "period_days": 30
}
```

**Status Codes:**
- `200 OK` - Estatísticas retornadas com sucesso
- `500 Internal Server Error` - Erro no servidor

---

## Tratamento de Erros

Todos os erros seguem o padrão:

```json
{
  "success": false,
  "error": "Descrição do erro"
}
```

### Códigos de Status HTTP

| Código | Significado |
|--------|------------|
| 200 | OK - Requisição bem-sucedida |
| 201 | Created - Recurso criado com sucesso |
| 204 | No Content - Requisição bem-sucedida sem conteúdo |
| 400 | Bad Request - Dados inválidos ou incompletos |
| 404 | Not Found - Recurso não encontrado |
| 500 | Internal Server Error - Erro no servidor |
| 503 | Service Unavailable - Serviço indisponível |

---

## Rate Limiting

Não há rate limiting implementado atualmente. Para produção, recomenda-se:
- Implementar rate limiting por IP
- Implementar rate limiting por API Key
- Usar Redis para cache de requisições

---

## Exemplos de Uso

### Fluxo Completo

```bash
# 1. Capturar lead
LEAD=$(curl -s -X POST http://localhost:3001/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "telefone": "(11) 98765-4321",
    "utm_source": "google",
    "utm_campaign": "summer_sale"
  }')

echo "$LEAD" | jq .

# 2. Redirecionar para WhatsApp
WHATSAPP_LINK=$(echo "$LEAD" | jq -r '.whatsapp_link')
echo "Redirecionando para: $WHATSAPP_LINK"

# 3. Processar venda (após atendimento comercial)
CONVERSION=$(curl -s -X POST http://localhost:3001/api/conversions \
  -H "Content-Type: application/json" \
  -d '{
    "codigo_venda": "VENDA-001",
    "valor_venda": 299.90,
    "observacoes": "Cliente (11) 98765-4321 - Produto XYZ",
    "canal": "comercial"
  }')

echo "$CONVERSION" | jq .

# 4. Obter estatísticas
curl -s http://localhost:3001/health/stats?days=30 | jq .
```

---

## Notas de Implementação

### Segurança

- Telefones são criptografados com AES-256-GCM antes do armazenamento
- Hashes SHA-256 são usados para buscas seguras
- CORS é configurável via variável de ambiente
- Validação de entrada em todos os endpoints

### Performance

- Índices de banco de dados otimizados para buscas por telefone e data
- Queries parametrizadas para prevenir SQL injection
- Logging estruturado para debugging

### Integração com Ads Platforms

Para enviar conversões para Google Ads e Meta Ads, implemente:

1. **Google Ads Conversion API:**
   - Use a chave de API configurada em `GOOGLE_ADS_API_KEY`
   - Envie dados após marcar conversão como enviada

2. **Meta Conversions API:**
   - Use o pixel ID e token configurados
   - Envie eventos de conversão com valor e moeda

---

## Changelog

### v1.0.0 (26 de Janeiro de 2024)
- Lançamento inicial
- Endpoints de captura de leads
- Endpoints de processamento de vendas
- Health check e estatísticas
