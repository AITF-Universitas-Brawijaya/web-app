#!/bin/bash
# Stop all services

echo "========================================="
echo "Stopping All Services"
echo "========================================="

echo "→ Stopping Frontend..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "  Frontend not running"

echo "→ Stopping Backend..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || echo "  Backend not running"

echo "→ Stopping Integrasi Service..."
lsof -ti:7000 | xargs kill -9 2>/dev/null || echo "  Integrasi Service not running"

# Also kill by process name
pkill -f "next dev" 2>/dev/null || true
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "python main_api.py" 2>/dev/null || true

echo "→ Stopping Backup Service..."
pkill -f "backup_db.sh" 2>/dev/null || echo "  Backup Service not running"

echo ""
echo "✓ All services stopped"
echo ""
