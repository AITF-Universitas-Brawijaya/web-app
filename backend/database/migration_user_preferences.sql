-- Migration: User Preferences
-- Created: 2025-12-08
-- Description: Add user preferences columns for UI settings (dark mode, compact mode)

-- ============================================================
-- Add preferences columns to users table
-- ============================================================

-- Add dark_mode preference (default: false = light mode)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'dark_mode'
    ) THEN
        ALTER TABLE users ADD COLUMN dark_mode BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add compact_mode preference (default: false = normal mode)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'compact_mode'
    ) THEN
        ALTER TABLE users ADD COLUMN compact_mode BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- ============================================================
-- Migration Complete
-- ============================================================

SELECT 'User preferences columns added' as status;
