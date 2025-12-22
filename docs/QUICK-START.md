# Quick Reference - Native Deployment

## Start Services

### All Services at Once
```bash
./start-all.sh
```

### Individual Services
```bash
# Start in separate terminals
./start-integrasi-service.sh  # Port 3000
./start-backend.sh             # Port 8000
./start-frontend.sh            # Port 3001
```

## Stop Services

```bash
./stop-all.sh
```

## Access Points

- **Dashboard**: http://localhost:3001
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Integrasi Service**: http://localhost:3000
- **Integrasi Docs**: http://localhost:3000/docs

## Health Checks

```bash
# Check all services
curl http://localhost:3000/health/services
curl http://localhost:8000/
curl http://localhost:3001/

# Check PostgreSQL
sudo systemctl status postgresql
```

## View Logs

```bash
# All logs
tail -f logs/*.log

# Individual logs
tail -f logs/integrasi-service.log
tail -f logs/backend.log
tail -f logs/frontend.log
```

## Common Issues

### Port Already in Use
```bash
# Find and kill process
lsof -i :3000  # or :8000, :3001
kill -9 <PID>

# Or use stop script
./stop-all.sh
```

### Service Won't Start
```bash
# Check logs
cat logs/integrasi-service.log
cat logs/backend.log
cat logs/frontend.log

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Database Connection Error
```bash
# Check PostgreSQL
sudo systemctl status postgresql

# Test connection
psql -U postgres -d prd -c "SELECT 1;"
```

## Service Dependencies

```
PostgreSQL (5432)
    ↓
Integrasi Service (3000)
    ↓
Backend (8000)
    ↓
Frontend (3001)
```

**Always start in this order!**

## Environment Files

- **Main Config**: `.env` (root directory)
- **Integrasi Service**: `integrasi-service/.env`

## Backup Database

```bash
# Create backup
pg_dump -U postgres prd > backup-$(date +%Y%m%d).sql

# Restore backup
psql -U postgres -d prd < backup-20231222.sql
```

## Update Dependencies

```bash
# Backend
cd backend
pip3 install -r requirements.txt

# Integrasi Service
cd integrasi-service
pip3 install -r requirements.txt

# Frontend
cd frontend
npm install
```

## Production Mode

```bash
# Build frontend for production
cd frontend
npm run build

# Start in production mode
PORT=3001 npm start
```

## Monitoring

```bash
# Resource usage
htop

# Disk usage
df -h

# Process list
ps aux | grep python
ps aux | grep node
```
