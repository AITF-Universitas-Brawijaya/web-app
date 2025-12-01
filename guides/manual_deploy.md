# Manual Deployment

**The script will:**
- ✅ Check prerequisites
- ✅ Build Next.js application
- ✅ Configure Nginx
- ✅ Start both frontend and backend with PM2
- ✅ Verify deployment

## Manual deployment steps:

```bash
# 1. Build frontend
cd frontend
npm install
npm run build

# 2. Start PM2
cd ..
pm2 start ecosystem.config.js
pm2 save

# 3. Start Nginx
sudo nginx -c /home/ubuntu/tim6_prd_workdir/nginx.conf

# 4. Verify
pm2 status
ss -tlnp | grep -E ":(80|3000|8000)"
```

## Detailed Deployment Explanation

### Step 1: Environment Configuration

#### Frontend Environment

Create/update `frontend/.env.local`:

```bash
# Leave empty to use relative URLs
NEXT_PUBLIC_API_URL=
```

**Important**: Do NOT use `http://127.0.0.1:8000` as it will fail when accessed from public URL!

#### Backend Environment

Backend uses conda environment `prd6`. Ensure all dependencies are installed:

```bash
conda activate prd6
pip install fastapi uvicorn python-dotenv
```

### Step 2: Build Applications

#### Build Frontend

```bash
cd frontend
npm install  # or pnpm install
npm run build
```

#### Verify Backend

```bash
cd backend
# Test backend can start
conda activate prd6
uvicorn main:app --host 0.0.0.0 --port 8000
# Ctrl+C to stop
```

### Step 3: Configure PM2

The `ecosystem.config.js` file manages both applications:

```javascript
module.exports = {
  apps: [
    {
      name: 'prd-analyst-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/home/ubuntu/tim6_prd_workdir/frontend',
      // ... frontend config
    },
    {
      name: 'prd-analyst-backend',
      script: '/home/ubuntu/tim6_prd_workdir/start-backend.sh',
      cwd: '/home/ubuntu/tim6_prd_workdir/backend',
      // ... backend config
    }
  ]
};
```

**Backend Wrapper Script** (`start-backend.sh`):
```bash
#!/bin/bash
source /home/ubuntu/miniconda3/etc/profile.d/conda.sh
conda activate prd6
cd /home/ubuntu/tim6_prd_workdir/backend
exec uvicorn main:app --host 0.0.0.0 --port 8000
```

### Step 4: Configure Nginx

The `nginx.conf` file routes requests:

```nginx
server {
    listen 80;
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        # ... proxy headers
    }
    
    # Frontend (default)
    location / {
        proxy_pass http://localhost:3000;
        # ... proxy headers
    }
}
```

### Step 5: Start Services

```bash
# Start PM2 applications
pm2 start ecosystem.config.js
pm2 save

# Start Nginx
sudo nginx -c /home/ubuntu/tim6_prd_workdir/nginx.conf
```