# Database Connection Guide

## ✅ Status Koneksi Database

Database PostgreSQL **TERHUBUNG** dengan sukses!

### 📊 Informasi Database

- **Host**: 54.169.163.120
- **Port**: 5432
- **Database**: prd
- **User**: postgres
- **PostgreSQL Version**: 14.20
- **Database Size**: 12 MB
- **Jumlah Tabel**: 12 tabel

### 📋 Daftar Tabel

| No | Nama Tabel | Ukuran |
|----|------------|--------|
| 1 | announcements | 8192 bytes |
| 2 | audit_log | 56 kB |
| 3 | chat_history | 64 kB |
| 4 | domain_notes | 16 kB |
| 5 | feedback | 16 kB |
| 6 | generated_domains | 96 kB |
| 7 | generator_settings | 16 kB |
| 8 | history_log | 8192 bytes |
| 9 | object_detection | 1632 kB |
| 10 | reasoning | 16 kB |
| 11 | results | 1624 kB |
| 12 | users | 16 kB |

## 🔧 Cara Mengecek Koneksi Database

### 1. Menggunakan Script Python
```bash
python3 check_db_connection.py
```

Script ini akan:
- Test koneksi dengan psycopg2
- Test koneksi dengan SQLAlchemy
- Menampilkan daftar tabel
- Menampilkan statistik database

### 2. Menggunakan Script Bash
```bash
./test_db_connection.sh
```

Script ini akan:
- Test koneksi dengan psql
- Menampilkan versi PostgreSQL
- Menampilkan ukuran database
- Menampilkan daftar tabel dan ukurannya
- Menampilkan jumlah koneksi aktif

### 3. Menggunakan psql Command Langsung
```bash
# Load environment variables dan connect
source .env
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME
```

Atau langsung:
```bash
PGPASSWORD=postgres psql -h 54.169.163.120 -p 5432 -U postgres -d prd
```

### 4. Test Query Sederhana
```bash
PGPASSWORD=postgres psql -h 54.169.163.120 -p 5432 -U postgres -d prd -c "SELECT version();"
```

## 📝 Perintah psql yang Berguna

Setelah connect ke database dengan psql:

```sql
-- List semua tabel
\dt

-- Describe struktur tabel
\d nama_tabel

-- List semua database
\l

-- List semua schema
\dn

-- Keluar dari psql
\q

-- Lihat ukuran database
SELECT pg_size_pretty(pg_database_size('prd'));

-- Lihat ukuran semua tabel
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC;

-- Lihat koneksi aktif
SELECT * FROM pg_stat_activity WHERE datname = 'prd';
```

## ⚙️ Setup Script Updates

Setup script `setup_prd6.sh` sekarang sudah include:

1. ✅ **PostgreSQL client libraries** (libpq-dev) - untuk psycopg2
2. ✅ **XML development libraries** (libxml2-dev, libxslt1-dev) - untuk lxml
3. ✅ **PostgreSQL client** (postgresql-client) - untuk psql command
4. ✅ **Python dependencies** dengan versi yang compatible dengan Python 3.13

## 🔒 Security Notes

**PENTING**: Pastikan security group/firewall di EC2 database server sudah dikonfigurasi untuk:
- Allow inbound traffic dari IP address container/server ini
- Port 5432 (PostgreSQL default port)
- Protocol: TCP

## 🚨 Troubleshooting

Jika koneksi gagal:

1. **Cek firewall/security group**
   ```bash
   # Test port connectivity
   timeout 5 python3 -c "import socket; s=socket.socket(); s.settimeout(5); s.connect(('54.169.163.120', 5432)); print('Port open')"
   ```

2. **Verify credentials di .env**
   ```bash
   cat .env | grep "^DB_"
   ```

3. **Test dengan timeout**
   ```bash
   PGPASSWORD=postgres timeout 10 psql -h 54.169.163.120 -p 5432 -U postgres -d prd -c "SELECT 1;"
   ```

4. **Check logs**
   - Database server logs
   - Application logs di `supervisor/main_api.out.log`

## 📚 Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [psql Command Reference](https://www.postgresql.org/docs/current/app-psql.html)
- [psycopg2 Documentation](https://www.psycopg.org/docs/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
