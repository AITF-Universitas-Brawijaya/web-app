# Panduan Sistem PRD Analyst

Dokumen ini berisi panduan lengkap untuk setup, menjalankan, mengelola, dan memecahkan masalah pada sistem PRD Analyst (Native Deployment).

## 1. Instalasi dan Setup Awal

Sistem ini dirancang untuk berjalan di lingkungan Linux (Ubuntu) menggunakan Miniconda untuk manajemen environment Python dan PostgreSQL untuk database.

### Langkah-langkah Setup:

1.  **Pastikan Anda berada di direktori project:**
    ```bash
    cd /home/ubuntu/web-app
    ```

2.  **Jalankan script setup otomatis:**
    Script ini akan menginstal dependencies sistem, Miniconda, membuat environment `prd6`, menginstal library Python/Node.js, dan menyiapkan database.
    ```bash
    ./setup.sh
    ```
    *Tunggu hingga proses selesai.*

## 2. Menjalankan Sistem

Anda dapat menjalankan semua layanan sekaligus menggunakan script yang tersedia. Script ini otomatis mengaktifkan environment Conda (`prd6`) yang diperlukan.

### Menjalankan Semua Layanan
```bash
./start-all.sh
```
Perintah ini akan menjalankan:
*   PostgreSQL Database
*   Integrasi Service (Port 7000)
*   Backend API (Port 8000)
*   Frontend Dashboard (Port 3001)
*   Backup Service Otomatis (Setiap 5 menit)

### Menjalankan Layanan Secara Terpisah (Opsional)
Jika Anda perlu menjalankan layanan satu per satu untuk debugging:

1.  **Aktifkan Conda Environment:**
    ```bash
    conda activate prd6
    ```

2.  **Jalankan Script:**
    *   **Integrasi Service:** `./start-integrasi-service.sh`
    *   **Backend API:** `./start-backend.sh`
    *   **Frontend:** `./start-frontend.sh`

## 3. Menghentikan Sistem

Untuk mematikan semua layanan yang berjalan di background:
```bash
./stop-all.sh
```

## 4. Akses Aplikasi

Setelah sistem berjalan, Anda dapat mengakses:

*   **Dashboard Utama:** [http://localhost:3001](http://localhost:3001)
*   **Backend API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
*   **Integrasi Service:** [http://localhost:7000](http://localhost:7000)

## 5. Manajemen Database

### Lokasi Data
*   Schema Database: `database/backup_schema.sql`
*   Data Database: `database/backup_data.sql`
*   Migrasi: `database/migrations/`

### Backup Otomatis
Sistem menjalankan backup otomatis setiap 5 menit ke file `database/backup_data.sql` dan `database/backup_schema.sql`.

### Backup Manual
Jika Anda ingin melakukan backup manual saat ini juga:
```bash
./backup_db.sh
```

### Restore Database
Untuk mereset database ke kondisi backup terakhir atau file tertentu:
1.  **Pastikan PostgreSQL berjalan.**
2.  **Jalankan perintah restore:**
    ```bash
    # Contoh restore dari migrasi tertentu
    PGPASSWORD=postgres psql -U postgres -h localhost -d prd -f database/migrations/backup-before-cleanup-20251222-094036.sql
    ```

## 6. Troubleshooting & Log

Jika terjadi masalah, Anda dapat memeriksa log yang tersimpan di folder `logs/`.

### Melihat Log Secara Real-time
Gunakan perintah `tail` untuk memantau aktivitas:

*   **Semua Log:**
    ```bash
    tail -f logs/*.log
    ```
*   **Log Backend:**
    ```bash
    tail -f logs/backend.log
    ```
*   **Log Integrasi (Crawler/Detection):**
    ```bash
    tail -f logs/integrasi-service.log
    ```
*   **Log Frontend:**
    ```bash
    tail -f logs/frontend.log
    ```

### Masalah Umum

1.  **Port Already in Use / EADDRINUSE**:
    *   Solusi: Jalankan `./stop-all.sh` lalu coba jalankan kembali.
    *   Jika membandel, cari proses yang menggunakan port: `lsof -i :8000` lalu kill PID-nya.

2.  **Environment Python Error**:
    *   Pastikan Anda sudah menjalankan instalasi dengan benar via `./setup.sh`.
    *   Coba aktifkan environment manual: `conda activate prd6`.

3.  **Crawler Tidak Menyimpan Gambar**:
    *   Pastikan folder `integrasi-service/domain-generator/output/img` ada dan memiliki izin tulis.
    *   Sistem sekarang menyimpan gambar sebagai **Base64** di database, bukan hanya file fisik.

## 7. Pembaruan Dependensi

Jika ada perubahan pada `requirements.txt` atau `package.json`:

1.  **Python (Backend/Integrasi):**
    ```bash
    conda activate prd6
    pip install -r requirements.txt
    ```

2.  **Frontend:**
    ```bash
    cd frontend
    npm install
    cd ..
    ```
