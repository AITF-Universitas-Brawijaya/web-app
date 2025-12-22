#!/bin/bash

# Start Integrasi Service (Port 7000)

echo "Starting Integrasi Service on port 7000..."

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Initialize conda
eval "$(conda shell.bash hook)" 2>/dev/null || eval "$($HOME/miniconda3/bin/conda shell.bash hook)"

# Activate conda environment
conda activate prd6

# Load environment variables
set -a
source .env 2>/dev/null || true
source integrasi-service/.env 2>/dev/null || true
set +a

# Start service
cd integrasi-service
python main_api.py
