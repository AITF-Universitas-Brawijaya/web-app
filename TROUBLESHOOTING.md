# Troubleshooting Guide - PRD Analyst Dashboard

## Masalah Umum dan Solusinya

### 1. Error: `pnpm run dev` berhasil tapi `pnpm start` error

#### Gejala:
```
⨯ Failed to start server
Error: listen EADDRINUSE: address already in use :::3000
```

#### Penyebab:
- Port 3000 sudah digunakan oleh proses lain (biasanya `pnpm run dev` yang masih berjalan)
- Perbedaan behavior antara development dan production mode:
  - **Development mode** (`pnpm run dev`): Otomatis mencari port lain jika 3000 sudah digunakan
  - **Production mode** (`pnpm start`): Langsung error jika port sudah digunakan

#### Solusi:

**Opsi 1: Hentikan proses yang menggunakan port 3000**
```bash
# Cari proses yang menggunakan port 3000
ps aux | grep -E 'next|node' | grep -v grep

# Hentikan proses tersebut (ganti <PID> dengan nomor yang sesuai)
kill -9 <PID>

# Atau gunakan script helper
./stop-app.sh
```

**Opsi 2: Gunakan port yang berbeda**
```bash
pnpm start -p 3001
```

**Opsi 3: Gunakan script helper yang sudah disediakan**
```bash
# Untuk development
./start-app.sh dev

# Untuk production
./start-app.sh prod
```

---

### 2. Error: "Application error: a client-side exception has occurred"

#### Gejala:
Saat mengakses `http://localhost:3000`, muncul error:
```
Application error: a client-side exception has occurred while loading localhost
(see the browser console for more information)
```

#### Penyebab:
- Di Next.js 15+, penggunaan `redirect()` langsung di component body tidak diperbolehkan di production mode
- File `src/app/page.tsx` menggunakan `redirect()` tanpa proper handling

#### Solusi:
File `src/app/page.tsx` sudah diperbaiki dengan menambahkan `RedirectType.replace`:

```typescript
import { redirect, RedirectType } from "next/navigation"

export default function HomePage() {
  redirect("/login", RedirectType.replace)
}
```

**Langkah-langkah:**
1. Rebuild aplikasi:
   ```bash
   cd frontend
   pnpm build
   ```

2. Restart production server:
   ```bash
   pnpm start
   ```

---

### 3. Backend tidak dapat diakses dari frontend

#### Gejala:
- Frontend tidak bisa fetch data dari backend
- Error CORS atau connection refused

#### Solusi:

**Cek konfigurasi environment:**
```bash
cat frontend/.env.local
```

Pastikan berisi:
```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

**Cek apakah backend berjalan:**
```bash
curl http://127.0.0.1:8000/health
# atau
curl http://127.0.0.1:8000/
```

**Restart backend jika perlu:**
```bash
cd backend
conda activate prd_analyst
uvicorn main:app --reload
```

---

## Script Helper

### `start-app.sh`
Script untuk menjalankan aplikasi dengan mudah.

**Usage:**
```bash
# Development mode (dengan hot-reload)
./start-app.sh dev

# Production mode (optimized build)
./start-app.sh prod
```

**Fitur:**
- ✅ Otomatis membersihkan port yang sudah digunakan
- ✅ Menjalankan backend dan frontend secara berurutan
- ✅ Menunggu hingga service benar-benar ready
- ✅ Menampilkan informasi PID dan log location

### `stop-app.sh`
Script untuk menghentikan semua proses aplikasi.

**Usage:**
```bash
./stop-app.sh
```

**Fitur:**
- ✅ Menghentikan semua proses frontend (port 3000)
- ✅ Menghentikan semua proses backend (port 8000)
- ✅ Verifikasi bahwa semua proses sudah berhenti

---

## Perintah Berguna

### Cek proses yang berjalan
```bash
# Cek semua proses Node.js
ps aux | grep -E 'next|node' | grep -v grep

# Cek proses di port tertentu
lsof -i :3000  # Frontend
lsof -i :8000  # Backend
```

### Hentikan proses manual
```bash
# Hentikan berdasarkan PID
kill -9 <PID>

# Hentikan berdasarkan port
lsof -ti:3000 | xargs kill -9
lsof -ti:8000 | xargs kill -9

# Hentikan berdasarkan nama proses
pkill -f "next-server"
pkill -f "uvicorn"
```

### Lihat log
```bash
# Log frontend (jika menggunakan start-app.sh)
tail -f /tmp/frontend.log

# Log backend (jika menggunakan start-app.sh)
tail -f /tmp/backend.log
```

---

## Workflow Rekomendasi

### Development
```bash
# 1. Jalankan aplikasi dalam mode development
./start-app.sh dev

# 2. Akses aplikasi
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000

# 3. Hentikan aplikasi saat selesai
./stop-app.sh
```

### Production Testing
```bash
# 1. Build dan jalankan dalam mode production
./start-app.sh prod

# 2. Test aplikasi
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000

# 3. Hentikan aplikasi
./stop-app.sh
```

### Manual Development (tanpa script)
```bash
# Terminal 1 - Backend
cd backend
conda activate prd_analyst
uvicorn main:app --reload

# Terminal 2 - Frontend
cd frontend
pnpm run dev
```

### Manual Production (tanpa script)
```bash
# Terminal 1 - Backend
cd backend
conda activate prd_analyst
uvicorn main:app --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend
cd frontend
pnpm build
pnpm start
```

---

## Catatan Penting

1. **Selalu build ulang** setelah mengubah kode di production mode:
   ```bash
   cd frontend
   pnpm build
   ```

2. **Pastikan environment variables** sudah di-set dengan benar di `frontend/.env.local`

3. **Gunakan mode development** untuk development aktif (hot-reload)

4. **Gunakan mode production** untuk testing performa dan behavior production

5. **Jangan lupa activate conda environment** sebelum menjalankan backend:
   ```bash
   conda activate prd_analyst
   ```

---

## Kontak

Jika masih mengalami masalah, hubungi:
- Team: AITF UB
- Repository: AITF-Universitas-Brawijaya/prototype-dashboard-chatbot
