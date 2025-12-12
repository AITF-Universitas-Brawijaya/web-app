BACKUP & RESTORE INSTRUCTIONS
=============================

This backup system preserves your PostgreSQL database and configuration files (.env)
in the event of a VPS restart where system directories (like /var/lib/postgresql) are wiped.

BACKUP
------
To create a new backup, run:
  ./scripts/backup.sh

This will:
1. Dump the entire 'prd' database to 'backup/prd_backup.sql'.
2. Copy '.env' and 'backend/.env' to 'backup/'.
3. Copy local Nginx configs to 'backup/'.

Location: /home/ubuntu/tim6_prd_workdir/backup

RESTORE
-------
After a VPS restart:

1. Re-install System Dependencies (if missing)
   RunPod restarts usually wipe system packages like PostgreSQL and Nginx.
   Run the setup script again to reinstall them:
     ./setup.sh
   
   (Or just install postgres: ./scripts/setup-local-postgres.sh)

2. Restore Data
   Once PostgreSQL is installed and running, run:
     ./scripts/restore.sh

   This will:
   1. Restore your .env files (if they were lost/overwritten).
   2. Drop the empty 'prd' database created by setup.
   3. Import your data from 'backup/prd_backup.sql'.
   4. Restore Nginx config files to the workspace.

3. Restart Services
   You may need to restart your application processes (e.g., via PM2):
     pm2 resurrect
     (or start them manually if pm2 was wiped)
