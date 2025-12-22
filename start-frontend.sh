#!/bin/bash
# Start script for Frontend (Next.js)

set -e

echo "========================================="
echo "Starting Frontend (Port 3000)"
echo "========================================="

# Navigate to frontend directory
cd "$(dirname "$0")/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "→ Installing Node.js dependencies..."
    npm install
fi

# Load environment variables
set -a
if [ -f ../.env ]; then
    source ../.env
fi
set +a

# Start the frontend in development mode
echo "→ Starting Frontend on port 3000..."
echo "→ Dashboard: http://localhost:3000"
echo "→ Backend API: http://localhost:8000"
echo ""

PORT=3000 npm run dev -- -H 0.0.0.0
