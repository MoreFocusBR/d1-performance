import { ConversionModel, Conversion } from '../models/Conversion';
import { LeadModel } from '../models/Lead';
import { extractPhoneFromText } from '../utils/validation';
import { normalizePhone, hashPhone } from '../utils/crypto';

export interface ProcessSaleRequest {
  codigo_venda: string;
  valor_venda: number;
  observacoes: string;
  canal: string;
  data_venda: string;
}

export class ConversionService {
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
      const phoneHash = hashPhone(phone);
      const lead = await LeadModel.findByPhoneHash(phoneHash);
      
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
