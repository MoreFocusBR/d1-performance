import { Hono } from 'hono';
import { query } from '../utils/db';

const app = new Hono();

/**
 * GET /api/campaigns/performance
 * 
 * Retorna dados de performance das campanhas cruzando vendas com leads da RD Station.
 * Aceita filtros de data e canal (origem).
 * 
 * Query Parameters:
 *   - start_date: Data início (YYYY-MM-DD)
 *   - end_date: Data fim (YYYY-MM-DD)
 *   - origem: Filtrar por canal/origem específico (pode ser múltiplo, separado por vírgula)
 */
app.get('/performance', async (c) => {
  try {
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');
    const origemFilter = c.req.query('origem');

    let dateFilter = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      dateFilter += ` AND v."DataVenda"::timestamp >= $${paramIndex}::timestamp`;
      params.push(startDate);
      paramIndex++;
    }
    if (endDate) {
      dateFilter += ` AND v."DataVenda"::timestamp <= $${paramIndex}::timestamp + interval '1 day'`;
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

    // Query principal: performance por campanha e canal
    const campaignResult = await query(`
      SELECT
        r.first_conversion->'conversion_origin'->>'campaign' AS utm_campaign,
        r.first_conversion->'conversion_origin'->>'source' AS origem,
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
      GROUP BY 
        utm_campaign, origem
      ORDER BY 
        valor_total_vendas DESC
    `, params);

    // Query de totais gerais (KPIs)
    const totalsParams: any[] = [];
    let totalsDateFilter = '';
    let totalsParamIndex = 1;

    if (startDate) {
      totalsDateFilter += ` AND v."DataVenda"::timestamp >= $${totalsParamIndex}::timestamp`;
      totalsParams.push(startDate);
      totalsParamIndex++;
    }
    if (endDate) {
      totalsDateFilter += ` AND v."DataVenda"::timestamp <= $${totalsParamIndex}::timestamp + interval '1 day'`;
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
          AND v."DataVenda"::timestamp >= $1::timestamp
          AND v."DataVenda"::timestamp <= $2::timestamp + interval '1 day'
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

    // Agrupar por canal para os gráficos
    const channelStats: Record<string, { total_vendas: number; valor_total: number; campanhas: Set<string> }> = {};
    for (const row of campaignResult.rows) {
      const channel = row.origem || '(direct)';
      if (!channelStats[channel]) {
        channelStats[channel] = { total_vendas: 0, valor_total: 0, campanhas: new Set() };
      }
      channelStats[channel].total_vendas += parseInt(row.total_vendas);
      channelStats[channel].valor_total += parseFloat(row.valor_total_vendas);
      channelStats[channel].campanhas.add(row.utm_campaign);
    }

    const channelSummary = Object.entries(channelStats).map(([channel, stats]) => ({
      channel,
      total_vendas: stats.total_vendas,
      valor_total: stats.valor_total,
      ticket_medio: stats.total_vendas > 0 ? stats.valor_total / stats.total_vendas : 0,
      total_campanhas: stats.campanhas.size
    })).sort((a, b) => b.valor_total - a.valor_total);

    // Formatar campanhas com dados de eficiência
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

      return {
        utm_campaign: row.utm_campaign,
        origem: row.origem || '(direct)',
        total_vendas: totalVendas,
        valor_total: valorTotal,
        ticket_medio: totalVendas > 0 ? valorTotal / totalVendas : 0,
        primeira_venda: primeiraVenda,
        ultima_venda: ultimaVenda,
        dias_ativo: diasAtivo,
        eficiencia: totalVendas > 0 ? (valorTotal / totalVendas / 1000 * 100) : 0
      };
    });

    const currentTotals = totalsResult.rows[0] || { total_vendas: 0, valor_total: 0, ticket_medio: 0 };

    return c.json({
      success: true,
      kpis: {
        total_vendas: parseInt(currentTotals.total_vendas) || 0,
        valor_total: parseFloat(currentTotals.valor_total) || 0,
        ticket_medio: parseFloat(currentTotals.ticket_medio) || 0,
        previous: previousTotals
      },
      channels: channelSummary,
      campaigns,
      available_channels: channelsResult.rows.map(r => r.origem).filter(Boolean),
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

export default app;
