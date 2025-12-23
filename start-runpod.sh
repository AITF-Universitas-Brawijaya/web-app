#!/bin/bash

# Start all services for RunPod
echo "Starting PRD Analyst on RunPod..."

# Source conda
eval "$($HOME/miniconda3/bin/conda shell.bash hook)"

# Start PostgreSQL if not running
if ! pgrep -x postgres > /dev/null; then
    echo "Starting PostgreSQL..."
    sudo su - postgres -c "/usr/lib/postgresql/*/bin/pg_ctl -D /workspace/postgresql/data -l /workspace/postgresql/logfile start"
    sleep 3
fi

# Start services
echo "Starting services..."
./start-integrasi-service.sh &
sleep 2
./start-backend.sh &
sleep 2
./start-frontend.sh &

echo ""
echo "✓ All services started!"
echo ""
echo "Access your application at:"
if [ -n "$RUNPOD_POD_ID" ]; then
    echo "  https://${RUNPOD_POD_ID}-3000.proxy.runpod.net"
else
    echo "  http://localhost:3000"
fi
echo ""
echo "To stop all services, run: ./stop-all.sh"
