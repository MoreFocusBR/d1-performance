import { query } from '../src/utils/db';

async function migrate() {
  try {
    console.log('🔄 Starting database migration...');

    // Create leads table
    await query(`
      CREATE TABLE IF NOT EXISTS leads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        telefone VARCHAR(255) NOT NULL,
        telefone_hash VARCHAR(64) NOT NULL UNIQUE,
        utm_source VARCHAR(100),
        utm_medium VARCHAR(100),
        utm_campaign VARCHAR(255),
        utm_content VARCHAR(255),
        utm_term VARCHAR(255),
        gclid VARCHAR(255),
        fbclid VARCHAR(255),
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'novo',
        INDEX idx_telefone_hash (telefone_hash),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✅ Leads table created');

    // Create conversoes table
    await query(`
      CREATE TABLE IF NOT EXISTS conversoes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        codigo_venda VARCHAR(50) NOT NULL UNIQUE,
        valor_venda DECIMAL(15,2) NOT NULL,
        canal VARCHAR(50) DEFAULT 'comercial',
        data_venda TIMESTAMP NOT NULL,
        google_ads_enviado BOOLEAN DEFAULT FALSE,
        meta_ads_enviado BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_lead_id (lead_id),
        INDEX idx_codigo_venda (codigo_venda),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✅ Conversoes table created');

    // Create indexes for better performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_leads_status_created 
      ON leads(status, created_at)
    `);
    console.log('✅ Indexes created');

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
