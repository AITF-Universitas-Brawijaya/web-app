# Environment Variables Template

## Docker Setup

Untuk menjalankan aplikasi dengan Docker, buat file `.env` di root directory dengan isi berikut:

```bash
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=prd

# Backend Configuration
DB_URL=postgresql://postgres:postgres@db:5432/prd
FRONTEND_URL=http://localhost:3000

# Google Gemini API Key
# Get your API key from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Notes

- **Database**: Gunakan `db` sebagai hostname karena Docker networking
- **Ports**: Default ports adalah 5432 (PostgreSQL), 8000 (Backend), 3000 (Frontend)
- **GEMINI_API_KEY**: Wajib diisi untuk fitur AI assistant
