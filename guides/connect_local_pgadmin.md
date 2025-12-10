# PostgreSQL Remote Access via pgAdmin Docker + SSH Tunnel

Panduan untuk mengakses database PostgreSQL di VPS menggunakan pgAdmin yang berjalan dalam Docker pada laptop, dengan koneksi melalui SSH tunnel.

## 1. SSH Config VPS

```

Host prd-vps
HostName 213.173.108.10
User ubuntu
Port 17470
IdentityFile ~/.ssh/id_ed25519

````

Pastikan PostgreSQL berjalan pada port `5432`.

## 2. Membuat SSH Tunnel

Jalankan di laptop (bukan di Docker). Biarkan terminal tetap terbuka selama digunakan.

```bash
ssh -N -L 0.0.0.0:55432:localhost:5432 -i ~/.ssh/id_ed25519 -p 17470 ubuntu@213.173.108.10
````

Cek tunnel aktif:

```bash
ss -tulpn | grep 55432
```

Harus muncul:

```
tcp LISTEN 0.0.0.0:55432 ...
```

## 3. Menjalankan pgAdmin dalam Docker

Hentikan container lama jika ada:

```bash
docker stop pgadmin && docker rm pgadmin
```

Jalankan:

```bash
docker run -d \
  --name pgadmin \
  -p 8080:80 \
  -e PGADMIN_DEFAULT_EMAIL=admin@example.com \
  -e PGADMIN_DEFAULT_PASSWORD=admin \
  --add-host=host.docker.internal:host-gateway \
  dpage/pgadmin4
```

Akses pgAdmin:
[http://localhost:8080](http://localhost:8080)

## 4. Menambahkan Server PostgreSQL di pgAdmin

### Connection Tab

| Field          | Value                  |
| -------------- | ---------------------- |
| Host           | `host.docker.internal` |
| Port           | `55432`                |
| Maintenance DB | `prd`                  |
| Username       | `postgres`             |
| Password       | `root`                 |
