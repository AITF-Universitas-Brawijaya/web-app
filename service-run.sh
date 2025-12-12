#!/bin/bash

# Configuration
PROJECT_DIR="/home/ubuntu/tim6_prd_workdir"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
export PGHOST=/tmp

print_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

cd "$PROJECT_DIR" || exit 1

print_info "Starting Service Run Script..."

# 1. Run Persistence Setup (Installs deps, starts DB, installs portable chrome)
if [ -f "scripts/start-persistent.sh" ]; then
    chmod +x scripts/start-persistent.sh
    ./scripts/start-persistent.sh
else
    print_error "scripts/start-persistent.sh not found!"
    exit 1
fi

# 2. Verify Services
print_info "Verifying services..."

# Postgres
if systemctl is-active --quiet postgresql; then
    # Usually we stopped system postgres and started our own via pg_ctl in start-persistent.sh
    # But start-persistent.sh might have just started it.
    # Let's check via psql
    if pg_isready -q; then
        print_info "PostgreSQL is READY."
    else
        print_warn "PostgreSQL is running but not ready yet."
    fi
else
    # Check if our custom pg_ctl instance is running
    if pgrep -f "postgres -D" > /dev/null; then
         print_info "PostgreSQL (custom instance) is RUNNING."
    else
         print_error "PostgreSQL is NOT running."
    fi
fi

# PM2 / Applications
if command -v pm2 &> /dev/null; then
    pm2 status
else
    print_warn "PM2 not found in path."
fi

# 3. Environment Info
print_info "Environment:"
echo "  PROJECT_DIR: $PROJECT_DIR"
echo "  CHROME_PATH: $PROJECT_DIR/bin/chrome-linux64/chrome"

print_info "System is UP. To view logs run: pm2 logs"
print_info "To stop everything run: pm2 kill && sudo pkill postgres"
