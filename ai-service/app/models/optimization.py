"""
Pydantic models for KMRL optimization requests and responses
"""

from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field, validator
from enum import Enum


class OptimizationStatus(str, Enum):
    """Optimization status enum"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class FitnessStatus(str, Enum):
    """Fitness certificate status"""
    VALID = "VALID"
    EXPIRED = "EXPIRED"
    PENDING = "PENDING"
    INVALID = "INVALID"
    UNDER_REVIEW = "UNDER_REVIEW"


class JobStatus(str, Enum):
    """Job card status"""
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    ON_HOLD = "ON_HOLD"


class JobPriority(str, Enum):
    """Job card priority levels"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"
    EMERGENCY = "EMERGENCY"


class TrainsetStatus(str, Enum):
    """Trainset operational status"""
    AVAILABLE = "AVAILABLE"
    IN_SERVICE = "IN_SERVICE"
    MAINTENANCE = "MAINTENANCE"
    OUT_OF_ORDER = "OUT_OF_ORDER"
    CLEANING = "CLEANING"
    DECOMMISSIONED = "DECOMMISSIONED"


class TrainsetData(BaseModel):
    """Trainset data for optimization"""
    trainset_id: str = Field(..., description="Unique identifier for the trainset")
    trainset_number: str = Field(..., description="Human-readable trainset number (e.g., KMRL-001)")
    
    # Basic properties
    manufacturer: str = Field(..., description="Trainset manufacturer")
    model: str = Field(..., description="Trainset model")
    capacity: int = Field(..., description="Passenger capacity")
    current_mileage: float = Field(..., description="Current odometer reading in km")
    total_mileage: float = Field(..., description="Total lifetime mileage in km")
    
    # Status information
    status: TrainsetStatus = Field(..., description="Current operational status")
    location: Optional[str] = Field(None, description="Current location/platform")
    depot: str = Field(..., description="Home depot")
    
    # Fitness certificate information
    fitness_valid: bool = Field(..., description="Whether fitness certificate is valid")
    fitness_expiry_date: Optional[datetime] = Field(None, description="Fitness certificate expiry date")
    fitness_status: FitnessStatus = Field(..., description="Detailed fitness status")
    
    # Job card information
    pending_job_cards: int = Field(0, description="Number of pending job cards")
    high_priority_jobs: int = Field(0, description="Number of high priority job cards")
    has_high_priority_jobs: bool = Field(False, description="Whether trainset has high priority maintenance")
    
    # Branding information
    branding_priority: int = Field(1, description="Branding/advertisement priority (1-5)")
    branding_revenue_potential: float = Field(0.0, description="Potential daily revenue from branding")
    current_branding_campaigns: int = Field(0, description="Number of active branding campaigns")
    
    # Maintenance information
    days_since_last_maintenance: int = Field(0, description="Days since last maintenance")
    next_maintenance_due: Optional[datetime] = Field(None, description="Next scheduled maintenance date")
    maintenance_score: float = Field(1.0, description="Maintenance readiness score (0-1)")
    
    # Performance metrics
    average_daily_mileage: float = Field(0.0, description="Average daily mileage in km")
    energy_efficiency_score: float = Field(1.0, description="Energy efficiency rating (0-1)")
    reliability_score: float = Field(1.0, description="Historical reliability score (0-1)")
    
    # IoT sensor data (optional)
    sensor_data: Optional[Dict[str, Any]] = Field(None, description="Latest IoT sensor readings")
    last_sensor_update: Optional[datetime] = Field(None, description="Last sensor data update time")
    
    @validator('branding_priority')
    def validate_branding_priority(cls, v):
        if not 1 <= v <= 5:
            raise ValueError('Branding priority must be between 1 and 5')
        return v
    
    @validator('current_mileage', 'total_mileage')
    def validate_mileage(cls, v):
        if v < 0:
            raise ValueError('Mileage cannot be negative')
        return v
    
    @validator('maintenance_score', 'energy_efficiency_score', 'reliability_score')
    def validate_scores(cls, v):
        if not 0 <= v <= 1:
            raise ValueError('Scores must be between 0 and 1')
        return v


class OptimizationConstraints(BaseModel):
    """Constraints for the optimization algorithm"""
    
    # Hard constraints (must be satisfied)
    require_valid_fitness: bool = Field(True, description="Require valid fitness certificates")
    exclude_high_priority_jobs: bool = Field(True, description="Exclude trainsets with high priority jobs")
    respect_maintenance_windows: bool = Field(True, description="Respect scheduled maintenance windows")
    
    # Soft constraints (preferences with weights)
    mileage_balance_weight: float = Field(0.6, description="Weight for mileage balancing (0-1)")
    branding_priority_weight: float = Field(0.3, description="Weight for branding optimization (0-1)")
    energy_efficiency_weight: float = Field(0.4, description="Weight for energy efficiency (0-1)")
    position_preference_weight: float = Field(0.2, description="Weight for position preferences (0-1)")
    
    # Thresholds
    max_mileage_variance: float = Field(0.15, description="Maximum allowed mileage variance (15%)")
    min_reliability_score: float = Field(0.7, description="Minimum reliability score required")
    max_days_since_maintenance: int = Field(60, description="Maximum days since last maintenance")
    
    # Capacity constraints
    max_trainsets_to_assign: int = Field(20, description="Maximum number of trainsets to assign")
    reserve_trainsets: int = Field(3, description="Number of trainsets to keep in reserve")
    
    @validator('mileage_balance_weight', 'branding_priority_weight', 'energy_efficiency_weight', 'position_preference_weight')
    def validate_weights(cls, v):
        if not 0 <= v <= 1:
            raise ValueError('Weights must be between 0 and 1')
        return v


class OptimizationRequest(BaseModel):
    """Request for schedule optimization"""
    
    optimization_id: str = Field(..., description="Unique ID for this optimization request")
    requested_by: Optional[str] = Field(None, description="User ID who requested optimization")
    
    # Algorithm selection
    algorithm: Optional[str] = Field("constraint_programming", description="Optimization algorithm to use")
    
    # Scheduling parameters
    schedule_date: datetime = Field(..., description="Date for which to optimize schedule")
    shift: str = Field("morning", description="Shift (morning, afternoon, evening, night)")
    max_trainsets: int = Field(20, description="Maximum number of trainsets to schedule")
    
    # Optimization parameters
    timeout_seconds: int = Field(30, description="Maximum time to spend optimizing")
    target_score: Optional[float] = Field(None, description="Target optimization score to achieve")
    
    # Algorithm-specific parameters
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Algorithm-specific parameters")
    
    # Constraints
    constraints: OptimizationConstraints = Field(default_factory=OptimizationConstraints, description="Optimization constraints")
    
    # Additional options
    generate_alternatives: bool = Field(False, description="Generate alternative solutions")
    explain_reasoning: bool = Field(True, description="Include reasoning for assignments")
    
    # Context information
    weather_conditions: Optional[str] = Field(None, description="Expected weather conditions")
    special_events: List[str] = Field(default_factory=list, description="Special events affecting demand")
    passenger_demand_forecast: Optional[Dict[str, float]] = Field(None, description="Expected passenger demand")
    
    @validator('max_trainsets')
    def validate_max_trainsets(cls, v):
        if not 1 <= v <= 25:  # KMRL has 25 trainsets
            raise ValueError('max_trainsets must be between 1 and 25')
        return v
    
    @validator('timeout_seconds')
    def validate_timeout(cls, v):
        if not 5 <= v <= 300:  # 5 seconds to 5 minutes
            raise ValueError('timeout_seconds must be between 5 and 300')
        return v


class AlternativeSolution(BaseModel):
    """Alternative optimization solution"""
    solution_id: str = Field(..., description="Unique ID for this alternative")
    score: float = Field(..., description="Optimization score")
    trainset_assignments: Dict[str, int] = Field(..., description="Trainset to position assignments")
    trade_offs: Dict[str, str] = Field(..., description="Trade-offs made in this solution")
    reasoning: Optional[str] = Field(None, description="Reasoning for this alternative")


class OptimizationResult(BaseModel):
    """Result of schedule optimization"""
    
    optimization_id: str = Field(..., description="Unique ID for the optimization request")
    status: OptimizationStatus = Field(..., description="Optimization status")
    
    # Algorithm information
    algorithm: str = Field(..., description="Algorithm used for optimization")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Algorithm parameters used")
    
    # Results
    score: float = Field(..., description="Overall optimization score")
    execution_time: float = Field(..., description="Time taken to optimize (seconds)")
    
    # Assignments
    trainset_assignments: Dict[str, int] = Field(default_factory=dict, description="Trainset ID to position mapping")
    position_assignments: Optional[Dict[int, str]] = Field(None, description="Position to trainset ID mapping")
    
    # Analysis
    constraint_violations: Dict[str, Any] = Field(default_factory=dict, description="Any constraint violations")
    performance_metrics: Optional[Dict[str, float]] = Field(None, description="Performance metrics")
    
    # Explanations
    explanation: Dict[str, Any] = Field(default_factory=dict, description="Detailed explanation of results")
    reasoning: Optional[Dict[str, str]] = Field(None, description="Per-trainset assignment reasoning")
    
    # Alternatives
    alternative_solutions: List[AlternativeSolution] = Field(default_factory=list, description="Alternative solutions")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow, description="When optimization was completed")
    model_version: str = Field("1.0", description="Version of the optimization model used")
    
    # Recommendations
    recommendations: Optional[List[str]] = Field(None, description="Recommendations for improvement")
    warnings: Optional[List[str]] = Field(None, description="Warnings about the solution")


class OptimizationJob(BaseModel):
    """Optimization job status"""
    job_id: str = Field(..., description="Unique job identifier")
    optimization_id: str = Field(..., description="Related optimization request ID")
    status: OptimizationStatus = Field(..., description="Current job status")
    progress: float = Field(0.0, description="Progress percentage (0-100)")
    message: Optional[str] = Field(None, description="Current status message")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Job creation time")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update time")
    estimated_completion: Optional[datetime] = Field(None, description="Estimated completion time")
    result: Optional[OptimizationResult] = Field(None, description="Result when completed")


class BulkOptimizationRequest(BaseModel):
    """Request for bulk optimization (multiple scenarios)"""
    batch_id: str = Field(..., description="Unique batch identifier")
    requests: List[OptimizationRequest] = Field(..., description="List of optimization requests")
    parallel_execution: bool = Field(True, description="Execute optimizations in parallel")
    max_concurrent_jobs: int = Field(5, description="Maximum concurrent optimization jobs")
    
    @validator('requests')
    def validate_requests(cls, v):
        if len(v) == 0:
            raise ValueError('At least one optimization request is required')
        if len(v) > 50:
            raise ValueError('Maximum 50 optimization requests per batch')
        return v


class PerformanceMetrics(BaseModel):
    """Performance metrics for optimization results"""
    
    # Efficiency metrics
    utilization_rate: float = Field(..., description="Fleet utilization percentage")
    mileage_balance_score: float = Field(..., description="How well balanced the mileage distribution is")
    energy_efficiency: float = Field(..., description="Overall energy efficiency score")
    
    # Business metrics
    branding_exposure_score: float = Field(..., description="Branding exposure optimization score")
    revenue_potential: float = Field(..., description="Estimated daily revenue potential")
    
    # Operational metrics
    maintenance_compliance: float = Field(..., description="Maintenance schedule compliance")
    fitness_compliance: float = Field(..., description="Fitness certificate compliance")
    
    # Quality metrics
    solution_quality: float = Field(..., description="Overall solution quality score")
    constraint_satisfaction: float = Field(..., description="Percentage of constraints satisfied")
    
    # Time-based metrics
    optimization_efficiency: float = Field(..., description="Efficiency of the optimization process")
    convergence_rate: float = Field(..., description="Rate of convergence to optimal solution")


class HealthStatus(BaseModel):
    """Health status of the optimization service"""
    status: str = Field(..., description="Overall service status")
    version: str = Field(..., description="Service version")
    uptime: float = Field(..., description="Service uptime in seconds")
    
    # Component health
    database_status: str = Field(..., description="Database connection status")
    redis_status: str = Field(..., description="Redis connection status")
    optimization_engine_status: str = Field(..., description="Optimization engine status")
    
    # Performance metrics
    active_optimizations: int = Field(..., description="Number of currently running optimizations")
    completed_optimizations: int = Field(..., description="Total completed optimizations")
    failed_optimizations: int = Field(..., description="Total failed optimizations")
    average_execution_time: float = Field(..., description="Average optimization execution time")
    
    # Resource usage
    memory_usage: float = Field(..., description="Memory usage percentage")
    cpu_usage: float = Field(..., description="CPU usage percentage")
    
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Status timestamp")
