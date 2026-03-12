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
      totalsDateFilter += ` AND v."DataVenda" >= $${totalsParamIndex}`;
      totalsParams.push(startDate);
      totalsParamIndex++;
    }
    if (endDate) {
      totalsDateFilter += ` AND v."DataVenda" <= $${totalsParamIndex}::date + interval '1 day'`;
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
          AND v."DataVenda" >= $1
          AND v."DataVenda" <= $2::date + interval '1 day'
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

    // Obter aportes agregados
    const aportes = await AporteService.getAggregated({
      data_inicio: aporteStartDate,
      data_fim: aporteEndDate
    });

    // Criar mapa de aportes para lookup rápido
    const aportesMap: Record<string, Record<string, number>> = {};
    aportes.forEach(a => {
      if (!aportesMap[a.utm_campaign]) {
        aportesMap[a.utm_campaign] = {};
      }
      aportesMap[a.utm_campaign][a.origem] = parseFloat(a.total_aporte);
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

      // Somar aportes
      if (aportesMap[row.utm_campaign] && aportesMap[row.utm_campaign][channel]) {
        channelStats[channel].total_aporte += aportesMap[row.utm_campaign][channel];
      }
    }

    const channelSummary = Object.entries(channelStats).map(([channel, stats]) => ({
      channel,
      total_vendas: stats.total_vendas,
      valor_total: stats.valor_total,
      total_aporte: stats.total_aporte,
      roi: stats.total_aporte > 0 ? ((stats.valor_total - stats.total_aporte) / stats.total_aporte * 100) : 0,
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

      // Obter aporte para esta campanha
      const aporte = aportesMap[row.utm_campaign]?.[row.origem] || 0;
      const roi = aporte > 0 ? ((valorTotal - aporte) / aporte * 100) : 0;

      return {
        utm_campaign: row.utm_campaign,
        origem: row.origem || '(direct)',
        total_vendas: totalVendas,
        valor_total: valorTotal,
        total_aporte: aporte,
        roi: roi,
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
        roi_geral: totalAportes > 0 ? ((parseFloat(currentTotals.valor_total) - totalAportes) / totalAportes * 100) : 0,
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
