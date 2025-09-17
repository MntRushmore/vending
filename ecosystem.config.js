/**
 * PM2 Ecosystem Configuration
 * Production deployment configuration for Vending Stream Analytics
 */

module.exports = {
  apps: [
    {
      // Application Configuration
      name: 'vending-stream-analytics',
      script: 'server.js',
      cwd: '/home/user/webapp',
      
      // Instance Configuration
      instances: 1,
      exec_mode: 'cluster',
      
      // Environment Variables
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0'
      },
      
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
        HOST: 'localhost'
      },
      
      // Logging Configuration
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Process Management
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Advanced Configuration
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 8000,
      
      // Health Monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Source Map Support
      source_map_support: true,
      
      // Process Title
      instance_var: 'INSTANCE_ID',
      
      // Additional Options
      ignore_watch: ['node_modules', 'logs', '*.log'],
      watch_options: {
        followSymlinks: false,
        usePolling: false
      }
    }
  ],
  
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-production-server.com'],
      ref: 'origin/main',
      repo: 'https://github.com/your-username/vending-stream-analytics.git',
      path: '/var/www/vending-stream',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    },
    
    staging: {
      user: 'deploy',
      host: ['staging-server.com'],
      ref: 'origin/develop',
      repo: 'https://github.com/your-username/vending-stream-analytics.git',
      path: '/var/www/vending-stream-staging',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env development'
    }
  }
};