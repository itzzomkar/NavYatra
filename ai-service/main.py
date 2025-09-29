"""
KMRL Train Induction AI/ML Optimization Service
FastAPI microservice for train scheduling optimization and machine learning
"""

import os
import sys
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from loguru import logger
import uvicorn

# Add app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.routers import optimization, analytics, health, ml_models, ai_automation
from app.services.database import get_database_connection, close_database_connection
from app.services.redis_service import get_redis_connection, close_redis_connection
from app.utils.config import get_settings
from app.utils.logging_config import setup_logging

# Setup logging
setup_logging()

# Get settings
settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("🤖 KMRL AI Service starting up...")
    
    try:
        # Initialize database connection
        await get_database_connection()
        logger.info("✅ Database connection established")
        
        # Initialize Redis connection
        await get_redis_connection()
        logger.info("✅ Redis connection established")
        
        # Initialize ML models
        from app.ml.model_manager import ModelManager
        model_manager = ModelManager()
        await model_manager.load_models()
        logger.info("✅ ML models loaded")
        
        logger.info("🚀 KMRL AI Service startup complete")
        
    except Exception as e:
        logger.error(f"❌ Failed to start AI service: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("🔄 KMRL AI Service shutting down...")
    
    try:
        # Close database connection
        await close_database_connection()
        logger.info("✅ Database connection closed")
        
        # Close Redis connection
        await close_redis_connection()
        logger.info("✅ Redis connection closed")
        
        logger.info("👋 KMRL AI Service shutdown complete")
        
    except Exception as e:
        logger.error(f"❌ Error during shutdown: {e}")

# Create FastAPI application
app = FastAPI(
    title="KMRL Train Induction AI/ML Service",
    description="""
    AI-driven optimization service for Kochi Metro Rail Limited (KMRL) train scheduling system.
    
    ## Features
    
    * **AI Automation**: Fully autonomous decision-making and scheduling systems
    * **Optimization Engine**: Multi-objective constraint satisfaction for train scheduling
    * **Predictive Maintenance**: ML-powered failure prediction and maintenance scheduling
    * **Intelligent Scheduler**: Autonomous schedule generation with real-time optimization
    * **Machine Learning**: Advanced models for maintenance scheduling and performance optimization
    * **Real-time Analytics**: Performance metrics and recommendations
    * **OR-Tools Integration**: Advanced constraint programming for complex scheduling scenarios
    
    ## Optimization Variables
    
    * Fitness Certificates Status
    * Job Card Priorities (IBM Maximo Integration)
    * Branding Exposure Optimization
    * Mileage Balancing Across Fleet
    * Cleaning Slot Allocation
    * Energy-Efficient Stabling Geometry
    
    """,
    version="1.0.0",
    contact={
        "name": "KMRL Development Team",
        "email": "tech@kmrl.com",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS
)

# Include routers
app.include_router(health.router, prefix="/health", tags=["Health Check"])
app.include_router(optimization.router, prefix="/api/v1/optimization", tags=["Optimization Engine"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics & ML"])
app.include_router(ml_models.router, prefix="/api/v1/ml", tags=["Machine Learning Models"])
app.include_router(ai_automation.router, prefix="/api/v1/ai", tags=["AI Automation"])

@app.get("/", tags=["Root"])
async def root() -> Dict[str, Any]:
    """Root endpoint with service information"""
    return {
        "service": "KMRL Train Induction AI/ML Service",
        "version": "1.0.0",
        "status": "running",
        "description": "AI-driven optimization and machine learning service for train scheduling",
        "endpoints": {
            "health": "/health",
            "optimization": "/api/v1/optimization",
            "analytics": "/api/v1/analytics",
            "ml_models": "/api/v1/ml",
            "ai_automation": "/api/v1/ai",
            "docs": "/docs",
            "redoc": "/redoc"
        },
        "capabilities": [
            "Fully autonomous AI decision-making",
            "Intelligent schedule generation",
            "Predictive maintenance with ML",
            "Multi-objective optimization",
            "Constraint satisfaction solving",
            "Mileage balancing optimization",
            "Branding exposure maximization",
            "Real-time performance analytics",
            "Autonomous system monitoring"
        ]
    }

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    """Custom HTTP exception handler"""
    logger.error(f"HTTP {exc.status_code}: {exc.detail}")
    return {
        "error": {
            "status_code": exc.status_code,
            "detail": exc.detail,
            "timestamp": "2024-01-01T00:00:00Z"
        }
    }

@app.exception_handler(Exception)
async def general_exception_handler(request, exc: Exception):
    """General exception handler"""
    logger.error(f"Unhandled exception: {exc}")
    return {
        "error": {
            "status_code": 500,
            "detail": "Internal server error",
            "timestamp": "2024-01-01T00:00:00Z"
        }
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
        workers=1 if settings.DEBUG else 4
    )
