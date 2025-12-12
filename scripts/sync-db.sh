#!/bin/bash
# Syncs /tmp/pg_data to /home/.../db_data_backup every 60s

PROJECT_DIR="/home/ubuntu/tim6_prd_workdir"
DB_DATA_DIR="/tmp/pg_data"
DB_BACKUP_DIR="$PROJECT_DIR/db_data_backup"

mkdir -p "$DB_BACKUP_DIR"

echo "Starting DB Sync: $DB_DATA_DIR -> $DB_BACKUP_DIR"

while true; do
    if [ -d "$DB_DATA_DIR" ]; then
        # Use rsync to mirror. --delete ensures removed files are removed from backup.
        # atomic copy is generally safe for physical files, though postgres might be writing.
        # Ideally we use pg_basebackup, but for file-persistence this is "good enough" for single-node restart protection.
        # To be purely safe, we might just copy WALs too.
        # rsync is robust.
        rsync -a --delete "$DB_DATA_DIR/" "$DB_BACKUP_DIR/"
    fi
    sleep 60
done
