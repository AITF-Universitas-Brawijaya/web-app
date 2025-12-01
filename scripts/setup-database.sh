#!/bin/bash

# Setup database script
# Creates database and imports schema

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get the actual user (not root when using sudo)
ACTUAL_USER=${SUDO_USER:-$USER}
PROJECT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

print_info "Setting up database..."

# Check if PostgreSQL is running
if ! sudo -u postgres psql -c "SELECT 1" >/dev/null 2>&1; then
    print_info "Starting PostgreSQL..."
    systemctl start postgresql || service postgresql start
    sleep 2
fi

# Create database if not exists
print_info "Creating database 'prd'..."
sudo -u postgres createdb prd 2>/dev/null || print_warning "Database 'prd' already exists"

# Import schema
print_info "Importing database schema..."
if [ -f "$PROJECT_DIR/backend/database/schema.sql" ]; then
    sudo -u postgres psql -d prd -f "$PROJECT_DIR/backend/database/schema.sql"
    print_info "Schema imported successfully"
else
    print_error "Schema file not found: $PROJECT_DIR/backend/database/schema.sql"
    exit 1
fi

# Import migration if exists
if [ -f "$PROJECT_DIR/backend/database/migration_object_detection.sql" ]; then
    print_info "Importing object detection migration..."
    sudo -u postgres psql -d prd -f "$PROJECT_DIR/backend/database/migration_object_detection.sql" 2>/dev/null || print_warning "Migration already applied or failed"
fi

# Verify tables
print_info "Verifying tables..."
TABLE_COUNT=$(sudo -u postgres psql -d prd -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
print_info "Found $TABLE_COUNT tables in database"

print_info "Database setup completed!"
print_info ""
print_info "To access the database, run:"
print_info "  psql -U postgres -d prd"
