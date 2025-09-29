"""Logging configuration for KMRL AI Service"""

import sys
from loguru import logger
from .config import get_settings

def setup_logging():
    """Setup loguru logging configuration"""
    settings = get_settings()
    
    # Remove default logger
    logger.remove()
    
    # Add console logger
    logger.add(
        sys.stdout,
        level=settings.LOG_LEVEL,
        format=settings.LOG_FORMAT,
        colorize=True
    )
    
    # Add file logger
    logger.add(
        "logs/ai_service.log",
        level=settings.LOG_LEVEL,
        format=settings.LOG_FORMAT,
        rotation="1 day",
        retention=settings.LOG_RETENTION,
        compression="zip"
    )
    
    logger.info("Logging configured successfully")
