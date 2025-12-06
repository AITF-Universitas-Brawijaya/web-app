#!/bin/bash

# Script: add_dummy.sh
# Description: Menambahkan dummy data ke database untuk testing
# Author: PRD Analyst Dashboard Team
# Date: 2025-12-02

set -e  # Exit on error

echo "[INFO] Adding dummy data to database..."

# Configuration
DB_NAME="prd"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SQL_FILE="$PROJECT_ROOT/backend/database/insert_dummy_data.sql"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if SQL file exists
if [ ! -f "$SQL_FILE" ]; then
    print_error "File SQL tidak ditemukan: $SQL_FILE"
    exit 1
fi

# Check if dummy data already exists
print_info "Memeriksa apakah dummy data sudah ada..."
dummy_count=$(psql -U postgres -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM generated_domains WHERE is_dummy = TRUE;")
dummy_count=$(echo $dummy_count | xargs)  # Trim whitespace

if [ "$dummy_count" -gt 0 ]; then
    print_warning "Dummy data sudah ada ($dummy_count records)"
    read -p "Apakah Anda ingin menambahkan dummy data lagi? (yes/no): " confirmation
    if [ "$confirmation" != "yes" ]; then
        print_info "Penambahan dummy data dibatalkan."
        exit 0
    fi
fi

# Execute SQL file
print_info "Menjalankan script insert_dummy_data.sql..."
psql -U postgres -d "$DB_NAME" -f "$SQL_FILE"

if [ $? -eq 0 ]; then
    # Count total dummy records
    total_dummy=$(psql -U postgres -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM generated_domains WHERE is_dummy = TRUE;")
    total_dummy=$(echo $total_dummy | xargs)
    
    print_info "========================================="
    print_info "✓ Dummy data berhasil ditambahkan!"
    print_info "  Total dummy records: $total_dummy"
    print_info "========================================="
    
    # Show summary
    print_info "Detail dummy data:"
    psql -U postgres -d "$DB_NAME" <<EOF
SELECT 
    gd.id_domain,
    gd.domain,
    COALESCE(r.status, 'unverified') as status,
    gd.date_generated,
    r.created_by,
    r.verified_by
FROM generated_domains gd
LEFT JOIN results r ON gd.id_domain = r.id_domain
WHERE gd.is_dummy = TRUE
ORDER BY gd.id_domain DESC
LIMIT 10;
EOF
else
    print_error "✗ Gagal menambahkan dummy data"
    exit 1
fi

echo ""
