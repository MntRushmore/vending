# 🚀 Deployment Guide

Complete guide for deploying Vending Stream Analytics in production environments.

## 📋 Prerequisites

### System Requirements
- **Node.js** 14+ (LTS recommended)
- **npm** 6+ or **yarn** 1.22+
- **PM2** 5+ (for process management)
- **Nginx** (optional, for reverse proxy)
- **Docker** 20+ (optional, for containerized deployment)

### Hardware Requirements
- **Minimum**: 1 CPU, 512MB RAM, 1GB storage
- **Recommended**: 2 CPU, 2GB RAM, 10GB storage
- **High Traffic**: 4+ CPU, 4GB+ RAM, 50GB+ storage

## 🔧 Installation Methods

### Method 1: Manual Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/vending-stream-analytics.git
   cd vending-stream-analytics
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   nano .env  # Edit configuration
   ```

4. **Install PM2**
   ```bash
   npm install -g pm2
   ```

5. **Setup directories**
   ```bash
   npm run setup:logs
   ```

6. **Start the application**
   ```bash
   npm run pm2:start
   ```

### Method 2: Docker Deployment

1. **Clone and build**
   ```bash
   git clone https://github.com/your-username/vending-stream-analytics.git
   cd vending-stream-analytics
   ```

2. **Build Docker image**
   ```bash
   docker build -t vending-stream:latest .
   ```

3. **Run container**
   ```bash
   docker run -d \
     --name vending-stream \
     -p 3000:3000 \
     -v $(pwd)/logs:/app/logs \
     vending-stream:latest
   ```

### Method 3: Docker Compose

1. **Start all services**
   ```bash
   docker-compose up -d
   ```

2. **With additional services**
   ```bash
   # With Nginx proxy
   docker-compose --profile nginx up -d
   
   # With monitoring
   docker-compose --profile monitoring up -d
   
   # Full stack
   docker-compose --profile nginx --profile monitoring up -d
   ```

## ⚙️ Configuration

### Environment Variables

Essential configuration in `.env` file:

```bash
# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# WebSocket
DEFAULT_WEBSOCKET_URL=wss://your-websocket-server.com/ws

# Security
SECRET_KEY=generate-secure-random-key
CORS_ORIGIN=https://yourdomain.com
```

### PM2 Configuration

Edit `ecosystem.config.js` for your environment:

```javascript
module.exports = {
  apps: [{
    name: 'vending-stream-analytics',
    script: 'server.js',
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

## 🌐 Reverse Proxy Setup

### Nginx Configuration

Create `/etc/nginx/sites-available/vending-stream`:

```nginx
server {
    listen 80;
    server_name analytics.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name analytics.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Main application
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket proxy (if needed)
    location /ws {
        proxy_pass http://your-websocket-server:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
    
    # Static assets with long cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/vending-stream /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Apache Configuration

Create `/etc/apache2/sites-available/vending-stream.conf`:

```apache
<VirtualHost *:80>
    ServerName analytics.yourdomain.com
    Redirect permanent / https://analytics.yourdomain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName analytics.yourdomain.com
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /path/to/ssl/cert.pem
    SSLCertificateKeyFile /path/to/ssl/key.pem
    
    # Security Headers
    Header always set X-Frame-Options DENY
    Header always set X-Content-Type-Options nosniff
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    
    # Proxy Configuration
    ProxyPreserveHost On
    ProxyRequests Off
    
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/
    
    # WebSocket Support
    ProxyPass /ws ws://your-websocket-server:8080/
    ProxyPassReverse /ws ws://your-websocket-server:8080/
</VirtualHost>
```

## 📊 Monitoring & Logging

### PM2 Monitoring

```bash
# View logs
pm2 logs vending-stream-analytics

# Monitor processes
pm2 monit

# Check status
pm2 status

# Restart application
pm2 restart vending-stream-analytics

# Reload with zero downtime
pm2 reload vending-stream-analytics
```

### Log Management

Create log rotation config `/etc/logrotate.d/vending-stream`:

```
/path/to/vending-stream/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 nodejs nodejs
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Health Monitoring

Setup health check with systemd timer or cron:

```bash
# Add to crontab
*/5 * * * * curl -f http://localhost:3000/health || systemctl restart vending-stream
```

## 🔒 Security

### SSL/TLS Setup

1. **Using Let's Encrypt**
   ```bash
   sudo certbot --nginx -d analytics.yourdomain.com
   ```

2. **Using custom certificate**
   ```bash
   # Copy certificate files
   sudo cp cert.pem /etc/ssl/certs/
   sudo cp key.pem /etc/ssl/private/
   sudo chmod 600 /etc/ssl/private/key.pem
   ```

### Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable

# iptables
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -j DROP
```

### User Security

```bash
# Create dedicated user
sudo useradd -r -s /bin/false vending-stream
sudo chown -R vending-stream:vending-stream /path/to/app
```

## 🚀 Performance Optimization

### Node.js Optimization

```bash
# Set Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"

# Enable production optimizations
export NODE_ENV=production
```

### PM2 Cluster Mode

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'vending-stream-analytics',
    script: 'server.js',
    instances: 'max',           // Use all CPU cores
    exec_mode: 'cluster',
    max_memory_restart: '1G',   // Restart if memory usage exceeds 1GB
    node_args: '--max-old-space-size=2048'
  }]
};
```

### Caching Strategy

1. **Nginx Caching**
   ```nginx
   proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=app_cache:10m max_size=1g inactive=60m;
   
   location / {
       proxy_cache app_cache;
       proxy_cache_valid 200 302 10m;
       proxy_cache_valid 404 1m;
   }
   ```

2. **Application Caching**
   ```javascript
   // Add Redis caching in future versions
   const redis = require('redis');
   const client = redis.createClient();
   ```

## 🔄 CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build Docker image
      run: docker build -t vending-stream:${{ github.sha }} .
      
    - name: Deploy to server
      run: |
        # Add your deployment commands here
        scp -r . user@server:/path/to/app
        ssh user@server "cd /path/to/app && pm2 reload ecosystem.config.js"
```

## 📦 Backup & Recovery

### Automated Backup Script

Create `scripts/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/backups"
APP_DIR="/path/to/vending-stream"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
tar -czf "$BACKUP_DIR/vending-stream-$DATE.tar.gz" \
  --exclude=node_modules \
  --exclude=logs \
  "$APP_DIR"

# Keep only last 30 days
find "$BACKUP_DIR" -name "vending-stream-*.tar.gz" -mtime +30 -delete
```

Add to crontab:
```bash
0 2 * * * /path/to/scripts/backup.sh
```

## 🔧 Troubleshooting

### Common Issues

1. **Application won't start**
   ```bash
   # Check logs
   pm2 logs vending-stream-analytics
   
   # Check port availability
   netstat -tulpn | grep :3000
   
   # Check permissions
   ls -la /path/to/app
   ```

2. **Memory issues**
   ```bash
   # Monitor memory usage
   pm2 monit
   
   # Increase memory limit
   pm2 restart vending-stream-analytics --node-args="--max-old-space-size=4096"
   ```

3. **WebSocket connection issues**
   ```bash
   # Test WebSocket connection
   wscat -c wss://your-websocket-url
   
   # Check proxy configuration
   curl -H "Upgrade: websocket" http://localhost:3000/ws
   ```

### Recovery Procedures

1. **Application Recovery**
   ```bash
   # Stop application
   pm2 stop vending-stream-analytics
   
   # Restore from backup
   tar -xzf backup-file.tar.gz
   
   # Start application
   pm2 start ecosystem.config.js
   ```

2. **Database Recovery** (for future versions)
   ```bash
   # Restore database
   pg_restore -d vending_stream backup.sql
   ```

## 📈 Scaling

### Horizontal Scaling

1. **Load Balancer Setup**
   ```nginx
   upstream vending_stream {
       server 127.0.0.1:3000;
       server 127.0.0.1:3001;
       server 127.0.0.1:3002;
   }
   
   server {
       location / {
           proxy_pass http://vending_stream;
       }
   }
   ```

2. **Multiple Instances**
   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [
       {
         name: 'vending-stream-1',
         script: 'server.js',
         env: { PORT: 3000 }
       },
       {
         name: 'vending-stream-2', 
         script: 'server.js',
         env: { PORT: 3001 }
       }
     ]
   };
   ```

### Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml vending-stream
```

## ✅ Checklist

### Pre-deployment
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Firewall rules configured
- [ ] Backup strategy implemented
- [ ] Monitoring setup
- [ ] Health checks configured

### Post-deployment
- [ ] Application starts successfully
- [ ] Health endpoint responds
- [ ] WebSocket connection works
- [ ] Logs are being written
- [ ] Metrics are being collected
- [ ] Backup runs successfully

---

**Need help?** Check the [troubleshooting section](#-troubleshooting) or [create an issue](https://github.com/your-username/vending-stream-analytics/issues).