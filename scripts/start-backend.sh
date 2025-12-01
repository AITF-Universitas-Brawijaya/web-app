#!/bin/bash
# Wrapper script to run backend with uvicorn using conda environment prd6

# Activate conda environment
source /home/ubuntu/miniconda3/etc/profile.d/conda.sh
conda activate prd6

# Run uvicorn
cd /home/ubuntu/tim6_prd_workdir/backend
exec uvicorn main:app --host 0.0.0.0 --port 8000
