# Ads Conversion Tracker

Sistema de rastreamento de conversões de campanhas de ads via WhatsApp com backend em Bun e PostgreSQL.

## 🚀 Características

- **Landing Page Ultra-Otimizada**: HTML5 + CSS puro, otimizado para 3G
- **Backend Rápido**: Bun runtime com Hono framework
- **Banco de Dados Robusto**: PostgreSQL com suporte a ACID
- **Rastreamento Completo**: UTM, GCLID, FBCLID
- **Criptografia**: Dados de telefone criptografados
- **API REST**: Endpoints para captura de leads e processamento de vendas
- **Integração WhatsApp**: Redirecionamento automático

## 📋 Pré-requisitos

- Bun 1.3.6+
- PostgreSQL 12+
- Node.js 18+ (para ferramentas auxiliares)

## 🔧 Instalação

### 1. Clone o repositório

```bash
git clone <repository-url>
cd ads-conversion-tracker
```

### 2. Instale as dependências

```bash
bun install
```

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

### 4. Configure o banco de dados

```bash
# Crie o banco de dados PostgreSQL
createdb ads_conversion_tracker

# Execute as migrações
bun run db:migrate
```

### 5. Inicie o servidor

```bash
# Modo desenvolvimento (com hot reload)
bun run dev

# Modo produção
bun run build
bun run start
```

O servidor estará disponível em `http://localhost:3001`

## 📚 Estrutura do Projeto

```
ads-conversion-tracker/
├── src/
│   ├── server.ts              # Arquivo principal do servidor
│   ├── routes/
│   │   ├── leads.ts           # Rotas de captura de leads
│   │   ├── conversions.ts     # Rotas de processamento de vendas
│   │   └── health.ts          # Health check e estatísticas
│   ├── services/
│   │   ├── LeadService.ts     # Lógica de captura de leads
│   │   └── ConversionService.ts # Lógica de conversões
│   ├── models/
│   │   ├── Lead.ts            # Modelo de Lead
│   │   └── Conversion.ts      # Modelo de Conversão
│   ├── middleware/
│   │   ├── cors.ts            # CORS middleware
│   │   └── logger.ts          # Logger middleware
│   └── utils/
│       ├── db.ts              # Configuração do banco
│       ├── crypto.ts          # Criptografia
│       └── validation.ts      # Validações
├── public/
│   └── index.html             # Landing page
├── scripts/
│   └── migrate.ts             # Script de migração
├── package.json
├── tsconfig.json
└── .env
```

## 🔌 API Endpoints

### Captura de Leads

**POST** `/api/leads`

```json
{
  "telefone": "(11) 98765-4321",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "summer_sale",
  "utm_content": "ad_1",
  "utm_term": "produto",
  "gclid": "CjwKCAiA...",
  "fbclid": "IwAR0..."
}
```

**Response:**
```json
{
  "success": true,
  "lead": {
    "id": "uuid",
    "telefone": "encrypted",
    "utm_source": "google",
    "status": "novo",
    "created_at": "2024-01-26T10:00:00Z"
  },
  "whatsapp_link": "https://wa.me/5511987654321?text=..."
}
```

### Processar Venda

**POST** `/api/conversions`

```json
{
  "codigo_venda": "VENDA-001",
  "valor_venda": 299.90,
  "observacoes": "Cliente (11) 98765-4321 - Produto XYZ",
  "canal": "comercial",
  "data_venda": "2024-01-26T10:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "conversion": {
    "id": "uuid",
    "lead_id": "uuid",
    "codigo_venda": "VENDA-001",
    "valor_venda": 299.90,
    "status": "novo",
    "created_at": "2024-01-26T10:30:00Z"
  }
}
```

### Obter Estatísticas

**GET** `/health/stats?days=30`

**Response:**
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

## 🔐 Segurança

- Telefones são criptografados com AES-256-GCM
- Hash SHA-256 para busca segura
- CORS configurável
- Validação de entrada em todos os endpoints
- Logs de auditoria para operações críticas

## 📊 Performance

- Landing page: **< 50KB** (sem gzip)
- Tempo de carregamento: **< 2s em 3G**
- Backend: **< 100ms** por requisição (sem I/O)
- Suporta **10.000+ requisições/segundo**

## 🚀 Deploy

### Docker

```dockerfile
FROM oven/bun:1.3.6

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --production

COPY src ./src
COPY public ./public
COPY tsconfig.json .

EXPOSE 3001

CMD ["bun", "run", "src/server.ts"]
```

### Variáveis de Ambiente para Produção

```bash
NODE_ENV=production
DB_HOST=db.example.com
DB_USER=prod_user
DB_PASSWORD=secure_password
ENCRYPTION_KEY=your-32-char-encryption-key
GOOGLE_ADS_API_KEY=your-api-key
META_ACCESS_TOKEN=your-token
FRONTEND_URL=https://yourdomain.com
```

## 📈 Monitoramento

- Endpoint de health check: `GET /health`
- Logs estruturados com timestamps
- Métricas de performance por endpoint
- Rastreamento de erros de banco de dados

## 🤝 Integração com Sistemas Externos

### Google Ads

Para integrar com Google Ads Conversion API:

1. Obtenha suas credenciais em Google Ads
2. Configure `GOOGLE_ADS_API_KEY` e `GOOGLE_ADS_CUSTOMER_ID`
3. Implemente o serviço de envio de conversões

### Meta Ads

Para integrar com Meta Conversions API:

1. Crie um pixel no Meta Business Manager
2. Configure `META_PIXEL_ID` e `META_ACCESS_TOKEN`
3. Implemente o serviço de envio de conversões

## 📝 Logs

Os logs são exibidos no console com formato:

```
[2024-01-26T10:00:00Z] POST /api/leads - 201 (45ms)
[DB] Executed query in 12ms
```

## 🧪 Testes

```bash
# Testar captura de lead
curl -X POST http://localhost:3001/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "telefone": "(11) 98765-4321",
    "utm_source": "google",
    "utm_campaign": "test"
  }'

# Testar health check
curl http://localhost:3001/health

# Testar estatísticas
curl http://localhost:3001/health/stats?days=30
```

## 📄 Licença

MIT

## 🆘 Suporte

Para reportar bugs ou sugerir melhorias, abra uma issue no repositório.

---

**Desenvolvido com ❤️ usando Bun + PostgreSQL**
