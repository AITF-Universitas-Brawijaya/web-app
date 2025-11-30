#!/bin/bash

# Script untuk menjalankan aplikasi PRD Analyst Dashboard
# Usage: ./start-dev.sh [dev|prod]

# Color definitions
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

MODE=${1:-dev}
FRONTEND_DIR="/home/ubuntu/tim6_prd_workdir/frontend"
BACKEND_DIR="/home/ubuntu/tim6_prd_workdir/backend"

echo -e "${BLUE}[INFO]${NC} Starting PRD Analyst Dashboard in $MODE mode..."

# Activate conda environment prd6 first
echo -e "${BLUE}[INFO]${NC} Activating conda environment prd6..."
source /home/ubuntu/miniconda3/etc/profile.d/conda.sh
conda activate prd6 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}[SUCCESS]${NC} Conda environment prd6 activated"
else
    echo -e "${YELLOW}[WARNING]${NC} Failed to activate prd6, trying base environment..."
    conda activate base
fi

# Function to kill processes on port
kill_port() {
    local port=$1
    echo -e "${BLUE}[INFO]${NC} Checking port $port..."
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}[WARNING]${NC} Port $port is in use by PID $pid. Killing process..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Kill existing processes
echo -e "${BLUE}[INFO]${NC} Cleaning up existing processes..."
kill_port 3000  # Frontend
kill_port 8000  # Backend

# Start backend
echo -e "${BLUE}[INFO]${NC} Starting backend..."
cd "$BACKEND_DIR"
uvicorn main:app --reload --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}[SUCCESS]${NC} Backend started (PID: $BACKEND_PID)"

# Wait for backend to be ready
echo -e "${BLUE}[INFO]${NC} Waiting for backend to be ready..."
for i in {1..10}; do
    if curl -s http://localhost:8000/ > /dev/null 2>&1; then
        echo -e "${GREEN}[SUCCESS]${NC} Backend is ready"
        break
    fi
    sleep 1
done

# Start frontend
echo -e "${BLUE}[INFO]${NC} Starting frontend..."
cd "$FRONTEND_DIR"

if [ "$MODE" = "prod" ]; then
    echo -e "${BLUE}[INFO]${NC} Building frontend for production..."
    pnpm build
    echo -e "${BLUE}[INFO]${NC} Starting production server..."
    pnpm start > /tmp/frontend.log 2>&1 &
else
    echo -e "${BLUE}[INFO]${NC} Starting development server..."
    pnpm run dev > /tmp/frontend.log 2>&1 &
fi

FRONTEND_PID=$!
echo -e "${GREEN}[SUCCESS]${NC} Frontend started (PID: $FRONTEND_PID)"

# Wait for frontend to be ready
echo -e "${BLUE}[INFO]${NC} Waiting for frontend to be ready..."
for i in {1..15}; do
    if curl -s http://localhost:3000/ > /dev/null 2>&1; then
        echo -e "${GREEN}[SUCCESS]${NC} Frontend is ready"
        break
    fi
    sleep 1
done

echo -e "${GREEN}[SUCCESS]${NC} Application is running"
echo ""

echo "=========================================="
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:8000"
echo "=========================================="
echo ""
echo "Process IDs:"
echo "   Frontend: $FRONTEND_PID"
echo "   Backend:  $BACKEND_PID"
echo ""
echo "Logs:"
echo "   Frontend: tail -f /tmp/frontend.log"
echo "   Backend:  tail -f /tmp/backend.log"
echo ""
echo "To stop all processes: ./stop-dev.sh"
echo ""
