-- Migration: Add batch_size setting to generator_settings
-- Description: Adds a new setting for controlling the number of domains per batch in the generator

-- First, add unique constraint on setting_key if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'generator_settings_setting_key_key'
    ) THEN
        ALTER TABLE generator_settings ADD CONSTRAINT generator_settings_setting_key_key UNIQUE (setting_key);
    END IF;
END $$;

-- Insert default batch_size setting (default: 10 domains per batch)
INSERT INTO generator_settings (setting_key, setting_value, updated_by, updated_at)
VALUES ('batch_size', '10', 'system', now())
ON CONFLICT (setting_key) DO NOTHING;
