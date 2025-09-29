#!/bin/bash

# =============================================================================
# KMRL Train Induction System - Production Deployment Script
# =============================================================================
# This script automates the deployment of the KMRL Train Induction System
# to production environment with comprehensive checks and rollback capability
# =============================================================================

set -euo pipefail

# Script configuration
SCRIPT_NAME="KMRL Production Deployment"
SCRIPT_VERSION="1.0.0"
LOG_FILE="logs/deployment-$(date +%Y%m%d_%H%M%S).log"
DEPLOYMENT_START_TIME=$(date)

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment variables
ENVIRONMENT=${ENVIRONMENT:-production}
PROJECT_ROOT=$(pwd)
BACKUP_DIR="${PROJECT_ROOT}/backups"
DEPLOYMENT_ID=$(date +%Y%m%d_%H%M%S)

# Docker configuration
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"
CONTAINER_PREFIX="kmrl"

# Health check configuration
HEALTH_CHECK_TIMEOUT=300
HEALTH_CHECK_INTERVAL=10
MAX_HEALTH_RETRIES=30

# =============================================================================
# Utility Functions
# =============================================================================

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Create logs directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
    
    case $level in
        "ERROR")   echo -e "${RED}[ERROR]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[SUCCESS]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[WARNING]${NC} $message" ;;
        "INFO")    echo -e "${BLUE}[INFO]${NC} $message" ;;
        *)         echo "$message" ;;
    esac
}

# Error handling
error_exit() {
    log "ERROR" "$1"
    log "ERROR" "Deployment failed. Check logs at: $LOG_FILE"
    exit 1
}

# Success message
success() {
    log "SUCCESS" "$1"
}

# Warning message
warning() {
    log "WARNING" "$1"
}

# Info message
info() {
    log "INFO" "$1"
}

# Check if command exists
check_command() {
    if ! command -v "$1" &> /dev/null; then
        error_exit "Command '$1' not found. Please install it before continuing."
    fi
}

# Wait for user confirmation
confirm() {
    local message="$1"
    local default="${2:-n}"
    
    while true; do
        if [ "$default" = "y" ]; then
            read -p "$message [Y/n]: " yn
            yn=${yn:-y}
        else
            read -p "$message [y/N]: " yn
            yn=${yn:-n}
        fi
        
        case $yn in
            [Yy]* ) return 0;;
            [Nn]* ) return 1;;
            * ) echo "Please answer yes or no.";;
        esac
    done
}

# =============================================================================
# Pre-deployment Checks
# =============================================================================

pre_deployment_checks() {
    info "Running pre-deployment checks..."
    
    # Check required commands
    check_command "docker"
    check_command "docker-compose"
    check_command "git"
    check_command "curl"
    check_command "jq"
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        error_exit "Not in project root directory. Please run from project root."
    fi
    
    # Check if production environment file exists
    if [ ! -f ".env.production" ]; then
        error_exit "Production environment file (.env.production) not found. Please create it from .env.production.example"
    fi
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        error_exit "Docker is not running. Please start Docker and try again."
    fi
    
    # Check available disk space (minimum 5GB)
    AVAILABLE_SPACE=$(df . | tail -1 | awk '{print $4}')
    if [ "$AVAILABLE_SPACE" -lt 5242880 ]; then
        error_exit "Insufficient disk space. At least 5GB required for deployment."
    fi
    
    # Check if git repository is clean
    if [ -n "$(git status --porcelain)" ]; then
        warning "Git repository has uncommitted changes."
        if ! confirm "Continue with uncommitted changes?"; then
            error_exit "Deployment cancelled due to uncommitted changes."
        fi
    fi
    
    # Check if on main/master branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
        warning "Not on main/master branch. Current branch: $CURRENT_BRANCH"
        if ! confirm "Continue deployment from current branch?"; then
            error_exit "Deployment cancelled. Please switch to main/master branch."
        fi
    fi
    
    success "Pre-deployment checks passed"
}

# =============================================================================
# Backup Functions
# =============================================================================

create_backup() {
    info "Creating backup before deployment..."
    
    mkdir -p "$BACKUP_DIR"
    BACKUP_PATH="$BACKUP_DIR/backup_$DEPLOYMENT_ID"
    mkdir -p "$BACKUP_PATH"
    
    # Backup database
    info "Backing up database..."
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres pg_dumpall -U "$POSTGRES_USER" > "$BACKUP_PATH/database_backup.sql" 2>/dev/null; then
        success "Database backup created"
    else
        warning "Database backup failed or database not running"
    fi
    
    # Backup Redis data
    info "Backing up Redis data..."
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T redis redis-cli --rdb - > "$BACKUP_PATH/redis_backup.rdb" 2>/dev/null; then
        success "Redis backup created"
    else
        warning "Redis backup failed or Redis not running"
    fi
    
    # Backup configuration files
    info "Backing up configuration files..."
    cp -r docker/ "$BACKUP_PATH/" 2>/dev/null || true
    cp .env.production "$BACKUP_PATH/" 2>/dev/null || true
    cp "$DOCKER_COMPOSE_FILE" "$BACKUP_PATH/" 2>/dev/null || true
    
    # Create backup metadata
    cat > "$BACKUP_PATH/backup_info.json" <<EOF
{
    "backup_id": "$DEPLOYMENT_ID",
    "timestamp": "$(date -Iseconds)",
    "git_commit": "$(git rev-parse HEAD)",
    "git_branch": "$(git rev-parse --abbrev-ref HEAD)",
    "environment": "$ENVIRONMENT"
}
EOF
    
    success "Backup created at: $BACKUP_PATH"
    export BACKUP_PATH
}

# =============================================================================
# Build and Test Functions
# =============================================================================

build_application() {
    info "Building application..."
    
    # Pull latest images
    info "Pulling base images..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" pull
    
    # Build custom images
    info "Building custom images..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" build --no-cache --force-rm
    
    success "Application built successfully"
}

run_tests() {
    info "Running tests..."
    
    # Backend tests
    info "Running backend tests..."
    if docker-compose -f docker-compose.test.yml run --rm backend npm test; then
        success "Backend tests passed"
    else
        error_exit "Backend tests failed"
    fi
    
    # Frontend tests
    info "Running frontend tests..."
    if docker-compose -f docker-compose.test.yml run --rm frontend npm test -- --coverage --watchAll=false; then
        success "Frontend tests passed"
    else
        error_exit "Frontend tests failed"
    fi
    
    # Integration tests
    info "Running integration tests..."
    if docker-compose -f docker-compose.test.yml run --rm e2e npm run test:e2e; then
        success "Integration tests passed"
    else
        error_exit "Integration tests failed"
    fi
    
    # Cleanup test containers
    docker-compose -f docker-compose.test.yml down -v
    
    success "All tests passed"
}

# =============================================================================
# Deployment Functions
# =============================================================================

stop_services() {
    info "Stopping current services..."
    
    if docker-compose -f "$DOCKER_COMPOSE_FILE" ps -q | grep -q .; then
        docker-compose -f "$DOCKER_COMPOSE_FILE" down --timeout 30
        success "Services stopped"
    else
        info "No services running"
    fi
}

start_services() {
    info "Starting services..."
    
    # Start infrastructure services first
    info "Starting database and cache services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d postgres redis
    
    # Wait for database to be ready
    info "Waiting for database to be ready..."
    local retries=0
    while [ $retries -lt 30 ]; do
        if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres pg_isready -U "$POSTGRES_USER" &>/dev/null; then
            break
        fi
        sleep 2
        retries=$((retries + 1))
    done
    
    if [ $retries -eq 30 ]; then
        error_exit "Database failed to start within timeout"
    fi
    
    # Run database migrations
    info "Running database migrations..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" run --rm backend npm run migrate:deploy
    
    # Start application services
    info "Starting application services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    success "Services started"
}

# =============================================================================
# Health Check Functions
# =============================================================================

wait_for_health() {
    info "Waiting for services to be healthy..."
    
    local retries=0
    local max_retries=$((HEALTH_CHECK_TIMEOUT / HEALTH_CHECK_INTERVAL))
    
    while [ $retries -lt $max_retries ]; do
        local all_healthy=true
        
        # Check backend health
        if ! curl -f -s http://localhost:3001/health >/dev/null 2>&1; then
            all_healthy=false
        fi
        
        # Check frontend availability
        if ! curl -f -s http://localhost:3000 >/dev/null 2>&1; then
            all_healthy=false
        fi
        
        # Check AI service health
        if ! curl -f -s http://localhost:8001/health >/dev/null 2>&1; then
            all_healthy=false
        fi
        
        if [ "$all_healthy" = true ]; then
            success "All services are healthy"
            return 0
        fi
        
        info "Services not ready yet. Retrying in ${HEALTH_CHECK_INTERVAL}s... ($((retries + 1))/$max_retries)"
        sleep $HEALTH_CHECK_INTERVAL
        retries=$((retries + 1))
    done
    
    error_exit "Services failed to become healthy within $HEALTH_CHECK_TIMEOUT seconds"
}

detailed_health_check() {
    info "Running detailed health checks..."
    
    # Backend API health check
    info "Checking backend API..."
    local backend_health=$(curl -s http://localhost:3001/health | jq -r '.data.status' 2>/dev/null || echo "failed")
    if [ "$backend_health" = "healthy" ]; then
        success "Backend API is healthy"
    else
        error_exit "Backend API health check failed"
    fi
    
    # Database connectivity
    info "Checking database connectivity..."
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T backend node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        prisma.\$queryRaw\`SELECT 1\`.then(() => {
            console.log('Database connection successful');
            process.exit(0);
        }).catch((e) => {
            console.error('Database connection failed:', e.message);
            process.exit(1);
        });
    "; then
        success "Database connectivity verified"
    else
        error_exit "Database connectivity check failed"
    fi
    
    # Redis connectivity
    info "Checking Redis connectivity..."
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T redis redis-cli ping | grep -q "PONG"; then
        success "Redis connectivity verified"
    else
        error_exit "Redis connectivity check failed"
    fi
    
    success "Detailed health checks passed"
}

# =============================================================================
# Monitoring and Cleanup Functions
# =============================================================================

setup_monitoring() {
    info "Setting up monitoring..."
    
    # Create monitoring directories
    mkdir -p logs/monitoring
    mkdir -p metrics
    
    # Start log monitoring
    docker-compose -f "$DOCKER_COMPOSE_FILE" logs -f > "logs/monitoring/runtime_$(date +%Y%m%d_%H%M%S).log" 2>&1 &
    
    # Save monitoring PID for cleanup
    echo $! > .monitoring.pid
    
    success "Monitoring setup complete"
}

cleanup() {
    info "Performing cleanup..."
    
    # Stop monitoring if running
    if [ -f .monitoring.pid ]; then
        local monitoring_pid=$(cat .monitoring.pid)
        kill "$monitoring_pid" 2>/dev/null || true
        rm -f .monitoring.pid
    fi
    
    # Clean up old images
    docker image prune -f
    
    # Clean up old backups (keep last 10)
    if [ -d "$BACKUP_DIR" ]; then
        find "$BACKUP_DIR" -maxdepth 1 -type d -name "backup_*" | sort -r | tail -n +11 | xargs rm -rf
    fi
    
    success "Cleanup completed"
}

# =============================================================================
# Rollback Functions
# =============================================================================

rollback() {
    local backup_path="$1"
    
    warning "Initiating rollback to backup: $backup_path"
    
    if [ ! -d "$backup_path" ]; then
        error_exit "Backup directory not found: $backup_path"
    fi
    
    # Stop current services
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    
    # Restore database
    if [ -f "$backup_path/database_backup.sql" ]; then
        info "Restoring database..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" up -d postgres
        sleep 10
        docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres psql -U "$POSTGRES_USER" < "$backup_path/database_backup.sql"
        success "Database restored"
    fi
    
    # Restore Redis
    if [ -f "$backup_path/redis_backup.rdb" ]; then
        info "Restoring Redis..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T redis redis-cli --rdb "$backup_path/redis_backup.rdb"
        success "Redis restored"
    fi
    
    # Restore configuration
    if [ -f "$backup_path/.env.production" ]; then
        cp "$backup_path/.env.production" .env.production
        success "Configuration restored"
    fi
    
    # Restart services
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    success "Rollback completed"
}

# =============================================================================
# Main Deployment Process
# =============================================================================

main() {
    echo "==============================================="
    echo "  $SCRIPT_NAME v$SCRIPT_VERSION"
    echo "  Started: $DEPLOYMENT_START_TIME"
    echo "  Environment: $ENVIRONMENT"
    echo "  Deployment ID: $DEPLOYMENT_ID"
    echo "==============================================="
    echo
    
    # Trap errors for cleanup
    trap 'error_exit "Deployment failed at line $LINENO"' ERR
    trap 'cleanup' EXIT
    
    # Confirm deployment
    if ! confirm "Are you sure you want to deploy to $ENVIRONMENT?"; then
        info "Deployment cancelled by user"
        exit 0
    fi
    
    # Main deployment steps
    pre_deployment_checks
    create_backup
    
    # Skip tests if --skip-tests flag is provided
    if [[ ! " $* " =~ " --skip-tests " ]]; then
        build_application
        run_tests
    else
        warning "Skipping tests as requested"
        build_application
    fi
    
    stop_services
    start_services
    wait_for_health
    detailed_health_check
    setup_monitoring
    
    # Deployment success
    local deployment_end_time=$(date)
    local duration=$(($(date +%s) - $(date -d "$DEPLOYMENT_START_TIME" +%s)))
    
    echo
    echo "==============================================="
    success "Deployment completed successfully!"
    echo "  Start Time: $DEPLOYMENT_START_TIME"
    echo "  End Time: $deployment_end_time"
    echo "  Duration: ${duration}s"
    echo "  Deployment ID: $DEPLOYMENT_ID"
    echo "  Backup Location: $BACKUP_PATH"
    echo "  Log File: $LOG_FILE"
    echo "==============================================="
    echo
    echo "Service URLs:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend API: http://localhost:3001"
    echo "  Health Check: http://localhost:3001/health"
    echo "  AI Service: http://localhost:8001"
    echo
    echo "To rollback if needed:"
    echo "  $0 --rollback $BACKUP_PATH"
    echo
}

# =============================================================================
# Script Entry Point
# =============================================================================

# Handle command line arguments
case "${1:-}" in
    --rollback)
        if [ -z "${2:-}" ]; then
            error_exit "Backup path required for rollback"
        fi
        rollback "$2"
        ;;
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo
        echo "Options:"
        echo "  --skip-tests     Skip running tests during deployment"
        echo "  --rollback PATH  Rollback to specified backup"
        echo "  --help, -h       Show this help message"
        echo
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac