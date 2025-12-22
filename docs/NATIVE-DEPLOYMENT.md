# Native Deployment Guide

Panduan lengkap untuk menjalankan PRD Analyst Dashboard secara native (tanpa Docker).

## Architecture

```
┌─────────────────────────────────────────────┐
│         Native Services (No Docker)         │
├─────────────────────────────────────────────┤
│                                             │
│  Integrasi Service (Port 3000)              │
│      ├─ Domain Generator (/process)         │
│      ├─ Manual Domains (/process-links)     │
│      ├─ AI Chat (/chat)                     │
│      └─ Health Check (/health/services)     │
│                                             │
│  Backend API (Port 8000)                    │
│      ├─ REST API Endpoints                  │
│      ├─ Calls Local Service (Port 3000)     │
│      └─ Database Integration                │
│                                             │
│  Frontend (Port 3001)                       │
│      ├─ Dashboard UI                        │
│      ├─ Data Management                     │
│      └─ Real-time Monitoring                │
│                                             │
│  PostgreSQL (Port 5432)                     │
│      └─ Persistent Data Storage             │
│                                             │
└─────────────────────────────────────────────┘
```

## Prerequisites

### System Requirements
- Ubuntu 20.04+ or similar Linux distribution
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- 4GB+ RAM
- 10GB+ free disk space

### Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.11
sudo apt install python3.11 python3.11-venv python3-pip -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install system dependencies for Playwright
sudo apt install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2
```

## Setup PostgreSQL

```bash
# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE prd;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE prd TO postgres;
\q
EOF

# Initialize database schema
psql -U postgres -d prd < database/init-schema.sql

# (Optional) Load initial data
psql -U postgres -d prd < database/init-data.sql
```

## Configuration

### 1. Setup Environment Variables

```bash
# Copy template
cp backend/env.template .env

# Edit configuration
nano .env
```

Update the following values in `.env`:

```bash
# Database Configuration
DB_URL=postgresql://postgres:postgres@localhost:5432/prd

# Service API Configuration (Local)
SERVICE_API_URL=http://localhost:3000
SERVICE_API_KEY=tim6-secret-key-2025

# Frontend Configuration
FRONTEND_URL=http://localhost:3001

# JWT Secret (generate a secure key)
JWT_SECRET_KEY=your-secure-secret-key-here
```

### 2. Setup Integrasi Service

```bash
cd integrasi-service

# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

Update `.env` in integrasi-service:

```bash
# Database
DB_URL=postgresql://postgres:postgres@localhost:5432/prd

# Backend (for logging)
BACKEND_URL=http://localhost:8000
BACKEND_LOG_URL=http://localhost:8000/api/crawler/log
```

## Installation

### 1. Install Integrasi Service Dependencies

```bash
cd integrasi-service
pip3 install -r requirements.txt
playwright install chromium
cd ..
```

### 2. Install Backend Dependencies

```bash
cd backend
pip3 install -r requirements.txt
cd ..
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

## Running Services

### Option 1: Manual Startup (Recommended for Development)

Open **3 separate terminal windows** and run:

**Terminal 1 - Integrasi Service:**
```bash
cd /home/ubuntu/web-app
./start-integrasi-service.sh
```

**Terminal 2 - Backend:**
```bash
cd /home/ubuntu/web-app
./start-backend.sh
```

**Terminal 3 - Frontend:**
```bash
cd /home/ubuntu/web-app
./start-frontend.sh
```

### Option 2: Background Processes

```bash
# Start all services in background
nohup ./start-integrasi-service.sh > logs/integrasi-service.log 2>&1 &
nohup ./start-backend.sh > logs/backend.log 2>&1 &
nohup ./start-frontend.sh > logs/frontend.log 2>&1 &

# View logs
tail -f logs/*.log
```

### Option 3: Using Screen/Tmux

```bash
# Using screen
screen -S integrasi ./start-integrasi-service.sh
screen -S backend ./start-backend.sh
screen -S frontend ./start-frontend.sh

# Detach: Ctrl+A then D
# Reattach: screen -r integrasi

# Using tmux
tmux new -s integrasi './start-integrasi-service.sh'
tmux new -s backend './start-backend.sh'
tmux new -s frontend './start-frontend.sh'

# Detach: Ctrl+B then D
# Reattach: tmux attach -t integrasi
```

## Accessing the Application

- **Frontend Dashboard**: http://localhost:3001
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Integrasi Service**: http://localhost:3000
- **Integrasi Service Docs**: http://localhost:3000/docs

## Service Startup Order

**IMPORTANT**: Services must be started in this order:

1. **PostgreSQL** (should already be running)
2. **Integrasi Service** (port 3000) - Backend depends on this
3. **Backend** (port 8000) - Frontend depends on this
4. **Frontend** (port 3001)

## Health Checks

```bash
# Check PostgreSQL
sudo systemctl status postgresql

# Check Integrasi Service
curl http://localhost:3000/
curl http://localhost:3000/health/services

# Check Backend
curl http://localhost:8000/
curl http://localhost:8000/health/services

# Check Frontend
curl http://localhost:3001/
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3000  # or :8000, :3001

# Kill process
kill -9 <PID>
```

### Database Connection Error

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Test connection
psql -U postgres -d prd -c "SELECT 1;"
```

### Playwright Browser Not Found

```bash
cd integrasi-service
playwright install chromium
sudo playwright install-deps chromium
```

### Python Module Not Found

```bash
# Reinstall dependencies
cd backend
pip3 install -r requirements.txt --force-reinstall

cd ../integrasi-service
pip3 install -r requirements.txt --force-reinstall
```

### Frontend Build Errors

```bash
cd frontend
rm -rf node_modules .next
npm install
npm run build
```

## Stopping Services

```bash
# If running in foreground: Ctrl+C in each terminal

# If running in background:
pkill -f "python3 main_api.py"  # Integrasi Service
pkill -f "uvicorn main:app"     # Backend
pkill -f "next dev"             # Frontend

# Or find and kill by port
lsof -ti:3000 | xargs kill -9
lsof -ti:8000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

## Production Deployment

For production, consider:

1. **Use systemd services** for auto-restart
2. **Use Nginx** as reverse proxy
3. **Enable SSL/TLS** with Let's Encrypt
4. **Setup log rotation**
5. **Configure firewall** (ufw)
6. **Use production build** for frontend (`npm run build && npm start`)

See `docs/PRODUCTION-DEPLOYMENT.md` for detailed production setup.

## Monitoring

### View Logs

```bash
# Integrasi Service
tail -f logs/integrasi-service.log

# Backend
tail -f logs/backend.log

# Frontend
tail -f logs/frontend.log
```

### Resource Usage

```bash
# Check CPU and memory
htop

# Check disk usage
df -h

# Check specific process
ps aux | grep python
ps aux | grep node
```

## Backup and Restore

### Backup Database

```bash
pg_dump -U postgres prd > backup-$(date +%Y%m%d).sql
```

### Restore Database

```bash
psql -U postgres -d prd < backup-20231222.sql
```

## Migration from Docker

If you're migrating from Docker:

1. **Backup Docker database first**:
   ```bash
   docker exec prd_postgres pg_dump -U postgres prd > database/backup-from-docker.sql
   ```

2. **Stop Docker containers**:
   ```bash
   docker-compose down
   ```

3. **Restore to native PostgreSQL**:
   ```bash
   psql -U postgres -d prd < database/backup-from-docker.sql
   ```

4. **Follow setup steps above**

## Support

For issues or questions:
- Check logs in `logs/` directory
- Review error messages carefully
- Ensure all services are running in correct order
- Verify environment variables are set correctly

## Docker Cleanup (Optional)

If you want to completely remove Docker:

```bash
# Stop all containers
docker stop $(docker ps -aq)

# Remove all containers
docker rm $(docker ps -aq)

# Remove all images
docker rmi $(docker images -q)

# Remove all volumes
docker volume rm $(docker volume ls -q)

# Remove Docker system
docker system prune -a --volumes -f

# Uninstall Docker (optional)
sudo apt remove docker docker-engine docker.io containerd runc
sudo apt autoremove
```
