import { LeadModel } from '../models/Lead';
import { query } from '../utils/db';

const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';
const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v19.0';
const GRAPH_API_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

/**
 * Interface para os dados do lead retornados pela Graph API
 */
export interface MetaLeadData {
  created_time: string;
  id: string;
  field_data: Array<{
    name: string;
    values: string[];
  }>;
  ad_id?: string;
  form_id?: string;
  adgroup_id?: string;
}

/**
 * Interface para o payload do webhook do Meta
 */
export interface MetaWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    changes: Array<{
      field: string;
      value: {
        ad_id: string;
        form_id: string;
        leadgen_id: string;
        created_time: number;
        page_id: string;
        adgroup_id: string;
      };
    }>;
  }>;
}

/**
 * Interface para o registro de webhook processado
 */
export interface WebhookLogEntry {
  leadgen_id: string;
  ad_id: string;
  form_id: string;
  page_id: string;
  adgroup_id: string;
  created_time: number;
  status: 'pendente' | 'processado' | 'erro';
  error_message?: string;
}

export class MetaLeadAdsService {

  /**
   * Processar o payload recebido do webhook do Meta
   * Extrai os leadgen_ids e enfileira para processamento assíncrono
   */
  static async processWebhookPayload(payload: MetaWebhookPayload): Promise<{
    success: boolean;
    processed: number;
    leadgen_ids: string[];
  }> {
    const leadgenIds: string[] = [];

    try {
      if (payload.object !== 'page') {
        console.log('⚠️ [Meta Lead Ads] Payload com object diferente de "page":', payload);
        return { success: true, processed: 0, leadgen_ids: [] };
      }

      // Iterar sobre as entradas e mudanças
      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          if (change.field === 'leadgen') {
            const { leadgen_id, ad_id, form_id, page_id, adgroup_id, created_time } = change.value;

            console.log(`📥 [Meta Lead Ads] Novo lead recebido: ${leadgen_id}`);

            // Registrar o webhook no banco de dados
            await this.logWebhookEntry({
              leadgen_id,
              ad_id,
              form_id,
              page_id,
              adgroup_id,
              created_time,
              status: 'pendente'
            });

            leadgenIds.push(leadgen_id);

            // Processar o lead de forma assíncrona (não bloqueia a resposta)
            this.processLeadAsync(leadgen_id, ad_id, form_id, page_id, adgroup_id);
          }
        }
      }

      console.log(`✅ [Meta Lead Ads] ${leadgenIds.length} leads enfileirados para processamento`);

      return {
        success: true,
        processed: leadgenIds.length,
        leadgen_ids: leadgenIds
      };
    } catch (error) {
      console.error('❌ [Meta Lead Ads] Erro ao processar payload:', error);
      return {
        success: false,
        processed: 0,
        leadgen_ids: leadgenIds
      };
    }
  }

  /**
   * Processar um lead de forma assíncrona
   * Busca os dados na Graph API e armazena no banco de dados
   */
  private static async processLeadAsync(
    leadgenId: string,
    adId: string,
    formId: string,
    pageId: string,
    adgroupId: string
  ): Promise<void> {
    try {
      console.log(`🔄 [Meta Lead Ads] Processando lead: ${leadgenId}`);

      // Buscar dados completos do lead na Graph API
      const leadData = await this.fetchLeadFromGraphAPI(leadgenId);

      if (!leadData) {
        await this.updateWebhookLog(leadgenId, 'erro', 'Falha ao buscar dados na Graph API');
        return;
      }

      // Extrair campos do formulário
      const fields = this.extractFieldData(leadData.field_data);

      // Criar o lead no banco de dados
      const lead = await LeadModel.create({
        telefone: fields.phone_number || '',
        email: fields.email || '',
        utm_source: 'meta',
        utm_medium: 'lead_ads',
        utm_campaign: adgroupId || '',
        utm_content: adId || '',
        utm_term: formId || '',
        fbclid: leadgenId,
        shopify_data: {
          meta_lead: true,
          leadgen_id: leadgenId,
          ad_id: adId,
          form_id: formId,
          page_id: pageId,
          adgroup_id: adgroupId,
          full_name: fields.full_name || '',
          created_time: leadData.created_time,
          raw_fields: fields
        }
      });

      // Atualizar o log do webhook
      await this.updateWebhookLog(leadgenId, 'processado');

      console.log(`✅ [Meta Lead Ads] Lead processado com sucesso: ${leadgenId} -> Lead ID: ${lead.id}`);
    } catch (error) {
      console.error(`❌ [Meta Lead Ads] Erro ao processar lead ${leadgenId}:`, error);
      await this.updateWebhookLog(
        leadgenId,
        'erro',
        error instanceof Error ? error.message : 'Erro desconhecido'
      );
    }
  }

  /**
   * Buscar dados do lead na Graph API do Meta com retry e backoff exponencial
   */
  static async fetchLeadFromGraphAPI(leadgenId: string): Promise<MetaLeadData | null> {
    if (!PAGE_ACCESS_TOKEN) {
      console.error('❌ [Meta Lead Ads] META_PAGE_ACCESS_TOKEN não configurado');
      return null;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const url = `${GRAPH_API_BASE_URL}/${leadgenId}?access_token=${PAGE_ACCESS_TOKEN}`;

        console.log(`📡 [Meta Lead Ads] Buscando lead na Graph API (tentativa ${attempt + 1}/${MAX_RETRIES}): ${leadgenId}`);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Graph API retornou ${response.status}: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json() as MetaLeadData;
        console.log(`✅ [Meta Lead Ads] Dados do lead obtidos com sucesso: ${leadgenId}`);
        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Erro desconhecido');
        console.warn(`⚠️ [Meta Lead Ads] Tentativa ${attempt + 1}/${MAX_RETRIES} falhou para ${leadgenId}: ${lastError.message}`);

        // Backoff exponencial
        if (attempt < MAX_RETRIES - 1) {
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
          console.log(`⏳ [Meta Lead Ads] Aguardando ${delay}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`❌ [Meta Lead Ads] Todas as tentativas falharam para ${leadgenId}:`, lastError?.message);
    return null;
  }

  /**
   * Extrair dados dos campos do formulário do Meta
   */
  private static extractFieldData(fieldData: Array<{ name: string; values: string[] }>): Record<string, string> {
    const fields: Record<string, string> = {};

    for (const field of fieldData) {
      fields[field.name] = field.values[0] || '';
    }

    return fields;
  }

  /**
   * Registrar entrada do webhook no banco de dados
   */
  private static async logWebhookEntry(entry: WebhookLogEntry): Promise<void> {
    try {
      await query(
        `INSERT INTO meta_webhook_logs (
          leadgen_id, ad_id, form_id, page_id, adgroup_id, 
          created_time, status, received_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (leadgen_id) DO UPDATE SET
          status = EXCLUDED.status,
          updated_at = NOW()`,
        [
          entry.leadgen_id,
          entry.ad_id,
          entry.form_id,
          entry.page_id,
          entry.adgroup_id,
          entry.created_time,
          entry.status
        ]
      );
    } catch (error) {
      console.error('❌ [Meta Lead Ads] Erro ao registrar webhook log:', error);
    }
  }

  /**
   * Atualizar status do log do webhook
   */
  private static async updateWebhookLog(
    leadgenId: string,
    status: 'pendente' | 'processado' | 'erro',
    errorMessage?: string
  ): Promise<void> {
    try {
      await query(
        `UPDATE meta_webhook_logs 
         SET status = $1, error_message = $2, updated_at = NOW()
         WHERE leadgen_id = $3`,
        [status, errorMessage || null, leadgenId]
      );
    } catch (error) {
      console.error('❌ [Meta Lead Ads] Erro ao atualizar webhook log:', error);
    }
  }

  /**
   * Reprocessar leads com erro
   */
  static async reprocessFailedLeads(): Promise<{
    success: boolean;
    reprocessed: number;
    failed: number;
  }> {
    try {
      const result = await query<{ leadgen_id: string; ad_id: string; form_id: string; page_id: string; adgroup_id: string }>(
        `SELECT leadgen_id, ad_id, form_id, page_id, adgroup_id 
         FROM meta_webhook_logs 
         WHERE status = 'erro' 
         ORDER BY received_at DESC 
         LIMIT 50`
      );

      let reprocessed = 0;
      let failed = 0;

      for (const row of result.rows) {
        try {
          await this.updateWebhookLog(row.leadgen_id, 'pendente');
          await this.processLeadAsync(
            row.leadgen_id,
            row.ad_id,
            row.form_id,
            row.page_id,
            row.adgroup_id
          );
          reprocessed++;
        } catch (error) {
          failed++;
        }
      }

      return { success: true, reprocessed, failed };
    } catch (error) {
      console.error('❌ [Meta Lead Ads] Erro ao reprocessar leads:', error);
      return { success: false, reprocessed: 0, failed: 0 };
    }
  }

  /**
   * Obter estatísticas dos webhooks
   */
  static async getWebhookStats(): Promise<{
    total: number;
    pendentes: number;
    processados: number;
    erros: number;
  }> {
    try {
      const result = await query<{ status: string; count: string }>(
        `SELECT status, COUNT(*) as count 
         FROM meta_webhook_logs 
         GROUP BY status`
      );

      const stats = {
        total: 0,
        pendentes: 0,
        processados: 0,
        erros: 0
      };

      for (const row of result.rows) {
        const count = parseInt(row.count);
        stats.total += count;

        switch (row.status) {
          case 'pendente':
            stats.pendentes = count;
            break;
          case 'processado':
            stats.processados = count;
            break;
          case 'erro':
            stats.erros = count;
            break;
        }
      }

      return stats;
    } catch (error) {
      console.error('❌ [Meta Lead Ads] Erro ao obter estatísticas:', error);
      return { total: 0, pendentes: 0, processados: 0, erros: 0 };
    }
  }
}
