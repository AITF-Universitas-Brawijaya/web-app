#!/bin/bash

# Database credentials
DB_NAME="prd"
DB_USER="postgres"
DB_HOST="localhost"
export PGPASSWORD="postgres"

echo "Recreating database $DB_NAME..."
psql -U $DB_USER -h $DB_HOST -c "DROP DATABASE IF EXISTS $DB_NAME;"
psql -U $DB_USER -h $DB_HOST -c "CREATE DATABASE $DB_NAME;"

echo "Running schema.sql..."
psql -U $DB_USER -h $DB_HOST -d $DB_NAME -f backend/database/schema.sql

# List of migrations in a sensible order
MIGRATIONS=(
    "migration_user_auth.sql"
    "migration_object_detection.sql"
    "migration_add_is_dummy.sql"
    "migration_add_is_manual.sql"
    "migration_add_status_columns.sql"
    "migration_chat_history.sql"
    "migration_confidence_and_tracking.sql"
    "migration_feedback.sql"
    "migration_fix_image_paths.sql"
    "migration_generator_keywords.sql"
    "migration_notes_settings.sql"
    "migration_serpapi.sql"
    "migration_user_preferences.sql"
)

for migration in "${MIGRATIONS[@]}"; do
    echo "Running $migration..."
    psql -U $DB_USER -h $DB_HOST -d $DB_NAME -f "backend/database/$migration" || echo "Warning: $migration completed with errors (possibly innocuous)"
done

echo "Inserting dummy data..."
psql -U $DB_USER -h $DB_HOST -d $DB_NAME -f backend/database/insert_dummy_data.sql

echo "Database restoration complete."
