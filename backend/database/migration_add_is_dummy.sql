-- Migration: Add is_dummy column to generated_domains table
-- Date: 2025-12-02
-- Description: Adds is_dummy BOOLEAN column to track dummy data entries

-- Add column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'generated_domains' 
        AND column_name = 'is_dummy'
    ) THEN
        ALTER TABLE generated_domains 
        ADD COLUMN is_dummy BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE 'Column is_dummy added successfully';
    ELSE
        RAISE NOTICE 'Column is_dummy already exists';
    END IF;
END $$;

-- Update existing records to mark them as non-dummy
UPDATE generated_domains SET is_dummy = FALSE WHERE is_dummy IS NULL;
