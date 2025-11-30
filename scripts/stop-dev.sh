#!/bin/bash

# Script untuk menghentikan aplikasi PRD Analyst Dashboard

# Color definitions
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}[INFO]${NC} Stopping PRD Analyst Dashboard..."

# Kill frontend (port 3000)
echo -e "${BLUE}[INFO]${NC} Stopping frontend..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
pkill -f "next-server" 2>/dev/null
pkill -f "pnpm start" 2>/dev/null
pkill -f "pnpm run dev" 2>/dev/null

# Kill backend (port 8000)
echo -e "${BLUE}[INFO]${NC} Stopping backend..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
pkill -f "uvicorn main:app" 2>/dev/null

sleep 1

# Verify
FRONTEND_RUNNING=$(lsof -ti:3000 2>/dev/null)
BACKEND_RUNNING=$(lsof -ti:8000 2>/dev/null)

if [ -z "$FRONTEND_RUNNING" ] && [ -z "$BACKEND_RUNNING" ]; then
    echo -e "${GREEN}[SUCCESS]${NC} All processes stopped successfully!"
else
    echo -e "${YELLOW}[WARNING]${NC} Some processes may still be running:"
    [ ! -z "$FRONTEND_RUNNING" ] && echo "   Frontend (port 3000): $FRONTEND_RUNNING"
    [ ! -z "$BACKEND_RUNNING" ] && echo "   Backend (port 8000): $BACKEND_RUNNING"
fi

echo ""
