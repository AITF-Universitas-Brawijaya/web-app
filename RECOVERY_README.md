# System Restoration Walkthrough

The following steps were taken to restore the system after the RunPod restart:

## 1. Database Restoration
- **Status**: Successful
- **Database**: `prd`
- **User**: `postgres`
- **Actions Taken**:
    - Recreated database `prd`.
    - Applied schema from `backend/database/schema.sql`.
    - Applied all migrations including `migration_user_auth.sql` (recreating `users` table).
    - Inserted dummy data.
    - User `admin` / `password123` created.

## 2. Environment Configuration
- **Backend**:
    - Fixed `backend/.env` which was missing the database password. It is now symlinked to the root `.env` file to ensure consistency.
    - Confirmed `DB_URL=postgresql://postgres:postgres@localhost:5432/prd`.
    - Verified `JWT_SECRET_KEY` exists in `.env`.
- **Frontend**:
    - Created `frontend/.env` symlink to root `.env`.

## 3. Nginx / Proxy Replacement
- Since Nginx configuration was lost, I implemented **Next.js Rewrites** in `frontend/next.config.ts`.
- Requests to `/api/*` on the frontend (port 3000) are now automatically proxied to the backend (port 8000). This removes the strict dependency on external Nginx for basic functionality.

## 4. Build and Deployment
- **Frontend**: Rebuilt using `npm run build`.
- **Process Management**: Restarted all processes using `pm2`.
- **Status**:
    - Frontend: Online (Port 3000)
    - Backend: Online (Port 8000)

## Verification
- `curl http://localhost:8000/` -> 200 OK (FastAPI running)
- `curl http://localhost:3000/` -> 200 OK (Frontend running)
- Backend logs show successful startup and database connection.

The system is now publicly accessible via the RunPod proxy ports (3000 for frontend). Login should work with `admin` / `password123`.
