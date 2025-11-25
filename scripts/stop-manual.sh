#!/bin/bash

# Stop manual background services

GREEN='\033[0;32m'
NC='\033[0m'

print_info() { echo -e "${GREEN}[INFO]${NC} $1"; }

PROJECT_DIR=$(dirname "$(dirname "$(readlink -f "$0")")")
PID_DIR="$PROJECT_DIR/pids"

print_info "Stopping services..."

# Stop Backend
if [ -f "$PID_DIR/backend.pid" ]; then
    PID=$(cat "$PID_DIR/backend.pid")
    if ps -p $PID > /dev/null; then
        kill $PID
        print_info "Backend stopped (PID: $PID)"
    else
        print_info "Backend process $PID not found"
    fi
    rm "$PID_DIR/backend.pid"
else
    print_info "Backend PID file not found"
fi

# Stop Frontend
if [ -f "$PID_DIR/frontend.pid" ]; then
    PID=$(cat "$PID_DIR/frontend.pid")
    if ps -p $PID > /dev/null; then
        kill $PID
        print_info "Frontend stopped (PID: $PID)"
    else
        print_info "Frontend process $PID not found"
    fi
    rm "$PID_DIR/frontend.pid"
else
    print_info "Frontend PID file not found"
fi

print_info "Services stopped."
