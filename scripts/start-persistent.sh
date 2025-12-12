#!/bin/bash

# Persistence Startup Script for RunPod
# This script ensures all system dependencies are installed and starts services
# using persistent data directories within the workdir.

set -e

# Configuration
PROJECT_DIR="/home/ubuntu/tim6_prd_workdir"
DB_DATA_DIR="$PROJECT_DIR/db_data"
LOG_DIR="$PROJECT_DIR/logs"
NGINX_CONF="$PROJECT_DIR/nginx.conf"
NEXTJS_NGINX_CONF="$PROJECT_DIR/nextjs-nginx.conf"
# Get the postgres bin path (adjust version if needed, assuming 14 from setup script)
PG_BIN="/usr/lib/postgresql/14/bin"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

print_info "Starting Persistent Setup..."

# 1. Check & Install System Dependencies
# We check for a critical binary from each package to decide if we need to reinstall.
if ! command -v psql &> /dev/null || ! command -v nginx &> /dev/null || ! command -v google-chrome &> /dev/null; then
    print_warn "System dependencies missing (likely due to restart). Re-installing..."
    
    # Update apt
    sudo apt-get update -qq

    # Install Backend/System basics
    sudo apt-get install -y -qq postgresql-14 postgresql-client-14 nginx curl wget git build-essential unzip
    
    # Install Chrome (Refactored from setup-local-chrome.sh for speed)
    if ! command -v google-chrome &> /dev/null; then
        print_info "Installing Chrome..."
        wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -O /tmp/chrome.deb
        sudo dpkg -i /tmp/chrome.deb || sudo apt-get install -f -y
        rm /tmp/chrome.deb
    fi
else
    print_info "System dependencies appear to be installed."
fi

# 2. Setup Persistent PostgreSQL
print_info "Setting up Persistent PostgreSQL..."

# Stop the default system postgres service (we want to run our own custom instance)
if systemctl is-active --quiet postgresql; then
    print_info "Stopping default system PostgreSQL service..."
    sudo service postgresql stop
fi

mkdir -p "$DB_DATA_DIR"
mkdir -p "$LOG_DIR"

# Initialize DB if data dir is empty
if [ -z "$(ls -A "$DB_DATA_DIR")" ]; then
    print_info "Initializing new database cluster in $DB_DATA_DIR..."
    "$PG_BIN/initdb" -D "$DB_DATA_DIR" --auth=trust --no-instructions
fi

# Check if Postgres is already running on port 5432 (system or ours)
if lsof -i :5432 >/dev/null; then
    print_warn "Port 5432 is in use. Checking if it's our instance..."
    if ! "$PG_BIN/pg_isready" -d template1 -q; then
         print_error "Port 5432 is in use but doesn't seem to be responding correctly. Attempting to kill..."
         sudo fuser -k 5432/tcp
    fi
fi

# Start Postgres (as current user)
# We use pg_ctl to start it in background
print_info "Starting PostgreSQL..."
"$PG_BIN/pg_ctl" -D "$DB_DATA_DIR" -l "$LOG_DIR/postgres.log" -o "-p 5432" start

# Wait for it to be ready
echo -n "Waiting for PostgreSQL to start..."
for i in {1..30}; do
    if "$PG_BIN/pg_isready" -q; then
        echo " Ready!"
        break
    fi
    echo -n "."
    sleep 1
done

# Setup DB Users/Schema if needed
# Since we run as 'ubuntu', we are the superuser 'ubuntu'.
# The app likely uses 'postgres' user. Let's ensure 'postgres' user exists with superuser privileges.
if ! psql -d template1 -c "SELECT 1 FROM pg_roles WHERE rolname='postgres'" | grep -q 1; then
    print_info "Creating 'postgres' superuser role..."
    psql -d template1 -c "CREATE ROLE postgres WITH LOGIN SUPERUSER ENCRYPTED PASSWORD 'root';"
fi

# Create 'prd' database if not exists
if ! psql -lqt | cut -d \| -f 1 | grep -qw prd; then
    print_info "Creating 'prd' database..."
    createdb prd
    print_info "Database 'prd' created. You may need to restore data if this is a fresh volume."
fi

# 3. Setup Nginx
print_info "Configuring Nginx..."
# Restore configs
if [ -f "$NGINX_CONF" ]; then
    sudo cp "$NGINX_CONF" /etc/nginx/sites-available/default
fi
# (Optional) NextJS config if separate, but usually one main config is enough or user manages it.
# Assuming nginx.conf in workdir is the main site config.

# Enable and Reload
if [ -f /etc/nginx/sites-available/default ]; then
    sudo ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
fi
sudo service nginx restart

# 4. Start Application (PM2)
print_info "Starting Application with PM2..."
if command -v pm2 &> /dev/null; then
    pm2 start "$PROJECT_DIR/ecosystem.config.js" || pm2 reload "$PROJECT_DIR/ecosystem.config.js"
    pm2 save
else
    print_error "PM2 not found! Try installing with: npm install -g pm2"
fi

print_info " Persistence Setup Complete! System should be up."
