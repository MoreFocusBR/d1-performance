import { Hono } from 'hono';
import { authMiddleware, requireAuth } from '../middleware/auth';
import { LeadService } from '../services/LeadService';

const app = new Hono();

// Apply auth middleware to all routes
app.use('*', authMiddleware);

/**
 * POST /api/external/leads
 * Criar um novo lead via API externa
 * 
 * Requer autenticação via API key
 * 
 * Headers:
 *   X-API-Key: sua-api-key
 * 
 * Body:
 * {
 *   "telefone": "(11) 98765-4321",
 *   "utm_source": "google",
 *   "utm_medium": "cpc",
 *   "utm_campaign": "campanha_teste",
 *   "utm_content": "anuncio_1",
 *   "utm_term": "palavra-chave",
 *   "gclid": "google-click-id",
 *   "fbclid": "facebook-click-id",
 *   "shopify_data": {
 *     "customer_id": "123456",
 *     "order_id": "order_123",
 *     "email": "customer@example.com",
 *     "tags": ["vip", "newsletter"]
 *   }
 * }
 */
app.post('/leads', requireAuth, async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    if (!body.telefone) {
      return c.json(
        { success: false, error: 'Campo "telefone" é obrigatório' },
        400
      );
    }

    const result = await LeadService.captureLead({
      telefone: body.telefone,
      utm_source: body.utm_source,
      utm_medium: body.utm_medium,
      utm_campaign: body.utm_campaign,
      utm_content: body.utm_content,
      utm_term: body.utm_term,
      gclid: body.gclid,
      fbclid: body.fbclid,
      shopify_data: body.shopify_data,
      ip_address: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
      user_agent: c.req.header('user-agent') || 'unknown'
    });

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }

    return c.json(
      {
        success: true,
        lead: result.lead,
        message: 'Lead criado com sucesso'
      },
      201
    );
  } catch (error) {
    console.error('Error in POST /external/leads:', error);
    return c.json({ success: false, error: 'Erro interno do servidor' }, 500);
  }
});

/**
 * POST /api/external/leads/batch
 * Criar múltiplos leads em uma única requisição
 * 
 * Requer autenticação via API key
 * 
 * Headers:
 *   X-API-Key: sua-api-key
 * 
 * Body:
 * {
 *   "leads": [
 *     {
 *       "telefone": "(11) 98765-4321",
 *       "utm_campaign": "campanha_1",
 *       "shopify_data": {...}
 *     },
 *     {
 *       "telefone": "(21) 99999-8888",
 *       "utm_campaign": "campanha_2",
 *       "shopify_data": {...}
 *     }
 *   ]
 * }
 */
app.post('/leads/batch', requireAuth, async (c) => {
  try {
    const body = await c.req.json();

    if (!Array.isArray(body.leads) || body.leads.length === 0) {
      return c.json(
        { success: false, error: 'Campo "leads" deve ser um array não vazio' },
        400
      );
    }

    // Limit batch size to 100
    if (body.leads.length > 100) {
      return c.json(
        { success: false, error: 'Máximo de 100 leads por requisição' },
        400
      );
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < body.leads.length; i++) {
      const leadData = body.leads[i];

      try {
        if (!leadData.telefone) {
          errors.push({
            index: i,
            error: 'Campo "telefone" é obrigatório'
          });
          continue;
        }

        const result = await LeadService.captureLead({
          telefone: leadData.telefone,
          utm_source: leadData.utm_source,
          utm_medium: leadData.utm_medium,
          utm_campaign: leadData.utm_campaign,
          utm_content: leadData.utm_content,
          utm_term: leadData.utm_term,
          gclid: leadData.gclid,
          fbclid: leadData.fbclid,
          shopify_data: leadData.shopify_data,
          ip_address: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
          user_agent: c.req.header('user-agent') || 'unknown'
        });

        if (result.success) {
          results.push({
            index: i,
            success: true,
            lead: result.lead
          });
        } else {
          errors.push({
            index: i,
            error: result.error
          });
        }
      } catch (error) {
        errors.push({
          index: i,
          error: 'Erro ao processar lead'
        });
      }
    }

    return c.json(
      {
        success: errors.length === 0,
        total: body.leads.length,
        created: results.length,
        failed: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined
      },
      errors.length === 0 ? 201 : 207
    );
  } catch (error) {
    console.error('Error in POST /external/leads/batch:', error);
    return c.json({ success: false, error: 'Erro interno do servidor' }, 500);
  }
});

/**
 * GET /api/external/leads
 * Listar leads com filtros
 * 
 * Requer autenticação via API key
 * 
 * Query Parameters:
 *   - status: novo, convertido, expirado (padrão: novo)
 *   - limit: número máximo de resultados (padrão: 50, máximo: 1000)
 *   - offset: número de resultados a pular (padrão: 0)
 */
app.get('/leads', requireAuth, async (c) => {
  try {
    const status = c.req.query('status') || 'novo';
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 1000);
    const offset = parseInt(c.req.query('offset') || '0');

    // Validate status
    const validStatuses = ['novo', 'convertido', 'expirado'];
    if (!validStatuses.includes(status)) {
      return c.json(
        {
          success: false,
          error: `Status inválido. Valores aceitos: ${validStatuses.join(', ')}`
        },
        400
      );
    }

    const leads = await LeadService.getAllLeads({
      status,
      limit,
      offset
    });

    return c.json({
      success: true,
      count: leads.length,
      limit,
      offset,
      leads
    });
  } catch (error) {
    console.error('Error in GET /external/leads:', error);
    return c.json({ success: false, error: 'Erro interno do servidor' }, 500);
  }
});

/**
 * GET /api/external/leads/:phone
 * Buscar lead por telefone
 * 
 * Requer autenticação via API key
 */
app.get('/leads/:phone', requireAuth, async (c) => {
  try {
    const phone = c.req.param('phone');

    if (!phone) {
      return c.json(
        { success: false, error: 'Telefone é obrigatório' },
        400
      );
    }

    const lead = await LeadService.findLeadByPhone(phone);

    if (!lead) {
      return c.json(
        { success: false, error: 'Lead não encontrado' },
        404
      );
    }

    return c.json({ success: true, lead });
  } catch (error) {
    console.error('Error in GET /external/leads/:phone:', error);
    return c.json({ success: false, error: 'Erro interno do servidor' }, 500);
  }
});

/**
 * GET /api/external/health
 * Verificar saúde da API (sem autenticação)
 */
app.get('/health', async (c) => {
  return c.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

export default app;
