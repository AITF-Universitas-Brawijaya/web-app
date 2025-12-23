#!/bin/bash

# Database Backup Script for RunPod
# Backs up both schema and data to database/ directory

set -e

echo "=========================================="
echo "PRD Analyst - Database Backup (RunPod)"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}➜ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Database credentials
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_HOST="localhost"
DB_NAME="prd"

# Backup directory
BACKUP_DIR="database"
mkdir -p "$BACKUP_DIR"

# Check if PostgreSQL is running
if ! PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -c "SELECT 1;" > /dev/null 2>&1; then
    print_error "PostgreSQL is not running or not accessible"
    echo ""
    echo "Start PostgreSQL with:"
    echo "  su - postgres -c '/usr/lib/postgresql/*/bin/pg_ctl -D /workspace/postgresql/data start'"
    exit 1
fi

print_info "PostgreSQL is running"
echo ""

# Backup schema
print_info "Backing up database schema..."
PGPASSWORD=$DB_PASSWORD pg_dump \
    -U $DB_USER \
    -h $DB_HOST \
    -d $DB_NAME \
    --schema-only \
    --no-owner \
    --no-privileges \
    -f "$BACKUP_DIR/backup_schema.sql"

if [ -f "$BACKUP_DIR/backup_schema.sql" ]; then
    SCHEMA_SIZE=$(du -h "$BACKUP_DIR/backup_schema.sql" | cut -f1)
    print_success "Schema backed up: $BACKUP_DIR/backup_schema.sql ($SCHEMA_SIZE)"
else
    print_error "Schema backup failed"
    exit 1
fi

echo ""

# Backup data
print_info "Backing up database data..."
PGPASSWORD=$DB_PASSWORD pg_dump \
    -U $DB_USER \
    -h $DB_HOST \
    -d $DB_NAME \
    --data-only \
    --no-owner \
    --no-privileges \
    -f "$BACKUP_DIR/backup_data.sql"

if [ -f "$BACKUP_DIR/backup_data.sql" ]; then
    DATA_SIZE=$(du -h "$BACKUP_DIR/backup_data.sql" | cut -f1)
    print_success "Data backed up: $BACKUP_DIR/backup_data.sql ($DATA_SIZE)"
else
    print_error "Data backup failed"
    exit 1
fi

echo ""

# Get record counts
print_info "Database statistics:"
echo ""

TABLES=("users" "generated_domains" "results" "generator_settings")

for table in "${TABLES[@]}"; do
    COUNT=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -d $DB_NAME -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')
    if [ -n "$COUNT" ]; then
        printf "  %-20s : %s records\n" "$table" "$COUNT"
    fi
done

echo ""
print_success "Backup completed successfully!"
echo ""
echo "Backup files:"
echo "  - $BACKUP_DIR/backup_schema.sql"
echo "  - $BACKUP_DIR/backup_data.sql"
echo ""
echo "To restore, run: ./setup-runpod.sh"
echo "(It will automatically use backup files if available)"
echo ""
