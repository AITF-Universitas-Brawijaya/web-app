# 🚀 Setup Guide - Tim6 PRD

Panduan lengkap untuk instalasi dan setup aplikasi Tim6 PRD dari awal.

---

## 📋 Prerequisites

Sebelum menjalankan setup, pastikan Anda memiliki:

- **OS**: Ubuntu 20.04+ atau Debian-based Linux
- **User**: User dengan sudo privileges
- **Network**: Koneksi internet untuk download dependencies
- **Disk Space**: Minimal 2GB free space

---

## ⚡ Quick Start (Automated Setup)

Cara tercepat untuk setup seluruh aplikasi:

```bash
cd /home/ubuntu/tim6_prd_workdir
bash setup_complete.sh
```

Script ini akan otomatis:
1. ✅ Install semua native dependencies (Supervisor, PostgreSQL libs, dll)
2. ✅ Install semua Python packages dari requirements.txt
3. ✅ Install Playwright dan Chromium browser
4. ✅ Setup environment variables (.env)
5. ✅ Configure dan start Supervisor
6. ✅ Start Main API service pada port 3000

**Estimasi waktu**: 5-10 menit (tergantung koneksi internet)

---

## 📦 What Gets Installed

### Native Dependencies (System Level)

| Package | Purpose | Version |
|---------|---------|---------|
| **supervisor** | Process manager | Latest |
| **libpq-dev** | PostgreSQL client libs | Latest |
| **python3** | Python runtime | 3.8+ |
| **python3-pip** | Python package manager | Latest |
| **Chromium libs** | Browser dependencies | Latest |

### Python Dependencies

Lihat file `requirements.txt` untuk daftar lengkap. Highlights:

- **fastapi** (0.124.4) - Web framework
- **uvicorn** (0.38.0) - ASGI server
- **playwright** (1.57.0) - Browser automation
- **sqlalchemy** (2.0.23) - Database ORM
- **beautifulsoup4** (4.14.3) - Web scraping
- **duckduckgo-search** (8.1.1) - Search API

### Playwright Browsers

- **Chromium** - Untuk screenshot dan web scraping

---

## 🔧 Manual Setup (Step by Step)

Jika Anda ingin setup manual atau troubleshooting:

### Step 1: Update System
```bash
sudo apt-get update
```

### Step 2: Install Supervisor
```bash
sudo apt-get install -y supervisor
supervisord --version
```

### Step 3: Install PostgreSQL Client Libraries
```bash
sudo apt-get install -y libpq-dev
```

### Step 4: Install Python Dependencies
```bash
cd /home/ubuntu/tim6_prd_workdir
pip3 install -r requirements.txt
```

### Step 5: Install Playwright Browsers
```bash
playwright install chromium
sudo playwright install-deps chromium
```

### Step 6: Setup Environment
```bash
# Copy example env file
cp .env.example .env

# Edit dengan konfigurasi Anda
nano .env
```

### Step 7: Start Supervisor
```bash
cd /home/ubuntu/tim6_prd_workdir
supervisord -c supervisor/supervisord.conf
```

### Step 8: Check Status
```bash
supervisorctl -c supervisor/supervisord.conf status
```

---

## 🔍 Verification

### Check All Services Running
```bash
# Check supervisor
supervisorctl -c supervisor/supervisord.conf status

# Check API responding
curl http://localhost:3000/

# Check logs
tail -f supervisor/main_api.out.log
```

### Test API Endpoint
```bash
# Health check
curl http://localhost:3000/

# Test with API key
curl -X POST http://localhost:3000/process \
  -H "X-API-Key: tim6-secret-key-2025" \
  -H "Content-Type: application/json" \
  -d '{"data": "test", "num_domains": 5}'
```

---

## 🎮 Managing the Application

### Supervisor Commands

```bash
# Lihat status semua service
supervisorctl -c supervisor/supervisord.conf status

# Start service
supervisorctl -c supervisor/supervisord.conf start main_api

# Stop service
supervisorctl -c supervisor/supervisord.conf stop main_api

# Restart service (setelah edit code)
supervisorctl -c supervisor/supervisord.conf restart main_api

# Shutdown supervisor
supervisorctl -c supervisor/supervisord.conf shutdown
```

### View Logs

```bash
# Real-time output log
tail -f supervisor/main_api.out.log

# Real-time error log
tail -f supervisor/main_api.err.log

# View last 50 lines
tail -n 50 supervisor/main_api.out.log
```

---

## 🐛 Troubleshooting

### Issue: Supervisor won't start

**Symptom**: `supervisord` command fails

**Solution**:
```bash
# Check if already running
ps aux | grep supervisord

# Kill existing process
pkill supervisord

# Remove stale PID file
rm supervisor/supervisord.pid

# Start again
supervisord -c supervisor/supervisord.conf
```

### Issue: Port 3000 already in use

**Symptom**: API fails to start, port conflict

**Solution**:
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Restart API
supervisorctl -c supervisor/supervisord.conf restart main_api
```

### Issue: Python import errors

**Symptom**: Module not found errors

**Solution**:
```bash
# Reinstall dependencies
pip3 install -r requirements.txt --force-reinstall

# Verify imports
python3 -c "import fastapi; import playwright; print('OK')"
```

### Issue: Playwright browser not found

**Symptom**: Browser executable not found

**Solution**:
```bash
# Install Chromium
playwright install chromium

# Install system dependencies
sudo playwright install-deps chromium
```

### Issue: Database connection failed

**Symptom**: Cannot connect to PostgreSQL

**Solution**:
```bash
# Check .env configuration
cat .env | grep DB_

# Test connection
psql -h 54.169.163.120 -U postgres -d prd

# Update .env if needed
nano .env
```

---

## 📁 File Structure

```
tim6_prd_workdir/
├── setup_complete.sh          # 🆕 Automated setup script
├── requirements.txt           # 🆕 Python dependencies
├── .env                       # Environment variables
├── .env.example              # Environment template
├── main_api.py               # Main API application
├── supervisor/
│   ├── supervisord.conf      # Supervisor config
│   ├── main_api.out.log      # Output logs
│   └── main_api.err.log      # Error logs
├── domain-generator/
│   └── crawler.py            # Domain crawler script
└── SUPERVISORD_GUIDE.md      # Supervisor documentation
```

---

## 🔐 Security Notes

1. **API Key**: Default key adalah `tim6-secret-key-2025`
   - Ganti di `main_api.py` untuk production
   
2. **Database Password**: Update di `.env`
   - Jangan commit `.env` ke git
   
3. **Firewall**: Pastikan port 3000 hanya accessible dari trusted sources

---

## 🚀 Next Steps After Setup

1. **Configure Environment**
   ```bash
   nano .env
   # Update database credentials
   # Update backend URLs
   ```

2. **Test API**
   ```bash
   curl http://localhost:3000/
   ```

3. **Monitor Logs**
   ```bash
   tail -f supervisor/main_api.out.log
   ```

4. **Setup Auto-start on Boot** (Optional)
   ```bash
   # Add to crontab
   @reboot cd /home/ubuntu/tim6_prd_workdir && supervisord -c supervisor/supervisord.conf
   ```

---

## 📞 Quick Reference

| Task | Command |
|------|---------|
| **Setup Everything** | `bash setup_complete.sh` |
| **Start Supervisor** | `supervisord -c supervisor/supervisord.conf` |
| **Check Status** | `supervisorctl -c supervisor/supervisord.conf status` |
| **Restart API** | `supervisorctl -c supervisor/supervisord.conf restart main_api` |
| **View Logs** | `tail -f supervisor/main_api.out.log` |
| **Stop All** | `supervisorctl -c supervisor/supervisord.conf shutdown` |

---

## ✅ Setup Checklist

- [ ] Run `setup_complete.sh`
- [ ] Update `.env` with correct credentials
- [ ] Verify supervisor is running
- [ ] Test API endpoint (curl localhost:3000)
- [ ] Check logs for errors
- [ ] Test domain generation endpoint
- [ ] Setup firewall rules (if needed)
- [ ] Configure auto-start on boot (optional)

---

**Last Updated**: 2025-12-19  
**Version**: 1.0  
**Maintainer**: Tim6 PRD Team
