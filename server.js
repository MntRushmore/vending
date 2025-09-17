/**
 * Production Server for Vending Stream Analytics
 * Simple static file server with WebSocket proxy support
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

/**
 * Static file server
 */
class StaticServer {
  constructor() {
    this.server = null;
    this.startTime = Date.now();
    this.requestCount = 0;
  }

  /**
   * Start the server
   */
  start() {
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    this.server.listen(PORT, HOST, () => {
      console.log(`🚀 Vending Stream Analytics Server`);
      console.log(`📍 Running on http://${HOST}:${PORT}`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log(`⏰ Started at: ${new Date().toISOString()}`);
      
      // Signal PM2 that the app is ready
      if (process.send) {
        process.send('ready');
      }
    });

    this.server.on('error', (error) => {
      console.error('❌ Server error:', error);
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.gracefulShutdown());
    process.on('SIGINT', () => this.gracefulShutdown());
  }

  /**
   * Handle incoming requests
   */
  handleRequest(req, res) {
    this.requestCount++;
    const startTime = Date.now();
    const { pathname } = url.parse(req.url);
    
    console.log(`${req.method} ${pathname} - ${req.headers['user-agent']?.substring(0, 50) || 'Unknown'}`);

    // Health check endpoint
    if (pathname === '/health' || pathname === '/status') {
      return this.handleHealthCheck(req, res);
    }

    // API endpoints (if needed for future expansion)
    if (pathname.startsWith('/api/')) {
      return this.handleAPIRequest(req, res);
    }

    // Static file serving
    this.serveStaticFile(req, res, pathname, startTime);
  }

  /**
   * Serve static files
   */
  serveStaticFile(req, res, pathname, startTime) {
    // Default to index.html for SPA routing
    let filePath = pathname === '/' ? '/index.html' : pathname;
    filePath = path.join(__dirname, filePath);

    // Security: prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
      return this.sendError(res, 403, 'Forbidden');
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        // Try to serve index.html for SPA routing
        if (pathname !== '/index.html') {
          return this.serveStaticFile(req, res, '/', startTime);
        }
        return this.sendError(res, 404, 'File not found');
      }

      const ext = path.extname(filePath);
      const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

      // Security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      
      if (NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      }

      // Cache headers
      if (ext === '.html') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
        res.setHeader('ETag', `"${stats.mtime.getTime()}-${stats.size}"`);
      }

      // Check if-none-match for 304
      const etag = res.getHeader('ETag');
      if (req.headers['if-none-match'] === etag) {
        res.statusCode = 304;
        res.end();
        this.logRequest(req, res, startTime);
        return;
      }

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', stats.size);

      const stream = fs.createReadStream(filePath);
      
      stream.on('error', (error) => {
        console.error('File read error:', error);
        if (!res.headersSent) {
          this.sendError(res, 500, 'Internal server error');
        }
      });

      stream.pipe(res);
      
      res.on('finish', () => {
        this.logRequest(req, res, startTime);
      });
    });
  }

  /**
   * Handle health check requests
   */
  handleHealthCheck(req, res) {
    const uptime = Date.now() - this.startTime;
    const memoryUsage = process.memoryUsage();
    
    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: uptime,
      uptimeHuman: this.formatUptime(uptime),
      requests: this.requestCount,
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
      },
      environment: NODE_ENV,
      version: '2.0.0',
      nodeVersion: process.version
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    res.statusCode = 200;
    res.end(JSON.stringify(healthData, null, 2));
  }

  /**
   * Handle API requests (placeholder for future expansion)
   */
  handleAPIRequest(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 404;
    res.end(JSON.stringify({
      error: 'API endpoint not implemented',
      message: 'This is a static file server. API endpoints are not available.',
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Send error response
   */
  sendError(res, statusCode, message) {
    if (res.headersSent) return;
    
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'text/html');
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error ${statusCode}</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
          .error { color: #e74c3c; }
        </style>
      </head>
      <body>
        <h1 class="error">Error ${statusCode}</h1>
        <p>${message}</p>
        <a href="/">← Back to Vending Stream</a>
      </body>
      </html>
    `);
  }

  /**
   * Log request
   */
  logRequest(req, res, startTime) {
    const duration = Date.now() - startTime;
    const { pathname } = url.parse(req.url);
    
    console.log(`✅ ${res.statusCode} ${req.method} ${pathname} - ${duration}ms`);
  }

  /**
   * Format uptime in human readable format
   */
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Graceful shutdown
   */
  gracefulShutdown() {
    console.log('\n🔄 Received shutdown signal, closing server gracefully...');
    
    this.server.close((err) => {
      if (err) {
        console.error('❌ Error during shutdown:', err);
        process.exit(1);
      }
      
      console.log('✅ Server closed successfully');
      console.log(`📊 Total requests handled: ${this.requestCount}`);
      console.log(`⏱️  Total uptime: ${this.formatUptime(Date.now() - this.startTime)}`);
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      console.log('⚠️  Forcing shutdown...');
      process.exit(1);
    }, 10000);
  }
}

// Start the server
if (require.main === module) {
  const server = new StaticServer();
  server.start();
}

module.exports = StaticServer;