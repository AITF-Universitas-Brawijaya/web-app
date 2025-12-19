# PRD Analyst Dashboard

Pengawasan Ruang Digital (PRD) Analyst is a comprehensive monitoring and analysis system designed to detect, verify, and analyze online gambling content across websites, social media, and public reports using AI-powered classification with human-in-the-loop validation.

## Key Features

- **Dashboard Monitoring** - Real-time overview of detected gambling sites with statistics and analytics
- **AI-Powered Classification** - Automated content analysis using KomdigiUB-8B
- **Domain Generator** - Intelligent keyword-based domain discovery via RunPod API integration
- **Service Health Monitoring** - Real-time status tracking of all backend services
- **Interactive Chatbot** - AI assistant for content analysis and verification
- **Data Management** - Comprehensive CRUD operations with filtering, sorting, and search
- **Screenshot Capture** - Automated visual evidence collection and storage
- **Announcement System** - Built-in notification system for updates and alerts

## Documentation

**[Docker Setup](docs/DOCKER.md)** - Complete Docker-based deployment guide with docker-compose

**[Quick Start Guide](docs/DOCKER-QUICKSTART.md)** - Quick reference for common Docker commands

## Quick Start

### Docker Deployment (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd prototype-dashboard-chatbot

# Configure environment variables
cp env.docker.template .env.docker
# Edit .env.docker with your configuration

# Start all services with Docker
./docker-dev.sh start

# Access the application
# Frontend: http://localhost
# Backend API: http://localhost/api
# API Docs: http://localhost/api/docs
```

See [docs/DOCKER.md](docs/DOCKER.md) for complete Docker setup instructions.

### Manual Deployment

For VPS/RunPod deployment without Docker, see archived guides in `archives/vps-deployment/GUIDES.md`.

## Architecture

```
┌─────────────────────────────────────────────┐
│         Docker Container Network            │
├─────────────────────────────────────────────┤
│                                             │
│  Nginx (Port 80) - Reverse Proxy            │
│      ├─ /api/ → Backend (Port 8000)         │
│      └─ /     → Frontend (Port 3000)        │
│                                             │
│  Backend (FastAPI)                          │
│      ├─ REST API Endpoints                  │
│      └─ RunPod API Integration              │
│                                             │
│  Frontend (Next.js)                         │
│      ├─ Dashboard UI                        │
│      ├─ Data Management                     │
│      └─ Real-time Monitoring                │
│                                             │
│  PostgreSQL (Port 5432)                     │
│      └─ Persistent Data Storage             │
│                                             │
└─────────────────────────────────────────────┘
         ↓                    
      RunPod Services
      - Domain Crawler
      - Health Check
      - KomdigiUB-8B
```

## Project Structure

```
prototype-dashboard-chatbot/
├── frontend/              # Next.js application
│   ├── src/
│   │   ├── app/          # App router pages
│   │   ├── components/   # React components
│   │   └── lib/          # Utilities and helpers
│   ├── public/           # Static assets
│   └── package.json
│
├── backend/               # FastAPI application
│   ├── routes/           # API route handlers
│   ├── models/           # Database models
│   ├── utils/            # Helper functions
│   ├── main.py           # Application entry point
│   └── requirements.txt
│
├── database/              # Database initialization
│   ├── init.sql          # Schema and seed data
│   └── backups/          # Database backups (gitignored)
│
├── docs/                  # Documentation files
│   ├── DOCKER.md
│   └── DOCKER-QUICKSTART.md
│
├── archives/              # Legacy files and guides
│   └── vps-deployment/
│
├── docker-compose.yml     # Docker orchestration
├── nginx.docker.conf      # Nginx configuration
├── docker-dev.sh          # Docker helper script
├── .env.docker            # Docker environment config
└── README.md              # This file
```

## Tech Stack

### Frontend
- **Next.js** 16.0.0 - React framework with App Router
- **React** 19.2.0 - UI library
- **TailwindCSS** 4 - Utility-first CSS framework
- **TypeScript** - Type-safe JavaScript
- **Radix UI** - Accessible component primitives
- **Recharts** - Data visualization library
- **React Markdown** - Markdown rendering for chatbot
- **Lucide React** - Icon library
- **pnpm** - Fast, disk space efficient package manager

### Backend
- **FastAPI** - Modern Python web framework
- **Python** 3.11+ - Programming language
- **Uvicorn** - ASGI server
- **PostgreSQL** 14 - Relational database
- **psycopg2** - PostgreSQL adapter
- **Pydantic** - Data validation

### Infrastructure & DevOps
- **Docker** - Containerization platform
- **Nginx** - Reverse proxy and web server
- **Git** - Version control
- **Pod Container** - Containerization platform

## Environment Variables

### Backend (.env or .env.docker)

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@postgres:5432/dbname

# RunPod API Configuration
SERVICE_API_URL=https://your-runpod-instance.proxy.runpod.net

# Server Configuration
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:3000
```

### Frontend

Frontend environment variables are configured via Next.js and proxied through the backend to avoid CORS issues.

## Service Health Monitoring

The dashboard includes real-time health monitoring for all services:

- **Database** - PostgreSQL connection status
- **KomdigiUB-8B** - AI service availability
- **RunPod API** - External crawler service status
- **Screenshot Service** - Selenium/Chrome driver status

Health checks run every 10 seconds and display service status on the home dashboard.

## RunPod API Integration

The system integrates with RunPod for domain crawling:

**Endpoint**: `POST /process`
- Accepts keyword and domain count parameters
- Returns streaming logs of the crawling process
- Automatically updates database with discovered domains

**Endpoint**: `GET /health/services`
- Returns status of all backend services
- Used for real-time monitoring

## Database Schema

The PostgreSQL database includes tables for:
- **websites** - Detected gambling sites with metadata
- **announcements** - System announcements and updates
- **screenshots** - Visual evidence storage (base64 encoded)
- **logs** - System activity logs

See `database/init.sql` for complete schema definition.

## Troubleshooting

### Docker Issues

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f [service_name]

# Restart services
./docker-dev.sh restart

# Clean rebuild
./docker-dev.sh clean
./docker-dev.sh start
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Access database directly
docker-compose exec postgres psql -U prd_user -d prd_database
```

### Frontend Build Issues

```bash
# Clear Next.js cache
cd frontend
rm -rf .next node_modules
pnpm install
pnpm run build
```

## Development Workflow

1. **Make changes** to frontend or backend code
2. **Test locally** using Docker: `./docker-dev.sh restart`
3. **Check logs** for errors: `docker-compose logs -f`
4. **Commit changes** with descriptive messages
5. **Push to repository** for deployment

## License

Internal project for Universitas Brawijaya - AITF 2025
