# Guia de Integração com Plataformas de Ads

## Google Ads Conversion API

### 1. Configuração Inicial

#### 1.1 Obtenha suas credenciais

1. Acesse [Google Ads API](https://developers.google.com/google-ads/api/docs/start)
2. Crie um projeto no Google Cloud Console
3. Ative a Google Ads API
4. Crie credenciais (OAuth 2.0 ou Service Account)
5. Obtenha seu Customer ID

#### 1.2 Configure as variáveis de ambiente

```bash
GOOGLE_ADS_API_KEY=your-api-key
GOOGLE_ADS_CUSTOMER_ID=1234567890
```

### 2. Implementação do Serviço

Crie o arquivo `src/services/GoogleAdsService.ts`:

```typescript
import fetch from 'node-fetch';

export class GoogleAdsService {
  private apiKey: string;
  private customerId: string;
  private baseUrl = 'https://googleads.googleapis.com/v15';

  constructor() {
    this.apiKey = process.env.GOOGLE_ADS_API_KEY || '';
    this.customerId = process.env.GOOGLE_ADS_CUSTOMER_ID || '';
  }

  async sendConversion(data: {
    gclid: string;
    conversionName: string;
    conversionValue: number;
    currencyCode: string;
    conversionDateTime: string;
  }) {
    try {
      const response = await fetch(
        `${this.baseUrl}/customers/${this.customerId}/conversions:upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || ''
          },
          body: JSON.stringify({
            conversions: [
              {
                gclid: data.gclid,
                conversionAction: `customers/${this.customerId}/conversionActions/YOUR_CONVERSION_ACTION_ID`,
                conversionDateTime: data.conversionDateTime,
                conversionValue: data.conversionValue,
                currencyCode: data.currencyCode,
                userIdentifiers: []
              }
            ],
            partialFailure: true
          })
        }
      );

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      console.error('Google Ads conversion error:', error);
      return { success: false, error };
    }
  }

  async sendOfflineConversion(data: {
    phoneNumber: string;
    conversionName: string;
    conversionValue: number;
    currencyCode: string;
    conversionDateTime: string;
  }) {
    try {
      const response = await fetch(
        `${this.baseUrl}/customers/${this.customerId}/conversions:upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || ''
          },
          body: JSON.stringify({
            conversions: [
              {
                conversionAction: `customers/${this.customerId}/conversionActions/YOUR_CONVERSION_ACTION_ID`,
                conversionDateTime: data.conversionDateTime,
                conversionValue: data.conversionValue,
                currencyCode: data.currencyCode,
                userIdentifiers: [
                  {
                    phoneNumber: data.phoneNumber
                  }
                ]
              }
            ],
            partialFailure: true
          })
        }
      );

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      console.error('Google Ads offline conversion error:', error);
      return { success: false, error };
    }
  }
}
```

### 3. Integração com Conversão

Adicione ao `src/services/ConversionService.ts`:

```typescript
import { GoogleAdsService } from './GoogleAdsService';

const googleAdsService = new GoogleAdsService();

// Após criar conversão
if (lead.gclid) {
  await googleAdsService.sendConversion({
    gclid: lead.gclid,
    conversionName: 'purchase',
    conversionValue: conversion.valor_venda,
    currencyCode: 'BRL',
    conversionDateTime: new Date().toISOString()
  });
  
  await ConversionModel.updateGoogleAdsSent(conversion.id);
}
```

---

## Meta Ads Conversions API

### 1. Configuração Inicial

#### 1.1 Obtenha suas credenciais

1. Acesse [Meta Business Manager](https://business.facebook.com)
2. Crie um Pixel ou use um existente
3. Gere um Token de Acesso
4. Obtenha o Pixel ID

#### 1.2 Configure as variáveis de ambiente

```bash
META_PIXEL_ID=123456789
META_ACCESS_TOKEN=your-access-token
```

### 2. Implementação do Serviço

Crie o arquivo `src/services/MetaAdsService.ts`:

```typescript
import fetch from 'node-fetch';

export class MetaAdsService {
  private pixelId: string;
  private accessToken: string;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor() {
    this.pixelId = process.env.META_PIXEL_ID || '';
    this.accessToken = process.env.META_ACCESS_TOKEN || '';
  }

  async sendConversion(data: {
    eventName: string;
    eventId: string;
    eventTime: number;
    eventSourceUrl: string;
    userEmail?: string;
    userPhone?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    value: number;
    currency: string;
    fbclid?: string;
  }) {
    try {
      const userData: any = {};
      
      if (data.userEmail) {
        userData.em = this.hashData(data.userEmail);
      }
      if (data.userPhone) {
        userData.ph = this.hashData(data.userPhone);
      }
      if (data.firstName) {
        userData.fn = this.hashData(data.firstName);
      }
      if (data.lastName) {
        userData.ln = this.hashData(data.lastName);
      }
      if (data.city) {
        userData.ct = this.hashData(data.city);
      }
      if (data.state) {
        userData.st = this.hashData(data.state);
      }
      if (data.zipCode) {
        userData.zp = this.hashData(data.zipCode);
      }
      if (data.country) {
        userData.country = this.hashData(data.country);
      }

      const response = await fetch(
        `${this.baseUrl}/${this.pixelId}/events`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data: [
              {
                eventName: data.eventName,
                eventId: data.eventId,
                eventTime: data.eventTime,
                eventSourceUrl: data.eventSourceUrl,
                userData: userData,
                customData: {
                  value: data.value,
                  currency: data.currency
                },
                clickId: data.fbclid
              }
            ],
            accessToken: this.accessToken
          })
        }
      );

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      console.error('Meta Ads conversion error:', error);
      return { success: false, error };
    }
  }

  private hashData(data: string): string {
    // Normalize: lowercase, trim whitespace
    const normalized = data.toLowerCase().trim();
    
    // Hash using SHA-256
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  async sendPurchaseEvent(data: {
    eventId: string;
    eventTime: number;
    eventSourceUrl: string;
    userPhone: string;
    value: number;
    currency: string;
    fbclid?: string;
  }) {
    return this.sendConversion({
      eventName: 'Purchase',
      eventId: data.eventId,
      eventTime: data.eventTime,
      eventSourceUrl: data.eventSourceUrl,
      userPhone: data.userPhone,
      value: data.value,
      currency: data.currency,
      fbclid: data.fbclid
    });
  }
}
```

### 3. Integração com Conversão

Adicione ao `src/services/ConversionService.ts`:

```typescript
import { MetaAdsService } from './MetaAdsService';

const metaAdsService = new MetaAdsService();

// Após criar conversão
if (lead.fbclid) {
  await metaAdsService.sendPurchaseEvent({
    eventId: conversion.id,
    eventTime: Math.floor(Date.now() / 1000),
    eventSourceUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    userPhone: normalizedPhone,
    value: conversion.valor_venda,
    currency: 'BRL',
    fbclid: lead.fbclid
  });
  
  await ConversionModel.updateMetaAdsSent(conversion.id);
}
```

---

## Webhook para Sincronização de Vendas

Se seu sistema de vendas suporta webhooks, configure:

### 1. Endpoint de Webhook

Adicione ao `src/routes/webhooks.ts`:

```typescript
import { Hono } from 'hono';
import { ConversionService } from '../services/ConversionService';

const app = new Hono();

// POST /webhooks/sales - Recebe notificações de vendas
app.post('/sales', async (c) => {
  try {
    const body = await c.req.json();

    // Processa a venda
    const result = await ConversionService.processSale({
      codigo_venda: body.sale_id,
      valor_venda: body.amount,
      observacoes: body.notes,
      canal: body.channel || 'comercial',
      data_venda: body.sale_date || new Date().toISOString()
    });

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }

    return c.json({ success: true, conversion: result.conversion }, 201);
  } catch (error) {
    console.error('Webhook error:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

export default app;
```

### 2. Configurar no Sistema de Vendas

Configure a URL do webhook:
```
https://yourdomain.com/webhooks/sales
```

Payload esperado:
```json
{
  "sale_id": "VENDA-001",
  "amount": 299.90,
  "notes": "Cliente (11) 98765-4321 - Produto XYZ",
  "channel": "comercial",
  "sale_date": "2024-01-26T10:30:00Z"
}
```

---

## Teste de Integração

### 1. Teste Google Ads

```bash
curl -X POST http://localhost:3001/api/conversions \
  -H "Content-Type: application/json" \
  -d '{
    "codigo_venda": "TEST-001",
    "valor_venda": 99.90,
    "observacoes": "Cliente (11) 98765-4321 - Teste",
    "canal": "comercial"
  }'
```

### 2. Teste Meta Ads

```bash
curl -X POST http://localhost:3001/api/conversions \
  -H "Content-Type: application/json" \
  -d '{
    "codigo_venda": "TEST-002",
    "valor_venda": 149.90,
    "observacoes": "Cliente (11) 98765-4321 - Teste",
    "canal": "comercial"
  }'
```

### 3. Verifique os Logs

```bash
docker-compose logs app | grep -i "google\|meta\|conversion"
```

---

## Troubleshooting

### Google Ads

**Problema:** "Invalid GCLID"
- **Solução:** Verifique se o GCLID foi capturado corretamente na landing page

**Problema:** "Conversion Action not found"
- **Solução:** Configure o ID correto da ação de conversão no Google Ads

### Meta Ads

**Problema:** "Invalid access token"
- **Solução:** Regenere o token de acesso no Meta Business Manager

**Problema:** "Pixel ID not found"
- **Solução:** Verifique se o Pixel ID está correto e ativo

---

## Monitoramento de Conversões

### 1. Logs de Envio

Implemente logging detalhado:

```typescript
console.log(`[CONVERSION] Enviando para Google Ads: ${conversionId}`);
console.log(`[CONVERSION] Enviando para Meta Ads: ${conversionId}`);
```

### 2. Métricas

Acompanhe:
- Total de conversões capturadas
- Total de conversões enviadas para Google Ads
- Total de conversões enviadas para Meta Ads
- Taxa de sucesso de envio
- Tempo médio de envio

### 3. Alertas

Configure alertas para:
- Falha no envio de conversão
- Taxa de sucesso abaixo de 95%
- Latência acima de 5 minutos

---

## Boas Práticas

1. **Validação de Dados**
   - Sempre valide telefone, email e outros dados
   - Normalize formatos antes de enviar

2. **Retry Logic**
   - Implemente retry automático com backoff exponencial
   - Máximo de 3 tentativas

3. **Deduplicação**
   - Mantenha registro de conversões já enviadas
   - Use event ID único para cada conversão

4. **Privacidade**
   - Criptografe dados sensíveis
   - Respeite LGPD e GDPR

5. **Testes**
   - Teste em ambiente de staging antes de produção
   - Use modo de teste das plataformas

---

## Recursos Adicionais

- [Google Ads API Documentation](https://developers.google.com/google-ads/api/docs)
- [Meta Conversions API](https://developers.facebook.com/docs/marketing-api/conversions-api)
- [LGPD - Lei Geral de Proteção de Dados](https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd)

---

**Última atualização:** 26 de Janeiro de 2024
