import { query } from '../utils/db';
import { hashPhone, encryptPhone, normalizePhone, decryptPhone } from '../utils/crypto';

export interface Lead {
  id: string;
  telefone: string;
  telefone_hash: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  fbclid?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  status: string;
}

// Helper function to decrypt lead data
function decryptLeadData(lead: any): Lead {
  try {
    return {
      ...lead,
      telefone: lead.telefone ? decryptPhone(lead.telefone) : lead.telefone
    };
  } catch (error) {
    console.error('Error decrypting lead data:', error);
    return lead;
  }
}

export class LeadModel {
  static async create(data: {
    telefone: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    gclid?: string;
    fbclid?: string;
    ip_address?: string;
    user_agent?: string;
  }): Promise<Lead> {
    const normalizedPhone = normalizePhone(data.telefone);
    const phoneHash = hashPhone(normalizedPhone);
    const encryptedPhone = encryptPhone(normalizedPhone);

    const result = await query<Lead>(
      `INSERT INTO leads (
        telefone, telefone_hash, utm_source, utm_medium, utm_campaign, 
        utm_content, utm_term, gclid, fbclid, ip_address, user_agent, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        encryptedPhone,
        phoneHash,
        data.utm_source || null,
        data.utm_medium || null,
        data.utm_campaign || null,
        data.utm_content || null,
        data.utm_term || null,
        data.gclid || null,
        data.fbclid || null,
        data.ip_address || null,
        data.user_agent || null,
        'novo'
      ]
    );

    return decryptLeadData(result.rows[0]);
  }

  static async findByPhoneHash(phoneHash: string): Promise<Lead | null> {
    const result = await query<Lead>(
      'SELECT * FROM leads WHERE telefone_hash = $1 ORDER BY created_at DESC LIMIT 1',
      [phoneHash]
    );

    return result.rows[0] ? decryptLeadData(result.rows[0]) : null;
  }

  static async findById(id: string): Promise<Lead | null> {
    const result = await query<Lead>(
      'SELECT * FROM leads WHERE id = $1',
      [id]
    );

    return result.rows[0] ? decryptLeadData(result.rows[0]) : null;
  }

  static async updateStatus(id: string, status: string): Promise<Lead> {
    const result = await query<Lead>(
      'UPDATE leads SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    return decryptLeadData(result.rows[0]);
  }

  static async findByStatus(options: { status: string; limit: number; offset: number }): Promise<Lead[]> {
    const result = await query<Lead>(
      `SELECT * FROM leads 
       WHERE status = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [options.status, options.limit, options.offset]
    );

    return result.rows.map(decryptLeadData);
  }

  static async findExpiredLeads(days: number = 90): Promise<Lead[]> {
    const result = await query<Lead>(
      `SELECT * FROM leads 
       WHERE status = 'novo' 
       AND created_at < NOW() - INTERVAL '${days} days'`,
      []
    );

    return result.rows.map(decryptLeadData);
  }

  static async expireLeads(days: number = 90): Promise<number> {
    const result = await query(
      `UPDATE leads 
       SET status = 'expirado' 
       WHERE status = 'novo' 
       AND created_at < NOW() - INTERVAL '${days} days'`,
      []
    );

    return result.rowCount || 0;
  }
}
