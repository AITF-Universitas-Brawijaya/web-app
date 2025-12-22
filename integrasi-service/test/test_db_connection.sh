#!/bin/bash
# ============================================
# Test Database Connection Script
# ============================================
# Quick script to test PostgreSQL database connection

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
else
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Database Connection Test${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${BLUE}Configuration:${NC}"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Test connection with psql
echo -e "${YELLOW}Testing connection...${NC}"
echo ""

if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Connection SUCCESSFUL!${NC}"
    echo ""
    
    # Get database info
    echo -e "${BLUE}Database Information:${NC}"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
\echo '--- PostgreSQL Version ---'
SELECT version();

\echo ''
\echo '--- Database Size ---'
SELECT pg_size_pretty(pg_database_size(current_database())) as size;

\echo ''
\echo '--- Tables in public schema ---'
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

\echo ''
\echo '--- Active Connections ---'
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE datname = current_database();
EOF
    
    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  Database is ready!${NC}"
    echo -e "${GREEN}============================================${NC}"
    exit 0
else
    echo -e "${RED}❌ Connection FAILED!${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo "  1. Check if database server is running"
    echo "  2. Verify .env configuration"
    echo "  3. Check firewall/security group settings"
    echo "  4. Verify network connectivity"
    echo ""
    echo -e "${YELLOW}Try manual connection:${NC}"
    echo "  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
    exit 1
fi
