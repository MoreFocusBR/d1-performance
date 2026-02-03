> # Documentação da API Externa

## 1. 🚀 Visão Geral

A API externa permite a integração de sistemas de terceiros para a criação e consulta de leads. Todos os endpoints requerem autenticação via API key.

## 2. 🔑 Autenticação

A autenticação é feita através de uma API key, que pode ser enviada de três formas:

1.  **Header (recomendado):**
    - `X-API-Key: sua-api-key`

2.  **Query Parameter:**
    - `?api_key=sua-api-key`

3.  **Body (apenas para POST/PUT):**
    - `{"api_key": "sua-api-key", ...}`

### Gerenciamento de API Keys

As API keys são gerenciadas através da variável de ambiente `API_KEYS`, que é uma lista de chaves separadas por vírgula:

```
API_KEYS=key1,key2,key3
```

## 3. 🌐 Endpoints

### 3.1. Criar um Novo Lead

- **Endpoint:** `POST /api/external/leads`
- **Descrição:** Cria um novo lead no sistema.
- **Autenticação:** Obrigatória

#### Body

```json
{
  "telefone": "(11) 98765-4321",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "campanha_teste",
  "utm_content": "anuncio_1",
  "utm_term": "palavra-cha *   "gclid": "google-click-id",
 *   "fbclid": "facebook-click-id",
 *   "shopify_data": {
 *     "customer_id": "...",
 *     "order_id": "..."
 *   }
 * }

#### Resposta de Sucesso (201)

```json
{
  "success": true,
  "lead": {
    "id": "...",
    "telefone": "11987654321",
    ...
  },
  "message": "Lead criado com sucesso"
}
```

### 3.2. Criar Múltiplos Leads (Batch)

- **Endpoint:** `POST /api/external/leads/batch`
- **Descrição:** Cria múltiplos leads em uma única requisição (máximo de 100).
- **Autenticação:** Obrigatória

#### Body

```json
{
  *     {
 *       "telefone": "(11) 98765-4321",
 *       "utm_campaign": "campanha_1",
 *       "shopify_data": {...}
 *     },
    {
      "telefone": "(21) 99999-8888",
      "utm_campaign": "campanha_2"
    }
  ]
}
```

#### Resposta de Sucesso (201 ou 207)

```json
{
  "success": true,
  "total": 2,
  "created": 2,
  "failed": 0,
  "results": [...],
  "errors": undefined
}
```

### 3.3. Listar Leads

- **Endpoint:** `GET /api/external/leads`
- **Descrição:** Lista leads com filtros.
- **Autenticação:** Obrigatória

#### Query Parameters

- `status`: `novo`, `convertido`, `expirado` (padrão: `novo`)
- `limit`: número máximo de resultados (padrão: 50, máximo: 1000)
- `offset`: número de resultados a pular (padrão: 0)

#### Resposta de Sucesso (200)

```json
{
  "success": true,
  "count": 10,
  "limit": 50,
  "offset": 0,
  "leads": [...]
}
```

### 3.4. Buscar Lead por Telefone

- **Endpoint:** `GET /api/external/leads/:phone`
- **Descrição:** Busca um lead pelo número de telefone.
- **Autenticação:** Obrigatória

#### Resposta de Sucesso (200)

```json
{
  "success": true,
  "lead": {
    "id": "...",
    "telefone": "11987654321",
    ...
  }
}
```

### 3.5. Health Check

- **Endpoint:** `GET /api/external/health`
- **Descrição:** Verifica a saúde da API.
- **Autenticação:** Não requerida

#### Resposta de Sucesso (200)

```json
{
  "success": true,
  "status": "ok",
  "timestamp": "..."
}
```

## 4. ⚙️ Validação e Tratamento de Erros

- **Validação Robusta:** Todos os endpoints possuem validação de dados para garantir a integridade.
- **Mensagens de Erro Claras:** As respostas de erro incluem mensagens claras para facilitar a depuração.
- **Status Codes HTTP:** A API utiliza status codes HTTP para indicar o resultado da requisição.

## 5. 🚀 Exemplo de Uso

```bash
curl -X POST "http://localhost:3001/api/external/leads" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua-api-key" \
  -d 
```
