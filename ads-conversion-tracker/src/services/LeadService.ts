import { LeadModel, Lead } from '../models/Lead';
import { isValidPhone, isValidUTM, extractPhoneFromText } from '../utils/validation';
import { normalizePhone } from '../utils/crypto';

export interface CaptureLeadRequest {
  telefone: string;
  email?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  fbclid?: string;
  shopify_data?: any;
  ip_address?: string;
  user_agent?: string;
}

export class LeadService {
  static async captureLead(data: CaptureLeadRequest): Promise<{ success: boolean; lead?: Lead; error?: string }> {
    try {
      // Validate UTM parameters
      if (!isValidUTM(data)) {
        console.warn('No UTM parameters provided');
      }

      // Create lead
      const lead = await LeadModel.create({
        telefone: data.telefone,
        email: data.email,
        utm_source: data.utm_source,
        utm_medium: data.utm_medium,
        utm_campaign: data.utm_campaign,
        utm_content: data.utm_content,
        utm_term: data.utm_term,
        gclid: data.gclid,
        fbclid: data.fbclid,
        shopify_data: data.shopify_data,
        ip_address: data.ip_address,
        user_agent: data.user_agent
      });

      return {
        success: true,
        lead
      };
    } catch (error) {
      console.error('Error capturing lead:', error);
      return {
        success: false,
        error: 'Erro ao processar sua solicitação. Tente novamente.'
      };
    }
  }

  static async findLeadByPhone(phone: string): Promise<Lead | null> {
    try {
      return await LeadModel.findByPhone(phone);
    } catch (error) {
      console.error('Error finding lead:', error);
      return null;
    }
  }

  static async generateWhatsAppLink(phone: string, message?: string): Promise<string> {
    const normalizedPhone = normalizePhone(phone);
    const encodedMessage = encodeURIComponent(message || 'Olá! Gostaria de falar com o time comercial');
    return `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;
  }

  static async getAllLeads(options: { status?: string; limit?: number; offset?: number }): Promise<Lead[]> {
    try {
      return await LeadModel.findByStatus({
        status: options.status || 'novo',
        limit: options.limit || 100,
        offset: options.offset || 0
      });
    } catch (error) {
      console.error('Error getting all leads:', error);
      return [];
    }
  }

  static async expireOldLeads(days: number = 90): Promise<number> {
    try {
      return await LeadModel.expireLeads(days);
    } catch (error) {
      console.error('Error expiring leads:', error);
      return 0;
    }
  }
}
