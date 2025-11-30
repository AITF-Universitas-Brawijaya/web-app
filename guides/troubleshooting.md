# Troubleshooting

## Issue 1: Backend Not Running

**Symptoms**: PM2 shows backend restarting constantly

**Cause**: Missing conda environment or dependencies

**Solution**:
```bash
# Check backend logs
pm2 logs prd-analyst-backend --err

# Verify conda environment
conda activate prd6
python -c "import fastapi; print('OK')"

# Restart backend
pm2 restart prd-analyst-backend
```

## Issue 2: Frontend Can't Connect to Backend

**Symptoms**: "Failed to load data" in dashboard

**Cause**: Wrong `NEXT_PUBLIC_API_URL` in `.env.local`

**Solution**:
```bash
# Use empty/relative URL
echo "NEXT_PUBLIC_API_URL=" > frontend/.env.local

# Rebuild and restart
cd frontend
npm run build
cd ..
pm2 restart prd-analyst-frontend
```

## Issue 3: Nginx Not Working After Restart

**Symptoms**: Public URL returns 404 or wrong content

**Cause**: Nginx started with default config instead of custom config

**Solution**:
```bash
# ALWAYS use config file flag
sudo pkill nginx
sudo nginx -c /home/ubuntu/tim6_prd_workdir/nginx.conf

# Or use script
scripts/restart-nginx.sh
```

## Issue 4: Port Already in Use

**Symptoms**: "Address already in use" error

**Solution**:
```bash
# Find process using port
sudo lsof -i :80    # or :3000 or :8000

# Kill process
sudo kill -9 <PID>

# Restart service
pm2 restart all
# or
sudo nginx -c /home/ubuntu/tim6_prd_workdir/nginx.conf
```

## Issue 5: Public URL 404

**Symptoms**: RunPod proxy returns 404

**Possible Causes**:
1. Port 80 not exposed in RunPod dashboard
2. RunPod pod needs restart
3. Nginx not running

**Solution**:
```bash
# 1. Check Nginx is running
ps aux | grep nginx

# 2. Check port 80 listening
ss -tlnp | grep :80

# 3. Test local access
curl -I http://localhost

# 4. If local works but public doesn't:
#    - Expose port 80 in RunPod dashboard
#    - Restart RunPod pod
#    - Wait 1-2 minutes for propagation
```

## Issue 6: PM2 Process Crashed

**Symptoms**: PM2 shows status as "errored" or "stopped"

**Solution**:
```bash
# View error logs
pm2 logs <app-name> --err

# Delete and restart
pm2 delete <app-name>
pm2 start ecosystem.config.js --only <app-name>

# Save configuration
pm2 save
```

## Issue 7: Development Mode Works but Production Fails

**Symptoms**: `pnpm run dev` works but `pnpm start` gives error

```
⨯ Failed to start server
Error: listen EADDRINUSE: address already in use :::3000
```

**Cause**: 
- Port 3000 already in use (usually by dev server still running)
- Development mode auto-finds another port, production mode doesn't

**Solution**:

**Option 1: Stop existing process**
```bash
# Find process using port 3000
ps aux | grep -E 'next|node' | grep -v grep

# Kill process
kill -9 <PID>

# Or use helper script
scripts/stop-dev.sh
```

**Option 2: Use different port**
```bash
pnpm start -p 3001
```

**Option 3: Use helper scripts**
```bash
# For development
scripts/start-dev.sh dev

# For production
scripts/start-dev.sh prod
```

## Issue 8: Application Error in Production

**Symptoms**: "Application error: a client-side exception has occurred"

**Cause**: Next.js 15+ doesn't allow `redirect()` directly in component body in production

**Solution**:
Already fixed in `src/app/page.tsx` with `RedirectType.replace`:

```typescript
import { redirect, RedirectType } from "next/navigation"

export default function HomePage() {
  redirect("/login", RedirectType.replace)
}
```

If you still see this error:
```bash
cd frontend
pnpm build
pm2 restart prd-analyst-frontend
```

## Issue 9: Backend Cannot Be Accessed from Frontend

**Symptoms**: Frontend can't fetch data, CORS or connection refused errors

**Solution**:

**Check environment configuration:**
```bash
cat frontend/.env.local
```

Should be empty for relative URLs:
```
NEXT_PUBLIC_API_URL=
```

**Check backend is running:**
```bash
curl http://localhost:8000/
```

**Restart backend if needed:**
```bash
pm2 restart prd-analyst-backend
```

## Issue 10: Conda Environment Not Found

**Symptoms**: Backend fails with "conda: command not found" or environment not found

**Solution**:
```bash
# Check conda environments
conda env list

# If prd6 doesn't exist, create it
conda create -n prd6 python=3.11

# Activate and install dependencies
conda activate prd6
cd backend
pip install -r requirements.txt

# Restart backend
pm2 restart prd-analyst-backend
```