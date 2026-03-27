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

    // ============================================
    // Criar tabela rdstation_webhook_logs se não existir
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS rdstation_webhook_logs (
        id                  SERIAL PRIMARY KEY,
        rdstation_lead_id   VARCHAR(100) NOT NULL UNIQUE,
        email               VARCHAR(255),
        name                VARCHAR(255),
        company             VARCHAR(255),
        job_title           VARCHAR(255),
        bio                 TEXT,
        public_url          TEXT,
        opportunity         VARCHAR(10),
        number_conversions  VARCHAR(20),
        lead_user           VARCHAR(255),
        last_conversion    JSONB,
        last_conversion     JSONB,
        custom_fields       JSONB,
        website             VARCHAR(500),
        personal_phone      VARCHAR(50),
        mobile_phone        VARCHAR(50),
        city                VARCHAR(100),
        estado              VARCHAR(100),
        lead_stage          VARCHAR(50),
        tags                JSONB,
        fit_score           VARCHAR(20),
        interest            VARCHAR(20),
        raw_payload         JSONB,
        status              VARCHAR(20) NOT NULL DEFAULT 'recebido',
        received_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Criar índices para rdstation_webhook_logs
    await query(`CREATE INDEX IF NOT EXISTS idx_rdstation_wh_logs_status ON rdstation_webhook_logs (status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_rdstation_wh_logs_lead_id ON rdstation_webhook_logs (rdstation_lead_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_rdstation_wh_logs_email ON rdstation_webhook_logs (email)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_rdstation_wh_logs_received_at ON rdstation_webhook_logs (received_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_rdstation_wh_logs_opportunity ON rdstation_webhook_logs (opportunity)`);

    // ============================================
    // Criar tabela performance_aporte_campanha
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS performance_aporte_campanha (
        id                  SERIAL PRIMARY KEY,
        utm_campaign        VARCHAR(255) NOT NULL,
        origem              VARCHAR(100) NOT NULL,
        valor_aporte        NUMERIC(15, 2) NOT NULL,
        data_aporte         DATE NOT NULL,
        descricao           TEXT,
        created_by          VARCHAR(255),
        created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(utm_campaign, origem, data_aporte)
      )
    `);

    // Criar índices para performance_aporte_campanha
    await query(`CREATE INDEX IF NOT EXISTS idx_aporte_campanha_utm ON performance_aporte_campanha (utm_campaign)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_aporte_campanha_origem ON performance_aporte_campanha (origem)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_aporte_campanha_data ON performance_aporte_campanha (data_aporte DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_aporte_campanha_combo ON performance_aporte_campanha (utm_campaign, origem, data_aporte)`);

    console.log('✅ [Migrations] Todas as tabelas verificadas/criadas com sucesso');
  } catch (error) {
    console.error('❌ [Migrations] Erro ao executar migrações automáticas:', error);
    // Não lançar erro para não impedir o servidor de iniciar
    // As queries individuais que dependem dessas tabelas irão falhar com mensagens específicas
  }
}
