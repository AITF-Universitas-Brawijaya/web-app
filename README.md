# PRD Analyst

AI-powered dashboard for Pengawasan Ruang Digital (PRD) analysis with intelligent chatbot.

**Public URL**: https://p5of745zrn7l3a-80.proxy.runpod.net/

## Documentation

**[Complete Guide](GUIDES.md)** - Comprehensive setup and deployment, troubleshooting, and command reference

## Architecture

```
Internet (HTTPS)
    ↓
RunPod Proxy: https://p5of745zrn7l3a-80.proxy.runpod.net/
    ↓
Container Port 80 → Nginx (Reverse Proxy)
    ├─ /api/ → Backend (Port 8000) - FastAPI
    └─ /     → Frontend (Port 3000) - Next.js
```

## Tech Stack

### Frontend
- **Next.js** 16.0.0 - React framework
- **React** 19.2.0 - UI library
- **TailwindCSS** 4 - Styling framework
- **TypeScript** - Type-safe JavaScript
- **Radix UI** - Accessible component primitives
- **Recharts** - Data visualization
- **React Markdown** - Markdown rendering

### Backend
- **FastAPI** - Modern Python web framework
- **Python** 3.11 - Programming language
- **Uvicorn** - ASGI server
- **PostgreSQL** 14 - Relational database
- **SQLAlchemy** - ORM (if used)
- **Pydantic** - Data validation
- **Google Gemini API** - AI/LLM integration

### Infrastructure & DevOps
- **PM2** - Process manager for Node.js and Python
- **Nginx** - Reverse proxy server
- **RunPod** - Container hosting platform
- **Conda** - Python environment manager (prd6)
- **nvm** - Node.js version manager

### Development Tools
- **pnpm** - Fast package manager
- **Chrome** - Web browser for testing
- **ChromeDriver** - Browser automation
- **Selenium** (if used) - Web scraping/automation

### Database & Storage
- **PostgreSQL** 14 - Primary database
- Local file storage for screenshots and assets

## Project Structure

```
tim6_prd_workdir/
├── frontend/              # Next.js application
├── backend/               # FastAPI application
├── scripts/               # Deployment & utility scripts
│   ├── deploy.sh
│   ├── update-app.sh
│   ├── restart-nginx.sh
│   ├── start-dev.sh
│   └── stop-dev.sh
├── guides/                # Documentation guides
├── ecosystem.config.js    # PM2 configuration
├── nginx.conf             # Nginx configuration
├── setup-native-vps.sh    # VPS setup script
├── GUIDES.md              # Complete documentation
└── README.md              # This file
```

**Last Updated**: 2025-12-01  
**Team**: PRD Analyst Team - AITF Universitas Brawijaya 2025
