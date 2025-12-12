#!/bin/bash
# Syncs /tmp/pg_data to /home/.../postgres_data every 60s

PROJECT_DIR="/home/ubuntu/tim6_prd_workdir"
RUNTIME_DB_DIR="/tmp/pg_data"
PERSISTENT_DB_DIR="$PROJECT_DIR/postgres_data"

mkdir -p "$PERSISTENT_DB_DIR"

echo "Starting DB Sync: $RUNTIME_DB_DIR -> $PERSISTENT_DB_DIR"

while true; do
    if [ -d "$RUNTIME_DB_DIR" ]; then
        # -a: archive mode, --delete: delete extraneous files from dest dirs
        rsync -a --delete "$RUNTIME_DB_DIR/" "$PERSISTENT_DB_DIR/"
    fi
    sleep 60
done
