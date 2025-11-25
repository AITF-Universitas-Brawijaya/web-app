# Native VPS Deployment Guide (Without Docker)

Panduan lengkap untuk deploy aplikasi PRD Analyst Dashboard di VPS tanpa menggunakan Docker.

## Prerequisites

- VPS dengan Ubuntu 20.04 atau lebih baru
- Akses root atau sudo privileges
- Minimal 2GB RAM
- Minimal 10GB disk space
- Internet connection untuk download dependencies
- **Conda (Miniconda atau Anaconda) sudah terinstall**

> **Note**: Jika belum install Conda, install terlebih dahulu:
> ```bash
> wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
> bash Miniconda3-latest-Linux-x86_64.sh
> source ~/.bashrc
> ```

## Quick Start

### 1. Clone Repository

```bash
cd /home/ubuntu
git clone <repository-url> prototype-dashboard-chatbot
cd prototype-dashboard-chatbot
```

### 2. Run Setup Script

```bash
sudo bash setup-native-vps.sh
```

Script ini akan:
- Verify Conda installation dan setup environment `prd6` dengan Python 3.11
- Install Node.js 20, PostgreSQL 14
- Install Chrome dan ChromeDriver untuk Selenium
- Setup database dan import schema
- Install semua dependencies (Python di conda env `prd6` dan Node.js)
- Build frontend untuk production
- Setup systemd services dengan conda environment
- Create log directory

### 3. Configure Environment

Edit file `.env` dengan konfigurasi Anda:

```bash
nano .env
```

**Penting**: Update `GEMINI_API_KEY` dengan API key Anda yang sebenarnya.

### 4. Start Services

```bash
sudo bash scripts/start-services.sh
```

### 5. Verify Installation

Akses aplikasi di browser:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Service Management

### Start Services

```bash
sudo systemctl start prd-backend
sudo systemctl start prd-frontend
```

Atau gunakan script:
```bash
sudo bash scripts/start-services.sh
```

### Manual Start (Non-Systemd Environments)

Jika VPS/Container Anda tidak menggunakan systemd, gunakan script berikut untuk menjalankan service di background:

**Start Services:**
```bash
bash scripts/start-manual-bg.sh
```
Script ini akan menjalankan Backend dan Frontend menggunakan `nohup` dan menyimpan logs di `/var/log/prd-analyst` (atau `./logs` jika permission denied).

**Stop Services:**
```bash
bash scripts/stop-manual.sh
```

**View Logs:**
```bash
tail -f logs/backend.log
tail -f logs/frontend.log
```

### Stop Services

```bash
sudo systemctl stop prd-backend
sudo systemctl stop prd-frontend
```

Atau gunakan script:
```bash
sudo bash scripts/stop-services.sh
```

### Restart Services

```bash
sudo systemctl restart prd-backend
sudo systemctl restart prd-frontend
```

### Check Status

```bash
sudo systemctl status prd-backend
sudo systemctl status prd-frontend
sudo systemctl status postgresql
```

### Enable Auto-Start on Boot

Services sudah di-enable secara otomatis oleh setup script. Untuk verify:

```bash
sudo systemctl is-enabled prd-backend
sudo systemctl is-enabled prd-frontend
```

## Conda Environment Management

### Activate Environment

```bash
conda activate prd6
```

### Deactivate Environment

```bash
conda deactivate
```

### List Installed Packages

```bash
conda activate prd6
pip list
```

### Update Dependencies

```bash
conda activate prd6
cd /home/ubuntu/tim6_prd_workdir/backend
pip install -r requirements.txt --upgrade
```

### Check Python Version

```bash
conda activate prd6
python --version  # Should be 3.11.x
```

## Logging

### View Logs

**Backend logs:**
```bash
# Real-time logs
sudo journalctl -u prd-backend -f

# Last 100 lines
sudo journalctl -u prd-backend -n 100

# Logs from specific time
sudo journalctl -u prd-backend --since "1 hour ago"
```

**Frontend logs:**
```bash
# Real-time logs
sudo journalctl -u prd-frontend -f

# Last 100 lines
sudo journalctl -u prd-frontend -n 100
```

**Log files location:**
- Backend: `/var/log/prd-analyst/backend.log`
- Backend errors: `/var/log/prd-analyst/backend-error.log`
- Frontend: `/var/log/prd-analyst/frontend.log`
- Frontend errors: `/var/log/prd-analyst/frontend-error.log`

## Database Management

### Access PostgreSQL

```bash
sudo -u postgres psql -d prd
```

### Common Database Commands

```sql
-- List all tables
\dt

-- View table structure
\d generated_domains

-- Query data
SELECT * FROM generated_domains LIMIT 10;

-- Exit
\q
```

### Backup Database

```bash
sudo -u postgres pg_dump prd > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database

```bash
sudo -u postgres psql -d prd < backup_file.sql
```

## Configuration

### Environment Variables

File `.env` berisi konfigurasi aplikasi:

```env
# Database
DB_URL=postgresql://postgres:postgres@localhost:5432/prd

# API URLs
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000

# Gemini API
GEMINI_API_KEY=your_actual_api_key_here

# Environment
NODE_ENV=production
```

### Change Ports

Jika ingin mengubah port default:

1. **Backend (default: 8000)**
   
   Edit `/etc/systemd/system/prd-backend.service`:
   ```ini
   ExecStart=/usr/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8080
   ```

2. **Frontend (default: 3000)**
   
   Edit `/etc/systemd/system/prd-frontend.service`:
   ```ini
   Environment="PORT=3001"
   ```

3. Reload systemd dan restart services:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart prd-backend prd-frontend
   ```

## Troubleshooting

### Service Won't Start

1. Check logs untuk error messages:
   ```bash
   sudo journalctl -u prd-backend -n 50
   ```

2. Verify dependencies installed:
   ```bash
   conda activate prd6
   python --version   # Should be 3.11.x (in prd6 environment)
   node --version     # Should be v20.x
   psql --version     # Should be 14.x
   ```

3. Check if ports are available:
   ```bash
   sudo netstat -tlnp | grep -E ':(3000|8000|5432)'
   ```

### Database Connection Error

1. Verify PostgreSQL is running:
   ```bash
   sudo systemctl status postgresql
   ```

2. Test connection:
   ```bash
   psql -U postgres -d prd -h localhost
   ```

3. Check `.env` file untuk correct credentials

### Chrome/Selenium Issues

1. Verify Chrome installed:
   ```bash
   google-chrome --version
   chromedriver --version
   ```

2. Check Chrome dependencies:
   ```bash
   ldd /usr/bin/google-chrome | grep "not found"
   ```

3. Run crawler manually untuk debugging:
   ```bash
   cd backend
   python3 domain-generator/crawler.py
   ```

### Permission Issues

1. Check log directory permissions:
   ```bash
   ls -la /var/log/prd-analyst/
   ```

2. Fix permissions if needed:
   ```bash
   sudo chown -R $USER:$USER /var/log/prd-analyst/
   ```

### Frontend Build Issues

1. Clear Next.js cache:
   ```bash
   cd frontend
   rm -rf .next node_modules
   pnpm install
   pnpm build
   ```

2. Check Node.js version:
   ```bash
   node --version  # Must be v20.x
   ```

## Performance Optimization

### PostgreSQL Tuning

Edit `/etc/postgresql/14/main/postgresql.conf`:

```conf
# For 2GB RAM VPS
shared_buffers = 512MB
effective_cache_size = 1536MB
maintenance_work_mem = 128MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 2621kB
min_wal_size = 1GB
max_wal_size = 4GB
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### Backend Performance

Untuk production dengan multiple workers, edit service file:

```ini
ExecStart=/usr/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## Security Recommendations

1. **Change default PostgreSQL password:**
   ```sql
   ALTER USER postgres WITH PASSWORD 'strong_password_here';
   ```
   Update `.env` accordingly.

2. **Setup firewall:**
   ```bash
   sudo ufw allow 22/tcp   # SSH
   sudo ufw allow 80/tcp   # HTTP
   sudo ufw allow 443/tcp  # HTTPS
   sudo ufw enable
   ```

3. **Use reverse proxy (Nginx):**
   ```bash
   sudo apt install nginx
   # Configure nginx to proxy to localhost:3000 and localhost:8000
   ```

4. **Enable SSL with Let's Encrypt:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

## Updating Application

### Pull Latest Changes

```bash
cd /home/ubuntu/prototype-dashboard-chatbot
git pull origin main
```

### Update Backend

```bash
conda activate prd6
cd backend
pip install -r requirements.txt
sudo systemctl restart prd-backend
```

### Update Frontend

```bash
cd frontend
pnpm install
pnpm build
sudo systemctl restart prd-frontend
```

### Update Database Schema

```bash
sudo -u postgres psql -d prd -f backend/database/schema.sql
```

## Monitoring

### System Resources

```bash
# CPU and Memory usage
htop

# Disk usage
df -h

# Service resource usage
systemctl status prd-backend prd-frontend
```

### Application Health

```bash
# Backend health check
curl http://localhost:8000/

# Frontend health check
curl http://localhost:3000/

# Database health check
sudo -u postgres psql -d prd -c "SELECT 1"
```

## Support

Jika mengalami masalah:

1. Check logs terlebih dahulu
2. Verify semua services running
3. Test database connectivity
4. Check system resources (RAM, disk space)
5. Review configuration files

## Architecture

```
┌─────────────────────────────────────────┐
│           Nginx (Reverse Proxy)         │
│         Port 80/443 (Optional)          │
└────────────┬────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌─────────┐      ┌──────────┐
│Frontend │      │ Backend  │
│Next.js  │◄────►│ FastAPI  │
│Port 3000│      │Port 8000 │
└─────────┘      └─────┬────┘
                       │
                       ▼
                 ┌──────────┐
                 │PostgreSQL│
                 │Port 5432 │
                 └──────────┘
```

## File Structure

```
prototype-dashboard-chatbot/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── requirements.txt        # Python dependencies
│   ├── database/
│   │   └── schema.sql         # Database schema
│   └── domain-generator/      # Crawler module
├── frontend/
│   ├── package.json           # Node.js dependencies
│   └── ...                    # Next.js files
├── scripts/
│   ├── setup-postgres.sh      # PostgreSQL setup
│   ├── start-services.sh      # Start all services
│   └── stop-services.sh       # Stop all services
├── systemd/
│   ├── prd-backend.service    # Backend service
│   └── prd-frontend.service   # Frontend service
├── setup-native-vps.sh        # Main setup script
├── env.example                # Environment template
└── .env                       # Environment config (create from template)
```
