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
-- Índices: leads
-- ============================================
CREATE INDEX IF NOT EXISTS idx_leads_telefone_hash ON leads(telefone_hash);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_status_created ON leads(status, created_at);

-- ============================================
-- Índices: conversoes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_conversoes_lead_id ON conversoes(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversoes_codigo_venda ON conversoes(codigo_venda);
CREATE INDEX IF NOT EXISTS idx_conversoes_created_at ON conversoes(created_at);

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
-- Verificação: Exibir tabelas criadas
-- ============================================
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' ORDER BY table_name;

-- ============================================
-- Verificação: Exibir índices criados
-- ============================================
-- SELECT indexname FROM pg_indexes 
-- WHERE schemaname = 'public' ORDER BY indexname;
