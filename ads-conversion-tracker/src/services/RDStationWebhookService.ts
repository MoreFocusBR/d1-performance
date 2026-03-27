import { query } from '../utils/db';

/**
 * Interface para o lead recebido via webhook da RD Station
 * Baseado na documentação oficial:
 * https://ajuda.rdstation.com/s/article/Integração-customizável-com-sistema-próprio-Webhook
 */
export interface RDStationWebhookLead {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  job_title: string | null;
  bio: string | null;
  public_url: string | null;
  created_at: string;
  opportunity: string;
  number_conversions: string;
  user: string | null;
  last_conversion: Record<string, any> | null;
  last_conversion: Record<string, any> | null;
  custom_fields: Record<string, any> | null;
  website: string | null;
  personal_phone: string | null;
  mobile_phone: string | null;
  city: string | null;
  estado: string | null;
  lead_stage: string | null;
  tags: string[] | null;
  fit_score: string | null;
  interest: string | null;
  [key: string]: any; // Campos adicionais que a RD Station pode enviar
}

/**
 * Interface para o payload completo do webhook da RD Station
 */
export interface RDStationWebhookPayload {
  leads: RDStationWebhookLead[];
}

/**
 * Service responsável por processar os webhooks recebidos da RD Station.
 * 
 * A RD Station envia um POST com payload JSON contendo um array de leads
 * sempre que um gatilho configurado é acionado (conversão ou oportunidade).
 */
export class RDStationWebhookService {

  /**
   * Processa o payload completo recebido do webhook da RD Station.
   * Itera sobre cada lead do array e registra no banco de dados.
   */
  static async processWebhookPayload(payload: RDStationWebhookPayload): Promise<{
    success: boolean;
    processed: number;
    failed: number;
    errors: any[];
  }> {
    const results = {
      processed: 0,
      failed: 0,
      errors: [] as any[]
    };

    if (!payload || !payload.leads || !Array.isArray(payload.leads)) {
      console.warn('⚠️ [RD Station Webhook] Payload inválido ou sem leads');
      return { success: false, ...results, errors: ['Payload inválido ou sem leads'] };
    }

    console.log(`📥 [RD Station Webhook] Processando ${payload.leads.length} lead(s) recebido(s)`);

    for (const lead of payload.leads) {
      try {
        await this.processLead(lead);
        results.processed++;
        console.log(`✅ [RD Station Webhook] Lead processado: ${lead.email} (RD ID: ${lead.id})`);
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        results.errors.push({
          rdstation_id: lead.id,
          email: lead.email,
          error: errorMessage
        });
        console.error(`❌ [RD Station Webhook] Erro ao processar lead ${lead.email}: ${errorMessage}`);
      }
    }

    return {
      success: results.failed === 0,
      ...results
    };
  }

  /**
   * Processa um lead individual recebido da RD Station.
   * Registra o log do webhook e salva/atualiza o lead no banco.
   */
  private static async processLead(lead: RDStationWebhookLead): Promise<void> {
    // 1. Registrar o log do webhook recebido
    await this.saveWebhookLog(lead);

    // 2. Salvar ou atualizar o lead na tabela de leads
    await this.upsertLead(lead);
  }

  /**
   * Salva o log completo do webhook recebido na tabela rdstation_webhook_logs.
   * Usa ON CONFLICT para atualizar caso o lead já tenha sido recebido antes.
   */
  private static async saveWebhookLog(lead: RDStationWebhookLead): Promise<void> {
    try {
      await query(
        `INSERT INTO rdstation_webhook_logs (
          rdstation_lead_id, email, name, company, job_title, bio,
          public_url, opportunity, number_conversions, lead_user,
          last_conversion, last_conversion, custom_fields,
          website, personal_phone, mobile_phone, city, estado,
          lead_stage, tags, fit_score, interest, raw_payload, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12, $13,
          $14, $15, $16, $17, $18,
          $19, $20, $21, $22, $23, $24
        )
        ON CONFLICT (rdstation_lead_id) DO UPDATE SET
          email = EXCLUDED.email,
          name = EXCLUDED.name,
          company = EXCLUDED.company,
          job_title = EXCLUDED.job_title,
          bio = EXCLUDED.bio,
          public_url = EXCLUDED.public_url,
          opportunity = EXCLUDED.opportunity,
          number_conversions = EXCLUDED.number_conversions,
          lead_user = EXCLUDED.lead_user,
          last_conversion = EXCLUDED.last_conversion,
          last_conversion = EXCLUDED.last_conversion,
          custom_fields = EXCLUDED.custom_fields,
          website = EXCLUDED.website,
          personal_phone = EXCLUDED.personal_phone,
          mobile_phone = EXCLUDED.mobile_phone,
          city = EXCLUDED.city,
          estado = EXCLUDED.estado,
          lead_stage = EXCLUDED.lead_stage,
          tags = EXCLUDED.tags,
          fit_score = EXCLUDED.fit_score,
          interest = EXCLUDED.interest,
          raw_payload = EXCLUDED.raw_payload,
          status = 'atualizado',
          updated_at = NOW()`,
        [
          lead.id,
          lead.email || null,
          lead.name || null,
          lead.company || null,
          lead.job_title || null,
          lead.bio || null,
          lead.public_url || null,
          lead.opportunity || null,
          lead.number_conversions || null,
          lead.user || null,
          lead.last_conversion ? JSON.stringify(lead.last_conversion) : null,
          lead.last_conversion ? JSON.stringify(lead.last_conversion) : null,
          lead.custom_fields ? JSON.stringify(lead.custom_fields) : null,
          lead.website || null,
          lead.personal_phone || null,
          lead.mobile_phone || null,
          lead.city || null,
          lead.estado || null,
          lead.lead_stage || null,
          lead.tags ? JSON.stringify(lead.tags) : null,
          lead.fit_score || null,
          lead.interest || null,
          JSON.stringify(lead),
          'recebido'
        ]
      );
    } catch (error) {
      console.error('❌ [RD Station Webhook] Erro ao salvar log do webhook:', error);
      throw error;
    }
  }

  /**
   * Salva ou atualiza o lead na tabela principal de leads.
   * Usa o telefone (personal_phone ou mobile_phone) e email para identificar o lead.
   */
  private static async upsertLead(lead: RDStationWebhookLead): Promise<void> {
    try {
      const phone = lead.personal_phone || lead.mobile_phone || '';
      const email = lead.email || '';

      if (!phone && !email) {
        console.warn(`⚠️ [RD Station Webhook] Lead ${lead.id} sem telefone e sem email, ignorando upsert na tabela leads`);
        return;
      }

      // Verificar se já existe um lead com este email
      let existingLead = null;
      if (email) {
        const result = await query(
          'SELECT * FROM leads WHERE email = $1 ORDER BY created_at DESC LIMIT 1',
          [email]
        );
        existingLead = result.rows[0] || null;
      }

      // Se não encontrou por email, tentar por telefone
      if (!existingLead && phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone) {
          const result = await query(
            'SELECT * FROM leads WHERE telefone LIKE $1 ORDER BY created_at DESC LIMIT 1',
            [`%${cleanPhone.slice(-8)}%`]
          );
          existingLead = result.rows[0] || null;
        }
      }

      if (existingLead) {
        // Atualizar lead existente com dados da RD Station
        await query(
          `UPDATE leads SET
            email = COALESCE($1, email),
            status = CASE WHEN $2 = 'true' THEN 'oportunidade' ELSE status END
          WHERE id = $3`,
          [email || null, lead.opportunity || 'false', existingLead.id]
        );
        console.log(`🔄 [RD Station Webhook] Lead atualizado: ${existingLead.id}`);
      } else {
        // Criar novo lead
        await query(
          `INSERT INTO leads (
            telefone, email, utm_source, utm_medium, utm_campaign, status
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            phone || 'sem-telefone',
            email || null,
            'rdstation',
            'webhook',
            lead.last_conversion?.content?.identifier || null,
            lead.opportunity === 'true' ? 'oportunidade' : 'novo'
          ]
        );
        console.log(`➕ [RD Station Webhook] Novo lead criado a partir do RD Station: ${email}`);
      }
    } catch (error) {
      console.error('❌ [RD Station Webhook] Erro ao fazer upsert do lead:', error);
      // Não relançar o erro para não impedir o processamento dos demais leads
    }
  }

  /**
   * Retorna estatísticas dos webhooks recebidos da RD Station.
   */
  static async getWebhookStats(): Promise<any> {
    try {
      const totalResult = await query(
        'SELECT COUNT(*) as total FROM rdstation_webhook_logs'
      );

      const byStatusResult = await query(
        `SELECT status, COUNT(*) as count 
         FROM rdstation_webhook_logs 
         GROUP BY status 
         ORDER BY count DESC`
      );

      const recentResult = await query(
        `SELECT rdstation_lead_id, email, name, status, received_at 
         FROM rdstation_webhook_logs 
         ORDER BY received_at DESC 
         LIMIT 10`
      );

      const byDayResult = await query(
        `SELECT DATE(received_at) as date, COUNT(*) as count 
         FROM rdstation_webhook_logs 
         GROUP BY DATE(received_at) 
         ORDER BY date DESC 
         LIMIT 30`
      );

      return {
        total: parseInt(totalResult.rows[0]?.total || '0'),
        by_status: byStatusResult.rows,
        recent: recentResult.rows,
        by_day: byDayResult.rows
      };
    } catch (error) {
      console.error('❌ [RD Station Webhook] Erro ao obter estatísticas:', error);
      throw error;
    }
  }

  /**
   * Retorna os leads recebidos via webhook com paginação.
   */
  static async getWebhookLeads(options: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<any> {
    try {
      const { limit = 50, offset = 0, status } = options;

      let whereClause = '';
      const params: any[] = [limit, offset];

      if (status) {
        whereClause = 'WHERE status = $3';
        params.push(status);
      }

      const result = await query(
        `SELECT * FROM rdstation_webhook_logs 
         ${whereClause}
         ORDER BY received_at DESC 
         LIMIT $1 OFFSET $2`,
        params
      );

      const countResult = await query(
        `SELECT COUNT(*) as total FROM rdstation_webhook_logs ${whereClause}`,
        status ? [status] : []
      );

      return {
        leads: result.rows,
        total: parseInt(countResult.rows[0]?.total || '0'),
        limit,
        offset
      };
    } catch (error) {
      console.error('❌ [RD Station Webhook] Erro ao listar leads:', error);
      throw error;
    }
  }
}
