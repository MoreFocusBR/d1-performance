import { query } from '../utils/db';

export interface Lead {
  id: string;
  telefone: string;
  email?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  fbclid?: string;
  ip_address?: string;
  user_agent?: string;
  shopify_data?: any; // JSONB field for Shopify data
  created_at: string;
  status: string;
}

export class LeadModel {
  static async create(data: {
    telefone: string;
    email?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    gclid?: string;
    fbclid?: string;
    ip_address?: string;
    user_agent?: string;
    shopify_data?: any;
  }): Promise<Lead> {

    const result = await query<Lead>(
      `INSERT INTO leads (
        telefone, email, utm_source, utm_medium, utm_campaign, 
        utm_content, utm_term, gclid, fbclid, ip_address, user_agent, shopify_data, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        data.telefone || null,
        data.email || null,
        data.utm_source || null,
        data.utm_medium || null,
        data.utm_campaign || null,
        data.utm_content || null,
        data.utm_term || null,
        data.gclid || null,
        data.fbclid || null,
        data.ip_address || null,
        data.user_agent || null,
        data.shopify_data ? JSON.stringify(data.shopify_data) : null,
        'novo'
      ]
    );

    return result.rows[0];
  }

  static async findByPhone(phone: string): Promise<Lead | null> {
    const result = await query<Lead>(
      'SELECT * FROM leads WHERE telefone LIKE $1 ORDER BY created_at DESC LIMIT 1',
      [`%${phone}%`]
    );

    return result.rows[0] ? result.rows[0] : null;
  }

  static async findById(id: string): Promise<Lead | null> {
    const result = await query<Lead>(
      'SELECT * FROM leads WHERE id = $1',
      [id]
    );

    return result.rows[0] ? result.rows[0] : null;
  }

  static async updateStatus(id: string, status: string): Promise<Lead> {
    const result = await query<Lead>(
      'UPDATE leads SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    return result.rows[0];
  }

  static async updateSyncStatus(id: string, status: string): Promise<Lead> {
    return this.updateStatus(id, status);
  }

  static async findByStatus(options: { status: string; limit: number; offset: number }): Promise<Lead[]> {
    const result = await query<Lead>(
      `SELECT * FROM leads 
       WHERE status = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [options.status, options.limit, options.offset]
    );

    return result.rows;
  }

  static async findExpiredLeads(days: number = 90): Promise<Lead[]> {
    const result = await query<Lead>(
      `SELECT * FROM leads 
       WHERE status = 'novo' 
       AND created_at < NOW() - INTERVAL '${days} days'`,
      []
    );

    return result.rows;
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
