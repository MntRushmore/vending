# Vending Stream Analytics Dockerfile
# Multi-stage build for production optimization

# Base image
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install PM2 globally
RUN npm install pm2 -g

# Copy package files
COPY package*.json ./

# Install dependencies (if any)
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Create app directory and user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy PM2
COPY --from=base /usr/local/lib/node_modules/pm2 /usr/local/lib/node_modules/pm2
RUN ln -s /usr/local/lib/node_modules/pm2/bin/pm2 /usr/local/bin/pm2

# Copy application files
COPY --chown=nodejs:nodejs . .

# Create logs directory
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Switch to non-root user
USER nodejs

# Start command
CMD ["pm2-runtime", "start", "ecosystem.config.js", "--env", "production"]

# Metadata labels
LABEL org.opencontainers.image.title="Vending Stream Analytics"
LABEL org.opencontainers.image.description="Modern real-time analytics dashboard for vending machine sales tracking"
LABEL org.opencontainers.image.version="2.0.0"
LABEL org.opencontainers.image.authors="Vending Stream Analytics Team"
LABEL org.opencontainers.image.source="https://github.com/your-username/vending-stream-analytics"
LABEL org.opencontainers.image.licenses="MIT"