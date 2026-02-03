-- ============================================
-- Migration: Adicionar campo shopify_data à tabela leads
-- ============================================
-- Este script adiciona suporte para armazenar dados da Shopify

-- ============================================
-- Adicionar coluna shopify_data (JSONB)
-- ============================================
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS shopify_data JSONB DEFAULT NULL;

-- ============================================
-- Criar índice GIN para melhor performance em queries JSONB
-- ============================================
CREATE INDEX IF NOT EXISTS idx_leads_shopify_data ON leads USING GIN (shopify_data);

-- ============================================
-- Comentário sobre a coluna
-- ============================================
COMMENT ON COLUMN leads.shopify_data IS 'Armazena dados adicionais da Shopify quando o lead vem de uma integração Shopify. Exemplo: {"customer_id": "...", "order_id": "...", "email": "...", "tags": [...]}';

-- ============================================
-- Verificação: Exibir estrutura da tabela leads
-- ============================================
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns 
-- WHERE table_name = 'leads' ORDER BY ordinal_position;
