#!/bin/bash
# Start script for Frontend (Next.js)

set -e

echo "========================================="
echo "Starting Frontend (Port 3001)"
echo "========================================="

# Navigate to frontend directory
cd "$(dirname "$0")/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "→ Installing Node.js dependencies..."
    npm install
fi

# Start the frontend in development mode
echo "→ Starting Frontend on port 3001..."
echo "→ Dashboard: http://localhost:3001"
echo "→ Backend API: http://localhost:8000"
echo ""

PORT=3001 npm run dev
