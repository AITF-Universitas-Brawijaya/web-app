# RunPod Integration - Quick Reference Card

## 🚀 Quick Start (30 seconds)

```bash
cd /home/ubuntu/tim6_prd_workdir
pip3 install -r runpod_requirements.txt
python3 runpod_service_integrated.py
```

## 📡 API Endpoints

### Generate Domains
```bash
curl -X POST http://localhost:8000/process \
  -H "Content-Type: application/json" \
  -d '{
    "data": "judi online, slot gacor",
    "num_domains": 10,
    "job_id": "my-job-123"
  }'
```

### Health Check
```bash
curl http://localhost:8000/health
```

## 🔧 Environment Variables

```bash
export BACKEND_LOG_URL="http://54.169.163.120/api/crawler/log"
export SERVICE_PORT="8000"
export CRAWLER_PATH="/home/ubuntu/tim6_prd_workdir/domain-generator/crawler.py"
```

## 📝 Log Format

```
[INFO]    - General information
[SUCCESS] - Successful operations
[ERROR]   - Error messages
[WARNING] - Warning messages
[DEBUG]   - Debug information
```

## 🧪 Testing

```bash
# Run test suite
python3 test_runpod_service.py

# Test single endpoint
curl http://localhost:8000/health
```

## 🐛 Troubleshooting

### Port in use?
```bash
lsof -i :8000
# Change port: SERVICE_PORT=8001 python3 runpod_service_integrated.py
```

### Backend not reachable?
```bash
curl -v http://54.169.163.120/api/crawler/log
```

### Crawler not found?
```bash
ls -la /home/ubuntu/tim6_prd_workdir/domain-generator/crawler.py
```

## 📂 Key Files

| File | Purpose |
|------|---------|
| `runpod_service_integrated.py` | **Main service** (use this) |
| `runpod_requirements.txt` | Dependencies |
| `start_runpod_service.sh` | Quick start script |
| `test_runpod_service.py` | Test suite |
| `RUNPOD_SERVICE_README.md` | Full docs |
| `IMPLEMENTATION_SUMMARY.md` | Overview |

## 🔄 Service Management

### Start
```bash
python3 runpod_service_integrated.py
```

### With Systemd
```bash
sudo systemctl start runpod-service
sudo systemctl status runpod-service
sudo journalctl -u runpod-service -f
```

## 📊 Request/Response Examples

### Request
```json
{
  "data": "judi online, slot gacor",
  "num_domains": 5,
  "job_id": "abc-123"
}
```

### Response (Success)
```json
{
  "status": "success",
  "domains": ["example1.com", "example2.com"],
  "count": 2,
  "keyword": "judi online, slot gacor"
}
```

### Response (Error)
```json
{
  "status": "error",
  "domains": [],
  "count": 0,
  "keyword": "judi online",
  "error": "Error message here"
}
```

## 🎯 Integration Checklist

- [ ] Install dependencies
- [ ] Verify crawler.py exists
- [ ] Test backend connectivity
- [ ] Start service
- [ ] Run test suite
- [ ] Integrate log route in backend
- [ ] Test end-to-end flow

## 💡 Tips

- **Always provide job_id** for log tracking
- **Logs are non-blocking** - won't fail generation
- **Use integrated version** for production
- **Check health endpoint** before sending requests
- **Monitor logs** with `journalctl -f`

## 🆘 Emergency Commands

```bash
# Kill service on port 8000
lsof -ti :8000 | xargs kill -9

# Check if service is running
ps aux | grep runpod_service

# View recent logs
tail -100 /var/log/runpod_service.out.log

# Test backend connectivity
curl -v http://54.169.163.120/api/crawler/log
```

## 📞 Support

- Full docs: `RUNPOD_SERVICE_README.md`
- Examples: `integration_example.py`
- Tests: `test_runpod_service.py`

---

**Version**: 1.0.0 | **Status**: Production Ready ✅
