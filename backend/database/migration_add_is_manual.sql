-- Migration: Add is_manual column to results table
-- Purpose: Track manually added domains vs auto-generated domains
-- Date: 2025-12-08

-- Add is_manual column to results table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'results' AND column_name = 'is_manual'
    ) THEN
        ALTER TABLE results ADD COLUMN is_manual BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_manual column to results table';
    ELSE
        RAISE NOTICE 'is_manual column already exists in results table';
    END IF;
END $$;

-- Create index for better filtering performance
CREATE INDEX IF NOT EXISTS idx_results_is_manual ON results(is_manual);

-- Update existing records to ensure they are marked as not manual
UPDATE results SET is_manual = FALSE WHERE is_manual IS NULL;

RAISE NOTICE 'Migration completed: is_manual column added with index';
