# Environment Variables Configuration

This document explains how to configure environment variables for the prototype dashboard chatbot.

## Backend Configuration

Create a `.env` file in the `backend/` directory with the following variables:

```bash
# Database Configuration
DATABASE_URL=sqlite:///./test.db

# RunPod API Configuration
SERVICE_API_URL=https://l7i1ghaqgdha36-3000.proxy.runpod.net

# JWT Secret (generate using: python generate_hash.py)
SECRET_KEY=your-secret-key-here
```

### Backend Environment Variables

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `DATABASE_URL` | Database connection string | `sqlite:///./test.db` |
| `SERVICE_API_URL` | Base URL for RunPod API | `https://l7i1ghaqgdha36-3000.proxy.runpod.net` |
| `SECRET_KEY` | JWT secret key for authentication | Required |

## Frontend Configuration

Create a `.env.local` file in the `frontend/` directory with the following variables:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# RunPod API URL (used by Next.js API routes)
SERVICE_API_URL=https://l7i1ghaqgdha36-3000.proxy.runpod.net
```

### Frontend Environment Variables

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:8000` |
| `SERVICE_API_URL` | RunPod API base URL (server-side only) | `https://l7i1ghaqgdha36-3000.proxy.runpod.net` |

## Setup Instructions

### Backend Setup

1. Copy the template file:
   ```bash
   cd backend
   cp env.template .env
   ```

2. Edit `.env` and update the values as needed:
   ```bash
   nano .env
   ```

3. Generate a secret key (if needed):
   ```bash
   python generate_hash.py
   ```

### Frontend Setup

1. Copy the template file:
   ```bash
   cd frontend
   cp env.template .env.local
   ```

2. Edit `.env.local` and update the values as needed:
   ```bash
   nano .env.local
   ```

## Docker Configuration

When using Docker, environment variables can be set in the `docker-compose.yml` file or passed via command line:

```yaml
services:
  backend:
    environment:
      - SERVICE_API_URL=https://your-runpod-url.proxy.runpod.net
      - DATABASE_URL=sqlite:///./test.db
      - SECRET_KEY=your-secret-key
  
  frontend:
    environment:
      - SERVICE_API_URL=https://your-runpod-url.proxy.runpod.net
      - NEXT_PUBLIC_API_URL=http://backend:8000
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit `.env` files** to version control
2. The `.env` files are already listed in `.gitignore`
3. Use `env.template` files as documentation only
4. Rotate your `SECRET_KEY` regularly
5. Use different values for development and production environments

## Files Modified

The following files now use environment variables instead of hardcoded URLs:

### Backend
- `backend/routes/crawler_routes.py` - Uses `SERVICE_API_URL` for `/process` and `/process-links` endpoints
- `backend/routes/runpod_chat.py` - Uses `SERVICE_API_URL` for `/chat` endpoint

### Frontend
- `frontend/src/app/api/runpod-chat/route.ts` - Uses `SERVICE_API_URL` for chat proxy
- `frontend/src/app/api/runpod-process/route.ts` - Uses `SERVICE_API_URL` for process proxy
- `frontend/src/app/api/health-check/route.ts` - Uses `SERVICE_API_URL` for health check proxy

## Troubleshooting

### Backend not reading .env file

Make sure you have `python-dotenv` installed:
```bash
pip install python-dotenv
```

### Frontend not reading .env.local file

Next.js automatically loads `.env.local` files. Make sure:
1. The file is named exactly `.env.local`
2. Server-side variables don't need the `NEXT_PUBLIC_` prefix
3. Client-side variables must have the `NEXT_PUBLIC_` prefix
4. Restart the dev server after changing environment variables

### Environment variable not updating

1. Restart your development server
2. For Docker, rebuild the containers:
   ```bash
   docker-compose down
   docker-compose up --build
   ```
