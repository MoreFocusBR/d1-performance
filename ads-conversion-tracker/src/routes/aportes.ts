import { Hono } from 'hono';
import { AporteService } from '../services/AporteService';

const app = new Hono();

/**
 * GET /api/aportes
 * Listar aportes com filtros opcionais
 */
app.get('/', async (c) => {
  try {
    const utm_campaign = c.req.query('utm_campaign');
    const origem = c.req.query('origem');
    const data_inicio = c.req.query('data_inicio');
    const data_fim = c.req.query('data_fim');
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 100;
    const offset = c.req.query('offset') ? parseInt(c.req.query('offset')!) : 0;

    const result = await AporteService.list({
      utm_campaign,
      origem,
      data_inicio,
      data_fim,
      limit,
      offset
    });

    return c.json({
      success: true,
      aportes: result.rows,
      total: result.total,
      limit,
      offset
    });
  } catch (error) {
    console.error('❌ [Aportes API] Erro ao listar:', error);
    return c.json({
      success: false,
      error: 'Erro ao listar aportes',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, 500);
  }
});

/**
 * GET /api/aportes/aggregated
 * Obter aportes agregados por campanha e origem
 */
app.get('/aggregated', async (c) => {
  try {
    const data_inicio = c.req.query('data_inicio');
    const data_fim = c.req.query('data_fim');

    const aportes = await AporteService.getAggregated({
      data_inicio,
      data_fim
    });

    const total = await AporteService.getTotalByPeriod(data_inicio, data_fim);

    return c.json({
      success: true,
      aportes,
      total,
      count: aportes.length
    });
  } catch (error) {
    console.error('❌ [Aportes API] Erro ao agregar:', error);
    return c.json({
      success: false,
      error: 'Erro ao agregar aportes',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, 500);
  }
});

/**
 * GET /api/aportes/:id
 * Obter aporte específico
 */
app.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const aporte = await AporteService.getById(id);

    if (!aporte) {
      return c.json({ success: false, error: 'Aporte não encontrado' }, 404);
    }

    return c.json({ success: true, aporte });
  } catch (error) {
    console.error('❌ [Aportes API] Erro ao buscar:', error);
    return c.json({
      success: false,
      error: 'Erro ao buscar aporte',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, 500);
  }
});

/**
 * POST /api/aportes
 * Criar novo aporte
 */
app.post('/', async (c) => {
  try {
    const body = await c.req.json();

    // Validar campos obrigatórios
    if (!body.utm_campaign || !body.origem || body.valor_aporte === undefined || !body.data_aporte) {
      return c.json({
        success: false,
        error: 'Campos obrigatórios: utm_campaign, origem, valor_aporte, data_aporte'
      }, 400);
    }

    const aporte = await AporteService.create({
      utm_campaign: body.utm_campaign.trim(),
      origem: body.origem.trim(),
      valor_aporte: parseFloat(body.valor_aporte),
      data_aporte: body.data_aporte,
      descricao: body.descricao?.trim() || null,
      created_by: body.created_by || 'admin'
    });

    console.log(`✅ [Aportes API] Novo aporte criado: ${aporte.id}`);

    return c.json({
      success: true,
      aporte,
      message: 'Aporte criado com sucesso'
    }, 201);
  } catch (error) {
    console.error('❌ [Aportes API] Erro ao criar:', error);
    
    // Verificar se é erro de constraint (UNIQUE)
    if (error instanceof Error && error.message.includes('unique')) {
      return c.json({
        success: false,
        error: 'Já existe um aporte para esta campanha, origem e data'
      }, 409);
    }

    return c.json({
      success: false,
      error: 'Erro ao criar aporte',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, 500);
  }
});

/**
 * PUT /api/aportes/:id
 * Atualizar aporte
 */
app.put('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();

    // Validar campos obrigatórios
    if (!body.utm_campaign || !body.origem || body.valor_aporte === undefined || !body.data_aporte) {
      return c.json({
        success: false,
        error: 'Campos obrigatórios: utm_campaign, origem, valor_aporte, data_aporte'
      }, 400);
    }

    const aporte = await AporteService.update(id, {
      utm_campaign: body.utm_campaign.trim(),
      origem: body.origem.trim(),
      valor_aporte: parseFloat(body.valor_aporte),
      data_aporte: body.data_aporte,
      descricao: body.descricao?.trim() || null
    });

    console.log(`✅ [Aportes API] Aporte atualizado: ${id}`);

    return c.json({
      success: true,
      aporte,
      message: 'Aporte atualizado com sucesso'
    });
  } catch (error) {
    console.error('❌ [Aportes API] Erro ao atualizar:', error);

    if (error instanceof Error && error.message.includes('não encontrado')) {
      return c.json({ success: false, error: error.message }, 404);
    }

    return c.json({
      success: false,
      error: 'Erro ao atualizar aporte',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, 500);
  }
});

/**
 * DELETE /api/aportes/:id
 * Deletar aporte
 */
app.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const deleted = await AporteService.delete(id);

    if (!deleted) {
      return c.json({ success: false, error: 'Aporte não encontrado' }, 404);
    }

    console.log(`✅ [Aportes API] Aporte deletado: ${id}`);

    return c.json({
      success: true,
      message: 'Aporte deletado com sucesso'
    });
  } catch (error) {
    console.error('❌ [Aportes API] Erro ao deletar:', error);
    return c.json({
      success: false,
      error: 'Erro ao deletar aporte',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, 500);
  }
});

export default app;
