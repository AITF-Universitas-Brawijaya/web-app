#!/bin/bash

# Script: remove_dummy.sh
# Description: Menghapus semua dummy data dari database
# Author: PRD Analyst Dashboard Team
# Date: 2025-12-02

set -e  # Exit on error

echo "[INFO] Removing dummy data from database..."

# Configuration
DB_NAME="prd"

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

# Check if dummy data exists
print_info "Memeriksa dummy data yang ada..."
dummy_count=$(psql -U postgres -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM generated_domains WHERE is_dummy = TRUE;")
dummy_count=$(echo $dummy_count | xargs)  # Trim whitespace

if [ "$dummy_count" -eq 0 ]; then
    print_warning "Tidak ada dummy data yang ditemukan di database."
    exit 0
fi

# Show dummy data to be deleted
print_info "Dummy data yang akan dihapus ($dummy_count records):"
psql -U postgres -d "$DB_NAME" <<EOF
SELECT 
    id_domain,
    domain,
    status,
    date_generated
FROM generated_domains 
WHERE is_dummy = TRUE
ORDER BY id_domain;
EOF

# Confirmation prompt
echo ""
print_warning "⚠️  Anda akan menghapus $dummy_count dummy records"
read -p "Apakah Anda yakin ingin melanjutkan? (yes/no): " confirmation

if [ "$confirmation" != "yes" ]; then
    print_info "Penghapusan dummy data dibatalkan."
    exit 0
fi

# Delete dummy data
print_info "Menghapus dummy data..."
psql -U postgres -d "$DB_NAME" <<EOF
-- Delete akan cascade ke semua tabel terkait (reasoning, object_detection, results)
DELETE FROM generated_domains WHERE is_dummy = TRUE;
EOF

if [ $? -eq 0 ]; then
    print_info "========================================="
    print_info "✓ Dummy data berhasil dihapus!"
    print_info "  Records dihapus: $dummy_count"
    print_info "========================================="
    
    # Verify deletion
    remaining=$(psql -U postgres -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM generated_domains WHERE is_dummy = TRUE;")
    remaining=$(echo $remaining | xargs)
    
    if [ "$remaining" -eq 0 ]; then
        print_info "✓ Verifikasi: Tidak ada dummy data tersisa"
    else
        print_warning "⚠️  Masih ada $remaining dummy data tersisa"
    fi
    
    # Show total remaining records
    total=$(psql -U postgres -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM generated_domains;")
    total=$(echo $total | xargs)
    print_info "Total records di database: $total"
else
    print_error "✗ Gagal menghapus dummy data"
    exit 1
fi

echo ""
