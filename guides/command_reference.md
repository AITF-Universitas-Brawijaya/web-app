# Command Reference

## PM2 Commands

```bash
# Start applications
pm2 start ecosystem.config.js
pm2 start ecosystem.config.js --only prd-analyst-frontend
pm2 start ecosystem.config.js --only prd-analyst-backend

# Status
pm2 status
pm2 info <app-name>

# Logs
pm2 logs                              # All apps
pm2 logs <app-name>                   # Specific app
pm2 logs <app-name> --lines 50        # Last 50 lines
pm2 logs <app-name> --err             # Only errors
pm2 logs <app-name> --nostream        # Don't follow

# Restart
pm2 restart <app-name>
pm2 restart all

# Stop
pm2 stop <app-name>
pm2 stop all

# Delete
pm2 delete <app-name>
pm2 delete all

# Save & Restore
pm2 save                              # Save process list
pm2 resurrect                         # Restore saved processes

# Startup
pm2 startup                           # Generate startup script
pm2 unstartup                         # Remove startup script

# Monitoring
pm2 monit                             # Real-time dashboard
```

## Nginx Commands

```bash
# Start (with custom config)
sudo nginx -c /home/ubuntu/tim6_prd_workdir/nginx.conf

# Stop
sudo pkill nginx

# Restart (CORRECT WAY)
sudo pkill nginx
sudo nginx -c /home/ubuntu/tim6_prd_workdir/nginx.conf

# Or use script
scripts/restart-nginx.sh

# Test configuration
sudo nginx -t -c /home/ubuntu/tim6_prd_workdir/nginx.conf

# Reload configuration
sudo nginx -s reload -c /home/ubuntu/tim6_prd_workdir/nginx.conf

# View logs
tail -f nginx/error.log
tail -f nginx/access.log
```

## System Commands

```bash
# Check ports
ss -tlnp | grep :80
ss -tlnp | grep :3000
ss -tlnp | grep :8000

# Check processes
ps aux | grep nginx
ps aux | grep node
ps aux | grep python

# Kill process by port
sudo lsof -i :80
sudo kill -9 <PID>

# System resources
htop
free -h
df -h
```

## Testing Commands

```bash
# Test frontend
curl -I http://localhost:3000
curl -I http://localhost

# Test backend
curl http://localhost:8000/
curl http://localhost/api/

# Test public URL
curl -I https://nghbz6f39eg4xx-80.proxy.runpod.net/login
``