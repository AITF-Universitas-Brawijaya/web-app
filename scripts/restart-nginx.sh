#!/bin/bash

# Restart Nginx script
# Use this to restart Nginx after configuration changes

CONFIG_FILE="/home/ubuntu/tim6_prd_workdir/nginx.conf"

echo "[INFO] Stopping Nginx..."
sudo pkill nginx
sleep 1

echo "[INFO] Starting Nginx on port 80 with custom config..."
sudo nginx -c "$CONFIG_FILE"

echo "[INFO] Checking Nginx status..."
if ss -tlnp | grep -q ":80"; then
    echo "[OK] Nginx is running on port 80"
    ps aux | grep nginx | grep -v grep | head -5
else
    echo "[ERROR] Nginx is not running"
    exit 1
fi

echo ""
echo "[INFO] Testing local access..."
curl -I http://localhost

echo ""
echo "[OK] Nginx restarted successfully with config: $CONFIG_FILE"
echo ""
echo "To test public access:"
echo "  curl -I https://nghbz6f39eg4xx-80.proxy.runpod.net/login"
echo ""
echo "If public URL returns 404, RunPod may need:"
echo "  1. Port 80 exposed in dashboard, OR"
echo "  2. Pod restart to detect port changes"

