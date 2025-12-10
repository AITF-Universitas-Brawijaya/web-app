# Manual Update

```bash
# 1. Pull latest code
git pull

# 2. Update frontend
cd frontend
npm install
npm run build

# 3. Restart PM2
cd ..
pm2 restart all
pm2 save
```