import { Pool } from 'pg';

// Configuração do banco de dados remoto
const pool = new Pool({
  host: process.env.DB_HOST || '200.80.111.222',
  port: parseInt(process.env.DB_PORT || '10103'),
  database: process.env.DB_NAME || 'd1_performance',
  user: process.env.DB_USER || 'morefocus',
  password: process.env.DB_PASSWORD || 'm0rolZgKrck23Yd1p7rS72euVOtqxdI7',
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando migrações do banco de dados...');
    console.log(`📍 Host: ${process.env.DB_HOST}`);
    console.log(`🗄️  Banco: ${process.env.DB_NAME}\n`);

    // Iniciar transação
    await client.query('BEGIN');

    // 1. Criar tabela leads
    console.log('📝 Criando tabela leads...');
    await client.query(`
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
        status VARCHAR(50) DEFAULT 'novo'
      )
    `);
    console.log('✅ Tabela leads criada');

    // 2. Criar tabela conversoes
    console.log('📝 Criando tabela conversoes...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversoes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        codigo_venda VARCHAR(50) NOT NULL UNIQUE,
        valor_venda DECIMAL(15,2) NOT NULL,
        canal VARCHAR(50) DEFAULT 'comercial',
        data_venda TIMESTAMP NOT NULL,
        google_ads_enviado BOOLEAN DEFAULT FALSE,
        meta_ads_enviado BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela conversoes criada');

    // 3. Criar índices
    console.log('📝 Criando índices...');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_telefone_hash 
      ON leads(telefone_hash)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_status 
      ON leads(status)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_created_at 
      ON leads(created_at)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_status_created 
      ON leads(status, created_at)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_conversoes_lead_id 
      ON conversoes(lead_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_conversoes_codigo_venda 
      ON conversoes(codigo_venda)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_conversoes_created_at 
      ON conversoes(created_at)
    `);
    
    console.log('✅ Índices criados');

    // Confirmar transação
    await client.query('COMMIT');

    console.log('\n✅ Migrações concluídas com sucesso!\n');

    // Listar tabelas criadas
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('📊 Tabelas criadas:');
    tablesResult.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Listar índices criados
    const indexesResult = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY indexname
    `);

    console.log('\n📊 Índices criados:');
    indexesResult.rows.forEach(row => {
      console.log(`   ✓ ${row.indexname}`);
    });

    console.log('\n🎉 Banco de dados está pronto para uso!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Erro durante as migrações:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
