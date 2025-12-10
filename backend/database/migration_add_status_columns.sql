-- Migration: Add status, flagged, updated_at to results table and remove status from generated_domains
-- Date: 2025-12-06
-- Description: 
--   1. Add status VARCHAR(20) to results table with default 'unverified'
--   2. Add flagged BOOLEAN to results table with default FALSE
--   3. Add updated_at TIMESTAMPTZ to results table
--   4. Migrate existing status data from generated_domains to results
--   5. Remove status column from generated_domains table

-- Step 1: Add status column to results table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'results' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE results 
        ADD COLUMN status VARCHAR(20) DEFAULT 'unverified';
        
        RAISE NOTICE 'Column status added to results table';
    ELSE
        RAISE NOTICE 'Column status already exists in results table';
    END IF;
END $$;

-- Step 2: Add flagged column to results table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'results' 
        AND column_name = 'flagged'
    ) THEN
        ALTER TABLE results 
        ADD COLUMN flagged BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE 'Column flagged added to results table';
    ELSE
        RAISE NOTICE 'Column flagged already exists in results table';
    END IF;
END $$;

-- Step 3: Add updated_at column to results table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'results' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE results 
        ADD COLUMN updated_at TIMESTAMPTZ;
        
        RAISE NOTICE 'Column updated_at added to results table';
    ELSE
        RAISE NOTICE 'Column updated_at already exists in results table';
    END IF;
END $$;

-- Step 4: Migrate existing status data from generated_domains to results
DO $$
BEGIN
    -- Update results.status from generated_domains.status where they are linked
    UPDATE results r
    SET status = COALESCE(gd.status, 'unverified')
    FROM generated_domains gd
    WHERE r.id_domain = gd.id_domain
    AND gd.status IS NOT NULL;
    
    RAISE NOTICE 'Migrated status data from generated_domains to results';
END $$;

-- Step 5: Remove status column from generated_domains table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'generated_domains' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE generated_domains 
        DROP COLUMN status;
        
        RAISE NOTICE 'Column status removed from generated_domains table';
    ELSE
        RAISE NOTICE 'Column status does not exist in generated_domains table';
    END IF;
END $$;

-- Verify changes in results table
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'results'
AND column_name IN ('status', 'flagged', 'updated_at')
ORDER BY column_name;

-- Verify status column removed from generated_domains
SELECT 
    column_name
FROM information_schema.columns
WHERE table_name = 'generated_domains'
AND column_name = 'status';
