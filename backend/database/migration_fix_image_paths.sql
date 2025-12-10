-- Migration: Fix image paths to include Gambling-Pipeline folder
-- This updates existing records that have incorrect paths

-- Update image_detected_path in object_detection table
UPDATE object_detection
SET image_detected_path = REPLACE(
    image_detected_path,
    '~/tim5_prd_workdir/results/',
    '~/tim5_prd_workdir/Gambling-Pipeline/results/'
)
WHERE image_detected_path LIKE '~/tim5_prd_workdir/results/%'
  AND image_detected_path NOT LIKE '~/tim5_prd_workdir/Gambling-Pipeline/%';

-- Update image_final_path in results table
UPDATE results
SET image_final_path = REPLACE(
    image_final_path,
    '~/tim5_prd_workdir/results/',
    '~/tim5_prd_workdir/Gambling-Pipeline/results/'
)
WHERE image_final_path LIKE '~/tim5_prd_workdir/results/%'
  AND image_final_path NOT LIKE '~/tim5_prd_workdir/Gambling-Pipeline/%';

-- Display summary of changes
SELECT 
    'object_detection' as table_name,
    COUNT(*) as updated_rows
FROM object_detection
WHERE image_detected_path LIKE '~/tim5_prd_workdir/Gambling-Pipeline/%'

UNION ALL

SELECT 
    'results' as table_name,
    COUNT(*) as updated_rows
FROM results
WHERE image_final_path LIKE '~/tim5_prd_workdir/Gambling-Pipeline/%';
