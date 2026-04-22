import { Hono } from 'hono';
import { ConversionService } from '../services/ConversionService';
import { query } from '../utils/db';

const app = new Hono();

type SyncBatchResultRow = {
  eligible_count: string;
  inserted_count: string;
  inserted_rows: string;
};

type InsertedConversionRow = {
  conversion_id: string;
  codigo_venda: string;
  rdstation_contact_id: string | null;
};

type SyncBatchResult = {
  eligible: number;
  inserted: number;
  insertedRows: InsertedConversionRow[];
};

function normalizeBaseUrl(url?: string) {
  if (!url) return '';
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

async function fetchRDStationEvents(rdstationContactId: string): Promise<any[] | null> {
  const baseUrl = normalizeBaseUrl(process.env.RDSTATION_URI);
  const apiKey = process.env.RDSTATION_API_KEY;

  if (!baseUrl || !apiKey || !rdstationContactId) return null;

  const url = `${baseUrl}/contact/${encodeURIComponent(rdstationContactId)}/events`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`RD events request failed (${response.status}): ${errText}`);
  }

  const data = await response.json().catch(() => null);
  if (!Array.isArray(data)) return [];
  return data;
}

async function updateConversionEventsPayload(conversionId: string, eventsPayload: any[] | null) {
  await query(
    `UPDATE conversoes
     SET events_payload = $1::jsonb
     WHERE id = $2`,
    [JSON.stringify(eventsPayload || []), conversionId]
  );
}

async function hydrateEventsForInsertedRows(rows: InsertedConversionRow[], concurrency = 5) {
  let fetched = 0;
  let failed = 0;
  const errors: Array<{ conversion_id: string; rdstation_contact_id: string | null; error: string }> = [];

  for (let i = 0; i < rows.length; i += concurrency) {
    const chunk = rows.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      chunk.map(async (row) => {
        if (!row.rdstation_contact_id) {
          await updateConversionEventsPayload(row.conversion_id, []);
          return;
        }

        const events = await fetchRDStationEvents(row.rdstation_contact_id);
        await updateConversionEventsPayload(row.conversion_id, events);
      })
    );

    settled.forEach((result, idx) => {
      const row = chunk[idx];
      if (result.status === 'fulfilled') {
        fetched++;
      } else {
        failed++;
        errors.push({
          conversion_id: row.conversion_id,
          rdstation_contact_id: row.rdstation_contact_id,
          error: result.reason instanceof Error ? result.reason.message : 'Erro desconhecido'
        });
      }
    });
  }

  return { fetched, failed, errors };
}

async function syncConfirmedBatch(batchSize: number): Promise<SyncBatchResult> {
  const candidateWindow = Math.max(batchSize * 30, 1000);

  const result = await query<SyncBatchResultRow>(`
    WITH candidate_vendas AS (
      SELECT
        v."Codigo"::text AS codigo_venda,
        LOWER(TRIM(v."EntregaEmail")) AS email_key,
        COALESCE(v."ValorTotal"::numeric, 0) AS valor_venda,
        COALESCE(NULLIF(v."OrigemPedido", ''), 'comercial') AS canal,
        CASE
          WHEN v."DataVenda" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
          THEN v."DataVenda"::timestamp
          ELSE NOW()
        END AS data_venda
      FROM "Venda" v
      LEFT JOIN conversoes c
        ON c.codigo_venda = v."Codigo"::text
      WHERE c.id IS NULL
        AND v."Cancelada" = false
        AND v."EntregaEmail" IS NOT NULL
        AND TRIM(v."EntregaEmail") <> ''
      LIMIT $2
    ),
    eligible AS (
      SELECT
        l.id AS lead_id,
        cv.codigo_venda,
        cv.valor_venda,
        cv.canal,
        cv.data_venda,
        l.rdstation_contact_id
      FROM candidate_vendas cv
      JOIN LATERAL (
        SELECT ld.id, ld.rdstation_contact_id
        FROM leads ld
        WHERE ld.email IS NOT NULL
          AND LOWER(ld.email) = cv.email_key
        ORDER BY ld.created_at DESC, ld.id DESC
        LIMIT 1
      ) l ON true
      JOIN LATERAL (
        SELECT r.last_conversion
        FROM rdstation_webhook_logs r
        WHERE r.email IS NOT NULL
          AND LOWER(r.email) = cv.email_key
        ORDER BY COALESCE(r.updated_at, r.received_at) DESC, r.id DESC
        LIMIT 1
      ) rd ON true
      WHERE rd.last_conversion->'conversion_origin'->>'campaign' IS NOT NULL
        AND rd.last_conversion->'conversion_origin'->>'campaign' <> ''
        AND rd.last_conversion->'conversion_origin'->>'campaign' <> '(not set)'
      LIMIT $1
    ),
    inserted AS (
      INSERT INTO conversoes (
        lead_id, codigo_venda, valor_venda, canal, data_venda, events_payload, google_ads_enviado, meta_ads_enviado
      )
      SELECT
        lead_id, codigo_venda, valor_venda, canal, data_venda, '[]'::jsonb, false, false
      FROM eligible
      ON CONFLICT (codigo_venda) DO NOTHING
      RETURNING id, codigo_venda
    )
    SELECT
      (SELECT COUNT(*)::text FROM eligible) AS eligible_count,
      (SELECT COUNT(*)::text FROM inserted) AS inserted_count,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'conversion_id', i.id,
              'codigo_venda', i.codigo_venda,
              'rdstation_contact_id', e.rdstation_contact_id
            )
          )
          FROM inserted i
          INNER JOIN eligible e
            ON e.codigo_venda = i.codigo_venda
        ),
        '[]'::json
      )::text AS inserted_rows
  `, [batchSize, candidateWindow]);

  console.log(`Sync batch result: eligible=${result.rows[0]?.eligible_count || '0'}, inserted=${result.rows[0]?.inserted_count || '0'}`);

  const row = result.rows[0] || { eligible_count: '0', inserted_count: '0', inserted_rows: '[]' };
  let insertedRows: InsertedConversionRow[] = [];
  try {
    insertedRows = row.inserted_rows ? JSON.parse(row.inserted_rows) : [];
  } catch {
    insertedRows = [];
  }

  return {
    eligible: parseInt(row.eligible_count, 10) || 0,
    inserted: parseInt(row.inserted_count, 10) || 0,
    insertedRows
  };
}

// POST /api/conversions/sync-confirmed - Sync confirmed leads from Venda + leads + RDStation
app.post('/sync-confirmed', async (c) => {
  const start = Date.now();
  try {
    const body = await c.req.json().catch(() => ({} as any));
    const batchSizeRaw = Number(body?.batch_size ?? 50);
    const maxBatchesRaw = Number(body?.max_batches ?? 1);
    const dryRun = Boolean(body?.dry_run ?? false);

    const batchSize = Number.isFinite(batchSizeRaw) ? Math.max(1, Math.min(200, Math.floor(batchSizeRaw))) : 50;
    const maxBatches = Number.isFinite(maxBatchesRaw) ? Math.max(1, Math.min(200, Math.floor(maxBatchesRaw))) : 1;

    if (dryRun) {
      const dryResult = await query<{ eligible_count: string }>(`
        SELECT COUNT(*)::text AS eligible_count
        FROM (
          SELECT v."Codigo"
          FROM "Venda" v
          LEFT JOIN conversoes c
            ON c.codigo_venda = v."Codigo"::text
          JOIN LATERAL (
            SELECT ld.id
            FROM leads ld
            WHERE ld.email IS NOT NULL
              AND v."EntregaEmail" IS NOT NULL
              AND LOWER(ld.email) = LOWER(v."EntregaEmail")
            ORDER BY ld.created_at DESC, ld.id DESC
            LIMIT 1
          ) l ON true
          JOIN LATERAL (
            SELECT r.last_conversion
            FROM rdstation_webhook_logs r
            WHERE r.email IS NOT NULL
              AND v."EntregaEmail" IS NOT NULL
              AND LOWER(r.email) = LOWER(v."EntregaEmail")
            ORDER BY COALESCE(r.updated_at, r.received_at) DESC, r.id DESC
            LIMIT 1
          ) rd ON true
          WHERE c.id IS NULL
            AND v."Cancelada" = false
            AND v."EntregaEmail" IS NOT NULL
            AND TRIM(v."EntregaEmail") <> ''
            AND rd.last_conversion->'conversion_origin'->>'campaign' IS NOT NULL
            AND rd.last_conversion->'conversion_origin'->>'campaign' <> ''
            AND rd.last_conversion->'conversion_origin'->>'campaign' <> '(not set)'
        ) x
      `);

      return c.json({
        success: true,
        dry_run: true,
        eligible_total: parseInt(dryResult.rows[0]?.eligible_count || '0', 10) || 0,
        duration_ms: Date.now() - start
      });
    }

    let totalInserted = 0;
    let totalEligibleScanned = 0;
    let executedBatches = 0;
    let eventsFetched = 0;
    let eventsFailed = 0;
    const eventsErrors: Array<{ conversion_id: string; rdstation_contact_id: string | null; error: string }> = [];

    for (let i = 0; i < maxBatches; i++) {
      const batch = await syncConfirmedBatch(batchSize);
      executedBatches++;
      totalEligibleScanned += batch.eligible;
      totalInserted += batch.inserted;
      if (batch.insertedRows.length > 0) {
        const hydration = await hydrateEventsForInsertedRows(batch.insertedRows);
        eventsFetched += hydration.fetched;
        eventsFailed += hydration.failed;
        eventsErrors.push(...hydration.errors);
      }

      if (batch.eligible === 0) break;
      if (batch.inserted === 0) break;
      if (batch.eligible < batchSize) break;
    }

    return c.json({
      success: true,
      batch_size: batchSize,
      max_batches: maxBatches,
      executed_batches: executedBatches,
      eligible_scanned: totalEligibleScanned,
      inserted: totalInserted,
      events_fetched: eventsFetched,
      events_failed: eventsFailed,
      events_errors: eventsErrors.slice(0, 20),
      duration_ms: Date.now() - start
    });
  } catch (error) {
    console.error('Error in POST /conversions/sync-confirmed:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// GET /api/conversions/confirmed - List confirmed conversions from view
app.get('/confirmed', async (c) => {
  try {
    const pageRaw = Number(c.req.query('page') || '1');
    const limitRaw = Number(c.req.query('limit') || '50');
    const search = (c.req.query('search') || '').trim();
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');

    const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.floor(limitRaw))) : 50;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      whereClause += ` AND c.data_venda::date >= $${paramIndex}::date`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND c.data_venda::date <= $${paramIndex}::date`;
      params.push(endDate);
      paramIndex++;
    }

    let countSearchClause = '';
    let rowsSearchClause = '';
    if (search) {
      countSearchClause = `
        AND (
          c.codigo_venda ILIKE $${paramIndex}
          OR l.email ILIKE $${paramIndex}
          OR EXISTS (
            SELECT 1
            FROM rdstation_webhook_logs r
            WHERE l.email IS NOT NULL
              AND r.email IS NOT NULL
              AND LOWER(r.email) = LOWER(l.email)
              AND (
                r.last_conversion->'conversion_origin'->>'campaign' ILIKE $${paramIndex}
                OR r.last_conversion->'conversion_origin'->>'source' ILIKE $${paramIndex}
              )
          )
        )
      `;
      rowsSearchClause = `
        AND (
          c.codigo_venda ILIKE $${paramIndex}
          OR l.email ILIKE $${paramIndex}
          OR rd.utm_campaign ILIKE $${paramIndex}
          OR rd.origem ILIKE $${paramIndex}
        )
      `;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const [totalResult, rowsResult] = await Promise.all([
      query<{ total: string }>(
        `SELECT COUNT(*)::text AS total
         FROM conversoes c
         JOIN leads l ON l.id = c.lead_id
         ${whereClause}
         ${countSearchClause}`,
        params
      ),
      query(
        `SELECT
          c.id AS conversao_id,
          c.codigo_venda,
          c.valor_venda,
          c.data_venda,
          c.canal,
          c.created_at,
          c.google_ads_enviado,
          c.meta_ads_enviado,
          l.id AS lead_id,
          l.email AS lead_email,
          l.status AS lead_status,
          rd.utm_campaign,
          rd.origem
        FROM conversoes c
        JOIN leads l ON l.id = c.lead_id
        LEFT JOIN LATERAL (
          SELECT
            r.last_conversion->'conversion_origin'->>'campaign' AS utm_campaign,
            r.last_conversion->'conversion_origin'->>'source' AS origem
          FROM rdstation_webhook_logs r
          WHERE l.email IS NOT NULL
            AND r.email IS NOT NULL
            AND LOWER(r.email) = LOWER(l.email)
          ORDER BY COALESCE(r.updated_at, r.received_at) DESC, r.id DESC
          LIMIT 1
        ) rd ON true
        ${whereClause}
        ${rowsSearchClause}
        ORDER BY c.data_venda DESC NULLS LAST, c.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      )
    ]);

    const total = parseInt(totalResult.rows[0]?.total || '0', 10) || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return c.json({
      success: true,
      page,
      limit,
      total,
      total_pages: totalPages,
      rows: rowsResult.rows
    });
  } catch (error) {
    console.error('Error in GET /conversions/confirmed:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// POST /api/conversions - Process a sale and create conversion
app.post('/', async (c) => {
  try {
    const body = await c.req.json();

    const result = await ConversionService.processSale({
      codigo_venda: body.codigo_venda,
      valor_venda: body.valor_venda,
      observacoes: body.observacoes,
      canal: body.canal || 'comercial',
      data_venda: body.data_venda || new Date().toISOString()
    });

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }

    return c.json({
      success: true,
      conversion: result.conversion
    }, 201);
  } catch (error) {
    console.error('Error in POST /conversions:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// GET /api/conversions/:id - Get conversion details
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const conversion = await ConversionService.getConversionWithLead(id);

    if (!conversion) {
      return c.json({ success: false, error: 'Conversion not found' }, 404);
    }

    return c.json({ success: true, conversion });
  } catch (error) {
    console.error('Error in GET /conversions/:id:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// GET /api/conversions - Get pending conversions
app.get('/', async (c) => {
  try {
    const conversions = await ConversionService.getPendingConversions();
    return c.json({ success: true, conversions });
  } catch (error) {
    console.error('Error in GET /conversions:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// POST /api/conversions/:id/google-sent - Mark conversion as sent to Google Ads
app.post('/:id/google-sent', async (c) => {
  try {
    const id = c.req.param('id');
    const success = await ConversionService.markGoogleAdsSent(id);

    if (!success) {
      return c.json({ success: false, error: 'Failed to update conversion' }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Error in POST /conversions/:id/google-sent:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// POST /api/conversions/:id/meta-sent - Mark conversion as sent to Meta Ads
app.post('/:id/meta-sent', async (c) => {
  try {
    const id = c.req.param('id');
    const success = await ConversionService.markMetaAdsSent(id);

    if (!success) {
      return c.json({ success: false, error: 'Failed to update conversion' }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Error in POST /conversions/:id/meta-sent:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

export default app;
