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
        first_conversion    JSONB,
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
    await query(`CREATE INDEX IF NOT EXISTS idx_rdstation_wh_logs_email_lower ON rdstation_webhook_logs (LOWER(email))`);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_rdstation_wh_logs_first_campaign_source
      ON rdstation_webhook_logs (
        (first_conversion->'conversion_origin'->>'campaign'),
        (first_conversion->'conversion_origin'->>'source')
      )
      WHERE (first_conversion->'conversion_origin'->>'campaign') IS NOT NULL
      AND (first_conversion->'conversion_origin'->>'campaign') != '(not set)'
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_rdstation_wh_logs_last_campaign_source
      ON rdstation_webhook_logs (
        (last_conversion->'conversion_origin'->>'campaign'),
        (last_conversion->'conversion_origin'->>'source')
      )
      WHERE (last_conversion->'conversion_origin'->>'campaign') IS NOT NULL
      AND (last_conversion->'conversion_origin'->>'campaign') != '(not set)'
    `);

    // Índices para acelerar joins/filtros de campanhas na tabela Venda (quando existir)
    await query(`
      DO $$
      BEGIN
        IF to_regclass('"Venda"') IS NOT NULL THEN
          EXECUTE 'CREATE INDEX IF NOT EXISTS idx_venda_entrega_email_lower ON "Venda" (LOWER("EntregaEmail"))';
          EXECUTE 'CREATE INDEX IF NOT EXISTS idx_venda_data_venda ON "Venda" ("DataVenda")';
          EXECUTE 'CREATE INDEX IF NOT EXISTS idx_venda_origem_pedido_lower ON "Venda" (LOWER("OrigemPedido"))';
          EXECUTE 'CREATE INDEX IF NOT EXISTS idx_venda_data_email_not_cancelada ON "Venda" ("DataVenda", LOWER("EntregaEmail")) WHERE "Cancelada" = false';
        END IF;
      END $$;
    `);

    // ============================================
    // Criar tabela performance_aporte_campanha
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS performance_aporte_campanha (
        id                  SERIAL PRIMARY KEY,
        utm_campaign        VARCHAR(255) NOT NULL,
        valor_aporte        NUMERIC(15, 2) NOT NULL,
        data_aporte         DATE NOT NULL,
        descricao           TEXT,
        created_by          VARCHAR(255),
        created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(utm_campaign, data_aporte)
      )
    `);

    // Criar índices para performance_aporte_campanha
    await query(`CREATE INDEX IF NOT EXISTS idx_aporte_campanha_utm ON performance_aporte_campanha (utm_campaign)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_aporte_campanha_data ON performance_aporte_campanha (data_aporte DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_aporte_campanha_combo ON performance_aporte_campanha (utm_campaign, data_aporte)`);

    // ============================================
    // Migrações adicionais: Alterações em tabelas existentes
    // ============================================
    
    // Remover coluna origem e recriar unicity
    await query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'performance_aporte_campanha' AND column_name = 'origem'
        ) THEN
          -- Drop column using CASCADE drops dependent constraints (like the old UNIQUE constraint)
          ALTER TABLE performance_aporte_campanha DROP COLUMN origem CASCADE;
          ALTER TABLE performance_aporte_campanha ADD CONSTRAINT performance_aporte_campanha_utm_campaign_data_aporte_key UNIQUE(utm_campaign, data_aporte);
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
