import { Hono } from 'hono';
import { query } from '../utils/db';
import { AporteService } from '../services/AporteService';

const app = new Hono();

function resolveConversionField(conversionTypeRaw?: string) {
  const conversionType = conversionTypeRaw === 'first' ? 'first' : 'last';
  const conversionField = conversionType === 'first' ? 'first_conversion' : 'last_conversion';
  const viewCampaignField = conversionType === 'first' ? 'first_utm_campaign' : 'last_utm_campaign';
  const viewSourceField = conversionType === 'first' ? 'first_origem' : 'last_origem';
  return { conversionType, conversionField, viewCampaignField, viewSourceField };
}

function buildVendaDateFilter(
  startDate?: string,
  endDate?: string,
  initialParamIndex = 1,
  column = `v."DataVenda"`
) {
  let sql = '';
  const params: any[] = [];
  let paramIndex = initialParamIndex;

  if (startDate) {
    sql += ` AND (${column})::date >= $${paramIndex}::date`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    sql += ` AND (${column})::date <= $${paramIndex}::date`;
    params.push(endDate);
    paramIndex++;
  }

  return { sql, params, nextParamIndex: paramIndex };
}

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
 *   - conversion_type: Tipo de conversão (first|last). Padrão: last
 */
app.get('/performance', async (c) => {
  try {
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');
    const origemFilter = c.req.query('origem');
    const aporteStartDate = c.req.query('aporte_start_date');
    const aporteEndDate = c.req.query('aporte_end_date');
    const origemPedidoFilter = c.req.query('origem_pedido');
    const { conversionType, viewCampaignField, viewSourceField } = resolveConversionField(c.req.query('conversion_type'));

    const campaignExpr = `v.${viewCampaignField}`;
    const sourceExpr = `v.${viewSourceField}`;

    const dateFilterResult = buildVendaDateFilter(startDate, endDate, 1, 'v.data_venda');
    const dateFilter = dateFilterResult.sql;
    const params: any[] = [...dateFilterResult.params];
    let paramIndex = dateFilterResult.nextParamIndex;

    let origemFilterSQL = '';
    if (origemFilter) {
      const origens = origemFilter.split(',').map(o => o.trim());
      const placeholders = origens.map((_, i) => `$${paramIndex + i}`).join(', ');
      origemFilterSQL = ` AND LOWER(${sourceExpr}) IN (${placeholders})`;
      params.push(...origens.map(o => o.toLowerCase()));
      paramIndex += origens.length;
    }

    let origemPedidoFilterSQL = '';
    if (origemPedidoFilter) {
      const origensPedido = origemPedidoFilter.split(',').map(o => o.trim());
      const placeholders = origensPedido.map((_, i) => `$${paramIndex + i}`).join(', ');
      origemPedidoFilterSQL = ` AND LOWER(v.canal) IN (${placeholders})`;
      params.push(...origensPedido.map(o => o.toLowerCase()));
      paramIndex += origensPedido.length;
    }

    const campaignPromise = query(`
      SELECT
        ${campaignExpr} AS utm_campaign,
        ${sourceExpr} AS origem,
        v.canal AS origem_pedido,
        COUNT(v.conversao_id) AS total_vendas,
        SUM(v.valor_venda::numeric) AS valor_total_vendas,
        MIN(v.data_venda) AS primeira_venda,
        MAX(v.data_venda) AS ultima_venda
      FROM
        vw_conversoes_confirmadas v
      WHERE
        1=1
        AND ${campaignExpr} IS NOT NULL
        AND TRIM(${campaignExpr}) <> ''
        AND ${campaignExpr} != '(not set)'
        ${dateFilter}
        ${origemFilterSQL}
        ${origemPedidoFilterSQL}
      GROUP BY
        1, 2, 3
      ORDER BY
        valor_total_vendas DESC
    `, params);

    const totalsDateFilterResult = buildVendaDateFilter(startDate, endDate, 1, 'v.data_venda');
    const totalsDateFilter = totalsDateFilterResult.sql;
    const totalsParams = totalsDateFilterResult.params;

    const totalsPromise = query(`
      SELECT
        COUNT(v.conversao_id) AS total_vendas,
        COALESCE(SUM(v.valor_venda::numeric), 0) AS valor_total,
        COALESCE(AVG(v.valor_venda::numeric), 0) AS ticket_medio
      FROM
        vw_conversoes_confirmadas v
      WHERE
        1=1
        AND ${campaignExpr} IS NOT NULL
        AND TRIM(${campaignExpr}) <> ''
        AND ${campaignExpr} != '(not set)'
        ${totalsDateFilter}
    `, totalsParams);

    let previousPromise: Promise<any> = Promise.resolve({
      rows: [{ total_vendas: 0, valor_total: 0, ticket_medio: 0 }]
    });

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const prevEnd = new Date(start);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - diffDays);

      const prevStartDate = prevStart.toISOString().split('T')[0];
      const prevEndDate = prevEnd.toISOString().split('T')[0];
      const previousDateFilterResult = buildVendaDateFilter(prevStartDate, prevEndDate, 1, 'v.data_venda');

      previousPromise = query(`
        SELECT
          COUNT(v.conversao_id) AS total_vendas,
          COALESCE(SUM(v.valor_venda::numeric), 0) AS valor_total,
          COALESCE(AVG(v.valor_venda::numeric), 0) AS ticket_medio
        FROM
          vw_conversoes_confirmadas v
        WHERE
          1=1
          AND ${campaignExpr} IS NOT NULL
          AND TRIM(${campaignExpr}) <> ''
          AND ${campaignExpr} != '(not set)'
          ${previousDateFilterResult.sql}
      `, previousDateFilterResult.params);
    }

    const channelsPromise = query(`
      SELECT DISTINCT
        ${sourceExpr} AS origem
      FROM
        vw_conversoes_confirmadas v
      WHERE
        1=1
        AND ${campaignExpr} IS NOT NULL
        AND TRIM(${campaignExpr}) <> ''
        AND ${campaignExpr} != '(not set)'
        AND ${sourceExpr} IS NOT NULL
        AND TRIM(${sourceExpr}) <> ''
        ${totalsDateFilter}
      ORDER BY 1
    `, totalsParams);

    const origemPedidoPromise = query(`
      SELECT DISTINCT
        v.canal AS origem_pedido
      FROM
        vw_conversoes_confirmadas v
      WHERE
        v.canal IS NOT NULL
        AND TRIM(v.canal) <> ''
      ORDER BY 1
    `);

    const aportesPromise = AporteService.getAggregated({
      data_inicio: aporteStartDate,
      data_fim: aporteEndDate
    });
    const totalAportesPromise = AporteService.getTotalByPeriod(aporteStartDate, aporteEndDate);

    const [
      campaignResult,
      totalsResult,
      previousResult,
      channelsResult,
      origemPedidoResult,
      aportes,
      totalAportes
    ] = await Promise.all([
      campaignPromise,
      totalsPromise,
      previousPromise,
      channelsPromise,
      origemPedidoPromise,
      aportesPromise,
      totalAportesPromise
    ]);

    const previousTotals = previousResult.rows[0]
      ? {
          total_vendas: parseInt(previousResult.rows[0].total_vendas) || 0,
          valor_total: parseFloat(previousResult.rows[0].valor_total) || 0,
          ticket_medio: parseFloat(previousResult.rows[0].ticket_medio) || 0
        }
      : { total_vendas: 0, valor_total: 0, ticket_medio: 0 };

    const aportesMap: Record<string, number> = {};
    aportes.forEach((a: any) => {
      aportesMap[a.utm_campaign] = parseFloat(a.total_aporte);
    });

    const channelStats: Record<string, { total_vendas: number; valor_total: number; total_aporte: number; campanhas: Set<string> }> = {};
    for (const row of campaignResult.rows) {
      const channel = row.origem || '(direct)';
      if (!channelStats[channel]) {
        channelStats[channel] = { total_vendas: 0, valor_total: 0, total_aporte: 0, campanhas: new Set() };
      }
      channelStats[channel].total_vendas += parseInt(row.total_vendas);
      channelStats[channel].valor_total += parseFloat(row.valor_total_vendas);
      channelStats[channel].campanhas.add(row.utm_campaign);

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

    const campaigns = campaignResult.rows.map((row: any) => {
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
      conversion_type: conversionType,
      available_channels: channelsResult.rows.map((r: any) => r.origem).filter(Boolean),
      available_origem_pedido: origemPedidoResult.rows.map((r: any) => r.origem_pedido).filter(Boolean),
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
 *   - conversion_type: Tipo de conversão (first|last). Padrão: last
 */
app.get('/orders', async (c) => {
  try {
    const utmCampaign = c.req.query('utm_campaign');
    const origem = c.req.query('origem');
    const origemPedido = c.req.query('origem_pedido');
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');
    const { conversionType, viewCampaignField, viewSourceField } = resolveConversionField(c.req.query('conversion_type'));

    if (!utmCampaign || !origem) {
      return c.json({
        success: false,
        error: 'utm_campaign e origem são obrigatórios'
      }, 400);
    }

    const campaignExpr = `v.${viewCampaignField}`;
    const sourceExpr = `v.${viewSourceField}`;

    let whereClause = `
      WHERE ${campaignExpr} = $1
      AND ${sourceExpr} = $2
    `;
    const params: any[] = [utmCampaign, origem];
    let paramIndex = 3;

    if (origemPedido) {
      whereClause += ` AND LOWER(v.canal) = $${paramIndex}`;
      params.push(origemPedido.toLowerCase());
      paramIndex++;
    }

    const ordersDateFilterResult = buildVendaDateFilter(startDate, endDate, paramIndex, 'v.data_venda');
    whereClause += ordersDateFilterResult.sql;
    params.push(...ordersDateFilterResult.params);

    const ordersResult = await query(`
      SELECT
        v.codigo_venda AS codigo,
        v.lead_email AS email,
        v.data_venda AS data_venda,
        v.valor_venda AS valor_total,
        v.canal AS origem_pedido,
        false AS cancelada,
        v.conversao_id AS conversao_id,
        jsonb_array_length(COALESCE(c.events_payload, '[]'::jsonb)) AS events_count
      FROM
        vw_conversoes_confirmadas v
      INNER JOIN
        conversoes c
        ON c.id = v.conversao_id
      ${whereClause}
      ORDER BY v.data_venda DESC
      LIMIT 100
    `, params);

    return c.json({
      success: true,
      conversion_type: conversionType,
      orders: ordersResult.rows.map((row: any) => ({
        codigo: row.codigo,
        email: row.email,
        data_venda: row.data_venda,
        valor_total: parseFloat(row.valor_total) || 0,
        origem_pedido: row.origem_pedido || 'Não informado',
        cancelada: row.cancelada,
        conversao_id: row.conversao_id || null,
        events_count: parseInt(row.events_count) || 0
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


