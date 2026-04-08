-- ============================================
-- Ads Conversion Tracker - Database Schema
-- ============================================
-- Este arquivo contém o schema completo do banco de dados
-- Pode ser executado diretamente no PostgreSQL

-- ============================================
-- Tabela: leads
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telefone VARCHAR(255) NOT NULL,
    telefone_hash VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(255) DEFAULT NULL,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(255),
    utm_content VARCHAR(255),
    utm_term VARCHAR(255),
    gclid VARCHAR(255),
    fbclid VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    shopify_data JSONB DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'novo'
);

-- ============================================
-- Tabela: conversoes
-- ============================================
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
);

-- ============================================
-- Tabela: meta_webhook_logs
-- ============================================
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
);

-- ============================================
-- Tabela: rdstation_webhook_logs
-- ============================================
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
    first_conversion     JSONB,
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
);

-- ============================================
-- Índices: leads
-- ============================================
CREATE INDEX IF NOT EXISTS idx_leads_telefone_hash ON leads(telefone_hash);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_status_created ON leads(status, created_at);
CREATE INDEX IF NOT EXISTS idx_leads_shopify_data ON leads USING GIN (shopify_data);

-- ============================================
-- Índices: conversoes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_conversoes_lead_id ON conversoes(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversoes_codigo_venda ON conversoes(codigo_venda);
CREATE INDEX IF NOT EXISTS idx_conversoes_created_at ON conversoes(created_at);

-- ============================================
-- Índices: meta_webhook_logs
-- ============================================
CREATE INDEX IF NOT EXISTS idx_meta_webhook_logs_status ON meta_webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_meta_webhook_logs_leadgen_id ON meta_webhook_logs(leadgen_id);
CREATE INDEX IF NOT EXISTS idx_meta_webhook_logs_received_at ON meta_webhook_logs(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_webhook_logs_page_id ON meta_webhook_logs(page_id);
CREATE INDEX IF NOT EXISTS idx_meta_webhook_logs_ad_id ON meta_webhook_logs(ad_id);

-- ============================================
-- Índices: rdstation_webhook_logs
-- ============================================
CREATE INDEX IF NOT EXISTS idx_rdstation_wh_logs_status ON rdstation_webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_rdstation_wh_logs_lead_id ON rdstation_webhook_logs(rdstation_lead_id);
CREATE INDEX IF NOT EXISTS idx_rdstation_wh_logs_email ON rdstation_webhook_logs(email);
CREATE INDEX IF NOT EXISTS idx_rdstation_wh_logs_received_at ON rdstation_webhook_logs(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_rdstation_wh_logs_opportunity ON rdstation_webhook_logs(opportunity);

-- ============================================
-- Views: Estatísticas
-- ============================================
CREATE OR REPLACE VIEW vw_conversoes_stats AS
SELECT 
    COUNT(*) as total_conversoes,
    SUM(valor_venda) as valor_total,
    AVG(valor_venda) as valor_medio,
    COUNT(CASE WHEN google_ads_enviado THEN 1 END) as google_enviadas,
    COUNT(CASE WHEN meta_ads_enviado THEN 1 END) as meta_enviadas,
    DATE(created_at) as data
FROM conversoes
GROUP BY DATE(created_at);

-- ============================================
-- Views: Leads por Status
-- ============================================
CREATE OR REPLACE VIEW vw_leads_status AS
SELECT 
    status,
    COUNT(*) as total,
    DATE(created_at) as data
FROM leads
GROUP BY status, DATE(created_at);

-- ============================================
-- Função: Atualizar status de lead para convertido
-- ============================================
CREATE OR REPLACE FUNCTION update_lead_status_on_conversion()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE leads SET status = 'convertido' WHERE id = NEW.lead_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Trigger: Atualizar status de lead após conversão
-- ============================================
DROP TRIGGER IF EXISTS trg_update_lead_status ON conversoes;
CREATE TRIGGER trg_update_lead_status
AFTER INSERT ON conversoes
FOR EACH ROW
EXECUTE FUNCTION update_lead_status_on_conversion();

-- ============================================
-- Comentários
-- ============================================
COMMENT ON TABLE meta_webhook_logs IS 'Logs de webhooks recebidos do Meta Lead Ads';
COMMENT ON COLUMN meta_webhook_logs.leadgen_id IS 'ID único do lead gerado pelo Meta';
COMMENT ON COLUMN meta_webhook_logs.ad_id IS 'ID do anúncio que gerou o lead';
COMMENT ON COLUMN meta_webhook_logs.form_id IS 'ID do formulário de lead ads';
COMMENT ON COLUMN meta_webhook_logs.page_id IS 'ID da página do Facebook';
COMMENT ON COLUMN meta_webhook_logs.adgroup_id IS 'ID do grupo de anúncios';
COMMENT ON COLUMN meta_webhook_logs.created_time IS 'Timestamp de criação do lead no Meta (Unix timestamp)';
COMMENT ON COLUMN meta_webhook_logs.status IS 'Status do processamento: pendente, processado, erro';
COMMENT ON COLUMN meta_webhook_logs.error_message IS 'Mensagem de erro caso o processamento falhe';
COMMENT ON COLUMN meta_webhook_logs.received_at IS 'Data/hora de recebimento do webhook';
COMMENT ON COLUMN meta_webhook_logs.updated_at IS 'Data/hora da última atualização do registro';
COMMENT ON COLUMN leads.shopify_data IS 'Armazena dados adicionais da Shopify quando o lead vem de uma integração Shopify';

COMMENT ON TABLE rdstation_webhook_logs IS 'Logs de webhooks recebidos da RD Station Marketing';
COMMENT ON COLUMN rdstation_webhook_logs.rdstation_lead_id IS 'ID único do lead na RD Station';
COMMENT ON COLUMN rdstation_webhook_logs.email IS 'Email do lead';
COMMENT ON COLUMN rdstation_webhook_logs.name IS 'Nome do lead';
COMMENT ON COLUMN rdstation_webhook_logs.company IS 'Empresa do lead';
COMMENT ON COLUMN rdstation_webhook_logs.job_title IS 'Cargo do lead';
COMMENT ON COLUMN rdstation_webhook_logs.opportunity IS 'Se o lead é uma oportunidade (true/false)';
COMMENT ON COLUMN rdstation_webhook_logs.raw_payload IS 'Payload completo recebido (JSON)';
COMMENT ON COLUMN rdstation_webhook_logs.status IS 'Status do processamento: recebido, atualizado, erro';
COMMENT ON COLUMN rdstation_webhook_logs.received_at IS 'Data/hora de recebimento do webhook';
COMMENT ON COLUMN rdstation_webhook_logs.updated_at IS 'Data/hora da última atualização do registro';

-- ============================================
-- Verificação: Exibir tabelas criadas
-- ============================================
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' ORDER BY table_name;

-- ============================================
-- Verificação: Exibir índices criados
-- ============================================
-- SELECT indexname FROM pg_indexes 
-- WHERE schemaname = 'public' ORDER BY indexname;
