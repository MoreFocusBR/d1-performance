import { ConversionModel, Conversion } from '../models/Conversion';
import { LeadModel } from '../models/Lead';
import { extractPhoneFromText } from '../utils/validation';
import { query } from '../utils/db';

export interface ProcessSaleRequest {
  codigo_venda: string;
  valor_venda: number;
  observacoes: string;
  canal: string;
  data_venda: string;
}

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

export interface SyncConfirmedRequest {
  batch_size?: number;
  max_batches?: number;
  dry_run?: boolean;
}

export interface GetConfirmedConversionsRequest {
  page?: number;
  limit?: number;
  search?: string;
  start_date?: string | null;
  end_date?: string | null;
}

export interface ConversionEventsResult {
  found: boolean;
  conversion_id?: string;
  events_payload?: any[];
  events_count?: number;
}

export class ConversionService {
  private static normalizeBaseUrl(url?: string) {
    if (!url) return '';
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  private static async fetchRDStationEvents(rdstationContactId: string): Promise<unknown | null> {
    const baseUrl = this.normalizeBaseUrl(process.env.RDSTATION_URI);
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
    return data;
  }

  private static async updateConversionEventsPayload(conversionId: string, eventsPayload: unknown | null) {
    await query(
      `UPDATE conversoes
       SET events_payload = $1::jsonb
       WHERE id = $2`,
      [JSON.stringify(eventsPayload || []), conversionId]
    );
  }

  private static async hydrateEventsForInsertedRows(rows: InsertedConversionRow[], concurrency = 5) {
    let fetched = 0;
    let failed = 0;
    const errors: Array<{ conversion_id: string; rdstation_contact_id: string | null; error: string }> = [];

    for (let i = 0; i < rows.length; i += concurrency) {
      const chunk = rows.slice(i, i + concurrency);
      const settled = await Promise.allSettled(
        chunk.map(async (row) => {
          if (!row.rdstation_contact_id) {
            await this.updateConversionEventsPayload(row.conversion_id, []);
            return;
          }

          const events = await this.fetchRDStationEvents(row.rdstation_contact_id);
          await this.updateConversionEventsPayload(row.conversion_id, events);
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

  private static async syncConfirmedBatch(batchSize: number): Promise<SyncBatchResult> {
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
          AND NOT (v."EntregaEmail" ILIKE ANY (ARRAY['%@mercadolivre.com%', '%@shopee.com%', '%@marketplace.amazon.com.br%']))
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
          SELECT r.first_conversion, r.last_conversion
          FROM rdstation_webhook_logs r
          WHERE r.email IS NOT NULL
            AND LOWER(r.email) = cv.email_key
          ORDER BY COALESCE(r.updated_at, r.received_at) DESC, r.id DESC
          LIMIT 1
        ) rd ON true
        WHERE (
            NULLIF(TRIM(rd.last_conversion->'conversion_origin'->>'campaign'), '') IS NOT NULL
            OR NULLIF(TRIM(rd.first_conversion->'conversion_origin'->>'campaign'), '') IS NOT NULL
          )
          AND COALESCE(
            NULLIF(TRIM(rd.last_conversion->'conversion_origin'->>'campaign'), ''),
            NULLIF(TRIM(rd.first_conversion->'conversion_origin'->>'campaign'), '')
          ) <> '(not set)'
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

  private static async getSyncConfirmedEligibleCount() {
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
          SELECT r.first_conversion, r.last_conversion
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
          AND NOT (v."EntregaEmail" ILIKE ANY (ARRAY['%@mercadolivre.com%', '%@shopee.com%', '%@marketplace.amazon.com.br%']))
          AND (
            NULLIF(TRIM(rd.last_conversion->'conversion_origin'->>'campaign'), '') IS NOT NULL
            OR NULLIF(TRIM(rd.first_conversion->'conversion_origin'->>'campaign'), '') IS NOT NULL
          )
          AND COALESCE(
            NULLIF(TRIM(rd.last_conversion->'conversion_origin'->>'campaign'), ''),
            NULLIF(TRIM(rd.first_conversion->'conversion_origin'->>'campaign'), '')
          ) <> '(not set)'
      ) x
    `);

    return parseInt(dryResult.rows[0]?.eligible_count || '0', 10) || 0;
  }

  static async syncConfirmed(data: SyncConfirmedRequest = {}) {
    const start = Date.now();

    const batchSizeRaw = Number(data?.batch_size ?? 50);
    const maxBatchesRaw = Number(data?.max_batches ?? 1);
    const dryRun = Boolean(data?.dry_run ?? false);

    const batchSize = Number.isFinite(batchSizeRaw) ? Math.max(1, Math.min(200, Math.floor(batchSizeRaw))) : 50;
    const maxBatches = Number.isFinite(maxBatchesRaw) ? Math.max(1, Math.min(200, Math.floor(maxBatchesRaw))) : 1;

    if (dryRun) {
      const eligibleTotal = await this.getSyncConfirmedEligibleCount();
      return {
        success: true,
        dry_run: true,
        eligible_total: eligibleTotal,
        duration_ms: Date.now() - start
      };
    }

    let totalInserted = 0;
    let totalEligibleScanned = 0;
    let executedBatches = 0;
    let eventsFetched = 0;
    let eventsFailed = 0;
    const eventsErrors: Array<{ conversion_id: string; rdstation_contact_id: string | null; error: string }> = [];

    for (let i = 0; i < maxBatches; i++) {
      const batch = await this.syncConfirmedBatch(batchSize);
      executedBatches++;
      totalEligibleScanned += batch.eligible;
      totalInserted += batch.inserted;
      if (batch.insertedRows.length > 0) {
        const hydration = await this.hydrateEventsForInsertedRows(batch.insertedRows);
        eventsFetched += hydration.fetched;
        eventsFailed += hydration.failed;
        eventsErrors.push(...hydration.errors);
      }

      if (batch.eligible === 0) break;
      if (batch.inserted === 0) break;
      if (batch.eligible < batchSize) break;
    }

    return {
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
    };
  }

  static async getConfirmedConversions(params: GetConfirmedConversionsRequest = {}) {
    const pageRaw = Number(params.page ?? 1);
    const limitRaw = Number(params.limit ?? 50);
    const search = (params.search || '').trim();
    const startDate = params.start_date || undefined;
    const endDate = params.end_date || undefined;

    const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.floor(limitRaw))) : 50;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      whereClause += ` AND v.data_venda::date >= $${paramIndex}::date`;
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND v.data_venda::date <= $${paramIndex}::date`;
      queryParams.push(endDate);
      paramIndex++;
    }

    let searchClause = '';
    if (search) {
      searchClause = `
        AND (
          v.codigo_venda ILIKE $${paramIndex}
          OR v.lead_email ILIKE $${paramIndex}
          OR v.utm_campaign ILIKE $${paramIndex}
          OR v.origem ILIKE $${paramIndex}
        )
      `;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const [totalResult, rowsResult] = await Promise.all([
      query<{ total: string }>(
        `SELECT COUNT(*)::text AS total
         FROM vw_conversoes_confirmadas v
         ${whereClause}
         ${searchClause}`,
        queryParams
      ),
      query(
        `SELECT
          v.conversao_id,
          v.codigo_venda,
          v.valor_venda,
          v.data_venda,
          v.canal,
          v.created_at,
          c.events_payload,
          jsonb_array_length(COALESCE(c.events_payload, '[]'::jsonb)) AS events_count,
          v.google_ads_enviado,
          v.meta_ads_enviado,
          v.lead_id,
          v.lead_email,
          v.lead_status,
          v.utm_campaign,
          v.origem
        FROM vw_conversoes_confirmadas v
        INNER JOIN conversoes c
          ON c.id = v.conversao_id
        ${whereClause}
        ${searchClause}
        ORDER BY v.data_venda DESC NULLS LAST, v.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...queryParams, limit, offset]
      )
    ]);

    const total = parseInt(totalResult.rows[0]?.total || '0', 10) || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      success: true,
      page,
      limit,
      total,
      total_pages: totalPages,
      rows: rowsResult.rows
    };
  }

  static async getConversionEvents(conversionId: string): Promise<ConversionEventsResult> {
    const result = await query<{ id: string; events_payload: any }>(
      `SELECT id, COALESCE(events_payload, '[]'::jsonb) AS events_payload
       FROM conversoes
       WHERE id = $1
       LIMIT 1`,
      [conversionId]
    );

    const row = result.rows[0];
    if (!row) {
      return { found: false };
    }

    const payload = Array.isArray(row.events_payload) ? row.events_payload : [];
    return {
      found: true,
      conversion_id: row.id,
      events_payload: payload,
      events_count: payload.length
    };
  }

  static async processSale(data: ProcessSaleRequest): Promise<{ success: boolean; conversion?: Conversion; error?: string }> {
    try {
      // Check if sale is from commercial channel
      if (data.canal !== 'comercial' && data.canal !== 'whatsapp') {
        return {
          success: false,
          error: 'Canal de venda não suportado para rastreamento'
        };
      }

      // Extract phone from observations
      const phone = extractPhoneFromText(data.observacoes);
      if (!phone) {
        return {
          success: false,
          error: 'Telefone não encontrado nas observações'
        };
      }

      // Find corresponding lead
      const lead = await LeadModel.findByPhone(phone);

      if (!lead) {
        return {
          success: false,
          error: 'Lead não encontrado para este telefone'
        };
      }

      // Check if conversion already exists
      const existingConversion = await ConversionModel.findByCodigoVenda(data.codigo_venda);
      if (existingConversion) {
        return {
          success: false,
          error: 'Venda já foi processada anteriormente'
        };
      }

      // Create conversion
      const conversion = await ConversionModel.create({
        lead_id: lead.id,
        codigo_venda: data.codigo_venda,
        valor_venda: data.valor_venda,
        canal: data.canal,
        data_venda: data.data_venda
      });

      // Update lead status
      await LeadModel.updateStatus(lead.id, 'convertido');

      return {
        success: true,
        conversion
      };
    } catch (error) {
      console.error('Error processing sale:', error);
      return {
        success: false,
        error: 'Erro ao processar a venda'
      };
    }
  }

  static async getConversionWithLead(conversionId: string): Promise<any> {
    try {
      const conversion = await ConversionModel.findById(conversionId);
      if (!conversion) {
        return null;
      }

      const lead = await LeadModel.findById(conversion.lead_id);
      return {
        ...conversion,
        lead
      };
    } catch (error) {
      console.error('Error getting conversion:', error);
      return null;
    }
  }

  static async getPendingConversions(): Promise<any[]> {
    try {
      const conversions = await ConversionModel.findPendingConversions();

      const result = [];
      for (const conversion of conversions) {
        const lead = await LeadModel.findById(conversion.lead_id);
        result.push({
          ...conversion,
          lead
        });
      }

      return result;
    } catch (error) {
      console.error('Error getting pending conversions:', error);
      return [];
    }
  }

  static async markGoogleAdsSent(conversionId: string): Promise<boolean> {
    try {
      await ConversionModel.updateGoogleAdsSent(conversionId);
      return true;
    } catch (error) {
      console.error('Error marking Google Ads sent:', error);
      return false;
    }
  }

  static async markMetaAdsSent(conversionId: string): Promise<boolean> {
    try {
      await ConversionModel.updateMetaAdsSent(conversionId);
      return true;
    } catch (error) {
      console.error('Error marking Meta Ads sent:', error);
      return false;
    }
  }

  static async getStats(days: number = 30): Promise<any> {
    try {
      return await ConversionModel.getConversionStats(days);
    } catch (error) {
      console.error('Error getting stats:', error);
      return null;
    }
  }
}
