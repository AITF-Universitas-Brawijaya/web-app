-- Migration: Update confidence score format and add modification tracking
-- Date: 2025-12-02
-- Description: 
--   1. Change all confidence_score columns from NUMERIC(5,4) to NUMERIC(4,1)
--   2. Add modified_by and modified_at columns to results table

-- Step 1: Update reasoning table confidence_score
DO $$ 
BEGIN
    -- Change column type for reasoning.confidence_score
    ALTER TABLE reasoning 
    ALTER COLUMN confidence_score TYPE NUMERIC(4,1);
    
    RAISE NOTICE 'reasoning.confidence_score updated to NUMERIC(4,1)';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating reasoning.confidence_score: %', SQLERRM;
END $$;

-- Step 2: Update results table confidence_score
DO $$ 
BEGIN
    -- Change column type for results.final_confidence
    ALTER TABLE results 
    ALTER COLUMN final_confidence TYPE NUMERIC(4,1);
    
    RAISE NOTICE 'results.final_confidence updated to NUMERIC(4,1)';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating results.final_confidence: %', SQLERRM;
END $$;

-- Step 3: Add modified_by column to results table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'results' 
        AND column_name = 'modified_by'
    ) THEN
        ALTER TABLE results 
        ADD COLUMN modified_by VARCHAR(100);
        
        RAISE NOTICE 'Column modified_by added to results table';
    ELSE
        RAISE NOTICE 'Column modified_by already exists in results table';
    END IF;
END $$;

-- Step 4: Add modified_at column to results table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'results' 
        AND column_name = 'modified_at'
    ) THEN
        ALTER TABLE results 
        ADD COLUMN modified_at TIMESTAMPTZ;
        
        RAISE NOTICE 'Column modified_at added to results table';
    ELSE
        RAISE NOTICE 'Column modified_at already exists in results table';
    END IF;
END $$;

-- Verify changes
SELECT 
    table_name,
    column_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns
WHERE table_name IN ('reasoning', 'object_detection', 'results')
AND column_name LIKE '%confidence%'
ORDER BY table_name, column_name;

-- Verify new columns in results table
SELECT 
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'results'
AND column_name IN ('modified_by', 'modified_at')
ORDER BY column_name;
