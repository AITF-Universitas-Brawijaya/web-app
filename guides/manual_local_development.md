# Manual Local Development

Development mode uses different ports (3001/8001) to avoid conflicts with production deployment.

```bash
# Terminal 1 - Backend (port 8001)
cd backend
conda activate prd6
uvicorn main:app --reload --host 0.0.0.0 --port 8001

# Terminal 2 - Frontend (port 3001)
cd frontend
```
Update the NEXT_PUBLIC_API_URL value in .env.local file inside the frontend folder to http://localhost:8001

```bash
PORT=3001 pnpm run dev
```

Access: http://localhost:3001 (frontend), http://localhost:8001 (backend)

If you use local browser then forward port 3001 to your local machine

⚠️ **Once finished, update the NEXT_PUBLIC_API_URL value in .env.local file inside the frontend folder to leave it blank**