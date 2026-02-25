# Integração com Meta Lead Ads - Webhooks

## Visão Geral

Esta integração permite receber e processar notificações em tempo real do Meta sempre que um novo lead for capturado através de uma campanha de **Lead Ads** no Facebook ou Instagram.

O fluxo ocorre em duas etapas:

1. **Recebimento da Notificação:** O Meta envia uma notificação (payload JSON) para o endpoint `/webhooks/meta-leads` via HTTP POST contendo o `leadgen_id`.
2. **Busca dos Dados do Lead:** A API utiliza o `leadgen_id` para fazer uma chamada à Graph API do Meta e recuperar os dados completos do lead (nome, email, telefone, etc.).

---

## Endpoints

### GET /webhooks/meta-leads

Endpoint de verificação do webhook. Usado pelo Meta para validar a autenticidade do endpoint durante a configuração.

**Query Parameters:**

| Parâmetro | Descrição |
|-----------|-----------|
| `hub.mode` | Sempre `subscribe` |
| `hub.verify_token` | Token de verificação configurado no painel da Meta |
| `hub.challenge` | String numérica que deve ser retornada na resposta |

**Respostas:**

| Status | Descrição |
|--------|-----------|
| 200 OK | Token válido, retorna o `hub.challenge` |
| 403 Forbidden | Token inválido |
| 400 Bad Request | Parâmetros ausentes |

---

### POST /webhooks/meta-leads

Endpoint para recebimento de notificações de novos leads.

**Headers:**

| Header | Descrição |
|--------|-----------|
| `X-Hub-Signature-256` | Hash SHA256 do corpo da requisição, assinado com o App Secret |
| `Content-Type` | `application/json` |

**Payload:**

```json
{
  "object": "page",
  "entry": [
    {
      "id": "<PAGE_ID>",
      "time": 1677352065,
      "changes": [
        {
          "field": "leadgen",
          "value": {
            "ad_id": "<AD_ID>",
            "form_id": "<FORM_ID>",
            "leadgen_id": "<LEADGEN_ID>",
            "created_time": 1677352064,
            "page_id": "<PAGE_ID>",
            "adgroup_id": "<ADGROUP_ID>"
          }
        }
      ]
    }
  ]
}
```

**Respostas:**

| Status | Descrição |
|--------|-----------|
| 200 OK | Notificação recebida com sucesso |
| 401 Unauthorized | Assinatura ausente |
| 403 Forbidden | Assinatura inválida |

---

### GET /webhooks/meta-leads/stats

Retorna estatísticas dos webhooks recebidos.

**Resposta:**

```json
{
  "success": true,
  "stats": {
    "total": 150,
    "pendentes": 5,
    "processados": 140,
    "erros": 5
  }
}
```

---

### POST /webhooks/meta-leads/reprocess

Reprocessa leads que falharam no processamento anterior.

**Resposta:**

```json
{
  "success": true,
  "message": "3 leads reprocessados, 0 falhas",
  "reprocessed": 3,
  "failed": 0
}
```

---

### GET /webhooks/meta-leads/health

Verifica se as variáveis de ambiente da integração estão configuradas.

**Resposta:**

```json
{
  "success": true,
  "status": "configured",
  "checks": {
    "META_VERIFY_TOKEN": "✓",
    "META_APP_SECRET": "✓",
    "META_PAGE_ACCESS_TOKEN": "✓"
  }
}
```

---

## Configuração

### Variáveis de Ambiente

| Variável | Descrição | Obrigatória |
|----------|-----------|:-----------:|
| `META_VERIFY_TOKEN` | Token de verificação definido no painel da Meta | Sim |
| `META_APP_SECRET` | App Secret do aplicativo Meta (para validar assinaturas) | Sim |
| `META_PAGE_ACCESS_TOKEN` | Token de acesso da página (para buscar dados na Graph API) | Sim |
| `META_GRAPH_API_VERSION` | Versão da Graph API (padrão: `v19.0`) | Não |

### Configuração no Painel da Meta

1. Acesse o [Meta for Developers](https://developers.facebook.com/)
2. Selecione seu aplicativo
3. Vá em **Webhooks** > **Adicionar Assinatura**
4. Configure:
   - **URL de Callback:** `https://seu-dominio.com/webhooks/meta-leads`
   - **Token de Verificação:** O mesmo valor definido em `META_VERIFY_TOKEN`
5. Assine o campo **leadgen** da página desejada

### Permissões Necessárias

O token de acesso da página deve ter as seguintes permissões:
- `pages_show_list`
- `leads_retrieval`
- `pages_manage_ads`

---

## Migração de Banco de Dados

Execute o script de migração para criar a tabela de logs:

```bash
psql -U seu_usuario -d seu_banco < scripts/migration-meta-webhook-logs.sql
```

---

## Fluxo de Processamento

```
Meta Lead Ads → POST /webhooks/meta-leads
                    │
                    ├── 1. Validar assinatura X-Hub-Signature-256
                    ├── 2. Registrar webhook no banco (meta_webhook_logs)
                    ├── 3. Responder 200 OK imediatamente
                    │
                    └── 4. Processamento assíncrono:
                         ├── Buscar dados na Graph API (com retry)
                         ├── Extrair campos do formulário
                         ├── Criar lead na tabela leads
                         └── Atualizar status no meta_webhook_logs
```

---

## Segurança

1. **Validação de Assinatura:** Todas as requisições POST são validadas com HMAC-SHA256 usando o App Secret.
2. **Timing-Safe Comparison:** A comparação de hashes é feita de forma segura contra timing attacks.
3. **HTTPS:** O endpoint deve ser acessado exclusivamente via HTTPS em produção.
4. **Segredos:** Todos os tokens e chaves são armazenados em variáveis de ambiente.

---

## Testes

Execute o script de teste:

```bash
chmod +x scripts/test-meta-webhook.sh
META_VERIFY_TOKEN=seu-token ./scripts/test-meta-webhook.sh
```
