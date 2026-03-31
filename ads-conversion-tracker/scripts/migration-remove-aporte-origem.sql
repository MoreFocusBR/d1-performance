-- Migration: Remove origem column from performance_aporte_campanha table
-- This migration removes the origem (channel) column as aportes are now linked only to campaigns
-- Date: 2026-03-31

BEGIN;

-- Drop any indexes on origem column if they exist
DROP INDEX IF EXISTS idx_performance_aporte_campanha_origem;

-- Drop the origem column
ALTER TABLE performance_aporte_campanha DROP COLUMN IF EXISTS origem;

COMMIT;
