-- ============================================
-- Migração: Criar tabela rdstation_webhook_logs
-- ============================================
-- Esta tabela armazena os logs de webhooks recebidos
-- da RD Station Marketing (integração customizável).
--
-- Documentação: https://ajuda.rdstation.com/s/article/Integração-customizável-com-sistema-próprio-Webhook
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
);

-- ============================================
-- Índices
-- ============================================
CREATE INDEX IF NOT EXISTS idx_rdstation_wh_logs_status ON rdstation_webhook_logs (status);
CREATE INDEX IF NOT EXISTS idx_rdstation_wh_logs_lead_id ON rdstation_webhook_logs (rdstation_lead_id);
CREATE INDEX IF NOT EXISTS idx_rdstation_wh_logs_email ON rdstation_webhook_logs (email);
CREATE INDEX IF NOT EXISTS idx_rdstation_wh_logs_received_at ON rdstation_webhook_logs (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_rdstation_wh_logs_opportunity ON rdstation_webhook_logs (opportunity);

-- ============================================
-- Comentários
-- ============================================
COMMENT ON TABLE rdstation_webhook_logs IS 'Logs de webhooks recebidos da RD Station Marketing';
COMMENT ON COLUMN rdstation_webhook_logs.rdstation_lead_id IS 'ID único do lead na RD Station';
COMMENT ON COLUMN rdstation_webhook_logs.email IS 'Email do lead';
COMMENT ON COLUMN rdstation_webhook_logs.name IS 'Nome do lead';
COMMENT ON COLUMN rdstation_webhook_logs.company IS 'Empresa do lead';
COMMENT ON COLUMN rdstation_webhook_logs.job_title IS 'Cargo do lead';
COMMENT ON COLUMN rdstation_webhook_logs.bio IS 'Anotações no perfil do lead';
COMMENT ON COLUMN rdstation_webhook_logs.public_url IS 'URL pública do lead na RD Station';
COMMENT ON COLUMN rdstation_webhook_logs.opportunity IS 'Se o lead é uma oportunidade (true/false)';
COMMENT ON COLUMN rdstation_webhook_logs.number_conversions IS 'Número de conversões do lead';
COMMENT ON COLUMN rdstation_webhook_logs.lead_user IS 'Email do dono do lead na RD Station';
COMMENT ON COLUMN rdstation_webhook_logs.last_conversion IS 'Dados da primeira conversão (JSON)';
COMMENT ON COLUMN rdstation_webhook_logs.last_conversion IS 'Dados da última conversão (JSON)';
COMMENT ON COLUMN rdstation_webhook_logs.custom_fields IS 'Campos personalizados do lead (JSON)';
COMMENT ON COLUMN rdstation_webhook_logs.website IS 'Site do lead';
COMMENT ON COLUMN rdstation_webhook_logs.personal_phone IS 'Telefone fixo do lead';
COMMENT ON COLUMN rdstation_webhook_logs.mobile_phone IS 'Celular do lead';
COMMENT ON COLUMN rdstation_webhook_logs.city IS 'Cidade do lead';
COMMENT ON COLUMN rdstation_webhook_logs.estado IS 'Estado do lead';
COMMENT ON COLUMN rdstation_webhook_logs.lead_stage IS 'Estágio do lead';
COMMENT ON COLUMN rdstation_webhook_logs.tags IS 'Tags do lead (JSON array)';
COMMENT ON COLUMN rdstation_webhook_logs.fit_score IS 'Perfil do Lead Scoring';
COMMENT ON COLUMN rdstation_webhook_logs.interest IS 'Interesse do Lead Scoring';
COMMENT ON COLUMN rdstation_webhook_logs.raw_payload IS 'Payload completo recebido (JSON)';
COMMENT ON COLUMN rdstation_webhook_logs.status IS 'Status do processamento: recebido, atualizado, erro';
COMMENT ON COLUMN rdstation_webhook_logs.received_at IS 'Data/hora de recebimento do webhook';
COMMENT ON COLUMN rdstation_webhook_logs.updated_at IS 'Data/hora da última atualização do registro';
