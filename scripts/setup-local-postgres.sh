#!/bin/bash

# Setup script for PostgreSQL 14 using apt package manager
# Installs system-wide but persists after reboot

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

print_info "Installing PostgreSQL 14 via apt package manager"

# Add PostgreSQL APT repository
print_info "Adding PostgreSQL repository..."
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -

# Update and install PostgreSQL
print_info "Installing PostgreSQL 14..."
apt-get update -qq
apt-get install -y -qq postgresql-14 postgresql-client-14

# Start PostgreSQL service
print_info "Starting PostgreSQL service..."
systemctl start postgresql || service postgresql start

# Wait for PostgreSQL to be ready
sleep 2

# Create database
print_info "Creating database 'prd'..."
sudo -u postgres createdb prd 2>/dev/null || print_warning "Database 'prd' already exists"

# Configure PostgreSQL for local trust authentication
print_info "Configuring PostgreSQL authentication..."
PG_HBA="/etc/postgresql/14/main/pg_hba.conf"
if ! grep -q "# Added by setup script" "$PG_HBA"; then
    cat >> "$PG_HBA" <<EOF

# Added by setup script - allow local connections without password
local   all             all                                     trust
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust
EOF
    systemctl reload postgresql || service postgresql reload
fi

print_info "PostgreSQL installation completed!"
print_info "PostgreSQL is running on port 5432"
print_info "Database 'prd' has been created"
print_info ""
print_info "To access the database, run:"
print_info "  psql -U postgres -d prd"
