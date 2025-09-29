# 🚀 KMRL Train Induction System - Production Deployment Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Service Configuration](#service-configuration)
- [Docker Deployment](#docker-deployment)
- [Production Optimizations](#production-optimizations)
- [Monitoring & Logging](#monitoring--logging)
- [Security Configuration](#security-configuration)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Windows Server 2019+
- **CPU**: 4+ cores (8+ recommended for AI service)
- **RAM**: 8GB minimum (16GB+ recommended)
- **Storage**: 100GB+ SSD
- **Network**: 1Gbps connection

### Software Dependencies
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Node.js**: 18+ (if running without Docker)
- **Python**: 3.9+ (if running without Docker)
- **PostgreSQL**: 15+
- **Redis**: 7+
- **Nginx**: 1.20+

## Environment Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd sih-KMRL-Train-Induction
```

### 2. Create Environment Files
Copy example environment files and configure them:

```bash
# Backend
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp ai-service/.env.example ai-service/.env
```

### 3. Configure Environment Variables

#### Backend (.env)
```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://kmrl_user:SECURE_PASSWORD@postgres:5432/kmrl_train_db
REDIS_URL=redis://redis:6379
JWT_SECRET=your_super_secure_jwt_secret_minimum_64_characters_production
AI_SERVICE_URL=http://ai-service:8001
FRONTEND_URL=https://kmrl-train-system.com
```

#### Frontend (.env)
```bash
REACT_APP_API_URL=https://api.kmrl-train-system.com
REACT_APP_AI_SERVICE_URL=https://ai.kmrl-train-system.com
REACT_APP_WS_URL=wss://api.kmrl-train-system.com
```

#### AI Service (.env)
```bash
HOST=0.0.0.0
PORT=8001
DEBUG=false
DATABASE_URL=postgresql://kmrl_user:SECURE_PASSWORD@postgres:5432/kmrl_train_db
REDIS_URL=redis://redis:6379
MAX_OPTIMIZATION_TIME=180
ENABLE_PARALLEL_PROCESSING=true
MAX_WORKERS=8
```

## Database Setup

### 1. PostgreSQL Configuration
Create production-ready PostgreSQL setup:

```sql
-- Create database and user
CREATE DATABASE kmrl_train_db;
CREATE USER kmrl_user WITH ENCRYPTED PASSWORD 'SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE kmrl_train_db TO kmrl_user;

-- Enable necessary extensions
\c kmrl_train_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
```

### 2. Database Migration
```bash
cd backend
npm run prisma:migrate
npm run prisma:seed
```

### 3. Database Optimization
Add to `postgresql.conf`:
```
# Performance tuning
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 16MB
maintenance_work_mem = 128MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
```

## Service Configuration

### 1. Production Docker Compose
Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/prod.conf:/etc/nginx/nginx.conf
      - ./docker/nginx/ssl:/etc/ssl/certs
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - backend
      - frontend
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: kmrl_train_db
      POSTGRES_USER: kmrl_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
      - ./database/init-prod.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
    command: |
      postgres
      -c shared_buffers=256MB
      -c effective_cache_size=1GB
      -c work_mem=16MB
      -c maintenance_work_mem=128MB

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_prod_data:/data
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      NODE_ENV: production
    volumes:
      - ./logs/backend:/app/logs
      - ./uploads:/app/uploads
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '2.0'
          memory: 1G

  ai-service:
    build:
      context: ./ai-service
      dockerfile: Dockerfile.prod
    volumes:
      - ./logs/ai-service:/app/logs
      - ./ai-service/models:/app/models
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 4G

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    restart: unless-stopped

volumes:
  postgres_prod_data:
  redis_prod_data:
```

### 2. Nginx Production Configuration
Create `docker/nginx/prod.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:3001;
    }

    upstream ai-service {
        server ai-service:8001;
    }

    # SSL Configuration
    server {
        listen 443 ssl http2;
        server_name kmrl-train-system.com;

        ssl_certificate /etc/ssl/certs/kmrl.crt;
        ssl_certificate_key /etc/ssl/certs/kmrl.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
        add_header X-Content-Type-Options "nosniff";
        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-XSS-Protection "1; mode=block";

        # Frontend
        location / {
            proxy_pass http://frontend:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Backend API
        location /api/ {
            proxy_pass http://backend/api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        # AI Service
        location /ai/ {
            proxy_pass http://ai-service/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 300s;
        }

        # Rate limiting
        limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
        location /api/ {
            limit_req zone=api burst=20 nodelay;
        }
    }

    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name kmrl-train-system.com;
        return 301 https://$server_name$request_uri;
    }
}
```

## Docker Deployment

### 1. Build Production Images
```bash
# Build all services
docker-compose -f docker-compose.prod.yml build

# Tag images for registry
docker tag kmrl-backend:latest your-registry.com/kmrl-backend:v1.0.0
docker tag kmrl-frontend:latest your-registry.com/kmrl-frontend:v1.0.0
docker tag kmrl-ai-service:latest your-registry.com/kmrl-ai-service:v1.0.0
```

### 2. Deploy Services
```bash
# Start production services
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs
```

### 3. Health Checks
```bash
# Check service health
curl -f https://kmrl-train-system.com/api/health
curl -f https://kmrl-train-system.com/ai/health/status

# Monitor logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f ai-service
```

## Production Optimizations

### 1. Backend Optimizations
Create `backend/Dockerfile.prod`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .
RUN npm run build
RUN npm prune --production

FROM node:18-alpine AS production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S kmrl -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=kmrl:nodejs /app/dist ./dist
COPY --from=builder --chown=kmrl:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=kmrl:nodejs /app/package.json ./package.json

# Security & Performance
RUN apk add --no-cache dumb-init
USER kmrl

EXPOSE 3001
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node dist/health-check.js
```

### 2. AI Service Optimizations
Create `ai-service/Dockerfile.prod`:

```dockerfile
FROM python:3.11-slim AS builder

WORKDIR /app
COPY requirements.txt .

RUN pip install --user --no-cache-dir --upgrade pip
RUN pip install --user --no-cache-dir -r requirements.txt

FROM python:3.11-slim AS production

RUN adduser --disabled-password --gecos '' kmrl

WORKDIR /app

# Copy dependencies
COPY --from=builder /root/.local /home/kmrl/.local
COPY --chown=kmrl:kmrl . .

# Security & Performance
RUN apt-get update && apt-get install -y --no-install-recommends \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

USER kmrl
ENV PATH=/home/kmrl/.local/bin:$PATH

EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8001/health/status')"

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "4"]
```

### 3. Frontend Optimizations
Create `frontend/Dockerfile.prod`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine AS production

# Copy built application
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Security headers
RUN echo "add_header X-Content-Type-Options nosniff;" >> /etc/nginx/conf.d/security.conf
RUN echo "add_header X-Frame-Options SAMEORIGIN;" >> /etc/nginx/conf.d/security.conf

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

## Monitoring & Logging

### 1. Prometheus Configuration
Create `monitoring/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:9090']
  
  - job_name: 'ai-service'
    static_configs:
      - targets: ['ai-service:8002']
  
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
  
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### 2. Grafana Dashboards
- System metrics (CPU, Memory, Disk)
- Application metrics (Request rate, Response time, Error rate)
- Database metrics (Connections, Queries, Performance)
- AI Service metrics (Optimization time, Success rate, Queue size)

### 3. Log Aggregation
Use ELK Stack or similar for centralized logging:

```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  elasticsearch:
    image: elasticsearch:7.15.0
    environment:
      - discovery.type=single-node
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  kibana:
    image: kibana:7.15.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

  logstash:
    image: logstash:7.15.0
    volumes:
      - ./logstash/config:/usr/share/logstash/pipeline
    depends_on:
      - elasticsearch
```

## Security Configuration

### 1. SSL Certificate Setup
```bash
# Generate SSL certificates (Let's Encrypt)
certbot certonly --webroot -w /var/www/certbot -d kmrl-train-system.com
```

### 2. Security Headers
Implemented in Nginx configuration above.

### 3. Database Security
- Use strong passwords
- Enable SSL/TLS encryption
- Configure firewall rules
- Regular security updates

### 4. Application Security
- JWT token validation
- Rate limiting
- Input validation
- SQL injection protection (Prisma ORM)
- XSS protection

## Backup & Recovery

### 1. Database Backup
```bash
#!/bin/bash
# backup-db.sh
BACKUP_DIR="/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)

docker exec postgres pg_dump -U kmrl_user kmrl_train_db > "$BACKUP_DIR/kmrl_db_$DATE.sql"

# Keep only last 30 backups
find $BACKUP_DIR -name "kmrl_db_*.sql" -mtime +30 -delete
```

### 2. Application Data Backup
```bash
#!/bin/bash
# backup-app.sh
BACKUP_DIR="/backups/application"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup uploads
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" ./uploads/

# Backup AI models
tar -czf "$BACKUP_DIR/models_$DATE.tar.gz" ./ai-service/models/

# Backup logs
tar -czf "$BACKUP_DIR/logs_$DATE.tar.gz" ./logs/
```

### 3. Automated Backup Schedule
Add to crontab:
```bash
# Database backup every day at 2 AM
0 2 * * * /opt/kmrl/scripts/backup-db.sh

# Application backup every week
0 3 * * 0 /opt/kmrl/scripts/backup-app.sh
```

## Deployment Scripts

### 1. Deployment Script
Create `deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Starting KMRL System deployment..."

# Pull latest changes
git pull origin main

# Build and deploy
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Health checks
if curl -f https://kmrl-train-system.com/api/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    exit 1
fi

if curl -f https://kmrl-train-system.com/ai/health/status > /dev/null 2>&1; then
    echo "✅ AI Service is healthy"
else
    echo "❌ AI Service health check failed"
    exit 1
fi

echo "🎉 Deployment completed successfully!"
```

### 2. Rollback Script
Create `rollback.sh`:

```bash
#!/bin/bash
set -e

echo "🔄 Rolling back to previous version..."

# Get previous version
PREVIOUS_VERSION=$(git log --oneline -2 | tail -1 | cut -d' ' -f1)

# Checkout previous version
git checkout $PREVIOUS_VERSION

# Rebuild and deploy
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

echo "✅ Rollback completed successfully!"
```

## Troubleshooting

### Common Issues

1. **Service Won't Start**
   - Check logs: `docker-compose logs service-name`
   - Verify environment variables
   - Check port conflicts

2. **Database Connection Issues**
   - Verify DATABASE_URL
   - Check PostgreSQL status
   - Verify network connectivity

3. **High CPU Usage**
   - Check optimization queue size
   - Monitor AI service performance
   - Scale services if needed

4. **Memory Issues**
   - Monitor Docker memory usage
   - Increase container limits
   - Optimize database queries

### Log Analysis
```bash
# Real-time logs
docker-compose -f docker-compose.prod.yml logs -f

# Error analysis
docker-compose -f docker-compose.prod.yml logs | grep ERROR

# Performance analysis
docker-compose -f docker-compose.prod.yml logs | grep "response_time"
```

## CI/CD Pipeline

### GitHub Actions Example
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          npm test
          npm run test:e2e

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to production
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            cd /opt/kmrl-train-system
            ./deploy.sh
```

---

## 🎯 Production Checklist

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database optimized and secured
- [ ] Monitoring and logging setup
- [ ] Backup strategy implemented
- [ ] Health checks configured
- [ ] Security headers applied
- [ ] Performance testing completed
- [ ] Documentation updated
- [ ] Team trained on deployment process

## 📞 Support

For deployment support:
- 📧 Email: devops@kmrl.com
- 📞 Phone: +91-XXX-XXX-XXXX
- 🐛 Issues: Create GitHub issue
- 📖 Documentation: `/docs` directory

---

**Built for Kochi Metro Rail Limited (KMRL)**  
*Production-ready AI-driven train scheduling system*
