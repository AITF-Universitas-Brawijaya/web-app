#!/bin/bash

# PRD Analyst Dashboard - Initial Deployment Script
# This script sets up PM2 and Nginx for production deployment in RunPod container

set -e  # Exit on error

echo "========================================="
echo "PRD Analyst Dashboard - Deployment Setup"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Project directory
PROJECT_DIR="/home/ubuntu/tim6_prd_workdir"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"

# ========================================
# 1. Check Prerequisites
# ========================================

echo "[INFO] Checking prerequisites..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}[ERROR] PM2 is not installed.${NC}"
    echo "Please install PM2 globally:"
    echo "  npm install -g pm2"
    exit 1
fi
echo -e "${GREEN}[OK] PM2 is installed${NC}"

# Check if Nginx is installed
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}[ERROR] Nginx is not installed.${NC}"
    echo "Please install Nginx:"
    echo "  sudo apt update"
    echo "  sudo apt install nginx -y"
    exit 1
fi
echo -e "${GREEN}[OK] Nginx is installed${NC}"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}[WARNING] PostgreSQL client not found${NC}"
else
    echo -e "${GREEN}[OK] PostgreSQL is installed${NC}"
fi

# ========================================
# 2. Start PostgreSQL
# ========================================

echo "[INFO] Starting PostgreSQL..."
if sudo service postgresql status &> /dev/null; then
    echo -e "${GREEN}[OK] PostgreSQL is already running${NC}"
else
    sudo service postgresql start
    sleep 2
    if sudo service postgresql status &> /dev/null; then
        echo -e "${GREEN}[OK] PostgreSQL started successfully${NC}"
    else
        echo -e "${RED}[ERROR] Failed to start PostgreSQL${NC}"
        exit 1
    fi
fi

# Verify PostgreSQL is listening
if ss -tlnp 2>/dev/null | grep -q ":5432"; then
    echo -e "${GREEN}[OK] PostgreSQL is listening on port 5432${NC}"
else
    echo -e "${RED}[ERROR] PostgreSQL is not listening on port 5432${NC}"
    exit 1
fi

# ========================================
# 3. Check Environment Variables
# ========================================

echo "[INFO] Checking environment variables..."

# Check backend .env
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${YELLOW}[WARNING] Backend .env file not found${NC}"
    echo "[INFO] Creating backend .env file..."
    cat > "$BACKEND_DIR/.env" << 'EOF'
FRONTEND_URL=http://localhost:3000
DB_URL=postgresql://postgres@localhost:5432/prd
EOF
    echo -e "${GREEN}[OK] Backend .env created${NC}"
else
    echo -e "${GREEN}[OK] Backend .env exists${NC}"
    # Verify DB_URL exists
    if ! grep -q "DB_URL" "$BACKEND_DIR/.env"; then
        echo -e "${YELLOW}[WARNING] DB_URL not found in .env${NC}"
        echo "DB_URL=postgresql://postgres@localhost:5432/prd" >> "$BACKEND_DIR/.env"
        echo -e "${GREEN}[OK] DB_URL added to .env${NC}"
    fi
fi

# Check frontend .env.local
if [ ! -f "$FRONTEND_DIR/.env.local" ]; then
    echo -e "${YELLOW}[WARNING] Frontend .env.local file not found${NC}"
    echo "[INFO] Creating frontend .env.local file..."
    cat > "$FRONTEND_DIR/.env.local" << 'EOF'
NEXT_PUBLIC_API_URL=
EOF
    echo -e "${GREEN}[OK] Frontend .env.local created${NC}"
else
    echo -e "${GREEN}[OK] Frontend .env.local exists${NC}"
fi

# ========================================
# 4. Activate Conda Environment
# ========================================

echo "[INFO] Activating conda environment..."
if [ -f "/home/ubuntu/miniconda3/etc/profile.d/conda.sh" ]; then
    source /home/ubuntu/miniconda3/etc/profile.d/conda.sh
    conda activate prd6 || {
        echo -e "${RED}[ERROR] Failed to activate conda environment 'prd6'${NC}"
        exit 1
    }
    echo -e "${GREEN}[OK] Conda environment 'prd6' activated${NC}"
else
    echo -e "${YELLOW}[WARNING] Conda not found, skipping...${NC}"
fi

# ========================================
# 5. Create Directories
# ========================================

echo "[INFO] Creating necessary directories..."
mkdir -p "$PROJECT_DIR/logs"
mkdir -p "$PROJECT_DIR/nginx/client_temp"
mkdir -p "$PROJECT_DIR/nginx/proxy_temp"
mkdir -p "$PROJECT_DIR/nginx/fastcgi_temp"
mkdir -p "$PROJECT_DIR/nginx/uwsgi_temp"
mkdir -p "$PROJECT_DIR/nginx/scgi_temp"
echo -e "${GREEN}[OK] Directories created${NC}"

# ========================================
# 6. Build Next.js Application
# ========================================

echo "[INFO] Building Next.js application..."
cd "$FRONTEND_DIR"

if [ -f "pnpm-lock.yaml" ]; then
    echo "[INFO] Using pnpm..."
    pnpm install
    pnpm run build
elif [ -f "package-lock.json" ]; then
    echo "[INFO] Using npm..."
    npm install
    npm run build
else
    echo "[INFO] Using npm (no lockfile found)..."
    npm install
    npm run build
fi

echo -e "${GREEN}[OK] Application built successfully${NC}"

# ========================================
# 7. Configure and Start Nginx
# ========================================

echo "[INFO] Configuring Nginx..."

# Test Nginx configuration if config file exists
if [ -f "$PROJECT_DIR/nginx.conf" ]; then
    nginx -t -c "$PROJECT_DIR/nginx.conf"
    echo -e "${GREEN}[OK] Nginx configuration is valid${NC}"
    
    # Start Nginx
    echo "[INFO] Starting Nginx on port 80..."
    sudo pkill nginx 2>/dev/null || true
    sleep 1
    sudo nginx -c "$PROJECT_DIR/nginx.conf"
    echo -e "${GREEN}[OK] Nginx started on port 80${NC}"
else
    echo -e "${YELLOW}[WARNING] nginx.conf not found, skipping Nginx setup${NC}"
fi

# ========================================
# 8. Start Application with PM2
# ========================================

echo "[INFO] Starting application with PM2..."
cd "$PROJECT_DIR"

# Stop existing PM2 processes
pm2 delete prd-analyst-frontend 2>/dev/null || true
pm2 delete prd-analyst-backend 2>/dev/null || true

# Start with ecosystem file
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

echo -e "${GREEN}[OK] Application started with PM2${NC}"

# # Setup PM2 startup (if systemd is available)
# if command -v systemctl &> /dev/null; then
#     echo "[INFO] Setting up PM2 startup script..."
#     STARTUP_CMD=$(pm2 startup systemd -u $USER --hp $HOME | grep "sudo")
#     if [ ! -z "$STARTUP_CMD" ]; then
#         echo -e "${YELLOW}[NOTE] To enable PM2 on system startup, run:${NC}"
#         echo "$STARTUP_CMD"
#     fi
# fi

# ========================================
# 9. Verify Deployment
# ========================================

echo ""
echo "========================================="
echo "Deployment Status"
echo "========================================="
pm2 status
echo ""

echo "[INFO] Verifying deployment..."
sleep 3

# Check PostgreSQL
if ss -tlnp 2>/dev/null | grep -q ":5432"; then
    echo -e "${GREEN}[OK] PostgreSQL is listening on port 5432${NC}"
else
    echo -e "${RED}[WARNING] PostgreSQL is not listening on port 5432${NC}"
fi

# Check backend
if ss -tlnp 2>/dev/null | grep -q ":8000"; then
    echo -e "${GREEN}[OK] Backend is listening on port 8000${NC}"
else
    echo -e "${RED}[WARNING] Backend is not listening on port 8000${NC}"
fi

# Check frontend
if ss -tlnp 2>/dev/null | grep -q ":3000"; then
    echo -e "${GREEN}[OK] Frontend is listening on port 3000${NC}"
else
    echo -e "${RED}[WARNING] Frontend is not listening on port 3000${NC}"
fi

# Check Nginx
if ss -tlnp 2>/dev/null | grep -q ":80"; then
    echo -e "${GREEN}[OK] Nginx is listening on port 80${NC}"
else
    echo -e "${YELLOW}[WARNING] Nginx is not listening on port 80${NC}"
fi

# Test backend API
echo "[INFO] Testing backend API..."
sleep 2
if curl -s http://localhost:8000/api/data/ | grep -q "id"; then
    echo -e "${GREEN}[OK] Backend API is responding${NC}"
else
    echo -e "${YELLOW}[WARNING] Backend API test failed${NC}"
fi

# Test frontend
echo "[INFO] Testing frontend..."
if curl -s http://localhost:3000 | grep -q "PRD Analyst"; then
    echo -e "${GREEN}[OK] Frontend is responding${NC}"
else
    echo -e "${YELLOW}[WARNING] Frontend test failed${NC}"
fi

# ========================================
# 10. Display Summary
# ========================================

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Services Status:"
echo "  - PostgreSQL: Running on port 5432"
echo "  - Backend:    Running on port 8000"
echo "  - Frontend:   Running on port 3000"
echo "  - Nginx:      Running on port 80"
echo ""
echo "Useful Commands:"
echo "  - View logs:        pm2 logs"
echo "  - Monitor:          pm2 monit"
echo "  - Restart backend:  pm2 restart prd-analyst-backend"
echo "  - Restart frontend: pm2 restart prd-analyst-frontend"
echo "  - Stop all:         pm2 stop all"
echo ""
echo "Access your application:"
echo "  - Via RunPod proxy (recommended)"
echo "  - Direct: http://localhost"
echo ""

