# Panduan Supervisord - Tim6 API

## 📋 Apa itu Supervisord?

Supervisord adalah process manager yang menjaga agar aplikasi tetap berjalan di background. Jika aplikasi crash, supervisord akan otomatis restart.

## 🚀 Quick Start

### 1. Install Supervisord
```bash
sudo apt-get update
sudo apt-get install supervisor
```

### 2. Start Service dengan Supervisord
```bash
cd /home/ubuntu/tim6_prd_workdir
supervisord -c supervisor/supervisord.conf
```

### 3. Cek Status
```bash
supervisorctl -c supervisor/supervisord.conf status
```

## 🎮 Perintah Dasar

### Melihat Status Service
```bash
supervisorctl -c supervisor/supervisord.conf status
```

### Start Service
```bash
supervisorctl -c supervisor/supervisord.conf start main_api
```

### Stop Service
```bash
supervisorctl -c supervisor/supervisord.conf stop main_api
```

### Restart Service
```bash
supervisorctl -c supervisor/supervisord.conf restart main_api
```

### Melihat Log Real-time
```bash
# Stdout (output normal)
tail -f supervisor/main_api.out.log

# Stderr (error log)
tail -f supervisor/main_api.err.log
```

## 📁 Struktur File

```
supervisor/
├── supervisord.conf      # Konfigurasi utama
├── supervisord.log       # Log supervisord
├── supervisord.pid       # Process ID
├── supervisor.sock       # Unix socket
├── main_api.out.log      # Output log API
└── main_api.err.log      # Error log API
```

## ⚙️ Konfigurasi

File konfigurasi ada di `supervisor/supervisord.conf`:

```ini
[program:main_api]
command=python3 /home/ubuntu/tim6_prd_workdir/main_api.py
directory=/home/ubuntu/tim6_prd_workdir
autostart=true          # Auto start saat supervisord jalan
autorestart=true        # Auto restart jika crash
startretries=3          # Retry 3x jika gagal start
```

## 🔧 Troubleshooting

### Service tidak mau start?
```bash
# Cek error log
cat supervisor/main_api.err.log

# Cek apakah port 3000 sudah dipakai
lsof -i :3000
```

### Supervisord sudah jalan?
```bash
# Cek process
ps aux | grep supervisord

# Atau cek PID file
cat supervisor/supervisord.pid
```

### Stop semua service
```bash
supervisorctl -c supervisor/supervisord.conf shutdown
```

### Reload konfigurasi
```bash
supervisorctl -c supervisor/supervisord.conf reread
supervisorctl -c supervisor/supervisord.conf update
```

## 🎯 Workflow Lengkap

### Pertama kali setup:
```bash
# 1. Masuk ke direktori
cd /home/ubuntu/tim6_prd_workdir

# 2. Start supervisord
supervisord -c supervisor/supervisord.conf

# 3. Cek status
supervisorctl -c supervisor/supervisord.conf status
```

### Setelah edit code:
```bash
# Restart service untuk apply perubahan
supervisorctl -c supervisor/supervisord.conf restart main_api
```

### Monitoring:
```bash
# Terminal 1: Lihat log
tail -f supervisor/main_api.out.log

# Terminal 2: Test API
curl http://localhost:3000/
```

## 🌐 Test API

Setelah service jalan, test dengan:

```bash
# Health check
curl http://localhost:3000/

# Test dengan API key
curl -X POST http://localhost:3000/process \
  -H "X-API-Key: tim6-secret-key-2025" \
  -H "Content-Type: application/json" \
  -d '{"data": "judi online", "num_domains": 5}'
```

## 💡 Tips

- **Auto start saat boot**: Gunakan systemd untuk start supervisord otomatis
- **Log rotation**: Supervisord otomatis rotate log (max 50MB, 10 backup)
- **Multiple services**: Tambah `[program:nama_service]` di config untuk service lain
- **Environment variables**: Set di config dengan `environment=KEY=value`

## 📞 Quick Reference

| Perintah | Fungsi |
|----------|--------|
| `supervisord -c supervisor/supervisord.conf` | Start supervisord |
| `supervisorctl status` | Lihat status |
| `supervisorctl start main_api` | Start service |
| `supervisorctl stop main_api` | Stop service |
| `supervisorctl restart main_api` | Restart service |
| `supervisorctl shutdown` | Stop supervisord |
| `tail -f supervisor/main_api.out.log` | Monitor log |

---

**Port**: 3000 | **API Key**: tim6-secret-key-2025
