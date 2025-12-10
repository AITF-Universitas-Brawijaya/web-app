-- Migration script for object_detection table
-- This script will drop the existing table and recreate it with the new schema

-- Drop the old table (this will also drop dependent foreign keys in results table)
DROP TABLE IF EXISTS object_detection CASCADE;

-- Recreate the table with updated schema
CREATE TABLE IF NOT EXISTS object_detection (
    id_detection TEXT PRIMARY KEY,
    id_domain INT NOT NULL REFERENCES generated_domains(id_domain) ON DELETE CASCADE,
    label BOOLEAN,
    confidence_score NUMERIC(4,1),
    image_detected_path VARCHAR(512),
    bounding_box JSONB,
    ocr JSONB,
    model_version TEXT,
    processed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (id_domain)
);

-- Recreate the foreign key in results table if it was dropped
-- Note: This assumes the results table structure remains the same
-- You may need to adjust this based on your actual results table structure
