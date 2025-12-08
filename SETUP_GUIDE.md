# 🎯 Quick Briefing - PRD Dashboard Authentication

## Untuk Developer yang Ingin Menggunakan Kode Ini:

### **Apa yang Sudah Diimplementasi:**
✅ User authentication (login/register) dengan JWT
✅ Data segregation per user (setiap user hanya lihat data mereka)
✅ Row Level Security di PostgreSQL
✅ Protected routes di frontend
✅ Password hashing dengan bcrypt

---

### **Yang Perlu Disiapkan:**

#### **1. Software Requirements:**
- Python 3.8+ (untuk backend)
- Node.js 18+ (untuk frontend)
- PostgreSQL 14+ (database)

#### **2. Setup Database:**
```bash
# Buat database
createdb dbprd

# Run schema
psql -d dbprd -f backend/database/schema.sql

# (Optional) Populate test data
python -m backend.populate_dummy_data
```

#### **3. Setup Backend:**
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Buat .env file dengan:
DB_URL=postgresql://postgres:root@localhost:5432/dbprd
SECRET_KEY=your-secret-key-change-this
FRONTEND_URL=http://localhost:3000

# Run server
cd ..
uvicorn backend.main:app --reload --port 8000
```

#### **4. Setup Frontend:**
```bash
cd frontend
npm install

# Buat .env.local dengan:
NEXT_PUBLIC_API_URL=http://localhost:8000

# Run dev server
npm run dev
```

#### **5. Test Login:**
- Buka `http://localhost:3000`
- Login dengan: `test@example.com` / `password123`
- Atau register user baru

---

### **File-File Penting yang Diubah:**

**Backend:**
- `backend/auth.py` - Authentication logic (BARU)
- `backend/routes/auth_routes.py` - Login/Register endpoints (BARU)
- `backend/routes/data_routes.py` - Protected data dengan user filter
- `backend/database/schema.sql` - Database schema dengan RLS

**Frontend:**
- `frontend/src/app/login/page.tsx` - Real API login (bukan hardcoded)
- `frontend/src/app/dashboard/page.tsx` - Include JWT token di requests
- `frontend/src/components/auth/ProtectedRoute.tsx` - Token-based protection

---

### **Cara Kerja Singkat:**

1. **User Register/Login** → Dapat JWT token
2. **Token disimpan** di localStorage
3. **Setiap API request** → Include token di header
4. **Backend verify token** → Extract user_id
5. **Query data** → Filter by user_id (RLS + WHERE clause)
6. **Return data** → Hanya data user tersebut

---

### **Troubleshooting Cepat:**

**"Failed to load data"**
→ Check `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:8000`

**"Unauthorized"**
→ Token expired, logout & login ulang

**"Seeing all users data"**
→ Check RLS enabled & WHERE clause di data_routes.py

---

### **Production Checklist:**

- [ ] Ganti `SECRET_KEY` dengan random string yang kuat
- [ ] Update database credentials
- [ ] Remove dummy data script
- [ ] Enable HTTPS
- [ ] Setup proper CORS
- [ ] Add rate limiting
- [ ] Setup monitoring

---

**Status:** ✅ Ready to Use
**Authentication:** ✅ Working
**Data Segregation:** ✅ Enforced
**Code Quality:** ✅ Clean & Documented
