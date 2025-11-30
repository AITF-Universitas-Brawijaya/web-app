# Helper scripts

### `scripts/start-dev.sh`

Script untuk menjalankan aplikasi dengan mudah (development/production).

**Usage:**
```bash
# Development mode (dengan hot-reload)
scripts/start-dev.sh dev

# Production mode (optimized build)
scripts/start-dev.sh prod
```

**Features:**
- ✅ Auto-cleanup ports yang sudah digunakan
- ✅ Menjalankan backend dan frontend secara berurutan
- ✅ Menunggu hingga service benar-benar ready
- ✅ Menampilkan informasi PID dan log location

### `scripts/stop-dev.sh`

Script untuk menghentikan semua proses aplikasi.

**Usage:**
```bash
scripts/stop-dev.sh
```

**Features:**
- ✅ Menghentikan semua proses frontend (port 3000)
- ✅ Menghentikan semua proses backend (port 8000)
- ✅ Verifikasi bahwa semua proses sudah berhenti

### `scripts/deploy.sh`

Automated deployment script dengan PM2 dan Nginx.

**Usage:**
```bash
scripts/deploy.sh
```

**Features:**
- ✅ Check prerequisites (PM2, Nginx)
- ✅ Build Next.js application
- ✅ Configure Nginx
- ✅ Start PM2 applications
- ✅ Verify deployment

### `scripts/update-app.sh`

Quick update script untuk code changes.

**Usage:**
```bash
scripts/update-app.sh
```

**Features:**
- ✅ Pull latest code (if using Git)
- ✅ Install dependencies
- ✅ Build application
- ✅ Restart PM2
- ✅ Show recent logs

### `scripts/restart-nginx.sh`

Nginx restart script (always uses correct config).

**Usage:**
```bash
scripts/restart-nginx.sh
```

**Features:**
- ✅ Always uses custom nginx.conf
- ✅ Stops existing Nginx
- ✅ Starts with correct configuration
- ✅ Verifies Nginx is running
- ✅ Tests local access.