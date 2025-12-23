# 📦 RunPod Deployment Package

Package lengkap untuk deploy PRD Analyst di RunPod.

## 📁 File yang Dibuat

### 1. **setup-runpod.sh** ⭐
Script utama untuk instalasi di RunPod.

**Fitur:**
- ✅ Instalasi tanpa systemd
- ✅ PostgreSQL manual management
- ✅ Auto-detect RunPod environment
- ✅ Conda environment setup
- ✅ Database initialization
- ✅ Environment configuration

**Perbedaan dari setup.sh:**
| Feature | setup.sh | setup-runpod.sh |
|---------|----------|-----------------|
| Nginx | ✅ | ❌ (tidak perlu) |
| Systemd | ✅ | ❌ (manual) |
| PostgreSQL | systemctl | pg_ctl manual |
| Data location | /var/lib | /workspace |
| Root access | sudo | langsung |

### 2. **start-runpod.sh**
Script untuk start semua services di RunPod.

**Yang dilakukan:**
1. Load conda environment
2. Start PostgreSQL (jika belum running)
3. Start integrasi-service (port 7000)
4. Start backend (port 8000)
5. Start frontend (port 3000)
6. Show access URL

### 3. **backup-database.sh**
Script untuk backup database.

**Output:**
- `database/backup_schema.sql` - Schema database
- `database/backup_data.sql` - Data database

**Fitur:**
- ✅ Backup schema dan data terpisah
- ✅ Statistics record count
- ✅ Error handling
- ✅ Size information

### 4. **docs/RUNPOD-DEPLOYMENT.md**
Dokumentasi lengkap deployment di RunPod.

**Isi:**
- 📋 Prerequisites
- 🚀 Quick start guide
- 🔧 Management commands
- 🔍 Troubleshooting
- 🌐 Port configuration
- 🔐 Security notes
- 📊 Monitoring tips

### 5. **RUNPOD-README.md**
Quick reference guide.

**Isi:**
- ⚡ Quick start (3 langkah)
- 📋 Essential commands
- 🔧 Common troubleshooting
- 🎯 Port mapping

## 🎯 Cara Penggunaan

### Setup Awal (Sekali saja)

```bash
cd /workspace
git clone <repo-url> web-app
cd web-app
chmod +x setup-runpod.sh
./setup-runpod.sh
source ~/.bashrc
```

### Start Services

```bash
./start-runpod.sh
```

### Backup Database

```bash
./backup-database.sh
```

### Stop Services

```bash
./stop-all.sh
```

## 🔄 Workflow RunPod

### Pertama Kali Setup Pod

```bash
# 1. Clone repo
cd /workspace
git clone <repo> web-app
cd web-app

# 2. Setup
./setup-runpod.sh

# 3. Reload shell
source ~/.bashrc

# 4. Start
./start-runpod.sh
```

### Setiap Kali Pod Restart

```bash
# 1. Masuk ke directory
cd /workspace/web-app

# 2. Start PostgreSQL (jika perlu)
su - postgres -c '/usr/lib/postgresql/*/bin/pg_ctl -D /workspace/postgresql/data start'

# 3. Start services
./start-runpod.sh
```

### Sebelum Stop Pod

```bash
# 1. Backup database
./backup-database.sh

# 2. Stop services
./stop-all.sh

# 3. Stop PostgreSQL (optional)
su - postgres -c '/usr/lib/postgresql/*/bin/pg_ctl -D /workspace/postgresql/data stop'
```

## 🗂️ Struktur Directory RunPod

```
/workspace/
├── web-app/                    # Aplikasi (dari git)
│   ├── setup-runpod.sh        # Setup script
│   ├── start-runpod.sh        # Startup script
│   ├── backup-database.sh     # Backup script
│   ├── .env                   # Environment config
│   ├── frontend/              # Next.js app
│   ├── backend/               # FastAPI app
│   ├── integrasi-service/     # Integration service
│   ├── database/              # SQL files & backups
│   │   ├── backup_schema.sql
│   │   └── backup_data.sql
│   ├── logs/                  # Application logs
│   └── docs/
│       └── RUNPOD-DEPLOYMENT.md
└── postgresql/                 # PostgreSQL (persistent)
    ├── data/                  # Database files
    └── logfile                # PostgreSQL logs
```

## 🔑 Key Differences dari Native Setup

### 1. **No Systemd**
```bash
# Native (systemd)
sudo systemctl start postgresql
sudo systemctl enable nginx

# RunPod (manual)
su - postgres -c 'pg_ctl -D /workspace/postgresql/data start'
# No nginx needed
```

### 2. **No Nginx**
```bash
# Native: Nginx reverse proxy (port 80 -> 3000)
# RunPod: Direct access via RunPod proxy
https://<POD_ID>-3000.proxy.runpod.net
```

### 3. **Data Location**
```bash
# Native
/var/lib/postgresql/

# RunPod (persistent)
/workspace/postgresql/data/
```

### 4. **Conda Location**
```bash
# Native
~/miniconda3

# RunPod
/opt/miniconda3
```

## 📊 Port Mapping

### Internal Ports
| Service | Port | Access |
|---------|------|--------|
| Frontend | 3000 | RunPod proxy |
| Backend | 8000 | Internal only |
| Integrasi | 7000 | Internal only |
| PostgreSQL | 5432 | Internal only |

### RunPod Proxy
```
https://<POD_ID>-3000.proxy.runpod.net -> localhost:3000
```

Configure di RunPod dashboard:
- Expose port: 3000
- Type: HTTP
- Auto-generate URL

## ⚠️ Important Notes

### 1. Persistence
- ✅ `/workspace` adalah persistent
- ✅ Database di `/workspace/postgresql/data`
- ✅ Backup files di `database/backup_*.sql`
- ❌ `/tmp` tidak persistent

### 2. Security
```bash
# Default credentials (GANTI DI PRODUCTION!)
DB_USER=postgres
DB_PASSWORD=postgres

# Generate JWT secret baru
echo -n "your-secret" | sha256sum
```

### 3. Resource Management
```bash
# Monitor GPU (jika GPU pod)
nvidia-smi

# Monitor CPU/Memory
htop

# Monitor disk
df -h /workspace
```

### 4. Auto-start on Pod Restart
Tambahkan ke RunPod startup script:
```bash
#!/bin/bash
cd /workspace/web-app
su - postgres -c '/usr/lib/postgresql/*/bin/pg_ctl -D /workspace/postgresql/data start'
sleep 3
./start-runpod.sh
```

## 🆘 Troubleshooting Quick Reference

| Problem | Solution |
|---------|----------|
| PostgreSQL tidak connect | `su - postgres -c 'pg_ctl -D /workspace/postgresql/data start'` |
| Port sudah digunakan | `./stop-all.sh` atau `kill -9 $(lsof -t -i:3000)` |
| Conda tidak ditemukan | `source ~/.bashrc` |
| Services tidak start | Cek logs di `logs/*.log` |
| Database error | Cek `/workspace/postgresql/logfile` |

## 📚 Documentation Links

- **Quick Start:** `RUNPOD-README.md`
- **Full Guide:** `docs/RUNPOD-DEPLOYMENT.md`
- **Native Setup:** `docs/NATIVE-DEPLOYMENT.md`
- **System Guide:** `docs/PANDUAN_SISTEM.md`

## ✅ Checklist Setup

- [ ] Clone repository ke `/workspace`
- [ ] Run `./setup-runpod.sh`
- [ ] Run `source ~/.bashrc`
- [ ] Run `./start-runpod.sh`
- [ ] Configure port forwarding di RunPod (port 3000)
- [ ] Test akses via public URL
- [ ] Ganti password default
- [ ] Setup backup otomatis
- [ ] Test semua fitur

## 🎉 Success Indicators

Jika setup berhasil, Anda akan melihat:

```bash
✓ All services started!

Access your application at:
  https://<POD_ID>-3000.proxy.runpod.net

To stop all services, run: ./stop-all.sh
```

Dan bisa akses:
- Frontend: ✅ Login page
- Backend: ✅ http://localhost:8000/docs
- Database: ✅ Connect via psql

---

**Created:** 2025-12-23  
**Version:** 1.0.0  
**Tested on:** RunPod GPU/CPU pods
