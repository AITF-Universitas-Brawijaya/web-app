# PRD Analyst - Native Deployment with Miniconda

Complete setup guide for native deployment using Miniconda environment.

## Quick Start

### Automated Setup

Run the setup script to install everything automatically:

```bash
./setup.sh
```

This will:
1. Install system dependencies (PostgreSQL, Node.js, etc.)
2. Install Miniconda
3. Create conda environment `prd6` with Python 3.12
4. Install all Python dependencies
5. Install Playwright browsers
6. Setup PostgreSQL database
7. Create environment files
8. Install frontend dependencies

### Manual Start

After setup completes:

```bash
# Activate conda environment
conda activate prd6

# Start all services
./start-all.sh
```

## Services

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3001 | http://localhost:3001 |
| Backend API | 8000 | http://localhost:8000 |
| Integrasi Service | 7000 | http://localhost:7000 |
| PostgreSQL | 5432 | localhost:5432 |

## Individual Service Management

### Start Services Individually

```bash
# Activate conda environment first
conda activate prd6

# Start each service in separate terminals
./start-integrasi-service.sh  # Port 7000
./start-backend.sh             # Port 8000
./start-frontend.sh            # Port 3001
```

### Stop All Services

```bash
./stop-all.sh
```

## Environment Files

### `.env` (Root directory)
```env
NODE_ENV=production
FRONTEND_URL=http://localhost:3001
SERVICE_API_URL=http://localhost:7000
DB_URL=postgresql://postgres:postgres@localhost:5432/prd
JWT_SECRET_KEY=your-secret-key-here
```

### `integrasi-service/.env`
```env
DB_URL=postgresql://postgres:postgres@localhost:5432/prd
BACKEND_URL=http://localhost:8000
BACKEND_LOG_URL=http://localhost:8000/api/crawler/log
```

### `frontend/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
SERVICE_API_URL=http://localhost:7000
```

## Database

### Credentials
- **Host:** localhost
- **Port:** 5432
- **Database:** prd
- **Username:** postgres
- **Password:** postgres

### Backup Database

```bash
pg_dump -U postgres prd > backup-$(date +%Y%m%d).sql
```

### Restore Database

```bash
psql -U postgres -d prd < backup-20231222.sql
```

## Conda Environment

### Activate Environment

```bash
conda activate prd6
```

### Deactivate Environment

```bash
conda deactivate
```

### Update Dependencies

```bash
conda activate prd6
pip install -r requirements.txt
```

### Recreate Environment

```bash
conda env remove -n prd6
conda create -n prd6 python=3.12 -y
conda activate prd6
pip install -r requirements.txt
playwright install chromium
```

## Logs

View service logs:

```bash
# All logs
tail -f logs/*.log

# Individual logs
tail -f logs/integrasi-service.log
tail -f logs/backend.log
tail -f logs/frontend.log
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :7000  # or :8000, :3001

# Kill process
kill -9 <PID>

# Or use stop script
./stop-all.sh
```

### Conda Not Found

```bash
# Initialize conda for current shell
eval "$($HOME/miniconda3/bin/conda shell.bash hook)"

# Or add to ~/.bashrc
echo 'eval "$($HOME/miniconda3/bin/conda shell.bash hook)"' >> ~/.bashrc
source ~/.bashrc
```

### Database Connection Error

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Test connection
PGPASSWORD=postgres psql -U postgres -h localhost -d prd -c "SELECT 1;"
```

### Playwright Browser Error

```bash
conda activate prd6
playwright install chromium
playwright install-deps chromium
```

## Production Deployment

For production, consider:

1. **Use systemd services** instead of manual scripts
2. **Setup Nginx** as reverse proxy
3. **Enable SSL/TLS** with Let's Encrypt
4. **Use environment-specific secrets**
5. **Setup monitoring** and logging
6. **Configure firewall** rules
7. **Setup automated backups**

See `docs/NATIVE-DEPLOYMENT.md` for detailed production setup.

## System Requirements

- **OS:** Ubuntu 24.04 LTS or similar
- **RAM:** Minimum 4GB, recommended 8GB
- **Disk:** Minimum 10GB free space
- **CPU:** 2+ cores recommended

## Dependencies

### System Packages
- PostgreSQL 14+
- Node.js 20+
- Python 3.12 (via Miniconda)
- Build tools (gcc, make, etc.)

### Python Packages
See `requirements.txt` for complete list.

### Node Packages
See `frontend/package.json` for complete list.

## Support

For issues or questions:
1. Check logs in `logs/` directory
2. Verify all services are running
3. Check environment variables
4. See troubleshooting section above
5. Refer to `docs/NATIVE-DEPLOYMENT.md`
