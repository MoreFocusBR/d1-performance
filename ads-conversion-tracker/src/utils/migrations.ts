import { query } from './db';

/**
 * Executa migrações automáticas no banco de dados.
 * Garante que todas as tabelas necessárias existam antes do servidor iniciar.
 */
export async function runAutoMigrations(): Promise<void> {
  try {
    console.log('🔄 [Migrations] Verificando tabelas do banco de dados...');

    // Criar tabela meta_webhook_logs se não existir
    await query(`
      CREATE TABLE IF NOT EXISTS meta_webhook_logs (
        id              SERIAL PRIMARY KEY,
        leadgen_id      VARCHAR(100) NOT NULL UNIQUE,
        ad_id           VARCHAR(100),
        form_id         VARCHAR(100),
        page_id         VARCHAR(100),
        adgroup_id      VARCHAR(100),
        created_time    BIGINT,
        status          VARCHAR(20) NOT NULL DEFAULT 'pendente',
        error_message   TEXT,
        received_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Criar índices para meta_webhook_logs
    await query(`CREATE INDEX IF NOT EXISTS idx_meta_webhook_logs_status ON meta_webhook_logs (status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_meta_webhook_logs_leadgen_id ON meta_webhook_logs (leadgen_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_meta_webhook_logs_received_at ON meta_webhook_logs (received_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_meta_webhook_logs_page_id ON meta_webhook_logs (page_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_meta_webhook_logs_ad_id ON meta_webhook_logs (ad_id)`);

    // Garantir que a coluna email existe na tabela leads
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'leads' AND column_name = 'email'
        ) THEN
          ALTER TABLE leads ADD COLUMN email VARCHAR(255) DEFAULT NULL;
        END IF;
      END $$
    `);

    // Garantir que a coluna shopify_data existe na tabela leads
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'leads' AND column_name = 'shopify_data'
        ) THEN
          ALTER TABLE leads ADD COLUMN shopify_data JSONB DEFAULT NULL;
          CREATE INDEX IF NOT EXISTS idx_leads_shopify_data ON leads USING GIN (shopify_data);
        END IF;
      END $$
    `);

    console.log('✅ [Migrations] Todas as tabelas verificadas/criadas com sucesso');
  } catch (error) {
    console.error('❌ [Migrations] Erro ao executar migrações automáticas:', error);
    // Não lançar erro para não impedir o servidor de iniciar
    // As queries individuais que dependem dessas tabelas irão falhar com mensagens específicas
  }
}
