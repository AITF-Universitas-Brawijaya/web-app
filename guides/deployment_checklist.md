# Deployment Checklist

## Pre-Deployment

- [ ] PM2 installed globally
- [ ] Nginx installed
- [ ] Conda environment `prd6` exists
- [ ] Frontend dependencies installed
- [ ] Backend dependencies installed
- [ ] `.env.local` configured correctly

## Deployment

- [ ] Frontend built successfully
- [ ] PM2 applications started
- [ ] Nginx started with correct config
- [ ] PM2 configuration saved

## Post-Deployment

- [ ] PM2 status shows all apps online
- [ ] Port 80 listening
- [ ] Port 3000 listening
- [ ] Port 8000 listening
- [ ] Local access working
- [ ] Public URL accessible (if configured)

## Verification

- [ ] `curl -I http://localhost` returns 200
- [ ] `curl http://localhost:8000/` returns JSON
- [ ] `pm2 logs` shows no errors
- [ ] Dashboard loads without errors
