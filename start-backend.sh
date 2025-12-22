#!/bin/bash

# Start Backend API (Port 8000)

echo "Starting Backend API on port 8000..."

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
set +a

# Start backend
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
