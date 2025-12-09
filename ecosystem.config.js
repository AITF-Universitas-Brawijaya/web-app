module.exports = {
    apps: [
        {
            name: 'prd-analyst-frontend',
            script: 'npm',
            args: 'start',
            cwd: '/home/ubuntu/tim6_prd_workdir/frontend',
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 3000
                // NEXT_PUBLIC_API_URL not set - uses relative URLs for Nginx proxying
            },
            error_file: '/home/ubuntu/tim6_prd_workdir/logs/pm2-frontend-error.log',
            out_file: '/home/ubuntu/tim6_prd_workdir/logs/pm2-frontend-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true
        },
        {
            name: 'prd-analyst-backend',
            script: '/home/ubuntu/tim6_prd_workdir/scripts/start-backend.sh',
            cwd: '/home/ubuntu/tim6_prd_workdir/backend',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                PYTHONUNBUFFERED: '1'
            },
            error_file: '/home/ubuntu/tim6_prd_workdir/logs/pm2-backend-error.log',
            out_file: '/home/ubuntu/tim6_prd_workdir/logs/pm2-backend-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true
        }
    ]
};
