import { query } from '../utils/db';

export interface Conversion {
  id: string;
  lead_id: string;
  codigo_venda: string;
  valor_venda: number;
  canal: string;
  data_venda: string;
  google_ads_enviado: boolean;
  meta_ads_enviado: boolean;
  created_at: string;
}

export class ConversionModel {
  static async create(data: {
    lead_id: string;
    codigo_venda: string;
    valor_venda: number;
    canal?: string;
    data_venda: string;
  }): Promise<Conversion> {
    const result = await query<Conversion>(
      `INSERT INTO conversoes (
        lead_id, codigo_venda, valor_venda, canal, data_venda, 
        google_ads_enviado, meta_ads_enviado
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        data.lead_id,
        data.codigo_venda,
        data.valor_venda,
        data.canal || 'comercial',
        data.data_venda,
        false,
        false
      ]
    );

    return result.rows[0];
  }

  static async findByCodigoVenda(codigoVenda: string): Promise<Conversion | null> {
    const result = await query<Conversion>(
      'SELECT * FROM conversoes WHERE codigo_venda = $1',
      [codigoVenda]
    );

    return result.rows[0] || null;
  }

  static async findById(id: string): Promise<Conversion | null> {
    const result = await query<Conversion>(
      'SELECT * FROM conversoes WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  static async updateGoogleAdsSent(id: string): Promise<Conversion> {
    const result = await query<Conversion>(
      'UPDATE conversoes SET google_ads_enviado = true WHERE id = $1 RETURNING *',
      [id]
    );

    return result.rows[0];
  }

  static async updateMetaAdsSent(id: string): Promise<Conversion> {
    const result = await query<Conversion>(
      'UPDATE conversoes SET meta_ads_enviado = true WHERE id = $1 RETURNING *',
      [id]
    );

    return result.rows[0];
  }

  static async findPendingConversions(): Promise<Conversion[]> {
    const result = await query<Conversion>(
      `SELECT * FROM conversoes 
       WHERE (google_ads_enviado = false OR meta_ads_enviado = false)
       AND created_at > NOW() - INTERVAL '24 hours'
       LIMIT 100`,
      []
    );

    return result.rows;
  }

  static async getConversionStats(days: number = 30): Promise<any> {
    const result = await query(
      `SELECT 
        COUNT(*) as total_conversoes,
        SUM(valor_venda) as valor_total,
        AVG(valor_venda) as valor_medio,
        COUNT(CASE WHEN google_ads_enviado THEN 1 END) as google_enviadas,
        COUNT(CASE WHEN meta_ads_enviado THEN 1 END) as meta_enviadas
       FROM conversoes 
       WHERE created_at > NOW() - INTERVAL '${days} days'`,
      []
    );

    return result.rows[0];
  }
}
