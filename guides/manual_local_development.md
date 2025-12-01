# Manual Local Development

Development mode uses different ports (3001/8001) to avoid conflicts with production deployment.

```bash
# Terminal 1 - Backend (port 8001)
cd backend
conda activate prd6
uvicorn main:app --reload --host 0.0.0.0 --port 8001

# Terminal 2 - Frontend (port 3001)
cd frontend

# Development
PORT=3001 pnpm run dev

# or Production
pnpm build
PORT=3001 pnpm start
```

Access: http://localhost:3001 (frontend), http://localhost:8001 (backend)