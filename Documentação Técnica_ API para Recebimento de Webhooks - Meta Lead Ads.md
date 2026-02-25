# Documentação Técnica: API para Recebimento de Webhooks - Meta Lead Ads

**Para:** Time de Desenvolvimento Backend

**Assunto:** Especificações técnicas para a implementação da API de recebimento de notificações de webhooks para campanhas de Meta Lead Ads.

---

## 1. Visão Geral

O objetivo desta API é receber e processar notificações em tempo real do Meta sempre que um novo lead for capturado através de uma campanha de **Lead Ads** no Facebook ou Instagram. A integração é feita através de webhooks.

O fluxo de dados ocorre em duas etapas principais:

1.  **Recebimento da Notificação:** O Meta envia uma notificação (payload JSON) para o nosso endpoint via **HTTP POST** contendo um ID do lead (`leadgen_id`).
2.  **Busca dos Dados do Lead:** Nossa API utiliza o `leadgen_id` para fazer uma chamada à **Graph API** do Meta e recuperar os dados completos do lead (nome, email, telefone, etc.).

---

## 2. Especificação do Endpoint

O endpoint deve ser exposto publicamente e ser capaz de lidar com dois tipos de requisições do Meta: a verificação do webhook (GET) e o recebimento de notificações (POST).

*   **URL:** `[A SER DEFINIDO PELA EQUIPE, ex: https://api.suaempresa.com/webhooks/meta-leads]`
*   **Métodos HTTP Suportados:** `GET`, `POST`

### 2.1. Verificação do Webhook (HTTP GET)

Quando o webhook é configurado no painel de desenvolvedores da Meta, uma requisição `GET` é enviada ao endpoint para verificar sua autenticidade.

**Requisição:**

O Meta enviará os seguintes parâmetros na query string da URL:

*   `hub.mode`: O valor será sempre `subscribe`.
*   `hub.challenge`: Uma string numérica que deve ser retornada na resposta.
*   `hub.verify_token`: O token de verificação que foi configurado no painel da Meta. Devemos usá-lo para validar a requisição.

**Lógica de Implementação:**

1.  Verifique se o `hub.mode` é igual a `subscribe`.
2.  Compare o `hub.verify_token` recebido com o token de verificação que foi definido durante a configuração do webhook.
3.  Se ambos forem válidos, responda com o valor do `hub.challenge` e um status **HTTP 200 OK**.
4.  Caso contrário, responda com um status **HTTP 403 Forbidden**.

**Exemplo de Código (Node.js/Express):**

```javascript
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

app.get('/webhooks/meta-leads', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});
```

### 2.2. Recebimento de Notificações de Leads (HTTP POST)

Após a verificação, o Meta enviará notificações de novos leads para este mesmo endpoint via `POST`.

**Requisição:**

*   **Header:** A requisição incluirá o header `X-Hub-Signature-256`, que contém um hash SHA256 do corpo da requisição, assinado com o `App Secret` do seu aplicativo Meta. **É crucial validar esta assinatura para garantir a autenticidade da notificação.**
*   **Corpo (Body):** O corpo da requisição será um objeto JSON com a estrutura detalhada na seção 3.

**Lógica de Implementação:**

1.  **Valide a Assinatura:** Antes de processar o corpo da requisição, valide a assinatura `X-Hub-Signature-256`. Calcule o hash SHA256 do corpo da requisição usando o `App Secret` e compare com o valor do header. Se não corresponderem, descarte a requisição.
2.  **Processe o Payload:** Se a assinatura for válida, processe o payload JSON.
3.  **Responda Rapidamente:** Responda com um status **HTTP 200 OK** o mais rápido possível para que o Meta saiba que a notificação foi recebida com sucesso. O processamento pesado (como a busca na Graph API) deve ser feito de forma assíncrona (ex: em uma fila de jobs).

**Exemplo de Validação de Assinatura (Node.js):**

```javascript
const crypto = require('crypto');
const APP_SECRET = process.env.META_APP_SECRET;

function verifyRequestSignature(req, res, buf) {
  const signature = req.headers['x-hub-signature-256'];

  if (!signature) {
    throw new Error('Couldn\'t validate the signature.');
  } else {
    const elements = signature.split('=');
    const signatureHash = elements[1];
    const expectedHash = crypto.createHmac('sha256', APP_SECRET)
                               .update(buf)
                               .digest('hex');
    if (signatureHash !== expectedHash) {
      throw new Error('Couldn\'t validate the request signature.');
    }
  }
}

// Use no middleware do Express
app.use(bodyParser.json({ verify: verifyRequestSignature }));
```

---

## 3. Estrutura de Dados (Payloads)

### 3.1. Payload da Notificação do Webhook

O corpo da requisição `POST` terá a seguinte estrutura. O campo mais importante é o `leadgen_id`.

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

### 3.2. Lógica de Processamento do Payload

1.  Itere sobre o array `entry` e, para cada entrada, itere sobre o array `changes`.
2.  Extraia o `leadgen_id` do objeto `value`.
3.  Adicione o `leadgen_id` a uma fila de processamento assíncrono para buscar os dados completos do lead.

---

## 4. Recuperando os Dados do Lead (Graph API)

Com o `leadgen_id` em mãos, faça uma requisição `GET` para a Graph API para obter os dados do formulário.

*   **Endpoint da Graph API:** `https://graph.facebook.com/v19.0/{leadgen-id}`
*   **Método:** `GET`
*   **Autenticação:** A requisição deve ser autenticada com um **Token de Acesso da Página** (`access_token`) que não expira. Este token deve ser gerado com as permissões `pages_show_list` e `leads_retrieval`.

**Exemplo de Requisição:**

```bash
curl -X GET "https://graph.facebook.com/v19.0/<LEADGEN_ID>?access_token=<PAGE_ACCESS_TOKEN>"
```

**Resposta da Graph API (Dados do Lead):**

A resposta conterá os dados preenchidos no formulário.

```json
{
  "created_time": "2023-02-25T19:07:44+0000",
  "id": "<LEADGEN_ID>",
  "field_data": [
    {
      "name": "full_name",
      "values": [
        "John Doe"
      ]
    },
    {
      "name": "email",
      "values": [
        "john.doe@example.com"
      ]
    },
    {
      "name": "phone_number",
      "values": [
        "+15551234567"
      ]
    }
    // ... outros campos personalizados
  ]
}
```

---

## 5. Boas Práticas e Recomendações

1.  **Segurança:**
    *   **Sempre** valide a assinatura `X-Hub-Signature-256`.
    *   Use **HTTPS** para o seu endpoint.
    *   Armazene o `App Secret`, `Verify Token` e `Page Access Token` de forma segura (ex: em variáveis de ambiente ou um cofre de segredos).

2.  **Performance:**
    *   Responda à requisição do webhook com **200 OK** imediatamente.
    *   Use uma **fila de mensagens** (ex: RabbitMQ, SQS) para processar a busca na Graph API de forma assíncrona. Isso evita timeouts e torna a API mais resiliente.

3.  **Error Handling:**
    *   Implemente um mecanismo de **retry com backoff exponencial** para as chamadas à Graph API em caso de falhas temporárias.
    *   Monitore e registre erros para identificar problemas na integração.

4.  **Gerenciamento de Tokens:**
    *   Gere um **token de acesso da página de longa duração** para evitar que ele expire. A documentação da Meta explica como estender a validade do token.

---

## 6. Referências

*   **Documentação Oficial de Webhooks para Lead Ads:** [https://developers.facebook.com/docs/marketing-api/guides/lead-ads/quickstart/webhooks-integration/](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/quickstart/webhooks-integration/)
*   **Recuperando Leads (Graph API):** [https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving/](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving/)
*   **Validando Payloads de Webhooks:** [https://developers.facebook.com/docs/graph-api/webhooks/getting-started#validate-payloads](https://developers.facebook.com/docs/graph-api/webhooks/getting-started#validate-payloads)
