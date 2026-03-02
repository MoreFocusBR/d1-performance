import { Hono } from 'hono';
import { RDStationWebhookService } from '../services/RDStationWebhookService';

const app = new Hono();

/**
 * POST /webhooks/rdstation
 * 
 * Endpoint para receber webhooks da RD Station Marketing.
 * A RD Station envia um POST com payload JSON contendo um array de leads
 * sempre que um gatilho configurado é acionado (conversão ou oportunidade).
 * 
 * Payload esperado:
 * {
 *   "leads": [
 *     {
 *       "id": "390319847",
 *       "email": "teste@webhook.com",
 *       "name": "Fulano Suporte RD",
 *       "company": null,
 *       "job_title": "Analista",
 *       ...
 *     }
 *   ]
 * }
 * 
 * Documentação: https://ajuda.rdstation.com/s/article/Integração-customizável-com-sistema-próprio-Webhook
 */
app.post('/', async (c) => {
  try {
    const payload = await c.req.json();

    console.log('📥 [RD Station Webhook] Webhook recebido');
    console.log(`📋 [RD Station Webhook] Leads no payload: ${payload?.leads?.length || 0}`);

    const result = await RDStationWebhookService.processWebhookPayload(payload);

    const statusCode = result.success ? 200 : 207;

    return c.json({
      success: result.success,
      message: `${result.processed} lead(s) processado(s)${result.failed > 0 ? `, ${result.failed} falha(s)` : ''}`,
      processed: result.processed,
      failed: result.failed,
      errors: result.errors.length > 0 ? result.errors : undefined
    }, statusCode);
  } catch (error) {
    console.error('❌ [RD Station Webhook] Erro ao processar webhook:', error);
    return c.json({
      success: false,
      error: 'Erro ao processar webhook',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, 500);
  }
});

/**
 * GET /webhooks/rdstation
 * 
 * Endpoint de verificação para a RD Station validar a URL do webhook.
 * A RD Station faz um GET para verificar se a URL está acessível.
 * Deve retornar HTTP 200 para que a validação seja bem-sucedida.
 */
app.get('/', async (c) => {
  return c.json({
    success: true,
    message: 'RD Station Webhook endpoint ativo',
    timestamp: new Date().toISOString()
  }, 200);
});

/**
 * GET /webhooks/rdstation/health
 * 
 * Verificar saúde do webhook da RD Station.
 */
app.get('/health', async (c) => {
  try {
    return c.json({
      success: true,
      status: 'active',
      endpoint: '/webhooks/rdstation',
      method: 'POST',
      description: 'Webhook para receber leads da RD Station Marketing',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Erro ao verificar saúde do webhook'
    }, 500);
  }
});

/**
 * GET /webhooks/rdstation/stats
 * 
 * Retorna estatísticas dos webhooks recebidos da RD Station.
 */
app.get('/stats', async (c) => {
  try {
    const stats = await RDStationWebhookService.getWebhookStats();

    return c.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ [RD Station Webhook] Erro ao obter estatísticas:', error);
    return c.json({
      success: false,
      error: 'Erro ao obter estatísticas',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, 500);
  }
});

/**
 * GET /webhooks/rdstation/leads
 * 
 * Lista os leads recebidos via webhook com paginação.
 * 
 * Query Parameters:
 *   - limit: Número máximo de registros (default: 50)
 *   - offset: Offset para paginação (default: 0)
 *   - status: Filtrar por status (recebido, atualizado, erro)
 */
app.get('/leads', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    const status = c.req.query('status');

    const result = await RDStationWebhookService.getWebhookLeads({
      limit,
      offset,
      status: status || undefined
    });

    return c.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('❌ [RD Station Webhook] Erro ao listar leads:', error);
    return c.json({
      success: false,
      error: 'Erro ao listar leads',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, 500);
  }
});

export default app;
