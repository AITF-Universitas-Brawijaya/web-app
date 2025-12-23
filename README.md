# PRD Analyst Dashboard

Pengawasan Ruang Digital (PRD) Analyst is a comprehensive monitoring and analysis system designed to detect, verify, and analyze online gambling content across websites, social media, and public reports using AI-powered classification with human-in-the-loop validation.

## Key Features

- **Dashboard Monitoring** - Real-time overview of detected gambling sites with statistics and analytics
- **AI-Powered Classification** - Automated content analysis using KomdigiUB-8B
- **Domain Generator** - Intelligent keyword-based domain discovery via local service integration
- **Service Health Monitoring** - Real-time status tracking of all backend services
- **Interactive Chatbot** - AI assistant for content analysis and verification
- **Data Management** - Comprehensive CRUD operations with filtering, sorting, and search
- **Screenshot Capture** - Automated visual evidence collection and storage
- **Announcement System** - Built-in notification system for updates and alerts

## Documentation

**[Panduan Sistem (Bahasa Indonesia)](docs/PANDUAN_SISTEM.md)** - Panduan lengkap instalasi dan penggunaan

## Architecture

```
┌─────────────────────────────────────────────┐
│         Native Services (No systemd)        │
├─────────────────────────────────────────────┤
│                                             │
│  Integrasi Service (Default Port 5000)      │
│      ├─ Domain Generator                    │
│      ├─ AI Chat Service                     │
│      └─ Health Monitoring                   │
│                                             │
│  Backend API (Default Port 8000)            │
│      ├─ REST API Endpoints                  │
│      └─ Local Service Integration           │
│                                             │
│  Frontend (Default Port 3000)               │
│      ├─ Dashboard UI                        │
│      ├─ Data Management                     │
│      └─ Real-time Monitoring                │
│                                             │
│  PostgreSQL (Default Port 5432)             │
│      └─ Persistent Data Storage             │
│                                             │
└─────────────────────────────────────────────┘
```

## Project Structure

```
web-app/
├── frontend/                      # Next.js application (Default Port 3000)
│   ├── src/
│   │   ├── app/                  # App router pages
│   │   │   ├── dashboard/        # Main dashboard page
│   │   │   ├── admin/            # Admin panel
│   │   │   └── login/            # Authentication
│   │   ├── components/           # React components
│   │   │   ├── ui/               # Reusable UI components
│   │   │   ├── dashboard/        # Dashboard-specific components
│   │   │   └── admin/            # Admin panel components
│   │   └── lib/                  # Utilities and helpers
│   ├── public/                   # Static assets
│   ├── .env.local                # Frontend environment config
│   └── package.json
│
├── backend/                       # FastAPI application (Default Port 8000)
│   ├── routes/                   # API route handlers
│   │   ├── announcements.py      # Announcement endpoints
│   │   ├── auth.py               # Authentication endpoints
│   │   ├── chat.py               # Chat history endpoints
│   │   ├── domains.py            # Domain management endpoints
│   │   ├── generator_settings.py # Generator configuration
│   │   └── health.py             # Health check endpoints
│   ├── stores/                   # Data access layer
│   ├── utils/                    # Helper functions
│   ├── db.py                     # Database connection
│   ├── main.py                   # Application entry point
│   └── requirements.txt
│
├── integrasi-service/             # Integration service (Default Port 5000)
│   ├── domain-generator/         # Domain discovery module
│   │   ├── output/               # Output directory for screenshots
│   │   └── crawler.py            # Web crawler with screenshot capture
│   ├── test/                     # Test files and examples
│   └── main_api.py               # FastAPI service entry point
│
├── database/                      # Database files
│   ├── init-schema.sql           # Database schema definition
│   ├── init-data.sql             # Initial seed data
│   ├── backup_schema.sql         # Auto-generated schema backup
│   └── backup_data.sql           # Auto-generated data backup (every 5 min)
│
├── logs/                          # Application logs
│   ├── frontend.log              # Frontend service logs
│   ├── backend.log               # Backend API logs
│   └── integrasi.log             # Integration service logs
│
├── docs/                          # Documentation files
│   └── PANDUAN_SISTEM.md         # Complete system guide (Indonesian)
│
├── .env                           # Root environment configuration
├── .env.example                   # Environment template
├── setup-runpod.sh                # Initial setup script for RunPod
├── start-runpod.sh                # Start all services
├── stop-all.sh                    # Stop all running services
├── backup_db.sh                   # Database backup automation
├── change_admin_password.py       # Admin password management
├── requirements.txt               # Root Python dependencies
└── README.md                      # This file
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

## Integrasi Service

The system uses a local Integrasi Service (Default Port 5000) for domain crawling and AI processing:

**Endpoint**: `POST /process`
- Accepts keyword and domain count parameters
- Returns streaming logs of the crawling process
- Automatically updates database with discovered domains (including base64 screenshots)

**Endpoint**: `POST /process-links`
- Accepts list of links
- Returns streaming logs of the crawling process
- Automatically updates database with discovered domains (including base64 screenshots)

**Endpoint**: `GET /health/services`
- Returns status of all backend services
- Used for real-time monitoring

## Database Schema

The PostgreSQL database includes tables for:
- **generated_domains** - Discovered domains with metadata and base64 screenshots
- **results** - Analysis results including detection and reasoning
- **object_detection** - Vision model outputs
- **reasoning** - AI reasoning outputs
- **announcements** - System announcements
- **audit_log** - System activity logs
- **chat_history** - User chat history

See `database/init-schema.sql` for complete schema definition.

## Contributor

- Team PRD AITF x UB 2025 (Batch 1)
- lanjutkan ..

## License

Internal project for AITF (Artificial Intelligence Talent Factory)
