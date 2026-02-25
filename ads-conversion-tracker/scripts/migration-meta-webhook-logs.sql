-- ============================================================
-- Migração: Criar tabela meta_webhook_logs
-- Descrição: Tabela para armazenar logs de webhooks recebidos
--            do Meta Lead Ads para rastreamento e reprocessamento
-- Data: 2026-02-25
-- ============================================================

-- Criar tabela de logs de webhook do Meta
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

-- Índices para otimização de queries
CREATE INDEX IF NOT EXISTS idx_meta_webhook_logs_status 
    ON meta_webhook_logs (status);

CREATE INDEX IF NOT EXISTS idx_meta_webhook_logs_leadgen_id 
    ON meta_webhook_logs (leadgen_id);

CREATE INDEX IF NOT EXISTS idx_meta_webhook_logs_received_at 
    ON meta_webhook_logs (received_at DESC);

CREATE INDEX IF NOT EXISTS idx_meta_webhook_logs_page_id 
    ON meta_webhook_logs (page_id);

CREATE INDEX IF NOT EXISTS idx_meta_webhook_logs_ad_id 
    ON meta_webhook_logs (ad_id);

-- Comentários nas colunas
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

-- Verificação
SELECT 'Tabela meta_webhook_logs criada com sucesso!' AS resultado;
