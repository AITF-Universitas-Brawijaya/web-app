#!/bin/bash

# Start All Services
# Starts PostgreSQL, Integrasi Service, Backend, and Frontend

set -e

echo "=========================================="
echo "Starting All Services"
echo "=========================================="
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Create logs directory
mkdir -p logs

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}➜ $1${NC}"
}

# Initialize conda
eval "$(conda shell.bash hook)" 2>/dev/null || eval "$($HOME/miniconda3/bin/conda shell.bash hook)"

# Activate conda environment
print_info "Activating conda environment 'prd6'..."
conda activate prd6
print_success "Conda environment activated"
echo ""

# 1. Check PostgreSQL
print_info "Checking PostgreSQL..."
if ! sudo systemctl is-active --quiet postgresql; then
    print_info "Starting PostgreSQL..."
    sudo systemctl start postgresql
fi
print_success "PostgreSQL is running"
echo ""

# 2. Start Integrasi Service (Port 7000)
print_info "Starting Integrasi Service (port 7000)..."
set -a
source .env 2>/dev/null || true
source integrasi-service/.env 2>/dev/null || true
set +a

cd integrasi-service
nohup python main_api.py > ../logs/integrasi-service.log 2>&1 &
INTEGRASI_PID=$!
cd ..

sleep 3
if ps -p $INTEGRASI_PID > /dev/null; then
    print_success "Integrasi Service started (PID: $INTEGRASI_PID)"
else
    echo "Failed to start Integrasi Service. Check logs/integrasi-service.log"
    exit 1
fi
echo ""

# 3. Start Backend (Port 8000)
print_info "Starting Backend API (port 8000)..."
cd backend
nohup python -m uvicorn main:app --host 0.0.0.0 --port 8000 > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

sleep 3
if ps -p $BACKEND_PID > /dev/null; then
    print_success "Backend API started (PID: $BACKEND_PID)"
else
    echo "Failed to start Backend. Check logs/backend.log"
    exit 1
fi
echo ""

# 4. Start Frontend (Port 3001)
print_info "Starting Frontend (port 3001)..."
cd frontend
PORT=3001 nohup npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

sleep 5
if ps -p $FRONTEND_PID > /dev/null; then
    print_success "Frontend started (PID: $FRONTEND_PID)"
else
    echo "Failed to start Frontend. Check logs/frontend.log"
    exit 1
fi
echo ""

# 5. Start Backup Service
print_info "Starting Backup Service..."
nohup ./backup_db.sh > logs/backup_db.log 2>&1 &
BACKUP_PID=$!
print_success "Backup Service started (PID: $BACKUP_PID)"
echo ""

# Summary
echo "=========================================="
print_success "All Services Started Successfully!"
echo "=========================================="
echo ""
echo "Services:"
echo "  • PostgreSQL:         localhost:5432"
echo "  • Integrasi Service:  http://localhost:7000"
echo "  • Backend API:        http://localhost:8000"
echo "  • Frontend:           http://localhost:3001"
echo ""
echo "Access the application:"
echo "  Dashboard:  http://localhost:3001"
echo "  API Docs:   http://localhost:8000/docs"
echo ""
echo "View logs:"
echo "  tail -f logs/integrasi-service.log"
echo "  tail -f logs/backend.log"
echo "  tail -f logs/frontend.log"
echo ""
echo "Stop all services:"
echo "  ./stop-all.sh"
echo ""
