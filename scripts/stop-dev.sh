#!/bin/bash

# Script untuk menghentikan aplikasi PRD Analyst Dashboard

# Color definitions
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}[INFO]${NC} Stopping PRD Analyst Dashboard..."

# Kill frontend (both dev and prod ports)
echo -e "${BLUE}[INFO]${NC} Stopping frontend..."
lsof -ti:3000 | xargs kill -9 2>/dev/null  # Production port
lsof -ti:3001 | xargs kill -9 2>/dev/null  # Development port
pkill -f "next-server" 2>/dev/null
pkill -f "pnpm start" 2>/dev/null
pkill -f "pnpm run dev" 2>/dev/null

# Kill backend (both dev and prod ports)
echo -e "${BLUE}[INFO]${NC} Stopping backend..."
lsof -ti:8000 | xargs kill -9 2>/dev/null  # Production port
lsof -ti:8001 | xargs kill -9 2>/dev/null  # Development port
pkill -f "uvicorn main:app" 2>/dev/null

sleep 1

# Verify
FRONTEND_DEV=$(lsof -ti:3001 2>/dev/null)
BACKEND_DEV=$(lsof -ti:8001 2>/dev/null)

if [ -z "$FRONTEND_DEV" ] && [ -z "$BACKEND_DEV" ]; then
    echo -e "${GREEN}[SUCCESS]${NC} All processes stopped successfully!"
else
    echo -e "${YELLOW}[WARNING]${NC} Some processes may still be running:"
    [ ! -z "$FRONTEND_DEV" ] && echo "   Frontend dev (port 3001): $FRONTEND_DEV"
    [ ! -z "$BACKEND_DEV" ] && echo "   Backend dev (port 8001): $BACKEND_DEV"
fi

echo ""
