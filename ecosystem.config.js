// PM2 ecosystem configuration for Barbote
export default {
  apps: [
    {
      name: 'barbote',
      script: 'server/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        BARBOTE_PORT: 3006
      },
      env_development: {
        NODE_ENV: 'development',
        BARBOTE_PORT: 3006
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/barbote-error.log',
      out_file: 'logs/barbote-out.log',
      merge_logs: true
    }
  ]
};
