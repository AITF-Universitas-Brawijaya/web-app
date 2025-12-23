#!/bin/bash

# PRD Analyst - Native Deployment Setup Script
# This script installs all dependencies and sets up the environment

set -e  # Exit on error

echo "=========================================="
echo "PRD Analyst - Native Deployment Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}➜ $1${NC}"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_error "Please do not run this script as root"
    exit 1
fi

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

print_info "Working directory: $SCRIPT_DIR"
echo ""

# ==========================================
# 1. Install System Dependencies
# ==========================================
print_info "Step 1: Installing system dependencies..."

sudo apt update
sudo apt install -y \
    postgresql postgresql-contrib \
    wget curl git \
    build-essential \
    libpq-dev \
    python3-dev \
    nginx \
    ca-certificates gnupg

# Install Node.js from NodeSource (includes npm)
if ! command -v npm &> /dev/null; then
    print_info "Installing Node.js from NodeSource..."
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
    sudo apt update
    sudo apt install -y nodejs
    print_success "Node.js $(node -v) and npm $(npm -v) installed"
else
    print_info "npm already installed: $(npm -v)"
fi

print_success "System dependencies installed"
echo ""

# ==========================================
# 2. Configure Nginx Reverse Proxy
# ==========================================
print_info "Step 2: Configuring Nginx Reverse Proxy..."

# Create Nginx configuration
sudo bash -c 'cat > /etc/nginx/sites-available/web-app <<EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF'

# Enable the site
sudo ln -sf /etc/nginx/sites-available/web-app /etc/nginx/sites-enabled/

# Remove default site if it exists
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
if sudo nginx -t; then
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    print_success "Nginx configured successfully (Port 80 -> 3000)"
else
    print_error "Nginx configuration failed"
fi
echo ""


# ==========================================
# 3. Install Miniconda
# ==========================================
print_info "Step 3: Installing Miniconda..."

MINICONDA_DIR="$HOME/miniconda3"

if [ -d "$MINICONDA_DIR" ]; then
    print_info "Miniconda already installed at $MINICONDA_DIR"
else
    print_info "Downloading Miniconda..."
    wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O /tmp/miniconda.sh
    
    print_info "Installing Miniconda..."
    bash /tmp/miniconda.sh -b -p "$MINICONDA_DIR"
    rm /tmp/miniconda.sh
    
    print_success "Miniconda installed"
fi

# Initialize conda for bash (current session)
eval "$("$MINICONDA_DIR/bin/conda" shell.bash hook)"

# Add conda to ~/.bashrc if not already there
if ! grep -q "conda initialize" ~/.bashrc 2>/dev/null; then
    print_info "Adding conda to ~/.bashrc..."
    "$MINICONDA_DIR/bin/conda" init bash
    print_success "Conda added to ~/.bashrc"
else
    print_info "Conda already configured in ~/.bashrc"
fi

print_success "Miniconda ready"
echo ""

# ==========================================
# 3. Create Conda Environment
# ==========================================
print_info "Step 3: Creating conda environment 'prd6'..."

# Remove existing environment if it exists
if conda env list | grep -q "prd6"; then
    print_info "Removing existing prd6 environment..."
    conda env remove -n prd6 -y
fi

print_info "Creating new prd6 environment with Python 3.12..."

# Accept Anaconda Terms of Service for default channels
print_info "Accepting Conda Terms of Service..."
conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/main 2>/dev/null || true
conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/r 2>/dev/null || true

# Configure conda channels
conda config --set channel_priority flexible
conda config --add channels conda-forge
conda config --set auto_activate_base false

conda create -n prd6 python=3.12 -y

print_success "Conda environment 'prd6' created"
echo ""

# ==========================================
# 4. Install Python Dependencies
# ==========================================
print_info "Step 4: Installing Python dependencies in prd6 environment..."

# Activate conda environment
conda activate prd6

print_info "Installing dependencies from requirements.txt..."
pip install -r requirements.txt

print_info "Installing Playwright browsers..."
playwright install chromium
playwright install-deps chromium

print_success "Python dependencies installed"
echo ""

# ==========================================
# 5. Setup PostgreSQL Database
# ==========================================
print_info "Step 5: Setting up PostgreSQL database..."

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Always reset password using peer authentication (which always works with sudo)
print_info "Setting PostgreSQL password..."
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';" 2>/dev/null || true

# Create database if not exists
sudo -u postgres psql -c "CREATE DATABASE prd;" 2>/dev/null || print_info "Database 'prd' already exists"

# Configure pg_hba.conf for md5 password authentication
print_info "Configuring PostgreSQL for password authentication..."
PG_HBA_FILE=$(sudo find /etc/postgresql -name "pg_hba.conf" 2>/dev/null | head -n 1)

if [ -n "$PG_HBA_FILE" ]; then
    # Replace peer and scram-sha-256 with md5 for local connections
    sudo sed -i 's/peer/md5/g' "$PG_HBA_FILE" 2>/dev/null || true
    sudo sed -i 's/scram-sha-256/md5/g' "$PG_HBA_FILE" 2>/dev/null || true
    
    # Restart PostgreSQL to apply changes
    sudo systemctl restart postgresql
    
    # Wait for PostgreSQL to be ready
    sleep 2
    
    # Verify connection works
    if PGPASSWORD=postgres psql -U postgres -h localhost -c "SELECT 1;" >/dev/null 2>&1; then
        print_success "PostgreSQL password authentication configured successfully"
    else
        print_error "PostgreSQL connection test failed. Trying alternative fix..."
        # Force reset password again after config change
        sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';" 2>/dev/null || true
        sudo systemctl restart postgresql
        sleep 2
    fi
else
    print_error "Could not find pg_hba.conf"
fi

print_success "PostgreSQL database ready"
echo ""

# ==========================================
# 6. Initialize Database Schema
# ==========================================
print_info "Step 6: Initializing database schema..."

# Determine schema file to use
SCHEMA_FILE=""
if [ -f "database/backup_schema.sql" ]; then
    SCHEMA_FILE="database/backup_schema.sql"
    print_info "Using schema backup: $SCHEMA_FILE"
elif [ -f "database/init-schema.sql" ]; then
    SCHEMA_FILE="database/init-schema.sql"
    print_info "Using initial schema: $SCHEMA_FILE"
fi

if [ -n "$SCHEMA_FILE" ]; then
    PGPASSWORD=postgres psql -U postgres -h localhost -d prd -f "$SCHEMA_FILE" 2>/dev/null || print_info "Schema already initialized"
    print_success "Database schema initialized"
else
    print_info "No schema file found (backup_schema.sql or init-schema.sql), skipping..."
fi

# Restore data if database is empty
# Determine data file to use
DATA_FILE=""
if [ -f "database/backup_data.sql" ]; then
    DATA_FILE="database/backup_data.sql"
    print_info "Using data backup: $DATA_FILE"
elif [ -f "database/init-data.sql" ]; then
    DATA_FILE="database/init-data.sql"
    print_info "Using initial data: $DATA_FILE"
fi

if [ -n "$DATA_FILE" ]; then
    # Check if database already has data
    RECORD_COUNT=$(PGPASSWORD=postgres psql -U postgres -h localhost -d prd -t -c "SELECT COUNT(*) FROM generated_domains;" 2>/dev/null | tr -d ' ')
    
    if [ -z "$RECORD_COUNT" ] || [ "$RECORD_COUNT" -eq 0 ]; then
        print_info "Restoring data..."
        PGPASSWORD=postgres psql -U postgres -h localhost -d prd -f "$DATA_FILE" 2>/dev/null || print_info "Data restore failed"
        print_success "Data restored"
    else
        print_info "Database already has $RECORD_COUNT records, skipping data restore"
    fi
else
    print_info "No data file found (backup_data.sql or init-data.sql), skipping data restore"
fi

echo ""

# ==========================================
# 7. Setup Environment Files
# ==========================================
print_info "Step 7: Setting up environment files..."

# Create .env if not exists
if [ ! -f ".env" ]; then
    print_info "Creating .env file..."
    cat > .env << 'EOF'
# Environment
NODE_ENV=production

# API Configuration
FRONTEND_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=
BACKEND_URL=http://localhost:8000
BACKEND_LOG_URL=http://localhost:8000/api/crawler/log

# Database Configuration
DB_URL=postgresql://postgres:postgres@localhost:5432/prd
DB_HOST=localhost
DB_PORT=5432
DB_NAME=prd
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Secret (SHA256 of 'prd-analyst-secret-key-2025-native-deployment')
# ini jwt secret development, kalau production ganti dengan generate baru
JWT_SECRET_KEY=e153b6639ec7155f5c74ed3acb6fe285195d25db407b20210594d700b69ab3c0

# Service API Configuration
SERVICE_API_URL=http://localhost:5000

# Internal Service Configuration
SCRAPE_SERVICE_HOST=localhost
SCRAPE_SERVICE_PORT=7000

REASONING_SERVICE_HOST=localhost
REASONING_SERVICE_PORT=8001
REASONING_SERVICE_URL=http://localhost:8001/v1

CHAT_SERVICE_HOST=localhost
CHAT_SERVICE_PORT=8002
CHAT_SERVICE_URL=http://localhost:8002

OBJ_DETECTION_SERVICE_HOST=localhost
OBJ_DETECTION_SERVICE_PORT=9090
OBJ_DETECTION_URL=http://localhost:9090/predict

# External/Integration Configuration
SCRAPER_API_URL=http://localhost:7000/api/scrape
VLLM_MODEL_NAME=aitfindonesia/KomdigiUB-8B-Instruct-PRD3
EOF
    print_success ".env file created"
else
    print_info ".env file already exists"
fi

echo ""

# ==========================================
# 8. Install Frontend Dependencies
# ==========================================
print_info "Step 8: Installing frontend dependencies..."

cd frontend
npm install
cd ..

print_success "Frontend dependencies installed"
echo ""

# ==========================================
# 9. Make Scripts Executable
# ==========================================
print_info "Step 9: Making startup scripts executable..."

chmod +x start-*.sh stop-all.sh 2>/dev/null || true

print_success "Scripts are executable"
echo ""

# ==========================================
# Setup Complete
# ==========================================
echo "=========================================="
print_success "Setup completed successfully!"
echo "=========================================="
echo ""
echo -e "${YELLOW}IMPORTANT: Run this command first to enable conda:${NC}"
echo -e "${GREEN}   source ~/.bashrc${NC}"
echo ""
echo "   Or open a new terminal window."
echo ""
echo "Next steps:"
echo ""
echo "1. Reload shell configuration:"
echo "   source ~/.bashrc"
echo ""
echo "2. Start all services:"
echo "   ./start-all.sh"
echo ""
echo "3. Or start services individually:"
echo "   ./start-integrasi-service.sh  # Port 7000"
echo "   ./start-backend.sh            # Port 8000"
echo "   ./start-frontend.sh           # Port 3000"
echo ""
echo "4. Access the application:"
echo "   Public:    http://<public-ip>   (via Nginx)"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8000"
echo "   API Docs:  http://localhost:8000/docs"
echo ""
echo "5. Stop all services:"
echo "   ./stop-all.sh"
echo ""
echo "For more information, see docs/NATIVE-DEPLOYMENT.md"
echo ""
