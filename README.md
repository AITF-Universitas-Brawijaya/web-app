# PRD Analyst Dashboard v2

Dashboard analisis untuk review dan triage hasil deteksi konten. Dibangun dengan arsitektur full-stack menggunakan **Next.js** (App Router) + **FastAPI** backend, dengan integrasi database PostgreSQL dan AI assistant powered by Google Gemini.

---

## 🚀 Deployment

**Frontend**: [https://prd-analyst.vercel.app](https://prd-analyst.vercel.app)

---

## 📋 Arsitektur

### **Frontend**
- **Framework**: Next.js 16 (App Router)
- **UI**: React 19 + TypeScript + TailwindCSS v4
- **State Management**: SWR untuk data fetching
- **Visualisasi**: Recharts untuk grafik dan analytics
- **Styling**: Radix UI components + Lucide icons

### **Backend**
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy
- **AI Integration**: Google Gemini API
- **Server**: Uvicorn (ASGI)

### **Database Schema**
- `crawling_data` - Data hasil crawling URL
- `reasoning` - Hasil analisis teks/reasoning
- `object_detection` - Hasil deteksi objek dari gambar
- `results` - Hasil final gabungan reasoning + detection

---

## 🛠️ Setup & Installation

### **Prerequisites**
- Node.js 18+ dan pnpm
- Python 3.9+
- PostgreSQL 14+

### **1. Clone Repository**
```bash
git clone <repository-url>
cd prototype-dashboard-chatbot
```

### **2. Setup Database**
```bash
# Buat database PostgreSQL
createdb prd

# Jalankan schema
psql -d prd -f backend/database/schema.sql
```

### **3. Setup Backend**
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Buat file .env
cat > .env << EOF
DB_URL=postgresql://postgres:root@localhost:5432/prd
FRONTEND_URL=http://localhost:3000
GEMINI_API_KEY=your_gemini_api_key_here
EOF

# Seed data (opsional)
python seed_data.py
```

### **4. Setup Frontend**
```bash
cd frontend

# Install dependencies
pnpm install

# Buat file .env.local
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF
```

---

## 🎯 Menjalankan Aplikasi

### **Development Mode**

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn main:app --reload
```
Backend akan berjalan di `http://localhost:8000`

**Terminal 2 - Frontend:**
```bash
cd frontend
pnpm run dev
```
Frontend akan berjalan di `http://localhost:3000`

### **Production Build**

**Backend:**
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
pnpm build
pnpm start
```

---

## 📁 Struktur File Penting

### **Frontend**
```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Homepage
│   │   └── dashboard/
│   │       └── page.tsx        # Dashboard utama
│   ├── components/
│   │   ├── ui/                 # UI primitives (Button, Dialog, dll)
│   │   └── modals/
│   │       ├── DataTable.tsx   # Tabel data hasil
│   │       └── DetailModal.tsx # Modal detail item
│   └── styles/
│       └── globals.css         # Tailwind entry point
└── package.json
```

### **Backend**
```
backend/
├── main.py                     # FastAPI app entry point
├── db.py                       # Database connection
├── database/
│   └── schema.sql              # Database schema
├── routes/
│   ├── data_routes.py          # CRUD data endpoints
│   ├── chat_routes.py          # Chat assistant API
│   ├── text_analyze_routes.py # Text analysis
│   ├── image_analyze_routes.py # Image analysis
│   ├── law_rag_routes.py       # Legal RAG endpoints
│   ├── update_routes.py        # Update operations
│   └── history_routes.py       # History tracking
├── stores/
│   ├── history_store.py        # Chat history storage
│   └── overrides_store.py      # User overrides
├── seed_data.py                # Data seeding script
└── requirements.txt
```

---

## 💻 Perintah Pengguna

### **Database Management**
```bash
# Seed data dari CSV
cd backend
python seed_data.py

# Reset database
psql -d prd -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql -d prd -f database/schema.sql

# Backup database
pg_dump prd > backup_$(date +%Y%m%d).sql

# Restore database
psql -d prd < backup_20250120.sql
```

### **Development**
```bash
# Install semua dependencies
cd frontend && pnpm install
cd ../backend && pip install -r requirements.txt

# Run tests (jika ada)
cd frontend && pnpm test
cd backend && pytest

# Lint & format
cd frontend && pnpm lint
cd backend && black . && flake8
```

### **Git Workflow**
```bash
# Buat branch baru
git checkout -b dev-username

# Commit changes
git add .
git commit -m "feat: description"

# Push ke remote
git push origin dev-username

# Merge ke master (setelah review)
git checkout master
git merge dev-username
git push origin master
```

---

## 🐛 Troubleshooting

### **Problem: Backend tidak bisa connect ke database**
```bash
# Error: "could not connect to server"
# Solusi:
1. Pastikan PostgreSQL running:
   sudo systemctl status postgresql
   sudo systemctl start postgresql

2. Cek connection string di .env:
   DB_URL=postgresql://user:password@localhost:5432/prd

3. Test koneksi manual:
   psql -d prd -U postgres
```

### **Problem: Frontend tidak bisa fetch data dari backend**
```bash
# Error: "Failed to fetch" atau CORS error
# Solusi:
1. Pastikan backend running di port 8000
2. Cek NEXT_PUBLIC_API_URL di frontend/.env.local
3. Cek FRONTEND_URL di backend/.env
4. Restart kedua server
```

### **Problem: Module not found di backend**
```bash
# Error: "ModuleNotFoundError: No module named 'xxx'"
# Solusi:
cd backend
pip install -r requirements.txt

# Jika masih error, coba:
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

### **Problem: pnpm command not found**
```bash
# Solusi:
npm install -g pnpm

# Atau gunakan npm sebagai alternatif:
cd frontend
npm install
npm run dev
```

### **Problem: Port sudah digunakan**
```bash
# Error: "Address already in use"
# Solusi untuk port 8000 (backend):
lsof -ti:8000 | xargs kill -9

# Solusi untuk port 3000 (frontend):
lsof -ti:3000 | xargs kill -9
```

### **Problem: Database schema tidak sesuai**
```bash
# Error: "relation does not exist" atau "column does not exist"
# Solusi:
cd backend
psql -d prd -f database/schema.sql

# Jika perlu reset total:
psql -d prd -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql -d prd -f database/schema.sql
python seed_data.py
```

### **Problem: Gemini API error**
```bash
# Error: "API key not valid" atau rate limit
# Solusi:
1. Cek GEMINI_API_KEY di backend/.env
2. Dapatkan API key baru di: https://makersuite.google.com/app/apikey
3. Pastikan API key valid dan tidak expired
4. Cek quota di Google Cloud Console
```

### **Problem: Build error di frontend**
```bash
# Error saat pnpm build
# Solusi:
cd frontend
rm -rf .next node_modules
pnpm install
pnpm build

# Jika masih error, cek TypeScript errors:
pnpm tsc --noEmit
```

---

## 📝 v2 Notes

### **Perubahan dari v1:**
- ✅ **Backend Migration**: Dari Next.js API routes ke FastAPI standalone
- ✅ **Database Integration**: PostgreSQL dengan schema terstruktur
- ✅ **Multi-route Architecture**: Modular routing untuk berbagai fitur
- ✅ **Data Seeding**: Script otomatis untuk populate database
- ✅ **Enhanced UI**: Dashboard dengan data table, modals, dan visualisasi
- ✅ **AI Features**: Text analysis, image analysis, dan legal RAG

### **AI Integration:**
- Primary: Google Gemini API via `@google/generative-ai` SDK
- Fallback: Vercel AI SDK dengan `generateText`
- Response format: Markdown dengan sanitization via `react-markdown` + `remark-gfm`
- **Note**: Gemini adalah setup sementara — akan diganti dengan Mistral sebagai LLM provider

### **Upcoming Features:**
- [ ] Mistral LLM integration
- [ ] Advanced analytics dashboard
- [ ] Batch processing untuk bulk analysis
- [ ] Export data ke CSV/Excel
- [ ] User authentication & authorization

---

## 🤝 Contributing

1. Fork repository
2. Buat branch baru (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

---

## 📄 License

Project ini dibuat untuk keperluan internal AITF Universitas Brawijaya.

---

## 📞 Support

Jika ada pertanyaan atau issue, silakan buat issue di repository atau hubungi tim development.
