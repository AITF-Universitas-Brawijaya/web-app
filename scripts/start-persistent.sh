#!/bin/bash

# Persistence Startup Script for RunPod
# This script ensures all system dependencies are installed and starts services
# using persistent data directories within the workdir.

set -e

# Configuration
# Configuration
# Configuration
PROJECT_DIR="/home/ubuntu/tim6_prd_workdir"
# RUNTIME DIR (Must support chmod 700)
DB_DATA_DIR="/tmp/pg_data"
# PERSISTENT DIR (Storage on /home)
DB_PERSISTENT_DIR="$PROJECT_DIR/postgres_data"
DB_BACKUP_DIR="$PROJECT_DIR/db_data_backup" # Keeping for legacy backup support

LOG_DIR="$PROJECT_DIR/logs"
BIN_DIR="$PROJECT_DIR/bin"
CHROME_DIR="$BIN_DIR/chrome-linux64"
CHROMEDRIVER_DIR="$BIN_DIR/chromedriver-linux64"

export PGHOST=/tmp
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
if ! command -v psql &> /dev/null || ! command -v nginx &> /dev/null || ! command -v google-chrome &> /dev/null || ! command -v lsof &> /dev/null; then
    print_warn "System dependencies missing (likely due to restart). Re-installing..."
    
    # Update apt
    sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq

    # Install Backend/System basics
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql-14 postgresql-client-14 nginx curl wget git build-essential unzip lsof psmisc rsync
else
    print_info "System dependencies (psql, nginx) appear to be installed."
fi

# 1.05 Setup Node.js & PM2 (Load NVM or Install if missing)
export NVM_DIR="/home/ubuntu/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"
else
    print_warn "NVM not found. Running setup script..."
    if [ -f "$PROJECT_DIR/scripts/setup-local-nodejs.sh" ]; then
         chmod +x "$PROJECT_DIR/scripts/setup-local-nodejs.sh"
         "$PROJECT_DIR/scripts/setup-local-nodejs.sh"
         export NVM_DIR="/home/ubuntu/.nvm"
         [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    else
         print_error "setup-local-nodejs.sh not found! Cannot setup Node environment."
    fi
fi

if ! command -v pm2 &> /dev/null; then
    print_info "PM2 not found in current environment. Installing global pm2..."
    npm install -g pm2
    # Reload path
    hash -r
fi

# 1.1 Setup Portable Chromium & ChromeDriver (Persistent in /home)
if [ ! -d "$CHROME_DIR" ] || [ ! -x "$CHROME_DIR/chrome" ] || [ ! -d "$CHROMEDRIVER_DIR" ]; then
    print_info "Portable Chromium/Driver not found. Installing to $BIN_DIR..."
    mkdir -p "$BIN_DIR"
    
    # URL for Chrome for Testing (stable version suitable for automation)
    VERSION="127.0.6533.72"
    CHROME_URL="https://storage.googleapis.com/chrome-for-testing-public/$VERSION/linux64/chrome-linux64.zip"
    DRIVER_URL="https://storage.googleapis.com/chrome-for-testing-public/$VERSION/linux64/chromedriver-linux64.zip"
    
    print_info "Downloading Chrome $VERSION..."
    wget -q --show-progress "$CHROME_URL" -O "$BIN_DIR/chrome.zip"
    wget -q --show-progress "$DRIVER_URL" -O "$BIN_DIR/chromedriver.zip"
    
    print_info "Unzipping binaries..."
    unzip -q -o "$BIN_DIR/chrome.zip" -d "$BIN_DIR"
    unzip -q -o "$BIN_DIR/chromedriver.zip" -d "$BIN_DIR"
    rm "$BIN_DIR/chrome.zip" "$BIN_DIR/chromedriver.zip"
    
    # Install dependencies for Chrome if missing (libs often missing on slim images)
    print_info "Installing Chrome runtime dependencies..."
    sudo apt-get install -y -qq libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2
    
    print_info "Portable Chrome/Driver installed."
else
    print_info "Portable Chrome & Driver found at $BIN_DIR"
fi

# 2. Setup PostgreSQL (Runtime in /tmp)
print_info "Setting up PostgreSQL in /tmp..."

# Stop existing postgres (system service)
if systemctl is-active --quiet postgresql; then
    print_info "Stopping default system PostgreSQL service..."
    sudo service postgresql stop
fi

mkdir -p "$LOG_DIR"
# DB_DATA_DIR was set to /tmp/pg_data in config (verify or set here)
DB_DATA_DIR="/tmp/pg_data"
mkdir -p "$DB_DATA_DIR"
chmod 700 "$DB_DATA_DIR"

# Restore from backup if exists and /tmp is empty (Best effort persistence)
if [ -z "$(ls -A "$DB_DATA_DIR")" ]; then
    if [ -d "$DB_BACKUP_DIR" ] && [ ! -z "$(ls -A "$DB_BACKUP_DIR")" ]; then
        print_info "Restoring database from backup..."
        rsync -a "$DB_BACKUP_DIR/" "$DB_DATA_DIR/"
    fi
fi

# Initialize DB if data dir is still empty
if [ -z "$(ls -A "$DB_DATA_DIR")" ]; then
    print_info "Initializing new database cluster in $DB_DATA_DIR..."
    "$PG_BIN/initdb" -D "$DB_DATA_DIR" --auth=trust --no-instructions
fi

# Check ports and cleanup
if lsof -i :5432 >/dev/null; then
    print_warn "Port 5432 is in use. Killing old processes..."
    sudo fuser -k 5432/tcp
fi

# Cleanup stale pid
rm -f "$DB_DATA_DIR/postmaster.pid"

# Start Postgres
print_info "Starting PostgreSQL..."
"$PG_BIN/pg_ctl" -D "$DB_DATA_DIR" -l "$LOG_DIR/postgres.log" -o "-p 5432 -k /tmp" start

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
if ! psql -d template1 -c "SELECT 1 FROM pg_roles WHERE rolname='postgres'" | grep -q 1; then
    print_info "Creating 'postgres' superuser role..."
    psql -d template1 -c "CREATE ROLE postgres WITH LOGIN SUPERUSER ENCRYPTED PASSWORD 'root';"
fi

# Start Sync Process (Optional Best Effort)
print_info "Starting DB Backup Sync (Best Effort)..."
if command -v pm2 &> /dev/null; then
    pm2 delete db-sync 2>/dev/null || true
    pm2 start "$PROJECT_DIR/scripts/sync-db.sh" --name db-sync
else
    pkill -f sync-db.sh || true
    nohup "$PROJECT_DIR/scripts/sync-db.sh" > "$LOG_DIR/sync.log" 2>&1 &
fi

# Create 'prd' database if not exists
if ! psql -lqt | cut -d \| -f 1 | grep -qw prd; then
    print_info "Creating 'prd' database..."
    createdb prd
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
