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

# Check if PM2 is installed
echo "[INFO] Checking PM2 installation..."
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}[ERROR] PM2 is not installed.${NC}"
    echo "Please install PM2 globally:"
    echo "  npm install -g pm2"
    exit 1
fi
echo -e "${GREEN}[OK] PM2 is installed${NC}"

# Check if Nginx is installed
echo "[INFO] Checking Nginx installation..."
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}[ERROR] Nginx is not installed.${NC}"
    echo "Please install Nginx:"
    echo "  sudo apt update"
    echo "  sudo apt install nginx -y"
    exit 1
fi
echo -e "${GREEN}[OK] Nginx is installed${NC}"

# Create logs directory
echo "[INFO] Creating logs directory..."
mkdir -p "$PROJECT_DIR/logs"
echo -e "${GREEN}[OK] Logs directory created${NC}"

# Build Next.js application
echo "[INFO] Building Next.js application..."
cd "$FRONTEND_DIR"
if [ -f "package-lock.json" ]; then
    npm install
    npm run build
elif [ -f "pnpm-lock.yaml" ]; then
    pnpm install
    pnpm run build
else
    npm install
    npm run build
fi
echo -e "${GREEN}[OK] Application built successfully${NC}"

# Create Nginx directories
echo "[INFO] Creating Nginx directories..."
mkdir -p "$PROJECT_DIR/nginx/client_temp"
mkdir -p "$PROJECT_DIR/nginx/proxy_temp"
mkdir -p "$PROJECT_DIR/nginx/fastcgi_temp"
mkdir -p "$PROJECT_DIR/nginx/uwsgi_temp"
mkdir -p "$PROJECT_DIR/nginx/scgi_temp"
echo -e "${GREEN}[OK] Nginx directories created${NC}"

# Test Nginx configuration
echo "[INFO] Testing Nginx configuration..."
nginx -t -c "$PROJECT_DIR/nginx.conf"
echo -e "${GREEN}[OK] Nginx configuration is valid${NC}"

# Start Nginx on port 80 (requires sudo)
echo "[INFO] Starting Nginx on port 80..."
# Kill existing nginx processes
sudo pkill nginx 2>/dev/null || true
sleep 1
# Start nginx with custom config
sudo nginx -c "$PROJECT_DIR/nginx.conf"
echo -e "${GREEN}[OK] Nginx started on port 80${NC}"


# Start application with PM2
echo "[INFO] Starting application with PM2..."
cd "$PROJECT_DIR"

# Stop existing PM2 process if running
pm2 delete prd-analyst-dashboard 2>/dev/null || true

# Start with ecosystem file
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

echo -e "${GREEN}[OK] Application started with PM2${NC}"

# Setup PM2 startup (if systemd is available)
if command -v systemctl &> /dev/null; then
    echo "[INFO] Setting up PM2 startup script..."
    pm2 startup systemd -u $USER --hp $HOME
    echo -e "${YELLOW}[NOTE] Please run the command above if it was generated${NC}"
fi

# Display status
echo ""
echo "========================================="
echo "Deployment Status"
echo "========================================="
pm2 status
echo ""

# Check if services are running
echo "[INFO] Verifying deployment..."
sleep 2

# Check if port 3000 is listening
if ss -tlnp 2>/dev/null | grep -q ":3000"; then
    echo -e "${GREEN}[OK] Next.js is listening on port 3000${NC}"
else
    echo -e "${RED}[WARNING] Port 3000 is not listening${NC}"
fi

# Check if port 80 is listening
if ss -tlnp 2>/dev/null | grep -q ":80"; then
    echo -e "${GREEN}[OK] Nginx is listening on port 80${NC}"
else
    echo -e "${RED}[WARNING] Port 80 is not listening${NC}"
fi

# Test local access
echo "[INFO] Testing local access..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200"; then
    echo -e "${GREEN}[OK] Application is accessible via http://localhost${NC}"
else
    echo -e "${YELLOW}[WARNING] Could not verify local access${NC}"
fi

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Check PM2 logs: pm2 logs prd-analyst-dashboard"
echo "2. Monitor status: pm2 monit"
echo "3. Access your app via RunPod proxy URL"
echo ""
echo "For updates, use: ./update-app.sh"
echo ""
