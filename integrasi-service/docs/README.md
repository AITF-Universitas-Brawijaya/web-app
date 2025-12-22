# Main API and Domain Generator

API service for generating and analyzing online gambling domains using web scraping, object detection, and reasoning AI.

## Description

This system performs:
- Domain search using DuckDuckGo Search
- Website screenshots with Playwright
- Visual gambling detection with Object Detection API
- Content analysis with vLLM Reasoning Model
- Results storage in PostgreSQL database

## Tech Stack

**Backend:**
- FastAPI - Web framework
- Uvicorn - ASGI server
- SQLAlchemy - Database ORM
- PostgreSQL - Database

**Web Scraping:**
- Playwright - Browser automation & screenshots
- BeautifulSoup4 - HTML parsing
- DuckDuckGo Search - Search engine API

**Process Management:**
- Supervisor - Process manager for auto-restart

## Project Structure

```
tim6_prd_workdir/
├── main_api.py              # Main API application
├── requirements.txt         # Python dependencies
├── .env                     # Environment variables
├── domain-generator/
│   ├── crawler.py          # Domain crawler & processor
│   ├── blocked_domains.txt # Blocked domains list
│   └── output/             # Generated results
├── supervisor/
│   ├── supervisord.conf    # Supervisor configuration
│   └── *.log               # Process logs
├── test/                   # Test scripts
└── docs/                   # Documentation
```

## Quick Start

### Automated Setup

```bash
cd /home/ubuntu/tim6_prd_workdir
bash setup_prd6.sh
```

The script will install all dependencies and start the service.

### Manual Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
playwright install chromium
```

2. Configure environment:
```bash
cp .env.example .env
nano .env  # Update database credentials
```

3. Start with Supervisor:
```bash
supervisord -c supervisor/supervisord.conf
```

## API Endpoints

**Base URL:** `http://localhost:3000`

**Authentication:** API Key required in header `X-API-Key: tim6-secret-key-2025`

### Endpoints

**GET /** - Health check
```bash
curl http://localhost:3000/
```

**POST /process** - Generate domains from keyword
```bash
curl -X POST http://localhost:3000/process \
  -H "X-API-Key: tim6-secret-key-2025" \
  -H "Content-Type: application/json" \
  -d '{"data": "judi online", "num_domains": 10}'
```

**POST /process-links** - Process from direct URL list
```bash
curl -X POST http://localhost:3000/process-links \
  -H "X-API-Key: tim6-secret-key-2025" \
  -H "Content-Type: application/json" \
  -d '{"links": ["https://example.com"], "num_domains": 5}'
```

**POST /chat** - Chat with AI about domains
```bash
curl -X POST http://localhost:3000/chat \
  -H "X-API-Key: tim6-secret-key-2025" \
  -H "Content-Type: application/json" \
  -d '{"message": "analyze this domain", "context": {...}}'
```

## Management

### Supervisor Commands

```bash
# Check status
supervisorctl -c supervisor/supervisord.conf status

# Restart service
supervisorctl -c supervisor/supervisord.conf restart main_api

# View logs
tail -f supervisor/main_api.out.log

# Stop all
supervisorctl -c supervisor/supervisord.conf shutdown
```

### Logs

- Output: `supervisor/main_api.out.log`
- Errors: `supervisor/main_api.err.log`
- Crawler: `supervisor/crawler_process.log`

## Dependencies

### Native Dependencies
- Supervisor - Process manager
- PostgreSQL client libraries
- Chromium - Browser for screenshots

### Python Dependencies
See `requirements.txt` for complete list.

Key packages:
- fastapi==0.124.4
- playwright==1.57.0
- sqlalchemy==2.0.23
- beautifulsoup4==4.14.3
- duckduckgo-search==8.1.1

## Configuration

### Environment Variables (.env)

```bash
# Database
DB_URL=postgresql://user:pass@host:5432/dbname

# Backend
BACKEND_URL=http://backend-host
BACKEND_LOG_URL=http://backend-host/api/crawler/log
```

### Supervisor Config

File: `supervisor/supervisord.conf`

Service will auto-start and auto-restart on crash.

## External Services

This service requires:

1. **PostgreSQL Database** (port 5432)
   - Database: `prd`
   - Tables: `generated_domains`, `object_detection`, `reasoning_results`

2. **Object Detection API** (port 9090)
   - Endpoint: `http://localhost:9090/predict`
   - Input: Screenshot image
   - Output: Detection results

3. **vLLM Reasoning API** (port 8001)
   - Endpoint: `http://localhost:8001/v1/chat/completions`
   - Model: KomdigiUB-8B-Instruct-PRD3
   - Purpose: Content reasoning

## Troubleshooting

### Port 3000 already in use
```bash
lsof -i :3000
kill -9 <PID>
supervisorctl -c supervisor/supervisord.conf restart main_api
```

### Supervisor won't start
```bash
pkill supervisord
rm supervisor/supervisord.pid
supervisord -c supervisor/supervisord.conf
```

### Import error
```bash
pip install -r requirements.txt --force-reinstall
```

### Playwright browser not found
```bash
playwright install chromium
sudo playwright install-deps chromium
```

## Documentation

- `docs/SETUP_GUIDE.md` - Complete setup and troubleshooting
- `docs/SUPERVISORD_GUIDE.md` - Supervisor guide
- `docs/QUICK_REFERENCE.md` - Quick reference commands
- `docs/CONFIG_REFERENCE.md` - Domain generator configuration

## Development

### Run Tests
```bash
cd test/
python3 test_api.py
python3 test_streaming.py
```

### Update Dependencies
```bash
pip freeze > requirements.txt
```

## License

Internal project - Tim 6 PRD AITF UB