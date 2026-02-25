import { Hono } from 'hono';
import { metaSignatureMiddleware } from '../middleware/metaSignature';
import { MetaLeadAdsService, MetaWebhookPayload } from '../services/MetaLeadAdsService';

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || '';

const app = new Hono();

/**
 * GET /webhooks/meta-leads
 * 
 * Endpoint de verificação do webhook do Meta.
 * Quando o webhook é configurado no painel de desenvolvedores da Meta,
 * uma requisição GET é enviada para verificar a autenticidade do endpoint.
 */
app.get('/', (c) => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');

  console.log(`🔐 [Meta Webhook] Verificação recebida - mode: ${mode}`);

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ [Meta Webhook] Verificação bem-sucedida');
      // Retornar o challenge como texto plano com status 200
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    } else {
      console.warn('⚠️ [Meta Webhook] Token de verificação inválido');
      return c.json({ error: 'Forbidden' }, 403);
    }
  }

  console.warn('⚠️ [Meta Webhook] Parâmetros de verificação ausentes');
  return c.json({ error: 'Bad Request' }, 400);
});

/**
 * POST /webhooks/meta-leads
 * 
 * Endpoint para recebimento de notificações de novos leads.
 * O Meta envia um payload JSON com o leadgen_id quando um novo lead é capturado.
 * 
 * Fluxo:
 * 1. Valida a assinatura X-Hub-Signature-256 (via middleware)
 * 2. Responde rapidamente com 200 OK
 * 3. Processa o payload de forma assíncrona (busca dados na Graph API)
 */
app.post('/', metaSignatureMiddleware, async (c) => {
  try {
    // O corpo já foi parseado pelo middleware de assinatura
    const payload = c.get('parsedBody') as MetaWebhookPayload;

    if (!payload) {
      // Fallback: tentar parsear o corpo diretamente
      const body = await c.req.json();
      if (!body) {
        return c.json({ error: 'Payload vazio' }, 400);
      }
    }

    console.log(`📥 [Meta Webhook] Notificação recebida - object: ${payload.object}`);

    // Processar o payload (o processamento pesado é feito de forma assíncrona)
    const result = await MetaLeadAdsService.processWebhookPayload(payload);

    console.log(`✅ [Meta Webhook] ${result.processed} leads enfileirados para processamento`);

    // Responder rapidamente com 200 OK
    return c.json({
      success: true,
      message: `${result.processed} leads recebidos`,
      leadgen_ids: result.leadgen_ids
    }, 200);
  } catch (error) {
    console.error('❌ [Meta Webhook] Erro ao processar notificação:', error);
    // Mesmo em caso de erro, retornar 200 para evitar que o Meta reenvie
    return c.json({ success: true, message: 'Received' }, 200);
  }
});

/**
 * GET /webhooks/meta-leads/stats
 * 
 * Endpoint para visualizar estatísticas dos webhooks recebidos.
 */
app.get('/stats', async (c) => {
  try {
    const stats = await MetaLeadAdsService.getWebhookStats();

    return c.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ [Meta Webhook] Erro ao obter estatísticas:', error);
    return c.json({
      success: false,
      error: 'Erro ao obter estatísticas'
    }, 500);
  }
});

/**
 * POST /webhooks/meta-leads/reprocess
 * 
 * Endpoint para reprocessar leads que falharam.
 */
app.post('/reprocess', async (c) => {
  try {
    console.log('🔄 [Meta Webhook] Reprocessando leads com erro...');

    const result = await MetaLeadAdsService.reprocessFailedLeads();

    return c.json({
      success: result.success,
      message: `${result.reprocessed} leads reprocessados, ${result.failed} falhas`,
      reprocessed: result.reprocessed,
      failed: result.failed
    });
  } catch (error) {
    console.error('❌ [Meta Webhook] Erro ao reprocessar leads:', error);
    return c.json({
      success: false,
      error: 'Erro ao reprocessar leads'
    }, 500);
  }
});

/**
 * GET /webhooks/meta-leads/health
 * 
 * Endpoint para verificar a saúde da integração com o Meta.
 */
app.get('/health', (c) => {
  const verifyToken = process.env.META_VERIFY_TOKEN;
  const appSecret = process.env.META_APP_SECRET;
  const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;

  const configured = Boolean(verifyToken && appSecret && pageAccessToken);

  return c.json({
    success: true,
    status: configured ? 'configured' : 'not_configured',
    checks: {
      META_VERIFY_TOKEN: verifyToken ? '✓' : '✗',
      META_APP_SECRET: appSecret ? '✓' : '✗',
      META_PAGE_ACCESS_TOKEN: pageAccessToken ? '✓' : '✗'
    }
  });
});

export default app;
