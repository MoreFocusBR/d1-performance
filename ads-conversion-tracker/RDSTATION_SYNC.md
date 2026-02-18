# Sincronização com RD Station

Este documento descreve como funciona a sincronização de leads com o RD Station.

## Visão Geral

A sincronização é feita através de um endpoint GET `/api/sync-rdstation` que consulta todos os leads com status `novo` e os envia para o RD Station.

## Endpoints

### GET /api/sync-rdstation

Sincroniza todos os leads com status `novo` para o RD Station.

**Query Parameters:**
- `force` (opcional): `true` para forçar a sincronização mesmo que o lead já tenha sido sincronizado.

**Exemplo de Resposta (Sucesso):**
```json
{
  "success": true,
  "message": "Sincronização concluída com sucesso: 2 leads sincronizados",
  "synced": 2,
  "failed": 0
}
```

**Exemplo de Resposta (com Erros):**
```json
{
  "success": false,
  "message": "Sincronização concluída com erros: 1 sucesso, 1 falhas",
  "synced": 1,
  "failed": 1,
  "errors": [
    {
      "leadId": "...",
      "email": "...",
      "error": "Falha ao enviar para RD Station"
    }
  ]
}
```

### POST /api/sync-rdstation/lead/:id

Sincroniza um lead específico para o RD Station.

**Exemplo de Resposta:**
```json
{
  "success": true,
  "message": "Lead sincronizado com sucesso"
}
```

### GET /api/sync-rdstation/health

Verifica a saúde da sincronização e se as variáveis de ambiente estão configuradas.

**Exemplo de Resposta:**
```json
{
  "success": true,
  "status": "configured",
  "rdStationUri": "✓",
  "rdStationApiKey": "✓"
}
```

## Configuração

Para que a sincronização funcione, as seguintes variáveis de ambiente devem ser configuradas:

- `RDSTATION_URI`: URI da API do RD Station (ex: `https://api.rdstation.com`)
- `RDSTATION_API_KEY`: Chave de API do RD Station

## Estrutura do Contato

O contato enviado para o RD Station tem a seguinte estrutura:

```json
{
  "email": "{leads.email}",
  "bio": "Solicitou para avisar sobre chegada do produto: {leads.shopify_data->productName} - {leads.shopify_data->variantName}",
  "tag": "avise_me"
}
```
