#!/bin/bash

# Production Deployment Script for Credential Hub Proof Service
# This script sets up the production environment and deploys the service

set -e  # Exit on any error

echo "🚀 Starting Credential Hub Production Deployment"

# Configuration
APP_NAME="credential-hub"
SERVICE_PORT=${SERVICE_PORT:-8000}
METRICS_PORT=${METRICS_PORT:-9090}
ENVIRONMENT=${ENVIRONMENT:-production}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "This script should not be run as root for security reasons"
        exit 1
    fi
}

# Check system requirements
check_requirements() {
    log_info "Checking system requirements..."
    
    # Check Python version
    if ! command -v python3.11 &> /dev/null; then
        log_error "Python 3.11+ is required but not installed"
        exit 1
    fi
    
    # Check Node.js for SnarkJS
    if ! command -v node &> /dev/null; then
        log_error "Node.js is required for SnarkJS but not installed"
        exit 1
    fi
    
    # Check PostgreSQL client
    if ! command -v psql &> /dev/null; then
        log_warn "PostgreSQL client not found - database operations may fail"
    fi
    
    # Check Redis client
    if ! command -v redis-cli &> /dev/null; then
        log_warn "Redis client not found - cache operations may fail"
    fi
    
    log_info "System requirements check completed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Install Poetry if not present
    if ! command -v poetry &> /dev/null; then
        log_info "Installing Poetry..."
        curl -sSL https://install.python-poetry.org | python3 -
        export PATH="$HOME/.local/bin:$PATH"
    fi
    
    # Install Python dependencies
    poetry install --only=main
    
    # Install Node.js dependencies for SnarkJS
    if [ -f package.json ]; then
        npm install
    fi
    
    log_info "Dependencies installation completed"
}

# Setup environment
setup_environment() {
    log_info "Setting up environment..."
    
    # Create required directories
    mkdir -p logs
    mkdir -p /tmp/zkp_proofs
    mkdir -p circuits
    
    # Set secure permissions
    chmod 700 /tmp/zkp_proofs
    chmod 755 circuits
    
    # Copy environment template if .env doesn't exist
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            log_warn "Created .env from template - please update with production values"
        else
            log_warn "No .env file found and no template available"
        fi
    fi
    
    log_info "Environment setup completed"
}

# Database setup
setup_database() {
    log_info "Setting up database..."
    
    # Check if DATABASE_URL is set
    if [ -z "$DATABASE_URL" ]; then
        log_warn "DATABASE_URL not set - using default local configuration"
        export DATABASE_URL="postgresql://localhost:5432/credential_hub"
    fi
    
    # Test database connection
    poetry run python -c "
import asyncio
from app.database import init_database
async def test():
    try:
        await init_database()
        print('✅ Database connection successful')
    except Exception as e:
        print(f'❌ Database connection failed: {e}')
        exit(1)
asyncio.run(test())
" || {
        log_error "Database setup failed"
        exit 1
    }
    
    log_info "Database setup completed"
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    local max_retries=30
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if curl -s "http://localhost:${SERVICE_PORT}/health" >/dev/null 2>&1; then
            log_info "✅ Health check passed"
            return 0
        fi
        
        retry_count=$((retry_count + 1))
        log_info "Health check attempt $retry_count/$max_retries..."
        sleep 2
    done
    
    log_error "❌ Health check failed after $max_retries attempts"
    return 1
}

# Start service
start_service() {
    log_info "Starting Credential Hub service..."
    
    # Set production environment variables
    export ENVIRONMENT=production
    export LOG_LEVEL=${LOG_LEVEL:-INFO}
    
    # Start the service with production settings
    poetry run uvicorn app.main:app \
        --host 0.0.0.0 \
        --port $SERVICE_PORT \
        --workers ${WORKERS:-4} \
        --log-level info \
        --access-log \
        --proxy-headers \
        --forwarded-allow-ips='*' &
    
    # Store PID
    SERVICE_PID=$!
    echo $SERVICE_PID > /tmp/credential-hub.pid
    
    log_info "Service started with PID: $SERVICE_PID"
    log_info "Service URL: http://localhost:${SERVICE_PORT}"
    log_info "Metrics URL: http://localhost:${METRICS_PORT}/metrics"
    
    # Perform health check
    sleep 5
    if health_check; then
        log_info "🎉 Deployment successful!"
    else
        log_error "🚨 Deployment failed - service is not healthy"
        stop_service
        exit 1
    fi
}

# Stop service
stop_service() {
    log_info "Stopping service..."
    
    if [ -f /tmp/credential-hub.pid ]; then
        local pid=$(cat /tmp/credential-hub.pid)
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
            log_info "Service stopped"
        else
            log_warn "Service was not running"
        fi
        rm -f /tmp/credential-hub.pid
    else
        log_warn "PID file not found"
    fi
}

# Cleanup function
cleanup() {
    log_info "Performing cleanup..."
    
    # Clean temporary files
    rm -rf /tmp/zkp_proofs/*
    
    # Remove old logs (keep last 7 days)
    find logs -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    log_info "Cleanup completed"
}

# Signal handlers
trap 'log_info "Received interrupt signal"; stop_service; exit 0' INT TERM

# Main execution
main() {
    case "${1:-deploy}" in
        "deploy")
            check_root
            check_requirements
            install_dependencies
            setup_environment
            setup_database
            start_service
            ;;
        "start")
            start_service
            ;;
        "stop")
            stop_service
            ;;
        "restart")
            stop_service
            sleep 2
            start_service
            ;;
        "health")
            health_check
            ;;
        "cleanup")
            cleanup
            ;;
        "logs")
            tail -f logs/credential-hub.log 2>/dev/null || echo "No log file found"
            ;;
        *)
            echo "Usage: $0 {deploy|start|stop|restart|health|cleanup|logs}"
            echo "  deploy   - Full deployment (default)"
            echo "  start    - Start the service"
            echo "  stop     - Stop the service"
            echo "  restart  - Restart the service"
            echo "  health   - Check service health"
            echo "  cleanup  - Clean temporary files"
            echo "  logs     - Show service logs"
            exit 1
            ;;
    esac
}

main "$@" 