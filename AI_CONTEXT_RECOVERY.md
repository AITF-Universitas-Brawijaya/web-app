# AI CONTEXT: System Recovery & Deployment Guide

**Use this document to orient the AI assistant after a system restart.**

## 1. Project Overview
- **Project Name**: Tim6 PRD Analyst Dashboard
- **Stack**:
  - **Frontend**: Next.js (Port 3000) - Dir: `frontend/`
  - **Backend**: Python FastAPI (Port 8000) - Dir: `backend/`
  - **Database**: PostgreSQL 14 (Port 5432, DB: `prd`)
  - **Process Manager**: PM2
  - **Directory**: `/home/ubuntu/tim6_prd_workdir`

## 2. Recovery Protocol (After Restart)
Since RunPod instances often wipe system directories (`/etc`, `/var`, `/usr/bin`) on restart, but preserve `/home/ubuntu`, you must reinstall system dependencies and restore data.

### Step 1: Reinstall System Dependencies
Check if Postgres or Nginx is missing. If so, run the unified setup script:
```bash
cd /home/ubuntu/tim6_prd_workdir
./setup.sh
```
*This installs: PostgreSQL 14, Nginx, Node.js 20, Python 3.11 (Conda), Chrome/ChromeDriver.*

### Step 2: Restore Data & Configuration
Run the restore script to recover the database from `backup/prd_backup.sql` and restore `.env` files.
```bash
./scripts/restore.sh
```
*The backup directory is located at `~/tim6_prd_workdir/backup`.*

### Step 3: Start Services
Use PM2 to start the application stack.
```bash
pm2 resurrect || pm2 start ecosystem.config.js
pm2 save
```

### Step 4: Verify Deployment
- **Frontend**: `curl http://localhost:3000`
- **Backend**: `curl http://localhost:8000`
- **Database**: `psql -U postgres -d prd -c "\dt"`

## 3. Configuration References

### Database Connection
- **URL**: `postgresql://postgres:root@localhost:5432/prd`
- **Creds**: User `postgres` / Pass `root` (or `postgres`, check `.env`)
- **Note**: The backend `.env` is restored by `restore.sh`.

### Environment Variables (.env)
- **Root**: `.env` (Source of truth)
- **Backend**: `backend/.env` (Duplicate/Symlink)
- **Frontend**: Uses `NEXT_PUBLIC_` vars from root `.env` during build.

### File Structure
```
/home/ubuntu/tim6_prd_workdir/
├── backend/            # FastAPI app
├── frontend/           # Next.js app
├── monitoring/         # Monitoring scripts
├── scripts/            # setup.sh, backup.sh, restore.sh
├── backup/             # PERSISTENT BACKUPS (SQL dump + .env)
├── ecosystem.config.js # PM2 config
└── setup.sh            # Main installer
```

## 4. Common Issues & Fixes
- **500 Internal Server Error**: Usually DB connection failure. Check `backend/.env` matches `setup-local-postgres.sh` credentials.
- **"psql: command not found"**: Run `./setup.sh` to reinstall Postgres.
- **Frontend 404/Connection Refused**: Ensure `pm2 start ecosystem.config.js` was run.
- **Data missing**: Run `./scripts/restore.sh`.
