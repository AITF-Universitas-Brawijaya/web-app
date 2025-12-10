-- Migration: User Generator Keywords
-- Created: 2025-12-09
-- Description: Add generator_keywords column to store user's preferred keywords for domain generator

-- ============================================================
-- Add generator_keywords column to users table
-- ============================================================

-- Add generator_keywords preference (default: empty string)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'generator_keywords'
    ) THEN
        ALTER TABLE users ADD COLUMN generator_keywords TEXT DEFAULT '';
    END IF;
END $$;

-- ============================================================
-- Migration Complete
-- ============================================================

SELECT 'generator_keywords column added' as status;
