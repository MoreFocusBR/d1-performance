import { Hono } from 'hono';
import { query } from '../utils/db';
import { AporteService } from '../services/AporteService';

const app = new Hono();

/**
 * GET /api/campaigns/performance
 * 
 * Retorna dados de performance das campanhas cruzando vendas com leads da RD Station.
 * Aceita filtros de data de vendas e data de aportes.
 * 
 * Query Parameters:
 *   - start_date: Data início vendas (YYYY-MM-DD)
 *   - end_date: Data fim vendas (YYYY-MM-DD)
 *   - origem: Filtrar por canal/origem específico (pode ser múltiplo, separado por vírgula)
 *   - aporte_start_date: Data início aportes (YYYY-MM-DD)
 *   - aporte_end_date: Data fim aportes (YYYY-MM-DD)
 */
app.get('/performance', async (c) => {
  try {
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');
    const origemFilter = c.req.query('origem');
    const aporteStartDate = c.req.query('aporte_start_date');
    const aporteEndDate = c.req.query('aporte_end_date');
    const origemPedidoFilter = c.req.query('origem_pedido');

    let dateFilter = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      dateFilter += ` AND v."DataVenda"::date >= $${paramIndex}::date`;
      params.push(startDate);
      paramIndex++;
    }
    if (endDate) {
      dateFilter += ` AND v."DataVenda"::date <= $${paramIndex}::date`;
      params.push(endDate);
      paramIndex++;
    }

    let origemFilterSQL = '';
    if (origemFilter) {
      const origens = origemFilter.split(',').map(o => o.trim());
      const placeholders = origens.map((_, i) => `$${paramIndex + i}`).join(', ');
      origemFilterSQL = ` AND LOWER(r.first_conversion->'conversion_origin'->>'source') IN (${placeholders})`;
      params.push(...origens.map(o => o.toLowerCase()));
      paramIndex += origens.length;
    }

    let origemPedidoFilterSQL = '';
    if (origemPedidoFilter) {
      const origensPedido = origemPedidoFilter.split(',').map(o => o.trim());
      const placeholders = origensPedido.map((_, i) => `$${paramIndex + i}`).join(', ');
      origemPedidoFilterSQL = ` AND LOWER(v."OrigemPedido") IN (${placeholders})`;
      params.push(...origensPedido.map(o => o.toLowerCase()));
      paramIndex += origensPedido.length;
    }

    // Query principal: performance por campanha e canal
    const campaignResult = await query(`
      SELECT
        r.first_conversion->'conversion_origin'->>'campaign' AS utm_campaign,
        r.first_conversion->'conversion_origin'->>'source' AS origem,
        v."OrigemPedido" AS origem_pedido,
        COUNT(v."Codigo") AS total_vendas,
        SUM(v."ValorTotal"::numeric) AS valor_total_vendas,
        MIN(v."DataVenda") AS primeira_venda,
        MAX(v."DataVenda") AS ultima_venda
      FROM 
        "Venda" v
      INNER JOIN 
        rdstation_webhook_logs r 
        ON LOWER(v."EntregaEmail") = LOWER(r.email)
      WHERE 
        v."Cancelada" = false
        AND r.first_conversion->'conversion_origin'->>'campaign' IS NOT NULL
        AND r.first_conversion->'conversion_origin'->>'campaign' != '(not set)'
        ${dateFilter}
        ${origemFilterSQL}
        ${origemPedidoFilterSQL}
      GROUP BY 
        utm_campaign, origem, v."OrigemPedido"
      ORDER BY 
        valor_total_vendas DESC
    `, params);

    // Query de totais gerais (KPIs)
    const totalsParams: any[] = [];
    let totalsDateFilter = '';
    let totalsParamIndex = 1;

    if (startDate) {
      totalsDateFilter += ` AND v."DataVenda"::date >= $${totalsParamIndex}::date`;
      totalsParams.push(startDate);
      totalsParamIndex++;
    }
    if (endDate) {
      totalsDateFilter += ` AND v."DataVenda"::date <= $${totalsParamIndex}::date`;
      totalsParams.push(endDate);
      totalsParamIndex++;
    }

    const totalsResult = await query(`
      SELECT
        COUNT(v."Codigo") AS total_vendas,
        COALESCE(SUM(v."ValorTotal"::numeric), 0) AS valor_total,
        COALESCE(AVG(v."ValorTotal"::numeric), 0) AS ticket_medio
      FROM 
        "Venda" v
      INNER JOIN 
        rdstation_webhook_logs r 
        ON LOWER(v."EntregaEmail") = LOWER(r.email)
      WHERE 
        v."Cancelada" = false
        AND r.first_conversion->'conversion_origin'->>'campaign' IS NOT NULL
        AND r.first_conversion->'conversion_origin'->>'campaign' != '(not set)'
        ${totalsDateFilter}
    `, totalsParams);

    // Query de período anterior para comparação (mesmo intervalo antes)
    let previousTotals = { total_vendas: 0, valor_total: 0, ticket_medio: 0 };
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const prevEnd = new Date(start);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - diffDays);

      const prevResult = await query(`
        SELECT
          COUNT(v."Codigo") AS total_vendas,
          COALESCE(SUM(v."ValorTotal"::numeric), 0) AS valor_total,
          COALESCE(AVG(v."ValorTotal"::numeric), 0) AS ticket_medio
        FROM 
          "Venda" v
        INNER JOIN 
          rdstation_webhook_logs r 
          ON LOWER(v."EntregaEmail") = LOWER(r.email)
        WHERE 
          v."Cancelada" = false
          AND r.first_conversion->'conversion_origin'->>'campaign' IS NOT NULL
          AND r.first_conversion->'conversion_origin'->>'campaign' != '(not set)'
          AND v."DataVenda"::date >= $1::date
          AND v."DataVenda"::date <= $2::date
      `, [prevStart.toISOString().split('T')[0], prevEnd.toISOString().split('T')[0]]);

      if (prevResult.rows[0]) {
        previousTotals = {
          total_vendas: parseInt(prevResult.rows[0].total_vendas) || 0,
          valor_total: parseFloat(prevResult.rows[0].valor_total) || 0,
          ticket_medio: parseFloat(prevResult.rows[0].ticket_medio) || 0
        };
      }
    }

    // Query de canais disponíveis (para filtro)
    const channelsResult = await query(`
      SELECT DISTINCT 
        r.first_conversion->'conversion_origin'->>'source' AS origem
      FROM 
        "Venda" v
      INNER JOIN 
        rdstation_webhook_logs r 
        ON LOWER(v."EntregaEmail") = LOWER(r.email)
      WHERE 
        v."Cancelada" = false
        AND r.first_conversion->'conversion_origin'->>'source' IS NOT NULL
      ORDER BY origem
    `);

    // Query de origens de pedido disponíveis (para filtro)
    const origemPedidoResult = await query(`
      SELECT DISTINCT 
        v."OrigemPedido" AS origem_pedido
      FROM 
        "Venda" v
      INNER JOIN 
        rdstation_webhook_logs r 
        ON LOWER(v."EntregaEmail") = LOWER(r.email)
      WHERE 
        v."Cancelada" = false
        AND v."OrigemPedido" IS NOT NULL
      ORDER BY origem_pedido
    `);

    // Obter aportes agregados
    const aportes = await AporteService.getAggregated({
      data_inicio: aporteStartDate,
      data_fim: aporteEndDate
    });

    // Criar mapa de aportes para lookup rápido (apenas por campanha)
    const aportesMap: Record<string, number> = {};
    aportes.forEach(a => {
      aportesMap[a.utm_campaign] = parseFloat(a.total_aporte);
    });

    // Agrupar por canal para os gráficos
    const channelStats: Record<string, { total_vendas: number; valor_total: number; total_aporte: number; campanhas: Set<string> }> = {};
    for (const row of campaignResult.rows) {
      const channel = row.origem || '(direct)';
      if (!channelStats[channel]) {
        channelStats[channel] = { total_vendas: 0, valor_total: 0, total_aporte: 0, campanhas: new Set() };
      }
      channelStats[channel].total_vendas += parseInt(row.total_vendas);
      channelStats[channel].valor_total += parseFloat(row.valor_total_vendas);
      channelStats[channel].campanhas.add(row.utm_campaign);

      // Somar aportes (agora apenas por campanha)
      if (aportesMap[row.utm_campaign]) {
        channelStats[channel].total_aporte += aportesMap[row.utm_campaign];
      }
    }

    const channelSummary = Object.entries(channelStats).map(([channel, stats]) => ({
      channel,
      total_vendas: stats.total_vendas,
      valor_total: stats.valor_total,
      total_aporte: stats.total_aporte,
      roas: stats.total_aporte > 0 ? stats.valor_total / stats.total_aporte : 0,
      ticket_medio: stats.total_vendas > 0 ? stats.valor_total / stats.total_vendas : 0,
      total_campanhas: stats.campanhas.size
    })).sort((a, b) => b.valor_total - a.valor_total);

    // Formatar campanhas com dados de eficiência e ROI
    const campaigns = campaignResult.rows.map(row => {
      const totalVendas = parseInt(row.total_vendas);
      const valorTotal = parseFloat(row.valor_total_vendas);
      const primeiraVenda = row.primeira_venda;
      const ultimaVenda = row.ultima_venda;
      
      let diasAtivo = 0;
      if (primeiraVenda && ultimaVenda) {
        diasAtivo = Math.ceil(
          (new Date(ultimaVenda).getTime() - new Date(primeiraVenda).getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      // Obter aporte para esta campanha (agora apenas por utm_campaign)
      const aporte = aportesMap[row.utm_campaign] || 0;
      const roas = aporte > 0 ? valorTotal / aporte : 0;

      return {
        utm_campaign: row.utm_campaign,
        origem: row.origem || '(direct)',
        origem_pedido: row.origem_pedido || 'Não informado',
        total_vendas: totalVendas,
        valor_total: valorTotal,
        total_aporte: aporte,
        roas: roas,
        ticket_medio: totalVendas > 0 ? valorTotal / totalVendas : 0,
        primeira_venda: primeiraVenda,
        ultima_venda: ultimaVenda,
        dias_ativo: diasAtivo,
        eficiencia: totalVendas > 0 ? (valorTotal / totalVendas / 1000 * 100) : 0
      };
    });

    const currentTotals = totalsResult.rows[0] || { total_vendas: 0, valor_total: 0, ticket_medio: 0 };
    const totalAportes = await AporteService.getTotalByPeriod(aporteStartDate, aporteEndDate);

    return c.json({
      success: true,
      kpis: {
        total_vendas: parseInt(currentTotals.total_vendas) || 0,
        valor_total: parseFloat(currentTotals.valor_total) || 0,
        ticket_medio: parseFloat(currentTotals.ticket_medio) || 0,
        total_aportes: totalAportes,
        roas_geral: totalAportes > 0 ? parseFloat(currentTotals.valor_total) / totalAportes : 0,
        previous: previousTotals
      },
      channels: channelSummary,
      campaigns,
      available_channels: channelsResult.rows.map(r => r.origem).filter(Boolean),
      available_origem_pedido: origemPedidoResult.rows.map(r => r.origem_pedido).filter(Boolean),
      total_campaigns: campaigns.length
    });
  } catch (error) {
    console.error('❌ [Campaigns API] Erro:', error);
    return c.json({
      success: false,
      error: 'Erro ao buscar dados de campanhas',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, 500);
  }
});

/**
 * GET /api/campaigns/orders
 * 
 * Retorna os pedidos/vendas vinculados a uma campanha específica.
 * 
 * Query Parameters:
 *   - utm_campaign: Nome da campanha
 *   - origem: Canal/origem da campanha
 *   - start_date: Data início (YYYY-MM-DD)
 *   - end_date: Data fim (YYYY-MM-DD)
 */
app.get('/orders', async (c) => {
  try {
    const utmCampaign = c.req.query('utm_campaign');
    const origem = c.req.query('origem');
    const origemPedido = c.req.query('origem_pedido');
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');

    if (!utmCampaign || !origem) {
      return c.json({
        success: false,
        error: 'utm_campaign e origem são obrigatórios'
      }, 400);
    }

    let whereClause = `
      WHERE r.first_conversion->'conversion_origin'->>'campaign' = $1
      AND r.first_conversion->'conversion_origin'->>'source' = $2
      AND v."Cancelada" = false
    `;
    const params: any[] = [utmCampaign, origem];
    let paramIndex = 3;

    // Adicionar filtro de origem_pedido se fornecido
    if (origemPedido) {
      whereClause += ` AND LOWER(v."OrigemPedido") = $${paramIndex}`;
      params.push(origemPedido.toLowerCase());
      paramIndex++;
    }

    if (startDate) {
      whereClause += ` AND v."DataVenda"::date >= $${paramIndex}::date`;
      params.push(startDate);
      paramIndex++;
    }
    if (endDate) {
      whereClause += ` AND v."DataVenda"::date <= $${paramIndex}::date`;
      params.push(endDate);
      paramIndex++;
    }

    const ordersResult = await query(`
      SELECT
        v."Codigo" AS codigo,
        v."EntregaEmail" AS email,
        v."DataVenda" AS data_venda,
        v."ValorTotal" AS valor_total,
        v."OrigemPedido" AS origem_pedido,
        v."Cancelada" AS cancelada
      FROM 
        "Venda" v
      INNER JOIN 
        rdstation_webhook_logs r 
        ON LOWER(v."EntregaEmail") = LOWER(r.email)
      ${whereClause}
      ORDER BY v."DataVenda" DESC
      LIMIT 100
    `, params);

    return c.json({
      success: true,
      orders: ordersResult.rows.map(row => ({
        codigo: row.codigo,
        email: row.email,
        data_venda: row.data_venda,
        valor_total: parseFloat(row.valor_total) || 0,
        origem_pedido: row.origem_pedido || 'Não informado',
        cancelada: row.cancelada
      }))
    });
  } catch (error) {
    console.error('❌ [Campaigns Orders API] Erro:', error);
    return c.json({
      success: false,
      error: 'Erro ao buscar pedidos da campanha',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, 500);
  }
});

export default app;
