import { LeadModel } from '../models/Lead';

export interface RDStationContact {
  email: string;
  bio: string;
  tag: string;
}

export class RDStationService {
  private static rdStationUri = process.env.RDSTATION_URI || 'https://api.rdstation.com';
  private static rdStationApiKey = process.env.RDSTATION_API_KEY;

  /**
   * Sincronizar leads com status 'novo' para RD Station
   */
  static async syncNewLeads(): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    errors: any[];
  }> {
    try {
      // Validate RD Station configuration
      if (!this.rdStationUri || !this.rdStationApiKey) {
        return {
          success: false,
          synced: 0,
          failed: 0,
          errors: ['RD Station URI ou API Key não configurados']
        };
      }

      // Get all new leads
      const leads = await LeadModel.findByStatus({ status: "novo", limit: 100, offset: 0 });

      if (!leads || leads.length === 0) {
        return {
          success: true,
          synced: 0,
          failed: 0,
          errors: []
        };
      }

      console.log(`📤 Sincronizando ${leads.length} leads para RD Station...`);

      const results = {
        synced: 0,
        failed: 0,
        errors: [] as any[]
      };

      // Process each lead
      for (const lead of leads) {
        try {
          const contact = this.buildRDStationContact(lead);
          const success = await this.sendToRDStation(contact);

          if (success) {
            results.synced++;
            // Update lead status to indicate it was synced
            await LeadModel.updateSyncStatus(lead.id, 'sincronizado_rdstation');
          } else {
            results.failed++;
            results.errors.push({
              leadId: lead.id,
              email: lead.email,
              error: 'Falha ao enviar para RD Station'
            });
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            leadId: lead.id,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }

      console.log(`✅ Sincronização concluída: ${results.synced} sucesso, ${results.failed} falhas`);

      return {
        success: results.failed === 0,
        ...results
      };
    } catch (error) {
      console.error('Erro ao sincronizar leads com RD Station:', error);
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: [error instanceof Error ? error.message : 'Erro desconhecido']
      };
    }
  }

  /**
   * Construir objeto de contato para RD Station
   */
  private static buildRDStationContact(lead: any): RDStationContact {
    // Extract product and variant information from shopify_data
    let productInfo = '';

    if (lead.shopify_data) {
      const shopifyData = typeof lead.shopify_data === 'string'
        ? JSON.parse(lead.shopify_data)
        : lead.shopify_data;

      const productName = shopifyData.productName || '';
      const variantName = shopifyData.variantName || '';

      productInfo = productName || variantName
        ? `${productName}${variantName ? ` - ${variantName}` : ''}`
        : '';
    }

    const bio = productInfo
      ? `Solicitou para avisar sobre chegada do produto: ${productInfo}`
      : 'Solicitou para avisar sobre chegada do produto';

    return {
      email: lead.email || '',
      bio,
      tag: 'avise_me'
    };
  }

  /**
   * Enviar contato para RD Station
   */
  private static async sendToRDStation(contact: RDStationContact): Promise<boolean> {
    try {
      const url = `${this.rdStationUri}/create-contact-rd`;

      console.log(`📨 Enviando contato para RD Station: ${contact.email}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.rdStationApiKey}`
        },
        body: JSON.stringify(contact)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Erro ao enviar para RD Station: ${response.status}`, errorData);
        return false;
      }

      console.log(`✅ Contato enviado com sucesso: ${contact.email}`);
      return true;
    } catch (error) {
      console.error('Erro ao enviar para RD Station:', error);
      return false;
    }
  }

  /**
   * Enviar um lead específico para RD Station
   */
  static async syncLeadById(leadId: string): Promise<boolean> {
    try {
      const lead = await LeadModel.findById(leadId);

      if (!lead) {
        console.error(`Lead não encontrado: ${leadId}`);
        return false;
      }

      const contact = this.buildRDStationContact(lead);
      const success = await this.sendToRDStation(contact);

      if (success) {
        await LeadModel.updateSyncStatus(leadId, 'sincronizado_rdstation');
      }

      return success;
    } catch (error) {
      console.error('Erro ao sincronizar lead individual:', error);
      return false;
    }
  }
}
