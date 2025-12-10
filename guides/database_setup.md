# Database Setup Guide

## PostgreSQL Installation

### Automated (via setup.sh)

The setup script automatically installs PostgreSQL 14 in `/home/ubuntu/postgresql`.

### Manual Installation

```bash
# Install PostgreSQL locally (without sudo)
cd /home/ubuntu
wget https://ftp.postgresql.org/pub/source/v14.0/postgresql-14.0.tar.gz
tar -xzf postgresql-14.0.tar.gz
cd postgresql-14.0

# Configure and install
./configure --prefix=/home/ubuntu/postgresql
make
make install

# Initialize database
/home/ubuntu/postgresql/bin/initdb -D /home/ubuntu/postgresql/data

# Start PostgreSQL
/home/ubuntu/postgresql/bin/pg_ctl -D /home/ubuntu/postgresql/data -l logfile start

# Create database
/home/ubuntu/postgresql/bin/createdb prd
```

## Database Schema Setup

### Import Schema

```bash
# Import schema
cd /home/ubuntu/tim6_prd_workdir
/home/ubuntu/postgresql/bin/psql -d prd -f backend/database/schema.sql
```

### Verify Schema

```bash
# Connect to database
/home/ubuntu/postgresql/bin/psql -d prd

# List tables
\dt

# Check specific table
\d domains

# Exit
\q
```

## Database Management

### Start PostgreSQL

```bash
/home/ubuntu/postgresql/bin/pg_ctl -D /home/ubuntu/postgresql/data -l logfile start
```

### Stop PostgreSQL

```bash
/home/ubuntu/postgresql/bin/pg_ctl -D /home/ubuntu/postgresql/data stop
```

### Check Status

```bash
/home/ubuntu/postgresql/bin/pg_ctl -D /home/ubuntu/postgresql/data status
```

### Restart PostgreSQL

```bash
/home/ubuntu/postgresql/bin/pg_ctl -D /home/ubuntu/postgresql/data restart
```

## Database Access

### Connect to Database

```bash
# Connect as default user
/home/ubuntu/postgresql/bin/psql -d prd

# Connect with specific user
/home/ubuntu/postgresql/bin/psql -U postgres -d prd
```

### Common psql Commands

```sql
-- List all databases
\l

-- List all tables
\dt

-- Describe table structure
\d table_name

-- List all schemas
\dn

-- List all users
\du

-- Show current database
SELECT current_database();

-- Show current user
SELECT current_user;

-- Exit psql
\q
```

## Database Operations

### Backup Database

```bash
# Backup entire database
/home/ubuntu/postgresql/bin/pg_dump prd > backup_$(date +%Y%m%d).sql

# Backup specific table
/home/ubuntu/postgresql/bin/pg_dump -t domains prd > domains_backup.sql

# Backup with compression
/home/ubuntu/postgresql/bin/pg_dump prd | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restore Database

```bash
# Restore from backup
/home/ubuntu/postgresql/bin/psql -d prd < backup.sql

# Restore compressed backup
gunzip -c backup.sql.gz | /home/ubuntu/postgresql/bin/psql -d prd
```

### Clear Data

```bash
# Clear specific table
/home/ubuntu/postgresql/bin/psql -d prd -c "TRUNCATE TABLE domains CASCADE;"

# Drop and recreate database
/home/ubuntu/postgresql/bin/dropdb prd
/home/ubuntu/postgresql/bin/createdb prd
/home/ubuntu/postgresql/bin/psql -d prd -f backend/database/schema.sql
```

## Environment Configuration

### Backend .env

Ensure backend `.env` file has correct database connection:

```bash
# Database Configuration
DATABASE_URL=postgresql://postgres@localhost/prd
DB_HOST=localhost
DB_PORT=5432
DB_NAME=prd
DB_USER=postgres
DB_PASSWORD=
```

### Test Database Connection

```bash
# From backend directory
conda activate prd6
cd backend
python -c "from db import engine; print('Database connection OK')"
```

## Troubleshooting

### Issue: PostgreSQL won't start

```bash
# Check if already running
ps aux | grep postgres

# Check logs
cat /home/ubuntu/postgresql/data/logfile

# Check port
ss -tlnp | grep 5432

# Try starting manually
/home/ubuntu/postgresql/bin/pg_ctl -D /home/ubuntu/postgresql/data -l logfile start
```

### Issue: Permission denied

```bash
# Fix ownership
sudo chown -R ubuntu:ubuntu /home/ubuntu/postgresql
```

### Issue: Database doesn't exist

```bash
# List databases
/home/ubuntu/postgresql/bin/psql -l

# Create database
/home/ubuntu/postgresql/bin/createdb prd

# Import schema
/home/ubuntu/postgresql/bin/psql -d prd -f backend/database/schema.sql
```

### Issue: Connection refused

```bash
# Check if PostgreSQL is running
/home/ubuntu/postgresql/bin/pg_ctl -D /home/ubuntu/postgresql/data status

# Check postgresql.conf
cat /home/ubuntu/postgresql/data/postgresql.conf | grep listen_addresses

# Should be: listen_addresses = 'localhost'
```

### Issue: Schema import fails

```bash
# Check schema file exists
ls -lh backend/database/schema.sql

# Try importing with verbose output
/home/ubuntu/postgresql/bin/psql -d prd -f backend/database/schema.sql -v ON_ERROR_STOP=1
```

## Database Schema

The PRD database includes the following main tables:

- `domains` - Crawled domain information
- `crawling_results` - Crawling results and screenshots
- `object_detection` - Object detection results
- `chat_history` - Chat conversation history
- `analysis_results` - Analysis results

### View Schema

```bash
# Connect to database
/home/ubuntu/postgresql/bin/psql -d prd

# View all tables
\dt

# View specific table structure
\d domains
\d crawling_results
\d object_detection
\d chat_history
```

## Performance Tips

### Check Database Size

```sql
-- Database size
SELECT pg_size_pretty(pg_database_size('prd'));

-- Table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Vacuum Database

```bash
# Vacuum database
/home/ubuntu/postgresql/bin/psql -d prd -c "VACUUM ANALYZE;"
```

### Reindex Database

```bash
# Reindex database
/home/ubuntu/postgresql/bin/psql -d prd -c "REINDEX DATABASE prd;"
```
