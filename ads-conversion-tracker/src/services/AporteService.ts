import { query } from '../utils/db';

export interface Aporte {
  id?: number;
  utm_campaign: string;
  valor_aporte: number;
  data_aporte: string;
  descricao?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export class AporteService {
  /**
   * Criar novo aporte
   */
  static async create(aporte: Aporte): Promise<Aporte> {
    const result = await query(
      `INSERT INTO performance_aporte_campanha 
       (utm_campaign, valor_aporte, data_aporte, descricao, created_by) 
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        aporte.utm_campaign,
        aporte.valor_aporte,
        aporte.data_aporte,
        aporte.descricao || null,
        aporte.created_by || 'sistema'
      ]
    );

    return result.rows[0];
  }

  /**
   * Atualizar aporte existente
   */
  static async update(id: number, aporte: Aporte): Promise<Aporte> {
    const result = await query(
      `UPDATE performance_aporte_campanha 
       SET utm_campaign = $1, valor_aporte = $2, 
           data_aporte = $3, descricao = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        aporte.utm_campaign,
        aporte.valor_aporte,
        aporte.data_aporte,
        aporte.descricao || null,
        id
      ]
    );

    if (result.rows.length === 0) {
      throw new Error(`Aporte com ID ${id} não encontrado`);
    }

    return result.rows[0];
  }

  /**
   * Deletar aporte
   */
  static async delete(id: number): Promise<boolean> {
    const result = await query(
      `DELETE FROM performance_aporte_campanha WHERE id = $1`,
      [id]
    );

    return result.rowCount > 0;
  }

  /**
   * Obter aporte por ID
   */
  static async getById(id: number): Promise<Aporte | null> {
    const result = await query(
      `SELECT * FROM performance_aporte_campanha WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Listar todos os aportes com filtros opcionais
   */
  static async list(filters?: {
    utm_campaign?: string;
    data_inicio?: string;
    data_fim?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ rows: Aporte[]; total: number }> {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.utm_campaign) {
      whereClause += ` AND LOWER(utm_campaign) LIKE LOWER($${paramIndex})`;
      params.push(`%${filters.utm_campaign}%`);
      paramIndex++;
    }

    if (filters?.data_inicio) {
      whereClause += ` AND data_aporte >= $${paramIndex}`;
      params.push(filters.data_inicio);
      paramIndex++;
    }

    if (filters?.data_fim) {
      whereClause += ` AND data_aporte <= $${paramIndex}`;
      params.push(filters.data_fim);
      paramIndex++;
    }

    // Total
    const totalResult = await query(
      `SELECT COUNT(*) as total FROM performance_aporte_campanha ${whereClause}`,
      params
    );
    const total = parseInt(totalResult.rows[0].total);

    // Dados
    let dataQuery = `SELECT * FROM performance_aporte_campanha ${whereClause} ORDER BY data_aporte DESC`;
    
    if (filters?.limit) {
      dataQuery += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    if (filters?.offset) {
      dataQuery += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
      paramIndex++;
    }

    const result = await query(dataQuery, params);

    return {
      rows: result.rows,
      total
    };
  }

  /**
   * Obter aportes agregados por campanha
   */
  static async getAggregated(filters?: {
    data_inicio?: string;
    data_fim?: string;
  }): Promise<Array<{ utm_campaign: string; total_aporte: number }>> {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.data_inicio) {
      whereClause += ` AND data_aporte >= $${paramIndex}`;
      params.push(filters.data_inicio);
      paramIndex++;
    }

    if (filters?.data_fim) {
      whereClause += ` AND data_aporte <= $${paramIndex}`;
      params.push(filters.data_fim);
      paramIndex++;
    }

    const result = await query(
      `SELECT 
        utm_campaign, 
        SUM(valor_aporte) as total_aporte
       FROM performance_aporte_campanha
       ${whereClause}
       GROUP BY utm_campaign
       ORDER BY total_aporte DESC`,
      params
    );

    return result.rows;
  }

  /**
   * Obter total de aportes por período
   */
  static async getTotalByPeriod(data_inicio?: string, data_fim?: string): Promise<number> {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (data_inicio) {
      whereClause += ` AND data_aporte >= $${paramIndex}`;
      params.push(data_inicio);
      paramIndex++;
    }

    if (data_fim) {
      whereClause += ` AND data_aporte <= $${paramIndex}`;
      params.push(data_fim);
      paramIndex++;
    }

    const result = await query(
      `SELECT COALESCE(SUM(valor_aporte), 0) as total FROM performance_aporte_campanha ${whereClause}`,
      params
    );

    return parseFloat(result.rows[0].total);
  }
}
