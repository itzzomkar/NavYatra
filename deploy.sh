#!/bin/bash
set -euo pipefail

# =====================================================
# KMRL Train Induction System - Production Deployment
# =====================================================

# Configuration
DEPLOYMENT_LOG="deployment.log"
BACKUP_DIR="backups/pre-deployment"
HEALTH_CHECK_TIMEOUT=120
ROLLBACK_ON_FAILURE=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

# Function to check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if running as appropriate user (not root)
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
        exit 1
    fi
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running"
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if .env file exists
    if [[ ! -f .env ]]; then
        error ".env file not found. Copy .env.prod.example to .env and configure it"
        exit 1
    fi
    
    # Check available disk space (at least 10GB)
    AVAILABLE_SPACE=$(df . | awk 'NR==2 {print $4}')
    if [[ $AVAILABLE_SPACE -lt 10485760 ]]; then # 10GB in KB
        error "Insufficient disk space. At least 10GB required"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Function to create backup
create_backup() {
    log "Creating pre-deployment backup..."
    
    mkdir -p "$BACKUP_DIR"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    
    # Backup current containers (if running)
    if docker-compose -f docker-compose.prod.yml ps -q | grep -q .; then
        log "Creating database backup..."
        docker-compose -f docker-compose.prod.yml exec -T postgres \
            pg_dump -U kmrl_user kmrl_train_db > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql" || {
            warning "Database backup failed, but continuing..."
        }
        
        # Backup volumes
        log "Creating volume backups..."
        docker run --rm -v kmrl_postgres_prod_data:/data -v $(pwd)/$BACKUP_DIR:/backup \
            alpine tar czf /backup/postgres_data_$TIMESTAMP.tar.gz -C /data . || {
            warning "PostgreSQL volume backup failed"
        }
        
        docker run --rm -v kmrl_redis_prod_data:/data -v $(pwd)/$BACKUP_DIR:/backup \
            alpine tar czf /backup/redis_data_$TIMESTAMP.tar.gz -C /data . || {
            warning "Redis volume backup failed"
        }
    fi
    
    # Backup application files
    if [[ -d uploads ]]; then
        tar -czf "$BACKUP_DIR/uploads_$TIMESTAMP.tar.gz" uploads/ || {
            warning "Uploads backup failed"
        }
    fi
    
    if [[ -d logs ]]; then
        tar -czf "$BACKUP_DIR/logs_$TIMESTAMP.tar.gz" logs/ || {
            warning "Logs backup failed"
        }
    fi
    
    success "Backup completed"
}

# Function to pull latest changes
update_source() {
    log "Pulling latest changes from repository..."
    
    # Save current commit hash for potential rollback
    echo $(git rev-parse HEAD) > .last_deploy_commit
    
    # Pull latest changes
    git fetch origin
    git checkout main
    git pull origin main
    
    success "Source code updated"
}

# Function to validate configuration
validate_config() {
    log "Validating configuration..."
    
    # Check if critical environment variables are set
    source .env
    
    REQUIRED_VARS=(
        "POSTGRES_PASSWORD"
        "JWT_SECRET"
        "FRONTEND_URL"
        "REACT_APP_API_URL"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    # Check if secrets are not default values
    if [[ "$POSTGRES_PASSWORD" == "CHANGE_ME_SECURE_DB_PASSWORD_128_CHARS_MIN" ]]; then
        error "POSTGRES_PASSWORD is still set to default value"
        exit 1
    fi
    
    if [[ "$JWT_SECRET" == "CHANGE_ME_SUPER_SECURE_JWT_SECRET_AT_LEAST_64_CHARACTERS_FOR_PRODUCTION_USE" ]]; then
        error "JWT_SECRET is still set to default value"
        exit 1
    fi
    
    success "Configuration validation passed"
}

# Function to build images
build_images() {
    log "Building Docker images..."
    
    # Build with no cache to ensure latest changes
    docker-compose -f docker-compose.prod.yml build --no-cache --parallel
    
    success "Images built successfully"
}

# Function to stop services gracefully
stop_services() {
    log "Stopping existing services..."
    
    if docker-compose -f docker-compose.prod.yml ps -q | grep -q .; then
        # Graceful shutdown
        docker-compose -f docker-compose.prod.yml stop
        
        # Wait for containers to stop
        timeout=30
        while docker-compose -f docker-compose.prod.yml ps -q | grep -q . && [ $timeout -gt 0 ]; do
            sleep 1
            ((timeout--))
        done
        
        # Force stop if still running
        if docker-compose -f docker-compose.prod.yml ps -q | grep -q .; then
            warning "Force stopping containers..."
            docker-compose -f docker-compose.prod.yml kill
        fi
        
        # Remove containers
        docker-compose -f docker-compose.prod.yml rm -f
    fi
    
    success "Services stopped"
}

# Function to start services
start_services() {
    log "Starting services..."
    
    # Start services
    docker-compose -f docker-compose.prod.yml up -d
    
    success "Services started"
}

# Function to wait for services to be healthy
wait_for_health() {
    log "Waiting for services to be healthy..."
    
    local timeout=$HEALTH_CHECK_TIMEOUT
    local healthy=false
    
    while [ $timeout -gt 0 ] && [ "$healthy" = false ]; do
        log "Health check attempt (${timeout}s remaining)..."
        
        # Check if all services are running
        if docker-compose -f docker-compose.prod.yml ps | grep -q "Exit\|unhealthy"; then
            sleep 5
            ((timeout-=5))
            continue
        fi
        
        # Check backend health
        if curl -f -s --max-time 5 http://localhost/api/health > /dev/null 2>&1; then
            success "Backend is healthy"
        else
            sleep 5
            ((timeout-=5))
            continue
        fi
        
        # Check AI service health
        if curl -f -s --max-time 5 http://localhost/ai/health/status > /dev/null 2>&1; then
            success "AI Service is healthy"
        else
            sleep 5
            ((timeout-=5))
            continue
        fi
        
        # Check frontend
        if curl -f -s --max-time 5 http://localhost/ > /dev/null 2>&1; then
            success "Frontend is healthy"
            healthy=true
        else
            sleep 5
            ((timeout-=5))
            continue
        fi
    done
    
    if [ "$healthy" = false ]; then
        error "Health check failed after $HEALTH_CHECK_TIMEOUT seconds"
        return 1
    fi
    
    success "All services are healthy"
    return 0
}

# Function to run post-deployment tasks
post_deployment() {
    log "Running post-deployment tasks..."
    
    # Run database migrations (if needed)
    docker-compose -f docker-compose.prod.yml exec -T backend npm run prisma:migrate || {
        warning "Database migration failed or not needed"
    }
    
    # Clear application caches
    docker-compose -f docker-compose.prod.yml exec -T redis redis-cli FLUSHDB || {
        warning "Cache clear failed"
    }
    
    # Send deployment notification (if configured)
    if [[ -n "${DEPLOYMENT_WEBHOOK:-}" ]]; then
        curl -X POST "$DEPLOYMENT_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"KMRL Train System deployed successfully at $(date)\"}" || {
            warning "Deployment notification failed"
        }
    fi
    
    success "Post-deployment tasks completed"
}

# Function to rollback on failure
rollback() {
    if [[ "$ROLLBACK_ON_FAILURE" != "true" ]]; then
        error "Deployment failed but rollback is disabled"
        return 1
    fi
    
    log "Rolling back due to deployment failure..."
    
    # Stop current services
    docker-compose -f docker-compose.prod.yml down
    
    # Restore previous commit
    if [[ -f .last_deploy_commit ]]; then
        PREVIOUS_COMMIT=$(cat .last_deploy_commit)
        git checkout "$PREVIOUS_COMMIT"
        
        # Rebuild and start
        docker-compose -f docker-compose.prod.yml build --no-cache
        docker-compose -f docker-compose.prod.yml up -d
        
        # Wait for health
        if wait_for_health; then
            success "Rollback completed successfully"
        else
            error "Rollback failed - manual intervention required"
            return 1
        fi
    else
        error "No previous commit found - cannot rollback"
        return 1
    fi
}

# Function to cleanup old resources
cleanup() {
    log "Cleaning up old resources..."
    
    # Remove unused Docker images
    docker image prune -f
    
    # Remove unused volumes (be careful with this)
    # docker volume prune -f
    
    # Clean old backups (keep last 10)
    if [[ -d "$BACKUP_DIR" ]]; then
        find "$BACKUP_DIR" -name "*.tar.gz" -o -name "*.sql" | sort -r | tail -n +11 | xargs rm -f
    fi
    
    success "Cleanup completed"
}

# Function to display deployment summary
show_summary() {
    log "Deployment Summary:"
    echo "===================="
    echo "✅ Deployment completed successfully"
    echo "🕒 Started: $(head -1 "$DEPLOYMENT_LOG" | grep -o '\[.*\]')"
    echo "🏁 Finished: $(date +'%Y-%m-%d %H:%M:%S')"
    echo "🔗 Frontend: ${FRONTEND_URL:-http://localhost}"
    echo "📊 Monitoring: http://localhost:3000 (Grafana)"
    echo "📈 Metrics: http://localhost:9090 (Prometheus)"
    echo "🔍 Logs: http://localhost:5601 (Kibana)"
    echo "===================="
}

# Main deployment function
main() {
    log "🚀 Starting KMRL Train Induction System deployment..."
    
    # Create log file
    touch "$DEPLOYMENT_LOG"
    
    # Trap errors for rollback
    if [[ "$ROLLBACK_ON_FAILURE" == "true" ]]; then
        trap 'rollback' ERR
    fi
    
    # Run deployment steps
    check_prerequisites
    create_backup
    update_source
    validate_config
    build_images
    stop_services
    start_services
    
    # Check if deployment was successful
    if wait_for_health; then
        post_deployment
        cleanup
        show_summary
        success "🎉 Deployment completed successfully!"
    else
        error "❌ Deployment failed during health check"
        exit 1
    fi
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback
        ;;
    "health")
        wait_for_health
        ;;
    "backup")
        create_backup
        ;;
    "cleanup")
        cleanup
        ;;
    *)
        echo "Usage: $0 [deploy|rollback|health|backup|cleanup]"
        exit 1
        ;;
esac
