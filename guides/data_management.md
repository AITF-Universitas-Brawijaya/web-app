# Data Management Guide

**Last Updated**: 2025-12-02

This guide covers the data management scripts for PRD Analyst Dashboard, including database reset, dummy data management, and output file cleanup.

## Scripts Overview

| Script | Purpose | Location | Destructive |
|--------|---------|----------|-------------|
| `reset_all.sh` | Reset database & delete all output files | `scripts/` | ⚠️ Yes |
| `add_dummy.sh` | Add dummy data for testing | `scripts/` | No |
| `remove_dummy.sh` | Remove only dummy data | `scripts/` | Partial |

## Reset All Data

### Script: `reset_all.sh`

**Purpose**: Completely reset the database and delete all output files.

### What It Does

1. **Truncates all database tables**:
   - `generated_domains`
   - `reasoning`
   - `object_detection`
   - `results`

2. **Resets sequences** to start from 1

3. **Deletes output files**:
   - `backend/domain-generator/output/all_domains.txt`
   - `backend/domain-generator/output/last_id.txt`
   - All JSON files in `backend/domain-generator/output/`
   - All images in `backend/domain-generator/output/img/`

### Usage

```bash
# Run the script
scripts/reset_all.sh

# You will be prompted for confirmation
# Type 'yes' to proceed
```

> [!CAUTION]
> This script is **DESTRUCTIVE** and will delete ALL data. Always backup important data before running.

## Add Dummy Data

### Script: `add_dummy.sh`

**Purpose**: Add predefined dummy data to the database for testing purposes.

### What It Does

1. Checks if dummy data already exists
2. Prompts for confirmation if dummy data exists
3. Executes `backend/database/insert_dummy_data.sql`
4. Inserts 3 dummy records with `is_dummy = TRUE`:
   - **Dummy 1**: Gambling site (verified)
   - **Dummy 2**: Adult content site (unverified)
   - **Dummy 3**: Legitimate e-commerce (false-positive)

### Usage

```bash
# Run the script
scripts/add_dummy.sh
```

### Dummy Data Details

Each dummy record includes:
- Complete domain information
- Reasoning analysis with confidence scores
- Object detection results with bounding boxes
- Final results with keywords and labels

## Remove Dummy Data

### Script: `remove_dummy.sh`

**Purpose**: Remove only dummy data from the database, preserving real production data.

### What It Does

1. Checks for existing dummy data (`is_dummy = TRUE`)
2. Shows preview of data to be deleted
3. Prompts for confirmation
4. Deletes dummy records (cascades to related tables)
5. Verifies deletion

### Usage

```bash
# Run the script
scripts/remove_dummy.sh
```

> [!IMPORTANT]
> This script only removes records where `is_dummy = TRUE`. Real production data is safe.

## Use Cases

### Scenario 1: Fresh Start for Testing

```bash
# 1. Reset everything
scripts/reset_all.sh

# 2. Add dummy data
scripts/add_dummy.sh

# 3. Start testing
```

### Scenario 2: Clean Production Database

```bash
# Remove only dummy data, keep real data
scripts/remove_dummy.sh
```

### Scenario 3: Development Cycle

```bash
# Add dummy data for development
scripts/add_dummy.sh

# ... do development work ...

# Remove dummy data before commit
scripts/remove_dummy.sh
```

### Scenario 4: Database Migration

```bash
# 1. Apply schema migration
psql -d prd -f backend/database/migration_add_is_dummy.sql

# 2. Add dummy data for testing
scripts/add_dummy.sh

# 3. Verify migration worked
psql -d prd -c "SELECT * FROM generated_domains WHERE is_dummy = TRUE;"
```

## Troubleshooting

### Script Permission Denied

```bash
# Make scripts executable
chmod +x scripts/reset_all.sh
chmod +x scripts/add_dummy.sh
chmod +x scripts/remove_dummy.sh
```

### Database Connection Error

```bash
# Check if PostgreSQL is running
systemctl status postgresql

# Check database exists
psql -l | grep prd

# Test connection
psql -d prd -c "SELECT 1;"
```

### Migration Already Applied

If you see "Column is_dummy already exists":

```sql
-- Check if column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'generated_domains' 
AND column_name = 'is_dummy';
```

This is normal and safe - the migration is idempotent.

### Dummy Data Not Found

If `remove_dummy.sh` says no dummy data found:

```sql
-- Check for dummy data
SELECT COUNT(*) FROM generated_domains WHERE is_dummy = TRUE;

-- Check all data
SELECT id_domain, domain, is_dummy FROM generated_domains;
```

### Files Not Deleted

If output files are not deleted, check permissions:

```bash
# Check directory permissions
ls -la archives/output/

# Check file ownership
ls -l archives/output/all_domains.txt

# Fix permissions if needed
chmod 755 archives/output/
```
