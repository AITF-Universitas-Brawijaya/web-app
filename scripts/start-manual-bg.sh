#!/bin/bash

# Start services in background (manual mode for non-systemd environments)

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

PROJECT_DIR=$(dirname "$(dirname "$(readlink -f "$0")")")
LOG_DIR="/var/log/prd-analyst"
PID_DIR="$PROJECT_DIR/pids"

# Ensure log directory exists and is writable
if [ ! -d "$LOG_DIR" ]; then
    print_warning "Log directory $LOG_DIR does not exist or is not writable."
    LOG_DIR="$PROJECT_DIR/logs"
    mkdir -p "$LOG_DIR"
    print_info "Using local log directory: $LOG_DIR"
fi

# Create symlink to logs in project directory for convenience
if [ "$LOG_DIR" != "$PROJECT_DIR/logs" ]; then
    ln -sfn "$LOG_DIR" "$PROJECT_DIR/logs"
    print_info "Created symlink: logs -> $LOG_DIR"
fi

mkdir -p "$PID_DIR"

# Detect Conda
CONDA_BASE=""
if [ -d "/home/$USER/miniconda3" ]; then
    CONDA_BASE="/home/$USER/miniconda3"
elif [ -d "/home/$USER/anaconda3" ]; then
    CONDA_BASE="/home/$USER/anaconda3"
elif [ -d "/opt/conda" ]; then
    CONDA_BASE="/opt/conda"
fi

if [ -z "$CONDA_BASE" ]; then
    print_error "Conda not found. Please set CONDA_BASE manually."
    exit 1
fi

PYTHON_EXEC="$CONDA_BASE/envs/prd6/bin/python"

print_info "Starting services in background..."

# 1. Start PostgreSQL
print_info "Starting PostgreSQL..."
if command -v service &> /dev/null; then
    sudo service postgresql start
else
    print_warning "Could not start PostgreSQL automatically. Please ensure it is running."
fi

# 2. Start Backend
print_info "Starting Backend..."
cd "$PROJECT_DIR/backend"
nohup $PYTHON_EXEC -m uvicorn main:app --host 0.0.0.0 --port 8000 > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$PID_DIR/backend.pid"
print_info "Backend started (PID: $BACKEND_PID). Logs: $LOG_DIR/backend.log"

# 3. Start Frontend
print_info "Starting Frontend..."
cd "$PROJECT_DIR/frontend"
nohup pnpm start > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$PID_DIR/frontend.pid"
print_info "Frontend started (PID: $FRONTEND_PID). Logs: $LOG_DIR/frontend.log"

echo ""
print_info "All services started in background!"
echo "To stop services, run: bash scripts/stop-manual.sh"
