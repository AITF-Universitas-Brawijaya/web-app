#!/bin/bash

# Script: reset_all.sh
# Description: Reset semua data pada database dan hapus semua output files
# Author: PRD Analyst Dashboard Team
# Date: 2025-12-02

set -e  # Exit on error

echo "[INFO] Starting complete database and output reset..."

# Configuration
DB_NAME="prd"
OUTPUT_DIR="/home/ubuntu/tim6_prd_workdir/backend/domain-generator/output"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Confirmation prompt
echo ""
print_warning "⚠️  PERINGATAN: Script ini akan menghapus SEMUA data!"
echo "  - Semua data di database (generated_domains, reasoning, object_detection, results)"
echo "  - File backend/domain-generator/output/all_domains.txt"
echo "  - File backend/domain-generator/output/last_id.txt"
echo "  - Semua file JSON di backend/domain-generator/output/"
echo "  - Semua file gambar di backend/domain-generator/output/img/"
echo ""
read -p "Apakah Anda yakin ingin melanjutkan? (yes/no): " confirmation

if [ "$confirmation" != "yes" ]; then
    print_info "Reset dibatalkan."
    exit 0
fi

# Step 1: Reset Database
print_info "Step 1/5: Menghapus semua data dari database..."

psql -U postgres -d "$DB_NAME" <<EOF
-- Delete all data from tables (CASCADE will handle foreign keys)
TRUNCATE TABLE results CASCADE;
TRUNCATE TABLE object_detection CASCADE;
TRUNCATE TABLE reasoning CASCADE;
TRUNCATE TABLE generated_domains CASCADE;

-- Reset sequences
ALTER SEQUENCE generated_domains_id_domain_seq RESTART WITH 1;
ALTER SEQUENCE reasoning_id_reasoning_seq RESTART WITH 1;
ALTER SEQUENCE results_id_results_seq RESTART WITH 1;

-- Verify deletion
SELECT 'generated_domains' as table_name, COUNT(*) as count FROM generated_domains
UNION ALL
SELECT 'reasoning', COUNT(*) FROM reasoning
UNION ALL
SELECT 'object_detection', COUNT(*) FROM object_detection
UNION ALL
SELECT 'results', COUNT(*) FROM results;
EOF

if [ $? -eq 0 ]; then
    print_info "✓ Database berhasil direset"
else
    print_error "✗ Gagal mereset database"
    exit 1
fi

# Step 2: Reset all_domains.txt
print_info "Step 2/5: Menghapus backend/domain-generator/output/all_domains.txt..."
if [ -f "$OUTPUT_DIR/all_domains.txt" ]; then
    rm -f "$OUTPUT_DIR/all_domains.txt"
    print_info "✓ all_domains.txt dihapus"
else
    print_warning "all_domains.txt tidak ditemukan (sudah tidak ada)"
fi

# Step 3: Reset last_id.txt
print_info "Step 3/5: Menghapus backend/domain-generator/output/last_id.txt..."
if [ -f "$OUTPUT_DIR/last_id.txt" ]; then
    rm -f "$OUTPUT_DIR/last_id.txt"
    print_info "✓ last_id.txt dihapus"
else
    print_warning "last_id.txt tidak ditemukan (sudah tidak ada)"
fi

# Step 4: Delete all JSON files
print_info "Step 4/5: Menghapus semua file JSON di backend/domain-generator/output/..."
json_count=$(find "$OUTPUT_DIR" -maxdepth 1 -name "*.json" -type f | wc -l)
if [ "$json_count" -gt 0 ]; then
    find "$OUTPUT_DIR" -maxdepth 1 -name "*.json" -type f -delete
    print_info "✓ $json_count file JSON dihapus"
else
    print_warning "Tidak ada file JSON yang ditemukan"
fi

# Step 5: Delete all images
print_info "Step 5/5: Menghapus semua gambar di backend/domain-generator/output/img/..."
if [ -d "$OUTPUT_DIR/img" ]; then
    img_count=$(find "$OUTPUT_DIR/img" -type f | wc -l)
    if [ "$img_count" -gt 0 ]; then
        rm -rf "$OUTPUT_DIR/img"/*
        print_info "✓ $img_count file gambar dihapus"
    else
        print_warning "Tidak ada gambar yang ditemukan"
    fi
else
    print_warning "Direktori img/ tidak ditemukan"
fi

# Summary
echo ""
print_info "========================================="
print_info "Reset selesai! Ringkasan:"
print_info "  ✓ Database direset (semua tabel kosong)"
print_info "  ✓ all_domains.txt dihapus"
print_info "  ✓ last_id.txt dihapus"
print_info "  ✓ $json_count file JSON dihapus"
print_info "  ✓ $img_count file gambar dihapus"
print_info "========================================="
echo ""
