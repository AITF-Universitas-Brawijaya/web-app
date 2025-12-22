#!/bin/bash

# Database Backup Script
# Backs up database schema and data every 5 minutes

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

echo "Starting Database Backup Service (Interval: 5 minutes)..."

while true; do
    echo "[$(date)] Starting backup..."
    
    # Backup Schema
    PGPASSWORD=postgres pg_dump -U postgres -h localhost -d prd --schema-only --no-owner --no-acl > database/backup_schema.sql 2>/dev/null
    
    # Backup Data
    PGPASSWORD=postgres pg_dump -U postgres -h localhost -d prd --data-only --no-owner --no-acl > database/backup_data.sql 2>/dev/null
    
    print_success "Backup completed at $(date)"
    
    # Wait for 5 minutes
    sleep 300
done
