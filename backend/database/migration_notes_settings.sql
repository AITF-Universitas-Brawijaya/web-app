-- Migration: Notes and Generator Settings
-- Created: 2025-12-06
-- Description: Add domain_notes table and generator_settings table

-- ============================================================
-- 1. Create domain_notes table
-- ============================================================
CREATE TABLE IF NOT EXISTS domain_notes (
    id SERIAL PRIMARY KEY,
    id_domain INT NOT NULL REFERENCES generated_domains(id_domain) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    created_by VARCHAR(50) NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_domain_notes_domain ON domain_notes(id_domain);
CREATE INDEX IF NOT EXISTS idx_domain_notes_created_by ON domain_notes(created_by);

-- ============================================================
-- 2. Create generator_settings table
-- ============================================================
CREATE TABLE IF NOT EXISTS generator_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    updated_by VARCHAR(50) REFERENCES users(username) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on setting_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_generator_settings_key ON generator_settings(setting_key);

-- ============================================================
-- 3. Migrate existing blocked domains and keywords to database
-- ============================================================

-- Insert blocked_domains setting (will be updated via API)
INSERT INTO generator_settings (setting_key, setting_value, updated_by, updated_at)
VALUES ('blocked_domains', '', NULL, now())
ON CONFLICT (setting_key) DO NOTHING;

-- Insert blocked_keywords setting (will be updated via API)
INSERT INTO generator_settings (setting_key, setting_value, updated_by, updated_at)
VALUES ('blocked_keywords', '', NULL, now())
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================
-- Migration Complete
-- ============================================================

-- Verify tables created
SELECT 'domain_notes table created' as status, count(*) as note_count FROM domain_notes;
SELECT 'generator_settings table created' as status, count(*) as setting_count FROM generator_settings;
