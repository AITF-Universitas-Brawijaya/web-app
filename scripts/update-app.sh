#!/bin/bash

# PRD Analyst Dashboard - Quick Update Script
# Use this script to update the application after code changes

set -e  # Exit on error

echo "========================================="
echo "PRD Analyst Dashboard - Update"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project directory
PROJECT_DIR="/home/ubuntu/tim6_prd_workdir"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Navigate to frontend directory
cd "$FRONTEND_DIR"

# Pull latest changes if using Git
if [ -d ".git" ]; then
    echo "[INFO] Pulling latest changes from Git..."
    git pull
    echo -e "${GREEN}[OK] Git pull completed${NC}"
fi

# Install dependencies if package.json changed
echo "[INFO] Installing dependencies..."
if [ -f "pnpm-lock.yaml" ]; then
    pnpm install
elif [ -f "package-lock.json" ]; then
    npm install
else
    npm install
fi
echo -e "${GREEN}[OK] Dependencies installed${NC}"

# Build application
echo "[INFO] Building application..."
if [ -f "pnpm-lock.yaml" ]; then
    pnpm run build
else
    npm run build
fi
echo -e "${GREEN}[OK] Build completed${NC}"

# Restart PM2 application
echo "[INFO] Restarting application..."
cd "$PROJECT_DIR"
pm2 restart prd-analyst-frontend
echo -e "${GREEN}[OK] Application restarted${NC}"

# Show recent logs
echo ""
echo "========================================="
echo "Recent Logs (last 20 lines)"
echo "========================================="
pm2 logs prd-analyst-frontend --lines 20 --nostream

echo ""
echo "========================================="
echo "Update Complete!"
echo "========================================="
echo ""
echo "Application Status:"
pm2 status prd-analyst-frontend
echo ""
echo "To view live logs: pm2 logs prd-analyst-frontend"
echo "To monitor: pm2 monit"
echo ""
