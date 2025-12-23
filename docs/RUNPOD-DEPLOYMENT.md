# RunPod Deployment Guide

Panduan lengkap untuk deploy PRD Analyst di RunPod GPU/CPU pods.

## 📋 Prasyarat

- RunPod account dengan pod aktif (GPU atau CPU)
- Minimal 20GB storage
- Port 3000 di-expose untuk akses public

## 🚀 Quick Start

### 1. Clone Repository

```bash
cd /workspace
git clone <repository-url> web-app
cd web-app
```

### 2. Jalankan Setup Script

```bash
chmod +x setup-runpod.sh
./setup-runpod.sh
```

### 3. Reload Shell & Start Services

```bash
source ~/.bashrc
./start-runpod.sh
```

### 4. Akses Aplikasi

Jika `RUNPOD_POD_ID` terdeteksi:
```
https://<POD_ID>-3000.proxy.runpod.net
```

Atau configure manual port forwarding di RunPod dashboard untuk port 3000.

## 🔧 Perbedaan dengan Setup Native

### ✅ Yang Dihilangkan

1. **Nginx** - RunPod sudah menyediakan proxy sendiri
2. **Systemd** - Menggunakan manual process management
3. **Sudo untuk PostgreSQL** - Langsung run sebagai root/postgres user

### ✨ Yang Ditambahkan

1. **PostgreSQL Manual Management** - Database di `/workspace/postgresql/data`
2. **RunPod URL Detection** - Auto-detect public URL dari `RUNPOD_POD_ID`
3. **Startup Script Khusus** - `start-runpod.sh` untuk kemudahan

## 📁 Struktur File RunPod

```
/workspace/
├── web-app/              # Aplikasi
│   ├── frontend/
│   ├── backend/
│   ├── integrasi-service/
│   └── database/
└── postgresql/           # PostgreSQL data
    ├── data/            # Database files
    └── logfile          # PostgreSQL logs
```

## 🛠️ Management Commands

### PostgreSQL

```bash
# Start PostgreSQL
su - postgres -c '/usr/lib/postgresql/*/bin/pg_ctl -D /workspace/postgresql/data start'

# Stop PostgreSQL
su - postgres -c '/usr/lib/postgresql/*/bin/pg_ctl -D /workspace/postgresql/data stop'

# Restart PostgreSQL
su - postgres -c '/usr/lib/postgresql/*/bin/pg_ctl -D /workspace/postgresql/data restart'

# Status PostgreSQL
su - postgres -c '/usr/lib/postgresql/*/bin/pg_ctl -D /workspace/postgresql/data status'

# Connect to database
PGPASSWORD=postgres psql -U postgres -h localhost -d prd
```

### Services

```bash
# Start all services
./start-runpod.sh

# Start individual services
./start-integrasi-service.sh  # Port 7000
./start-backend.sh            # Port 8000
./start-frontend.sh           # Port 3000

# Stop all services
./stop-all.sh
```

### Conda Environment

```bash
# Activate environment
conda activate prd6

# Deactivate environment
conda deactivate

# List environments
conda env list
```

## 🔍 Troubleshooting

### PostgreSQL tidak bisa connect

```bash
# Cek apakah PostgreSQL running
ps aux | grep postgres

# Cek port 5432
lsof -i :5432

# Restart PostgreSQL
su - postgres -c '/usr/lib/postgresql/*/bin/pg_ctl -D /workspace/postgresql/data restart'

# Test connection
PGPASSWORD=postgres psql -U postgres -h localhost -c "SELECT 1;"
```

### Port sudah digunakan

```bash
# Cek port yang digunakan
lsof -i :3000
lsof -i :8000
lsof -i :7000

# Kill process di port tertentu
kill -9 $(lsof -t -i:3000)
```

### Conda environment tidak ditemukan

```bash
# Reload bashrc
source ~/.bashrc

# Atau initialize conda manual
eval "$(/opt/miniconda3/bin/conda shell.bash hook)"
```

### Services tidak start

```bash
# Cek logs
tail -f logs/integrasi-service.log
tail -f logs/backend.log
tail -f logs/frontend.log

# Cek apakah conda environment aktif
conda env list | grep prd6

# Activate dan coba start manual
conda activate prd6
cd integrasi-service
python main_api.py
```

## 🌐 Port Configuration

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Next.js web interface |
| Backend | 8000 | FastAPI backend |
| Integrasi Service | 7000 | Domain generator & scraper |
| PostgreSQL | 5432 | Database |
| Reasoning Service | 8001 | AI reasoning (optional) |
| Chat Service | 8002 | Chatbot (optional) |
| Object Detection | 9090 | Image detection (optional) |

## 📝 Environment Variables

File `.env` akan dibuat otomatis dengan konfigurasi berikut:

```env
# RunPod Configuration
RUNPOD_POD_ID=<auto-detected>
PUBLIC_URL=https://<POD_ID>-3000.proxy.runpod.net

# Database
DB_URL=postgresql://postgres:postgres@localhost:5432/prd
DB_HOST=localhost
DB_PORT=5432
DB_NAME=prd
DB_USER=postgres
DB_PASSWORD=postgres

# Services
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
SERVICE_API_URL=http://localhost:5000
```

## 🔐 Security Notes

1. **Default Passwords** - Ganti password PostgreSQL di production:
   ```sql
   ALTER USER postgres WITH PASSWORD 'new_secure_password';
   ```
   
2. **JWT Secret** - Generate JWT secret baru untuk production:
   ```bash
   echo -n "your-secret-phrase" | sha256sum
   ```
   Update di `.env`:
   ```env
   JWT_SECRET_KEY=<new-hash>
   ```

3. **Database Backup** - Setup backup otomatis:
   ```bash
   # Jalankan backup script
   ./backup-database.sh
   ```

## 🔄 Persistence

RunPod pods bisa di-stop/restart. Untuk persistence:

1. **Simpan di `/workspace`** - Folder ini persistent
2. **PostgreSQL data** - Sudah di `/workspace/postgresql/data`
3. **Backup regular** - Gunakan `backup-database.sh`
4. **Environment files** - `.env` di root project

## 📊 Monitoring

### Check Service Status

```bash
# Cek semua services running
ps aux | grep -E "(python|node|postgres)"

# Cek resource usage
htop

# Cek disk usage
df -h /workspace
```

### Logs

```bash
# Real-time logs
tail -f logs/*.log

# PostgreSQL logs
tail -f /workspace/postgresql/logfile
```

## 🚨 Common Issues

### 1. "Database connection failed"
**Solution:** Start PostgreSQL terlebih dahulu
```bash
su - postgres -c '/usr/lib/postgresql/*/bin/pg_ctl -D /workspace/postgresql/data start'
```

### 2. "Port already in use"
**Solution:** Stop existing services
```bash
./stop-all.sh
# Atau kill manual
kill -9 $(lsof -t -i:3000)
```

### 3. "Conda command not found"
**Solution:** Reload shell
```bash
source ~/.bashrc
```

### 4. "Permission denied"
**Solution:** RunPod biasanya run sebagai root, tapi pastikan ownership:
```bash
chown -R postgres:postgres /workspace/postgresql/data
```

## 📚 Additional Resources

- [RunPod Documentation](https://docs.runpod.io/)
- [PostgreSQL Manual](https://www.postgresql.org/docs/)
- [Conda User Guide](https://docs.conda.io/projects/conda/en/latest/user-guide/)

## 💡 Tips

1. **Auto-start on pod restart** - Tambahkan ke RunPod startup script:
   ```bash
   cd /workspace/web-app && ./start-runpod.sh
   ```

2. **Monitor resources** - RunPod charge per hour, monitor usage:
   ```bash
   nvidia-smi  # Untuk GPU pods
   htop        # CPU/Memory
   ```

3. **Backup before experiments** - Selalu backup database sebelum testing:
   ```bash
   ./backup-database.sh
   ```

4. **Use tmux/screen** - Untuk persistent sessions:
   ```bash
   tmux new -s prd
   ./start-runpod.sh
   # Ctrl+B, D untuk detach
   ```

## 🆘 Support

Jika mengalami masalah:

1. Cek logs di `logs/` directory
2. Cek PostgreSQL logs di `/workspace/postgresql/logfile`
3. Verify semua services running: `ps aux | grep -E "(python|node|postgres)"`
4. Restart services: `./stop-all.sh && ./start-runpod.sh`

---

**Last Updated:** 2025-12-23
**Version:** 1.0.0
