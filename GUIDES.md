# Complete Guide

**Last Updated**: 2025-12-01  

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [Quick Start](#quick-start)
- [Configuration Files](#configuration-files)
- [Monitoring](#monitoring)
- [Useful Commands](#useful-commands)
- [Other Guides](#other-guides)
- [Important Notes](#important-notes)
- [Support & Resources](#support--resources)

## Overview

This guide covers the complete deployment of PRD Analyst Dashboard using:
- **PM2** - Process manager for frontend (Next.js) and backend (FastAPI)
- **Nginx** - Reverse proxy on port 80
- **RunPod** - Container hosting with HTTPS proxy

What's Deployed:

| Component | Technology | Port | Process Manager |
|-----------|-----------|------|-----------------|
| Frontend | Next.js 16.0.0 | 3000 | PM2 |
| Backend | FastAPI (Python) | 8000 | PM2 |
| Reverse Proxy | Nginx | 80 | systemd/manual |

Architecture:

```
Internet (HTTPS)
    ↓
RunPod Proxy: https://nghbz6f39eg4xx-80.proxy.runpod.net/login
    ↓
Container Port 80 → Nginx (Reverse Proxy)
    ├─ /api/ → Backend (Port 8000) - FastAPI
    └─ /     → Frontend (Port 3000) - Next.js
```

## Setup

```bash
# Clone repository
git clone https://github.com/AITF-Universitas-Brawijaya/prototype-dashboard-chatbot.git
cd prototype-dashboard-chatbot

# Run setup script (requires sudo)
sudo bash setup.sh
```

Or manually and detailed: [Manual Setup](guides/manual_setup.md)

## Quick Start

### Deployment

```bash
chmod +x scripts/deploy.sh
scripts/deploy.sh
```

Or manually and detailed: [Manual Deployment](guides/manual_deploy.md)

Access Application: https://nghbz6f39eg4xx-80.proxy.runpod.net/login`

### Local Development

Development Mode:

```bash
# Start application in development mode
scripts/start-dev.sh dev

# Stop when done
scripts/stop-dev.sh
```

Production Testing:

```bash
# Build and run in production mode
scripts/start-dev.sh prod

# Stop application
scripts/stop-dev.sh
```

Or manually: [Manual Local Development](guides/manual_local_development.md)

Access Application: http://localhost:3000 (frontend), http://localhost:8000 (backend)

If you use local browser then forward port 3000 to your local machine

### Update & Maintenance

Update Application Code:

```bash
cd /home/ubuntu/tim6_prd_workdir
scripts/update-app.sh
```

Or manually: [Manual Update](guides/manual_update.md)


Update Backend Dependencies:

```bash
conda activate prd6
cd backend
pip install -r requirements.txt
pm2 restart prd-analyst-backend
```

Update Nginx Configuration:

```bash
# 1. Edit nginx.conf
nano nginx.conf

# 2. Test configuration
sudo nginx -t -c /home/ubuntu/tim6_prd_workdir/nginx.conf

# 3. Restart Nginx
scripts/restart-nginx.sh
```

Backup Important Files:

```bash
# Backup configuration
tar -czf backup-$(date +%Y%m%d).tar.gz \
  ecosystem.config.js \
  nginx.conf \
  frontend/.env.local \
  backend/.env
```

## Configuration Files

1. `ecosystem.config.js`: PM2 configuration for both frontend and backend.
    
    **Key Settings**:
    - Frontend: npm start on port 3000
    - Backend: wrapper script with conda environment
    - Auto-restart enabled
    - Memory limit: 1GB each
    - Logs in `/home/ubuntu/tim6_prd_workdir/logs/`

2. `nginx.conf`: Nginx reverse proxy configuration.
    
    **Key Settings**:
    - Listen on port 80
    - Proxy `/api/` to backend (port 8000)
    - Proxy `/` to frontend (port 3000)
    - WebSocket support
    - 60s timeouts

3. `scripts/start-backend.sh`: Wrapper script for backend to activate conda environment.
    
    **Purpose**: PM2 cannot directly activate conda environments, so this script:
    1. Activates conda environment `prd6`
    2. Runs uvicorn with FastAPI

## Monitoring

Check Service Status:

```bash
# PM2 status
pm2 status

# Nginx status
ps aux | grep nginx

# Port status
ss -tlnp | grep -E ":(80|3000|8000)"
```

View Logs:

```bash
# PM2 logs (all)
pm2 logs

# Frontend logs
pm2 logs prd-analyst-frontend

# Backend logs
pm2 logs prd-analyst-backend

# Nginx logs
tail -f nginx/error.log
tail -f nginx/access.log
```

Real-time Monitoring:

```bash
# PM2 monitoring dashboard
pm2 monit

# System resources
htop
```

Health Checks:

```bash
# Frontend
curl -I http://localhost:3000

# Backend
curl http://localhost:8000/

# Via Nginx
curl -I http://localhost
curl http://localhost/api/
```

## Useful Commands

Check Running Processes:

```bash
# Check all Node.js processes
ps aux | grep -E 'next|node' | grep -v grep

# Check process on specific port
lsof -i :3000  # Frontend
lsof -i :8000  # Backend
lsof -i :80    # Nginx
```

Stop Processes Manually:

```bash
# Stop by PID
kill -9 <PID>

# Stop by port
lsof -ti:3000 | xargs kill -9
lsof -ti:8000 | xargs kill -9

# Stop by process name
pkill -f "next-server"
pkill -f "uvicorn"
```

## Other Guides

- [Database Setup](guides/database_setup.md)
- [Troubleshooting](guides/troubleshooting.md)
- [Helper Scripts](guides/helper_scripts.md)
- [Command Reference](guides/command_reference.md)
- [Best Practices](guides/best_practices.md)
- [Deployment Checklist](guides/deployment_checklist.md)

## Important Notes

1. **Always rebuild** after code changes in production mode:
   ```bash
   cd frontend
   pnpm build
   ```

2. **Ensure environment variables** are set correctly in `frontend/.env.local`

3. **Use local development mode** for active development (hot-reload) and testing performance and production behavior

4. **Always activate conda environment** before running backend:
   ```bash
   conda activate prd6
   ```

5. **Never use `sudo nginx` without `-c` flag** - it will use default config instead of custom config

6. **Use relative URLs** in frontend `.env.local` for public deployment:
   ```
   NEXT_PUBLIC_API_URL=
   ```

## Support & Resources

- **Next.js**: https://nextjs.org/docs
- **PM2**: https://pm2.keymetrics.io/docs
- **Nginx**: https://nginx.org/en/docs
- **FastAPI**: https://fastapi.tiangolo.com
- **RunPod**: https://docs.runpod.io
