# 🚄 KMRL Train Induction System - Complete Setup & Deployment Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Prerequisites](#prerequisites)
3. [Development Setup](#development-setup)
4. [Production Deployment](#production-deployment)
5. [Configuration](#configuration)
6. [Testing](#testing)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)

---

## System Overview

The KMRL Train Induction Planning & Scheduling System is a comprehensive AI-driven platform that optimizes train scheduling decisions for Kochi Metro Rail Limited. The system consists of:

- **Frontend**: React.js with TypeScript
- **Backend**: Node.js with Express and TypeScript  
- **AI Service**: Python FastAPI with ML models
- **IoT Integration**: Real-time sensor data processing
- **Database**: PostgreSQL with Redis caching
- **Real-time**: WebSocket for live updates

## Prerequisites

### Development Environment
- Node.js 18+ and npm 9+
- Python 3.9+ with pip
- Docker Desktop
- Git
- VS Code or preferred IDE

### Production Environment
- Ubuntu 20.04+ or CentOS 8+
- Docker 20.10+ and Docker Compose 2.0+
- 8GB RAM minimum (16GB recommended)
- 50GB storage
- SSL certificates (for HTTPS)

## Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/kmrl-train-induction.git
cd kmrl-train-induction
```

### 2. Install Dependencies

#### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
```

#### Frontend Setup
```bash
cd ../frontend
npm install
cp .env.example .env.local
# Edit .env.local with your API URLs
```

#### AI Service Setup
```bash
cd ../ai-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

### 3. Database Setup

#### Using Docker (Recommended)
```bash
docker-compose up postgres redis -d
```

#### Manual Setup
```sql
-- Connect to PostgreSQL
CREATE DATABASE kmrl_train_db;
CREATE USER kmrl_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE kmrl_train_db TO kmrl_user;
```

### 4. Initialize Database Schema
```bash
cd backend
npm run prisma:migrate
npm run prisma:seed  # Load initial data
```

### 5. Start Development Servers

#### Option 1: Using Docker Compose
```bash
docker-compose up
```

#### Option 2: Manual Start
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm start

# Terminal 3 - AI Service
cd ai-service
uvicorn main:app --reload --port 8001
```

### 6. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api
- AI Service: http://localhost:8001
- API Docs: http://localhost:3001/api-docs

## Production Deployment

### 1. Server Preparation

#### Install Docker and Docker Compose
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### Configure Firewall
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3001/tcp  # Backend API (if needed)
sudo ufw enable
```

### 2. Environment Configuration

Create production `.env` files:

#### `.env.production`
```bash
# Database
DATABASE_URL=postgresql://kmrl_user:strong_password@postgres:5432/kmrl_train_db
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET=generate_secure_random_string_64_chars
REFRESH_TOKEN_SECRET=another_secure_random_string_64_chars
API_KEY=secure_api_key_for_external_services

# Services
AI_SERVICE_URL=http://ai-service:8001
FRONTEND_URL=https://kmrl.yourdomain.com

# WhatsApp Integration
WHATSAPP_API_URL=https://api.whatsapp.com
WHATSAPP_BUSINESS_ID=your_business_id
WHATSAPP_PHONE_NUMBER=+919876543210
WHATSAPP_API_TOKEN=your_api_token

# MQTT/IoT
MQTT_BROKER_URL=mqtt://your-mqtt-broker:1883
MQTT_USERNAME=kmrl_iot
MQTT_PASSWORD=secure_mqtt_password

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
PROMETHEUS_ENABLED=true
```

### 3. Build Production Images

```bash
# Build all services
docker-compose -f docker-compose.prod.yml build

# Or build individually
docker build -f Dockerfile.production -t kmrl-system:latest .
```

### 4. Deploy with Docker Compose

```bash
# Start all services in production mode
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 5. SSL/TLS Setup with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d kmrl.yourdomain.com

# Auto-renewal
sudo systemctl status certbot.timer
```

### 6. Database Migrations

```bash
# Run migrations in production
docker-compose exec backend npm run prisma:migrate:deploy

# Backup database
docker-compose exec postgres pg_dump -U kmrl_user kmrl_train_db > backup_$(date +%Y%m%d).sql
```

## Configuration

### Key Configuration Files

#### `nginx.conf` - Web Server Configuration
- Located at `/etc/nginx/nginx.conf`
- Handles reverse proxy, SSL, rate limiting
- Serves static files and routes API requests

#### `supervisord.conf` - Process Manager
- Manages multiple services in container
- Auto-restart on failure
- Log rotation

#### Backend Configuration
- `backend/config/default.json` - Default settings
- `backend/config/production.json` - Production overrides
- Environment variables override JSON configs

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| NODE_ENV | Environment (development/production) | Yes |
| DATABASE_URL | PostgreSQL connection string | Yes |
| REDIS_URL | Redis connection string | Yes |
| JWT_SECRET | JWT signing secret | Yes |
| AI_SERVICE_URL | AI service endpoint | Yes |
| MQTT_BROKER_URL | IoT broker URL | No |
| WHATSAPP_API_TOKEN | WhatsApp API token | No |

## Testing

### Run Unit Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# AI service tests
cd ai-service
pytest
```

### Run Integration Tests
```bash
npm run test:integration
```

### Load Testing
```bash
# Install k6
brew install k6  # macOS
sudo apt install k6  # Ubuntu

# Run load tests
k6 run tests/load/api-load-test.js
```

### End-to-End Testing
```bash
# Using Cypress
npm run cypress:open
```

## Monitoring

### 1. Application Monitoring

#### Prometheus Metrics
Access at: http://localhost:9090/metrics

Key metrics to monitor:
- Request rate and latency
- Error rates
- Database connection pool
- Memory and CPU usage
- WebSocket connections

#### Grafana Dashboards
```bash
# Add Grafana to docker-compose
docker-compose -f docker-compose.monitoring.yml up -d grafana
```
Access at: http://localhost:3000 (admin/admin)

### 2. Log Management

#### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

#### Log Aggregation with ELK Stack
```yaml
# Add to docker-compose.yml
elasticsearch:
  image: elasticsearch:8.11.0
  environment:
    - discovery.type=single-node
    
logstash:
  image: logstash:8.11.0
  
kibana:
  image: kibana:8.11.0
```

### 3. Health Checks

#### API Health Endpoints
- Backend: `GET /api/health`
- AI Service: `GET /health`
- Frontend: `GET /`

#### Automated Health Monitoring
```bash
# Setup health check script
cat > healthcheck.sh << 'EOF'
#!/bin/bash
curl -f http://localhost:3001/api/health || exit 1
curl -f http://localhost:8001/health || exit 1
EOF

chmod +x healthcheck.sh
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check PostgreSQL status
docker-compose ps postgres
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U kmrl_user -d kmrl_train_db
```

#### 2. Port Already in Use
```bash
# Find process using port
sudo lsof -i :3000
sudo kill -9 <PID>

# Or change port in .env
PORT=3002
```

#### 3. Memory Issues
```bash
# Increase Docker memory
docker-compose down
# Edit docker-compose.yml - add memory limits
services:
  backend:
    mem_limit: 2g
```

#### 4. Build Failures
```bash
# Clear Docker cache
docker system prune -a
docker-compose build --no-cache
```

#### 5. WebSocket Connection Issues
- Check firewall rules
- Verify nginx WebSocket proxy configuration
- Check CORS settings in backend

### Debug Mode

#### Enable Debug Logging
```bash
# Backend
DEBUG=* npm run dev

# AI Service
LOG_LEVEL=DEBUG uvicorn main:app --reload
```

#### Access Container Shell
```bash
docker-compose exec backend sh
docker-compose exec ai-service bash
```

## Performance Optimization

### 1. Database Optimization
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_trainsets_status ON trainsets(status);
CREATE INDEX idx_schedules_date ON schedules(schedule_date);
CREATE INDEX idx_fitness_expiry ON fitness_certificates(valid_until);
```

### 2. Redis Caching
```javascript
// Cache frequently accessed data
await redis.setex('trainsets:active', 300, JSON.stringify(activeTrainsets));
```

### 3. Frontend Optimization
```bash
# Build optimized production bundle
npm run build

# Analyze bundle size
npm run build -- --stats
npx webpack-bundle-analyzer build/bundle-stats.json
```

## Backup and Recovery

### Automated Backups
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T postgres pg_dump -U kmrl_user kmrl_train_db > backups/db_$DATE.sql
tar -czf backups/files_$DATE.tar.gz uploads/
EOF

# Schedule with cron
crontab -e
0 2 * * * /home/user/kmrl/backup.sh
```

### Restore from Backup
```bash
# Database restore
docker-compose exec -T postgres psql -U kmrl_user kmrl_train_db < backup.sql

# Files restore
tar -xzf files_backup.tar.gz -C uploads/
```

## Security Checklist

- [ ] Change all default passwords
- [ ] Enable SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up rate limiting
- [ ] Enable CORS properly
- [ ] Implement API authentication
- [ ] Regular security updates
- [ ] Configure backup strategy
- [ ] Set up monitoring alerts
- [ ] Document incident response

## Support

For issues or questions:
1. Check the [Documentation](./docs)
2. Search [GitHub Issues](https://github.com/your-org/kmrl-train-induction/issues)
3. Contact the development team

---

## Quick Commands Reference

```bash
# Start system
docker-compose up -d

# Stop system
docker-compose down

# View logs
docker-compose logs -f [service]

# Restart service
docker-compose restart [service]

# Database backup
docker-compose exec postgres pg_dump -U kmrl_user kmrl_train_db > backup.sql

# Update code
git pull origin main
docker-compose build
docker-compose up -d

# Check system status
docker-compose ps
curl http://localhost:3001/api/health
```

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintained by**: KMRL Development Team