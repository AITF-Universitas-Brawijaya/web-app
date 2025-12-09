# Perbaikan Domain Generator - Data Tidak Tersimpan

**Tanggal:** 2025-12-09  
**Status:** ✅ Diperbaiki

## Masalah yang Ditemukan

Setelah menjalankan domain generator, data **tidak tersimpan ke database** meskipun proses crawling berhasil dan file JSON ter-generate.

### Root Cause Analysis

1. **Field API yang Salah**
   - Crawler mencoba mengambil `classification_confidence` dari response API detection
   - Field yang benar adalah `prob_fusion`
   - Ini menyebabkan confidence score menjadi `0.0` atau error

2. **Format Confidence Score**
   - API mengembalikan nilai 0-1 (contoh: 0.4833)
   - Database mengharapkan nilai 0-100 (contoh: 48.3)
   - Perlu konversi dengan mengalikan 100

## Perbaikan yang Dilakukan

### 1. File: `/backend/domain-generator/crawler.py`

#### Perbaikan di fungsi `send_to_detection_api` (line 400-406)

**Sebelum:**
```python
confidence = result.get('classification_confidence', 0.0)
print(f"[DETECTION API] {item_id}: ✓ {status} (confidence: {confidence:.4f})")
```

**Sesudah:**
```python
confidence = result.get('prob_fusion', 0.0)
print(f"[DETECTION API] {item_id}: ✓ {status} (prob_fusion: {confidence:.4f})")
```

#### Perbaikan di fungsi `save_to_database` (line 512-520)

**Sebelum:**
```python
confidence = api_result.get('classification_confidence', 0.0)
confidence_score = round(confidence, 1)
final_confidence = confidence_score
```

**Sesudah:**
```python
# Use prob_fusion as the confidence score (this is what the API actually returns)
confidence = api_result.get('prob_fusion', 0.0)
confidence_score = round(confidence * 100, 1)  # Convert to percentage (0-100)
final_confidence = confidence_score
```

### 2. File: `/backend/requirements.txt`

Ditambahkan dependencies yang hilang untuk domain generator:

```text
# Domain Generator Dependencies
duckduckgo-search==6.3.5
httpx==0.27.2
beautifulsoup4==4.12.3
selenium==4.26.1
requests==2.32.3
```

## Struktur Response API Detection

Untuk referensi, ini adalah struktur response yang benar dari detection API:

```json
{
  "success": true,
  "result": {
    "status": "non_gambling",           // atau "gambling"
    "prob_vit": 0.9466,                 // Probability dari ViT model
    "prob_ocr": 0.02,                   // Probability dari OCR
    "prob_fusion": 0.4833,              // ⭐ INI yang digunakan (fusion probability)
    "label_vit": "gambling",
    "label_ocr": "non_gambling",
    "label_fusion": "non_gambling",
    "detections": [],
    "ocr_text": null,
    "visualization_path": "/results/inference/xxx.webp",
    "id": "uuid-here",
    "timestamp": "2025-12-09T09:09:49.659103"
  }
}
```

## Deployment

1. ✅ Updated `crawler.py` dengan field API yang benar
2. ✅ Updated `requirements.txt` dengan dependencies lengkap
3. ✅ Restart backend PM2: `pm2 restart prd-analyst-backend`

## Testing

Untuk memverifikasi perbaikan:

1. **Generate Domain Baru:**
   - Buka aplikasi
   - Klik tombol "Generate Domain"
   - Masukkan jumlah domain (misal: 2)
   - Klik "Generate"

2. **Cek Database:**
   ```bash
   psql -U postgres -d prd -c "SELECT COUNT(*) FROM results WHERE created_at > NOW() - INTERVAL '5 minutes';"
   ```

3. **Cek Data di Dashboard:**
   - Refresh halaman dashboard
   - Domain baru harus muncul di tabel
   - Confidence score harus terisi dengan benar (0-100)

## Catatan Penting

### Dependencies Installation

User menggunakan **conda environment `prd6`**. Pastikan semua dependencies terinstall di environment yang benar:

```bash
conda activate prd6
pip install duckduckgo-search==6.3.5 httpx==0.27.2 beautifulsoup4==4.12.3 selenium==4.26.1 requests==2.32.3
```

### Confidence Score Format

- **API Response:** 0.0 - 1.0 (contoh: 0.4833 = 48.33%)
- **Database Storage:** 0.0 - 100.0 (contoh: 48.3)
- **Konversi:** `round(prob_fusion * 100, 1)`

### Database Schema

Tabel yang diisi oleh crawler:

1. **`generated_domains`** - Data domain dasar (URL, title, domain, image_path)
2. **`object_detection`** - Hasil detection API (label, confidence, bounding_box, OCR)
3. **`results`** - Data final untuk ditampilkan di dashboard
4. **`audit_log`** - Log aktivitas pembuatan domain

## Troubleshooting

Jika masih ada masalah:

1. **Cek log backend:**
   ```bash
   pm2 logs prd-analyst-backend --lines 50
   ```

2. **Cek apakah crawler berjalan:**
   ```bash
   ls -lth /home/ubuntu/tim6_prd_workdir/backend/domain-generator/output/*.json | head -5
   ```

3. **Test manual crawler:**
   ```bash
   conda activate prd6
   cd /home/ubuntu/tim6_prd_workdir/backend/domain-generator
   python3 crawler.py -n 1 -k "test keyword" -u "testuser"
   ```

4. **Cek database connection:**
   ```bash
   psql -U postgres -d prd -c "SELECT version();"
   ```

## File yang Dimodifikasi

1. `/home/ubuntu/tim6_prd_workdir/backend/domain-generator/crawler.py`
   - Line 400-406: Fix detection API log
   - Line 512-520: Fix confidence score extraction dan conversion

2. `/home/ubuntu/tim6_prd_workdir/backend/requirements.txt`
   - Ditambahkan 5 dependencies baru untuk crawler

3. `/home/ubuntu/tim6_prd_workdir/frontend/src/components/modals/CrawlingModal.tsx`
   - Line 8: Fix API_BASE undefined issue (dari fix sebelumnya)

## Next Steps

Setelah user mengkonfirmasi bahwa domain generator sudah berfungsi dengan baik:

1. ✅ Test dengan jumlah domain lebih banyak (5-10 domain)
2. ✅ Verifikasi confidence score ditampilkan dengan benar di dashboard
3. ✅ Pastikan screenshot dan object detection berfungsi
4. ✅ Cek audit log mencatat created_by dengan benar
