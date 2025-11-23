# 🐳 Docker Setup Guide

Panduan lengkap untuk menjalankan PRD Analyst Dashboard menggunakan Docker.

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Minimal 4GB RAM available
- Minimal 10GB disk space

### Install Docker

**Ubuntu/Debian:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

**macOS:**
```bash
brew install --cask docker
```

**Windows:**
Download dan install [Docker Desktop](https://www.docker.com/products/docker-desktop)

---

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd prototype-dashboard-chatbot
```

### 2. Setup Environment Variables

Buat file `.env` di root directory:

```bash
cat > .env << 'EOF'
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=prd

# Backend Configuration
DB_URL=postgresql://postgres:postgres@db:5432/prd
FRONTEND_URL=http://localhost:3000

# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF
```

> [!IMPORTANT]
> Ganti `your_gemini_api_key_here` dengan API key Anda dari [Google AI Studio](https://makersuite.google.com/app/apikey)

### 3. Build dan Run

```bash
# Build semua images
docker-compose build

# Start semua services
docker-compose up -d

# Check status
docker-compose ps
```

### 4. Akses Aplikasi

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Database**: localhost:5432

---

## 📦 Services

### Database (PostgreSQL)
- **Image**: postgres:14-alpine
- **Port**: 5432
- **Volume**: `postgres_data` untuk persistensi
- **Init**: Auto-run `schema.sql` saat pertama kali

### Backend (FastAPI)
- **Port**: 8000
- **Mode**: Development (hot-reload enabled)
- **Features**: 
  - Chrome/Chromium untuk web scraping
  - Auto-reload saat code berubah
  - Health check endpoint

### Frontend (Next.js)
- **Port**: 3000
- **Mode**: Development (hot-reload enabled)
- **Features**:
  - Fast refresh
  - Auto-reload saat code berubah

---

## 🛠️ Common Commands

### Start/Stop Services

```bash
# Start semua services
docker-compose up -d

# Start dengan logs
docker-compose up

# Stop semua services
docker-compose down

# Stop dan hapus volumes (HATI-HATI: akan hapus data database)
docker-compose down -v
```

### View Logs

```bash
# Semua services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Rebuild Services

```bash
# Rebuild semua
docker-compose build

# Rebuild specific service
docker-compose build backend
docker-compose build frontend

# Rebuild tanpa cache
docker-compose build --no-cache
```

### Execute Commands in Container

```bash
# Backend shell
docker-compose exec backend bash

# Frontend shell
docker-compose exec frontend sh

# Database psql
docker-compose exec db psql -U postgres -d prd

# Run Python script
docker-compose exec backend python seed_data.py
```

---

## 🔧 Development Workflow

### Hot Reload

Kedua backend dan frontend sudah dikonfigurasi dengan hot-reload:

1. Edit file di local machine
2. Changes akan otomatis terdeteksi
3. Service akan auto-reload

### Database Management

**Seed Data:**
```bash
docker-compose exec backend python seed_data.py
```

**Reset Database:**
```bash
docker-compose exec db psql -U postgres -d prd -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker-compose restart db
docker-compose exec backend python seed_data.py
```

**Backup Database:**
```bash
docker-compose exec db pg_dump -U postgres prd > backup_$(date +%Y%m%d).sql
```

**Restore Database:**
```bash
cat backup_20250123.sql | docker-compose exec -T db psql -U postgres -d prd
```

**Access Database:**
```bash
# Via psql
docker-compose exec db psql -U postgres -d prd

# Via external tool (pgAdmin, DBeaver, etc)
# Host: localhost
# Port: 5432
# User: postgres
# Password: postgres
# Database: prd
```

### Install New Dependencies

**Backend (Python):**
```bash
# 1. Add to requirements.txt
echo "new-package==1.0.0" >> backend/requirements.txt

# 2. Rebuild backend
docker-compose build backend

# 3. Restart
docker-compose up -d backend
```

**Frontend (Node):**
```bash
# 1. Exec into container
docker-compose exec frontend sh

# 2. Install package
pnpm add new-package

# 3. Exit and rebuild
exit
docker-compose build frontend
docker-compose up -d frontend
```

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
lsof -ti:3000
lsof -ti:8000
lsof -ti:5432

# Kill the process
lsof -ti:3000 | xargs kill -9
```

### Container Won't Start

```bash
# Check logs
docker-compose logs backend

# Check container status
docker-compose ps

# Restart specific service
docker-compose restart backend
```

### Database Connection Error

```bash
# Check database is healthy
docker-compose exec db pg_isready -U postgres

# Check database exists
docker-compose exec db psql -U postgres -l

# Recreate database
docker-compose down
docker-compose up -d db
# Wait 10 seconds
docker-compose up -d backend frontend
```

### Out of Disk Space

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove everything (HATI-HATI!)
docker system prune -a --volumes
```

### Permission Denied

```bash
# Fix ownership (Linux/macOS)
sudo chown -R $USER:$USER .

# Or run with sudo
sudo docker-compose up -d
```

### Chrome/Selenium Issues in Backend

```bash
# Rebuild backend dengan no-cache
docker-compose build --no-cache backend

# Check Chrome installation
docker-compose exec backend google-chrome --version
```

---

## 🚀 Production Deployment

Untuk production, gunakan target `production` di Dockerfile:

### docker-compose.prod.yml

```yaml
version: '3.8'

services:
  db:
    # Same as development
    
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: production
    # ... rest of config
    
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: production
      args:
        NEXT_PUBLIC_API_URL: https://api.yourdomain.com
    # ... rest of config
```

**Run Production:**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📊 Monitoring

### Health Checks

```bash
# Backend health
curl http://localhost:8000/

# Frontend health
curl http://localhost:3000/

# Database health
docker-compose exec db pg_isready -U postgres
```

### Resource Usage

```bash
# Check resource usage
docker stats

# Check specific container
docker stats prd-analyst-backend
```

---

## 🔒 Security Notes

> [!WARNING]
> Default credentials are for **development only**. Untuk production:
> - Ganti password database
> - Gunakan secrets management
> - Enable SSL/TLS
> - Restrict network access

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [FastAPI Docker Guide](https://fastapi.tiangolo.com/deployment/docker/)
- [Next.js Docker Guide](https://nextjs.org/docs/deployment#docker-image)

---

## 💡 Tips

1. **Faster Builds**: Gunakan BuildKit
   ```bash
   DOCKER_BUILDKIT=1 docker-compose build
   ```

2. **Clean Development**: Restart dari fresh state
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```

3. **Debug Mode**: Run tanpa detached untuk lihat logs
   ```bash
   docker-compose up
   ```

4. **Network Inspection**:
   ```bash
   docker network inspect prototype-dashboard-chatbot_prd-network
   ```
