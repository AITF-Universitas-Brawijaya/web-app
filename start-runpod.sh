#!/bin/bash

# PRD Analyst - RunPod Startup Script
# Optimized for RunPod environment
# Based on start-all.sh design

set -e

echo "==========================================="
echo "PRD Analyst - RunPod Startup"
echo "==========================================="
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Create logs directory
mkdir -p logs

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}➜ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${BLUE}⚠ $1${NC}"
}

# Initialize Environment
print_info "Step 1: Initializing environment..."

# Source conda
if [ -f "$HOME/miniconda3/bin/conda" ]; then
    eval "$($HOME/miniconda3/bin/conda shell.bash hook)"
    print_success "Conda initialized"
else
    print_warning "Conda binary not found at standard location"
fi

# Load environment variables
if [ -f ".env" ]; then
    set -a
    source .env 2>/dev/null || true
    set +a
    print_success "Loaded .env file"
else
    print_warning ".env file not found"
fi

# Activate conda environment
print_info "Activating conda environment 'prd6'..."
conda activate prd6
print_success "Conda environment activated"
echo ""

# ==========================================
# 2. Start PostgreSQL (RunPod Specific)
# ==========================================
print_info "Step 2: Starting PostgreSQL Database..."

# CONFLICT CHECK: Stop system PostgreSQL if running
if systemctl is-active --quiet postgresql || systemctl is-active --quiet postgresql@16-main; then
    print_warning "System PostgreSQL detected. Stopping it..."
    sudo systemctl stop postgresql
    sudo systemctl stop postgresql@16-main
    sleep 2
fi

# Check if PostgreSQL is already running
if ! pgrep -x postgres > /dev/null; then
    print_info "Starting PostgreSQL service..."
    
    PG_DATA_DIR="/workspace/postgresql/data"
    PG_LOG_FILE="/workspace/postgresql/logfile"
    
    # Ensure logs directory permissions
    sudo mkdir -p "$(dirname "$PG_LOG_FILE")"
    sudo touch "$PG_LOG_FILE"
    sudo chown postgres:postgres "$PG_LOG_FILE"

    # Start using pg_ctl
    if sudo su - postgres -c "/usr/lib/postgresql/*/bin/pg_ctl -D $PG_DATA_DIR -l $PG_LOG_FILE start"; then
        print_success "PostgreSQL start command issued"
    else
        print_error "Failed to issue start command"
        exit 1
    fi
    
    # Wait for readiness
    print_info "Waiting for PostgreSQL to be ready..."
    sleep 3
    if pgrep -x postgres > /dev/null; then
        print_success "PostgreSQL started successfully"
    else
        print_error "Failed to start PostgreSQL"
        exit 1
    fi
else
    print_success "PostgreSQL is already running"
fi

# ==========================================
# 2.5 Verify Database 'prd'
# ==========================================
PG_PSQL=$(ls /usr/lib/postgresql/*/bin/psql | tail -n 1)

if ! PGPASSWORD=postgres "$PG_PSQL" -U postgres -h localhost -lqt | cut -d \| -f 1 | grep -qw prd; then
    print_error "Database 'prd' NOT found!"
    print_info "Please run ./setup-runpod.sh to initialize the database."
    exit 1
else
    print_success "Database 'prd' verified"
fi
echo ""

# ==========================================
# 3. Start Integrasi Service
# ==========================================
print_info "Step 3: Starting Integrasi Service (port 5000)..."

cd integrasi-service
nohup python main_api.py > ../logs/integrasi-service.log 2>&1 &
INTEGRASI_PID=$!
cd ..

sleep 2
if ps -p $INTEGRASI_PID > /dev/null; then
    print_success "Integrasi Service started (PID: $INTEGRASI_PID)"
else
    print_error "Failed to start Integrasi Service. Check logs/integrasi-service.log"
    exit 1
fi
echo ""

# ==========================================
# 4. Start Backend Service
# ==========================================
print_info "Step 4: Starting Backend Service (port 8000)..."

cd backend
nohup python -m uvicorn main:app --host 0.0.0.0 --port 8000 > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

sleep 2
if ps -p $BACKEND_PID > /dev/null; then
    print_success "Backend Service started (PID: $BACKEND_PID)"
else
    print_error "Failed to start Backend. Check logs/backend.log"
    exit 1
fi
echo ""

# ==========================================
# 5. Start Frontend
# ==========================================
print_info "Step 5: Starting Frontend (port 3000)..."

cd frontend
PORT=3000 nohup npm run dev -- -H 0.0.0.0 > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

sleep 5
if ps -p $FRONTEND_PID > /dev/null; then
    print_success "Frontend started (PID: $FRONTEND_PID)"
else
    print_error "Failed to start Frontend. Check logs/frontend.log"
    exit 1
fi
echo ""

# ==========================================
# 6. Start Backup Service
# ==========================================
print_info "Step 6: Starting Backup Service..."

chmod +x backup_db.sh
nohup ./backup_db.sh > logs/backup_db.log 2>&1 &
BACKUP_PID=$!

if ps -p $BACKUP_PID > /dev/null; then
    print_success "Backup Service started (PID: $BACKUP_PID)"
else
    print_warning "Failed to start Backup Service"
fi
echo ""

# ==========================================
# Startup Complete
# ==========================================
echo "==========================================="
print_success "All Services Started Successfully!"
echo "==========================================="
echo ""

# Determine Public URL
if [ -n "$RUNPOD_POD_ID" ]; then
    PUBLIC_URL="https://${RUNPOD_POD_ID}-3000.proxy.runpod.net"
else
    PUBLIC_URL="http://localhost:3000"
fi

echo "Services:"
echo "  • PostgreSQL:         localhost:5432"
echo "  • Integrasi Service:  http://localhost:5000 (PID: $INTEGRASI_PID)"
echo "  • Backend API:        http://0.0.0.0:8000 (PID: $BACKEND_PID)"
echo "  • Frontend:           http://0.0.0.0:3000 (PID: $FRONTEND_PID)"
echo ""
echo "Access the application:"
echo -e "  Dashboard:  ${GREEN}$PUBLIC_URL${NC}"
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
