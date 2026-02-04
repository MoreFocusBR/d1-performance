-- Migration: Remove telefone_hash column from leads table
-- This migration removes the hash-based lookup functionality
-- and relies solely on encrypted phone numbers

BEGIN;

-- Drop the index on telefone_hash if it exists
DROP INDEX IF EXISTS idx_leads_telefone_hash;

-- Drop the telefone_hash column
ALTER TABLE leads DROP COLUMN IF EXISTS telefone_hash;

COMMIT;
