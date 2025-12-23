# 🚀 RunPod Quick Setup

Setup cepat PRD Analyst di RunPod dalam 3 langkah!

## ⚡ Quick Start

```bash
# 1. Jalankan setup
chmod +x setup-runpod.sh
./setup-runpod.sh

# 2. Reload shell
source ~/.bashrc

# 3. Start services
./start-runpod.sh
```

## 🌐 Akses Aplikasi

**Public URL (auto-detected):**
```
https://<POD_ID>-3000.proxy.runpod.net
```

**Atau configure port forwarding di RunPod dashboard untuk port 3000**

## 📋 Management Commands

### Services
```bash
./start-runpod.sh      # Start semua services
./stop-all.sh          # Stop semua services
```

### PostgreSQL
```bash
# Start
su - postgres -c '/usr/lib/postgresql/*/bin/pg_ctl -D /workspace/postgresql/data start'

# Stop
su - postgres -c '/usr/lib/postgresql/*/bin/pg_ctl -D /workspace/postgresql/data stop'

# Status
su - postgres -c '/usr/lib/postgresql/*/bin/pg_ctl -D /workspace/postgresql/data status'
```

### Database Backup
```bash
./backup-database.sh
```

## 🔧 Troubleshooting

### PostgreSQL tidak running
```bash
su - postgres -c '/usr/lib/postgresql/*/bin/pg_ctl -D /workspace/postgresql/data start'
```

### Port sudah digunakan
```bash
./stop-all.sh
kill -9 $(lsof -t -i:3000)
```

### Conda tidak ditemukan
```bash
source ~/.bashrc
```

## 📚 Dokumentasi Lengkap

Lihat [docs/RUNPOD-DEPLOYMENT.md](docs/RUNPOD-DEPLOYMENT.md) untuk panduan lengkap.

## 🎯 Ports

| Service | Port |
|---------|------|
| Frontend | 3000 |
| Backend | 8000 |
| Integrasi | 7000 |
| PostgreSQL | 5432 |

## ⚠️ Penting

- Database disimpan di `/workspace/postgresql/data` (persistent)
- Backup database sebelum eksperimen: `./backup-database.sh`
- Ganti password default di production!

---

**Setup Script:** `setup-runpod.sh`  
**Full Guide:** `docs/RUNPOD-DEPLOYMENT.md`
