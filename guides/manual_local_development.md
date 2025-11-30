# Manual Local Development

## Manual Development

```bash
# Terminal 1 - Backend
cd backend
conda activate prd6
uvicorn main:app --reload

# Terminal 2 - Frontend
cd frontend
pnpm run dev
```

## Manual Production

```bash
# Terminal 1 - Backend
cd backend
conda activate prd6
uvicorn main:app --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend
cd frontend
pnpm build
pnpm start
```