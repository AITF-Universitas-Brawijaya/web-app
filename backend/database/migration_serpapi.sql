-- Migration: SerpAPI Integration
-- Created: 2025-12-09
-- Description: Add SerpAPI key to generator_settings table

-- ============================================================
-- Add SerpAPI key setting
-- ============================================================

INSERT INTO generator_settings (setting_key, setting_value, updated_by, updated_at)
VALUES ('serpapi_key', '', NULL, now())
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================
-- Migration Complete
-- ============================================================

-- Verify setting created
SELECT 'serpapi_key setting created' as status, setting_key, setting_value 
FROM generator_settings 
WHERE setting_key = 'serpapi_key';
