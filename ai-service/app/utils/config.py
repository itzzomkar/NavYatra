"""Configuration management for KMRL AI Service"""

import os
from typing import List, Optional
from functools import lru_cache
from pydantic import validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "KMRL AI Service"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    
    # Security
    SECRET_KEY: str = "kmrl-ai-service-secret-key-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Database
    DATABASE_URL: str = "postgresql://kmrl_user:kmrl_password@localhost:5432/kmrl_train_db"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0
    
    # Backend API
    BACKEND_API_URL: str = "http://localhost:3001"
    BACKEND_API_TOKEN: Optional[str] = None
    
    # ML Models
    MODEL_PATH: str = "app/ml/models"
    MODEL_VERSION: str = "v1.0"
    
    # Optimization
    OPTIMIZATION_TIMEOUT: int = 30  # seconds
    MAX_OPTIMIZATION_WORKERS: int = 4
    GENETIC_ALGORITHM_GENERATIONS: int = 1000
    GENETIC_ALGORITHM_POPULATION: int = 100
    
    # OR-Tools Configuration
    ORTOOLS_TIME_LIMIT: int = 30  # seconds
    ORTOOLS_THREADS: int = 4
    
    # Trainset Configuration (KMRL specific)
    MAX_TRAINSETS: int = 25
    MAX_STABLING_POSITIONS: int = 30
    DEPOT_NAME: str = "Muttom Depot"
    
    # Fitness Certificate Configuration
    FITNESS_VALIDITY_DAYS: int = 365
    FITNESS_WARNING_DAYS: int = 30  # Days before expiry to warn
    
    # Job Card Configuration
    MAXIMO_SYNC_INTERVAL: int = 300  # seconds (5 minutes)
    HIGH_PRIORITY_THRESHOLD: int = 3  # Priority >= 3 is high priority
    
    # Branding Configuration
    MIN_BRANDING_EXPOSURE: float = 8.0  # hours per day
    BRANDING_PRIORITY_WEIGHT: float = 0.3
    
    # Mileage Configuration
    MILEAGE_BALANCE_THRESHOLD: float = 0.15  # 15% variance allowed
    TARGET_DAILY_MILEAGE: float = 200.0  # km per day
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} | {message}"
    LOG_RETENTION: str = "30 days"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
    ]
    
    ALLOWED_HOSTS: List[str] = [
        "localhost",
        "127.0.0.1",
        "0.0.0.0"
    ]
    
    # Monitoring
    ENABLE_METRICS: bool = True
    METRICS_PORT: int = 9090
    
    # Caching
    CACHE_TTL: int = 300  # seconds (5 minutes)
    OPTIMIZATION_RESULT_TTL: int = 3600  # seconds (1 hour)
    
    # Performance
    MAX_CONCURRENT_OPTIMIZATIONS: int = 5
    OPTIMIZATION_QUEUE_SIZE: int = 20
    
    # External APIs
    WEATHER_API_URL: Optional[str] = None
    WEATHER_API_KEY: Optional[str] = None
    
    # IoT Configuration
    IOT_MQTT_BROKER: Optional[str] = None
    IOT_MQTT_PORT: int = 1883
    IOT_MQTT_USERNAME: Optional[str] = None
    IOT_MQTT_PASSWORD: Optional[str] = None
    
    # Alerts and Notifications
    ALERT_WEBHOOK_URL: Optional[str] = None
    EMAIL_NOTIFICATIONS: bool = False
    SLACK_WEBHOOK_URL: Optional[str] = None
    
    @validator("CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v
    
    @validator("ALLOWED_HOSTS", pre=True)
    def assemble_allowed_hosts(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v
    
    @validator("DEBUG", pre=True)
    def parse_debug(cls, v):
        if isinstance(v, str):
            return v.lower() in ("true", "1", "yes", "on")
        return v
    
    @validator("ENABLE_METRICS", pre=True)
    def parse_enable_metrics(cls, v):
        if isinstance(v, str):
            return v.lower() in ("true", "1", "yes", "on")
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Optimization algorithm configurations
OPTIMIZATION_ALGORITHMS = {
    "genetic_algorithm": {
        "name": "Genetic Algorithm",
        "description": "Multi-objective genetic algorithm for train scheduling",
        "parameters": {
            "population_size": 100,
            "generations": 1000,
            "crossover_rate": 0.8,
            "mutation_rate": 0.1,
            "elitism_count": 10
        },
        "timeout": 30
    },
    "constraint_programming": {
        "name": "Constraint Programming",
        "description": "OR-Tools CP-SAT solver for constraint satisfaction",
        "parameters": {
            "time_limit": 30,
            "num_search_workers": 4,
            "log_search_progress": False
        },
        "timeout": 30
    },
    "simulated_annealing": {
        "name": "Simulated Annealing",
        "description": "Simulated annealing optimization for local search",
        "parameters": {
            "initial_temperature": 100.0,
            "cooling_rate": 0.95,
            "min_temperature": 0.01,
            "max_iterations": 10000
        },
        "timeout": 20
    },
    "particle_swarm": {
        "name": "Particle Swarm Optimization",
        "description": "PSO for continuous optimization problems",
        "parameters": {
            "swarm_size": 50,
            "max_iterations": 1000,
            "inertia_weight": 0.5,
            "cognitive_weight": 1.5,
            "social_weight": 1.5
        },
        "timeout": 25
    }
}

# ML Model configurations
ML_MODELS = {
    "maintenance_predictor": {
        "name": "Maintenance Prediction Model",
        "description": "Predicts maintenance requirements based on usage patterns",
        "algorithm": "RandomForestClassifier",
        "features": [
            "current_mileage",
            "days_since_last_maintenance",
            "average_daily_usage",
            "weather_conditions",
            "route_difficulty"
        ]
    },
    "mileage_optimizer": {
        "name": "Mileage Optimization Model",
        "description": "Optimizes mileage distribution across trainsets",
        "algorithm": "LinearRegression",
        "features": [
            "historical_mileage",
            "trainset_age",
            "maintenance_status",
            "route_assignment"
        ]
    },
    "demand_forecaster": {
        "name": "Passenger Demand Forecasting",
        "description": "Forecasts passenger demand for capacity planning",
        "algorithm": "LSTM",
        "features": [
            "historical_ridership",
            "time_of_day",
            "day_of_week",
            "weather",
            "events"
        ]
    },
    "anomaly_detector": {
        "name": "Equipment Anomaly Detection",
        "description": "Detects anomalies in equipment behavior",
        "algorithm": "IsolationForest",
        "features": [
            "sensor_readings",
            "performance_metrics",
            "environmental_conditions"
        ]
    }
}

# Constraint definitions for optimization
SCHEDULING_CONSTRAINTS = {
    "fitness_certificate": {
        "required": True,
        "weight": 1.0,
        "description": "Trainset must have valid fitness certificate"
    },
    "job_card_status": {
        "required": True,
        "weight": 0.8,
        "description": "No pending high-priority job cards"
    },
    "mileage_balance": {
        "required": False,
        "weight": 0.6,
        "description": "Balance mileage across fleet",
        "threshold": 0.15
    },
    "branding_priority": {
        "required": False,
        "weight": 0.3,
        "description": "Maximize branding exposure"
    },
    "cleaning_schedule": {
        "required": True,
        "weight": 0.5,
        "description": "Ensure cleaning schedule compliance"
    },
    "stabling_geometry": {
        "required": False,
        "weight": 0.4,
        "description": "Optimize stabling positions for energy efficiency"
    },
    "maintenance_window": {
        "required": True,
        "weight": 0.9,
        "description": "Respect maintenance time windows"
    }
}
