# Batch Size Setting - Implementation Summary

## Overview
Menambahkan fitur setting untuk mengatur jumlah domain per batch pada Generator Settings di admin panel.

## Changes Made

### 1. Database Migration
**File**: `/home/ubuntu/web-app/database/migrations/003_add_batch_size_setting.sql`
- Menambahkan unique constraint pada kolom `setting_key` di tabel `generator_settings`
- Menambahkan baris baru dengan `setting_key = 'batch_size'` dan nilai default `10`

### 2. Backend API Endpoints
**File**: `/home/ubuntu/web-app/backend/routes/admin_routes.py`

Menambahkan 2 endpoint baru:

#### GET `/api/admin/generator/batch-size`
- Mengambil nilai batch size dari database
- Hanya dapat diakses oleh administrator
- Return default value `10` jika belum ada di database

#### POST `/api/admin/generator/batch-size`
- Menyimpan nilai batch size ke database
- Validasi: harus berupa integer positif
- Hanya dapat diakses oleh administrator

### 3. Frontend UI
**File**: `/home/ubuntu/web-app/frontend/src/components/admin/GeneratorSettingsSection.tsx`

Menambahkan:
- State management untuk `batchSize` dan `loadingBatchSize`
- Fungsi `handleSaveBatchSize()` untuk menyimpan setting
- UI section baru dengan:
  - Input number dengan min=1, max=100
  - Label dan deskripsi yang jelas
  - Button untuk save
  - Loading state

## How to Use

1. Login sebagai administrator
2. Buka halaman Admin Panel
3. Scroll ke bagian "Generator Settings"
4. Cari section "Batch Size (Domains per Batch)"
5. Masukkan jumlah domain yang diinginkan per batch (1-100)
6. Klik "Save Batch Size"

## Default Value
- Default batch size: **10 domains per batch**

## Database Schema
```sql
Table: generator_settings
- id: integer (primary key)
- setting_key: varchar(100) (unique)
- setting_value: text
- updated_by: varchar(50)
- updated_at: timestamp with time zone
```

## Migration Status
✅ Migration berhasil dijalankan
✅ Data default sudah masuk ke database
✅ Backend endpoints sudah aktif
✅ Frontend UI sudah terintegrasi
