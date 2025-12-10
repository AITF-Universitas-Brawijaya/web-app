# Best Practices

## 1. Always Use Scripts

- Use `scripts/deploy.sh` for deployment
- Use `scripts/update-app.sh` for updates
- Use `scripts/restart-nginx.sh` for Nginx restart

## 2. Monitor Regularly

```bash
# Check status daily
pm2 status
ps aux | grep nginx

# Check logs for errors
pm2 logs --err
```

## 3. Save PM2 Configuration

```bash
# After any PM2 changes
pm2 save
```

## 4. Test Before Deploying

```bash
# Test build locally
cd frontend
npm run build

# Test backend locally
conda activate prd6
cd backend
uvicorn main:app --reload
```

## 5. Keep Backups

```bash
# Regular backups
tar -czf backup-$(date +%Y%m%d).tar.gz \
  ecosystem.config.js nginx.conf \
  frontend/.env.local backend/.env
```

## 6. Use Correct Nginx Restart

```bash
# WRONG (uses default config)
sudo nginx

# CORRECT (uses custom config)
sudo nginx -c /home/ubuntu/tim6_prd_workdir/nginx.conf
```