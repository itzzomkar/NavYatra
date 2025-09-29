"""
Intelligent Auto-Scheduler for KMRL Train Induction System
Automatically generates optimal schedules without human intervention
"""

import asyncio
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta, time
from dataclasses import dataclass, asdict
from enum import Enum
from loguru import logger
import json
import math

from .decision_engine import AutonomousAIEngine, DecisionType, DecisionUrgency
from .predictive_maintenance import PredictiveMaintenanceAI, MaintenancePrediction
from ..optimization.engine import SchedulingOptimizer
from ..models.optimization import OptimizationRequest, TrainsetData


class ScheduleType(Enum):
    """Types of schedules the AI can generate"""
    PEAK_HOUR = "peak_hour"
    OFF_PEAK = "off_peak"
    NIGHT_SERVICE = "night_service"
    MAINTENANCE_WINDOW = "maintenance_window"
    EMERGENCY_RESPONSE = "emergency_response"
    WEEKEND = "weekend"
    HOLIDAY = "holiday"


class SchedulePriority(Enum):
    """Schedule generation priorities"""
    EFFICIENCY = "efficiency"
    PASSENGER_COMFORT = "passenger_comfort" 
    ENERGY_SAVINGS = "energy_savings"
    MAINTENANCE_OPTIMIZATION = "maintenance_optimization"
    COST_REDUCTION = "cost_reduction"


@dataclass
class ScheduleRequest:
    """Represents an automatic schedule generation request"""
    schedule_id: str
    schedule_type: ScheduleType
    start_time: datetime
    end_time: datetime
    priority: SchedulePriority
    constraints: Dict[str, Any]
    expected_demand: int
    weather_conditions: str
    special_events: List[str]
    
    
@dataclass
class GeneratedSchedule:
    """Represents a generated schedule"""
    schedule_id: str
    generated_at: datetime
    schedule_type: ScheduleType
    trainset_assignments: Dict[str, int]
    estimated_performance: Dict[str, float]
    risk_assessment: Dict[str, float]
    confidence: float
    alternative_options: List[Dict[str, Any]]
    execution_plan: List[Dict[str, Any]]
    monitoring_alerts: List[str]


class IntelligentAutoScheduler:
    """
    Fully Autonomous Intelligent Scheduler
    """
    
    def __init__(self):
        self.optimizer = SchedulingOptimizer()
        self.predictive_maintenance = PredictiveMaintenanceAI()
        self.ai_engine = AutonomousAIEngine()
        
        # Schedule generation history
        self.generated_schedules = []
        self.performance_history = []
        
        # AI Learning parameters
        self.learning_rate = 0.01
        self.confidence_threshold = 0.75
        self.auto_execution_threshold = 0.85
        
        # Demand prediction models (simplified)
        self.demand_patterns = {
            'weekday_peak': [0.2, 0.3, 0.6, 0.8, 0.9, 1.0, 0.8, 0.6, 0.4, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.8, 0.6, 0.4, 0.3, 0.2, 0.1, 0.1],
            'weekend': [0.1, 0.1, 0.1, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.2, 0.1, 0.1],
            'holiday': [0.1, 0.1, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.0, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.1]
        }
        
        # Weather impact factors
        self.weather_impact = {
            'sunny': 1.0,
            'cloudy': 1.0,
            'rainy': 1.15,
            'heavy_rain': 1.3,
            'stormy': 1.4
        }
        
        # Schedule templates
        self.schedule_templates = self._initialize_schedule_templates()
        
    def _initialize_schedule_templates(self) -> Dict[str, Dict]:
        """Initialize schedule templates for different scenarios"""
        
        return {
            'peak_morning': {
                'start_hour': 6,
                'end_hour': 10,
                'min_trainsets': 18,
                'max_trainsets': 25,
                'priority': SchedulePriority.PASSENGER_COMFORT,
                'frequency_minutes': 3
            },
            'peak_evening': {
                'start_hour': 17,
                'end_hour': 21,
                'min_trainsets': 18,
                'max_trainsets': 25,
                'priority': SchedulePriority.PASSENGER_COMFORT,
                'frequency_minutes': 3
            },
            'off_peak': {
                'start_hour': 10,
                'end_hour': 17,
                'min_trainsets': 10,
                'max_trainsets': 15,
                'priority': SchedulePriority.EFFICIENCY,
                'frequency_minutes': 8
            },
            'night_service': {
                'start_hour': 22,
                'end_hour': 5,
                'min_trainsets': 5,
                'max_trainsets': 8,
                'priority': SchedulePriority.ENERGY_SAVINGS,
                'frequency_minutes': 15
            },
            'weekend': {
                'start_hour': 6,
                'end_hour': 23,
                'min_trainsets': 8,
                'max_trainsets': 15,
                'priority': SchedulePriority.EFFICIENCY,
                'frequency_minutes': 10
            },
            'maintenance_window': {
                'start_hour': 1,
                'end_hour': 5,
                'min_trainsets': 3,
                'max_trainsets': 8,
                'priority': SchedulePriority.MAINTENANCE_OPTIMIZATION,
                'frequency_minutes': 30
            }
        }
    
    async def start_autonomous_scheduling(self):
        """Start autonomous scheduling service"""
        logger.info("🤖 Starting Autonomous Intelligent Scheduler...")
        
        # Start continuous scheduling loop
        asyncio.create_task(self._continuous_scheduling_loop())
        asyncio.create_task(self._performance_monitoring_loop())
        asyncio.create_task(self._adaptive_learning_loop())
        
        logger.info("✅ Autonomous Scheduler started successfully")
    
    async def _continuous_scheduling_loop(self):
        """Main scheduling loop that runs continuously"""
        while True:
            try:
                current_time = datetime.now()
                
                # Check if we need to generate a new schedule
                schedule_needed = await self._evaluate_scheduling_need(current_time)
                
                if schedule_needed:
                    schedule_request = await self._create_schedule_request(current_time)
                    if schedule_request:
                        generated_schedule = await self._generate_intelligent_schedule(schedule_request)
                        
                        if generated_schedule and generated_schedule.confidence >= self.auto_execution_threshold:
                            await self._execute_schedule_automatically(generated_schedule)
                        elif generated_schedule and generated_schedule.confidence >= self.confidence_threshold:
                            await self._request_schedule_approval(generated_schedule)
                
                # Check every 5 minutes
                await asyncio.sleep(300)
                
            except Exception as e:
                logger.error(f"Error in scheduling loop: {e}")
                await asyncio.sleep(600)  # Wait 10 minutes on error
    
    async def _performance_monitoring_loop(self):
        """Monitor schedule performance and learn from outcomes"""
        while True:
            try:
                # Analyze performance of active schedules
                await self._analyze_schedule_performance()
                
                # Check every 15 minutes
                await asyncio.sleep(900)
                
            except Exception as e:
                logger.error(f"Error in performance monitoring: {e}")
                await asyncio.sleep(1800)
    
    async def _adaptive_learning_loop(self):
        """Learn from historical data and improve scheduling"""
        while True:
            try:
                # Update demand patterns
                await self._update_demand_patterns()
                
                # Improve scheduling algorithms
                await self._optimize_scheduling_parameters()
                
                # Check every hour
                await asyncio.sleep(3600)
                
            except Exception as e:
                logger.error(f"Error in adaptive learning: {e}")
                await asyncio.sleep(7200)
    
    async def _evaluate_scheduling_need(self, current_time: datetime) -> bool:
        """Evaluate if a new schedule needs to be generated"""
        
        hour = current_time.hour
        minute = current_time.minute
        weekday = current_time.weekday()
        
        # Schedule generation times (every 4 hours, or at critical times)
        critical_hours = [5, 6, 9, 12, 16, 17, 20, 22]
        
        if hour in critical_hours and minute < 10:
            logger.info(f"🕐 Critical scheduling time detected: {hour}:00")
            return True
        
        # Check for emergency scheduling needs
        if await self._check_emergency_scheduling_need():
            logger.warning("🚨 Emergency scheduling triggered")
            return True
        
        # Regular 4-hour schedule updates
        if hour % 4 == 0 and minute < 10:
            logger.info(f"🔄 Regular schedule update time: {hour}:00")
            return True
        
        return False
    
    async def _check_emergency_scheduling_need(self) -> bool:
        """Check if emergency rescheduling is needed"""
        
        # Get current trainset status
        current_trainsets = await self._get_current_trainset_status()
        
        # Check for critical maintenance predictions
        maintenance_predictions = []
        for trainset in current_trainsets:
            if trainset['status'] == 'AVAILABLE':
                predictions = await self.predictive_maintenance.analyze_trainset_health(trainset['trainset_id'])
                maintenance_predictions.extend(predictions)
        
        # Count critical issues
        critical_count = len([p for p in maintenance_predictions if p.health_status.value in ['critical', 'poor']])
        
        # Check if we have too many critical trainsets
        available_count = len([ts for ts in current_trainsets if ts['status'] == 'AVAILABLE'])
        
        if critical_count > available_count * 0.2:  # More than 20% have critical issues
            return True
        
        # Check for fitness certificate expiries
        expired_fitness = len([ts for ts in current_trainsets if ts.get('fitness_expired', False)])
        
        if expired_fitness > 0:
            return True
        
        return False
    
    async def _create_schedule_request(self, current_time: datetime) -> Optional[ScheduleRequest]:
        """Create a schedule request based on current conditions"""
        
        hour = current_time.hour
        weekday = current_time.weekday()
        
        # Determine schedule type
        schedule_type = self._determine_schedule_type(current_time)
        
        # Predict passenger demand
        predicted_demand = self._predict_passenger_demand(current_time)
        
        # Get weather conditions (simplified)
        weather = await self._get_weather_conditions()
        
        # Check for special events
        special_events = await self._get_special_events(current_time)
        
        # Determine priority
        priority = self._determine_schedule_priority(schedule_type, current_time)
        
        # Create schedule timeframe
        if schedule_type == ScheduleType.PEAK_HOUR:
            duration = 4  # 4 hours
        elif schedule_type == ScheduleType.OFF_PEAK:
            duration = 6  # 6 hours
        elif schedule_type == ScheduleType.NIGHT_SERVICE:
            duration = 8  # 8 hours
        else:
            duration = 4
        
        start_time = current_time
        end_time = current_time + timedelta(hours=duration)
        
        # Create constraints
        constraints = await self._create_schedule_constraints(schedule_type, current_time)
        
        return ScheduleRequest(
            schedule_id=f"AUTO_{schedule_type.value}_{int(current_time.timestamp())}",
            schedule_type=schedule_type,
            start_time=start_time,
            end_time=end_time,
            priority=priority,
            constraints=constraints,
            expected_demand=predicted_demand,
            weather_conditions=weather,
            special_events=special_events
        )
    
    def _determine_schedule_type(self, current_time: datetime) -> ScheduleType:
        """Determine the appropriate schedule type"""
        
        hour = current_time.hour
        weekday = current_time.weekday()
        
        # Weekend schedule
        if weekday >= 5:  # Saturday = 5, Sunday = 6
            return ScheduleType.WEEKEND
        
        # Peak hours (6-10 AM, 5-9 PM)
        if (6 <= hour < 10) or (17 <= hour < 21):
            return ScheduleType.PEAK_HOUR
        
        # Night service (10 PM - 6 AM)
        elif (hour >= 22) or (hour < 6):
            return ScheduleType.NIGHT_SERVICE
        
        # Maintenance window (1-5 AM)
        elif 1 <= hour < 5:
            return ScheduleType.MAINTENANCE_WINDOW
        
        # Off-peak (10 AM - 5 PM)
        else:
            return ScheduleType.OFF_PEAK
    
    def _predict_passenger_demand(self, current_time: datetime) -> int:
        """Predict passenger demand based on historical patterns"""
        
        hour = current_time.hour
        weekday = current_time.weekday()
        
        # Select demand pattern
        if weekday < 5:  # Weekday
            pattern = self.demand_patterns['weekday_peak']
        elif weekday == 5:  # Saturday
            pattern = self.demand_patterns['weekend']
        else:  # Sunday
            pattern = [x * 0.8 for x in self.demand_patterns['weekend']]  # Lower demand on Sunday
        
        # Get base demand for this hour
        base_demand = pattern[hour] if hour < len(pattern) else 0.3
        
        # Apply scaling (assume max capacity is 1000 passengers per trainset)
        scaled_demand = int(base_demand * 15 * 1000)  # 15 trainsets capacity
        
        return scaled_demand
    
    async def _get_weather_conditions(self) -> str:
        """Get current weather conditions (simplified)"""
        # In real implementation, this would call a weather API
        import random
        weather_options = ['sunny', 'cloudy', 'rainy', 'heavy_rain']
        return random.choice(weather_options)
    
    async def _get_special_events(self, current_time: datetime) -> List[str]:
        """Check for special events that might affect demand"""
        # In real implementation, this would check event databases
        events = []
        
        # Check for holidays (simplified)
        if current_time.month == 12 and current_time.day == 25:
            events.append("Christmas Day")
        elif current_time.month == 1 and current_time.day == 1:
            events.append("New Year")
        
        return events
    
    def _determine_schedule_priority(self, schedule_type: ScheduleType, current_time: datetime) -> SchedulePriority:
        """Determine scheduling priority based on type and conditions"""
        
        if schedule_type == ScheduleType.PEAK_HOUR:
            return SchedulePriority.PASSENGER_COMFORT
        elif schedule_type == ScheduleType.NIGHT_SERVICE:
            return SchedulePriority.ENERGY_SAVINGS
        elif schedule_type == ScheduleType.MAINTENANCE_WINDOW:
            return SchedulePriority.MAINTENANCE_OPTIMIZATION
        elif schedule_type == ScheduleType.OFF_PEAK:
            return SchedulePriority.EFFICIENCY
        else:
            return SchedulePriority.COST_REDUCTION
    
    async def _create_schedule_constraints(self, schedule_type: ScheduleType, current_time: datetime) -> Dict[str, Any]:
        """Create scheduling constraints based on type and conditions"""
        
        # Get template constraints
        template_key = {
            ScheduleType.PEAK_HOUR: 'peak_morning' if current_time.hour < 12 else 'peak_evening',
            ScheduleType.OFF_PEAK: 'off_peak',
            ScheduleType.NIGHT_SERVICE: 'night_service',
            ScheduleType.WEEKEND: 'weekend',
            ScheduleType.MAINTENANCE_WINDOW: 'maintenance_window'
        }.get(schedule_type, 'off_peak')
        
        template = self.schedule_templates[template_key]
        
        # Get current trainset availability
        trainsets = await self._get_current_trainset_status()
        available_trainsets = [ts for ts in trainsets if ts['status'] == 'AVAILABLE']
        
        # Apply maintenance constraints
        maintenance_predictions = []
        for trainset in available_trainsets:
            predictions = await self.predictive_maintenance.analyze_trainset_health(trainset['trainset_id'])
            maintenance_predictions.extend(predictions)
        
        # Filter out trainsets with critical maintenance needs
        critical_trainsets = set(p.trainset_id for p in maintenance_predictions 
                                if p.health_status.value in ['critical', 'poor'])
        
        available_for_service = [ts for ts in available_trainsets 
                               if ts['trainset_id'] not in critical_trainsets]
        
        constraints = {
            'min_trainsets': max(template['min_trainsets'], len(available_for_service) // 3),
            'max_trainsets': min(template['max_trainsets'], len(available_for_service)),
            'available_trainsets': [ts['trainset_id'] for ts in available_for_service],
            'maintenance_exclusions': list(critical_trainsets),
            'priority': template['priority'],
            'frequency_minutes': template['frequency_minutes'],
            'energy_limit': self._calculate_energy_limit(schedule_type),
            'cost_limit': self._calculate_cost_limit(schedule_type)
        }
        
        return constraints
    
    def _calculate_energy_limit(self, schedule_type: ScheduleType) -> float:
        """Calculate energy consumption limit based on schedule type"""
        
        base_limits = {
            ScheduleType.PEAK_HOUR: 150.0,  # kWh per trainset per hour
            ScheduleType.OFF_PEAK: 120.0,
            ScheduleType.NIGHT_SERVICE: 80.0,
            ScheduleType.WEEKEND: 100.0,
            ScheduleType.MAINTENANCE_WINDOW: 60.0
        }
        
        return base_limits.get(schedule_type, 100.0)
    
    def _calculate_cost_limit(self, schedule_type: ScheduleType) -> float:
        """Calculate operational cost limit"""
        
        base_costs = {
            ScheduleType.PEAK_HOUR: 5000.0,  # INR per hour
            ScheduleType.OFF_PEAK: 3000.0,
            ScheduleType.NIGHT_SERVICE: 2000.0,
            ScheduleType.WEEKEND: 3500.0,
            ScheduleType.MAINTENANCE_WINDOW: 1500.0
        }
        
        return base_costs.get(schedule_type, 3000.0)
    
    async def _generate_intelligent_schedule(self, request: ScheduleRequest) -> Optional[GeneratedSchedule]:
        """Generate an intelligent schedule based on the request"""
        
        logger.info(f"🧠 Generating intelligent schedule: {request.schedule_type.value}")
        
        try:
            # Prepare trainset data
            trainset_data = await self._prepare_trainset_data(request)
            
            if len(trainset_data) < request.constraints['min_trainsets']:
                logger.warning(f"Insufficient trainsets available: {len(trainset_data)}")
                return None
            
            # Create optimization request with AI enhancements
            optimization_request = await self._create_enhanced_optimization_request(request, trainset_data)
            
            # Run multiple optimization algorithms and compare
            algorithms = ['constraint_programming', 'genetic_algorithm', 'simulated_annealing']
            best_result = None
            best_score = -float('inf')
            
            for algorithm in algorithms:
                optimization_request.algorithm = algorithm
                result = await self.optimizer.optimize_schedule(optimization_request, trainset_data)
                
                if result.status == "completed" and result.score > best_score:
                    best_result = result
                    best_score = result.score
            
            if not best_result:
                logger.error("All optimization algorithms failed")
                return None
            
            # Enhance the result with AI insights
            enhanced_schedule = await self._enhance_schedule_with_ai(request, best_result, trainset_data)
            
            # Calculate confidence score
            confidence = await self._calculate_schedule_confidence(enhanced_schedule, request)
            
            # Generate execution plan
            execution_plan = await self._create_execution_plan(enhanced_schedule, request)
            
            # Create monitoring alerts
            monitoring_alerts = await self._create_monitoring_alerts(enhanced_schedule, request)
            
            generated_schedule = GeneratedSchedule(
                schedule_id=request.schedule_id,
                generated_at=datetime.now(),
                schedule_type=request.schedule_type,
                trainset_assignments=enhanced_schedule['trainset_assignments'],
                estimated_performance=enhanced_schedule['performance_metrics'],
                risk_assessment=enhanced_schedule['risk_assessment'],
                confidence=confidence,
                alternative_options=enhanced_schedule['alternatives'],
                execution_plan=execution_plan,
                monitoring_alerts=monitoring_alerts
            )
            
            # Store generated schedule
            self.generated_schedules.append(generated_schedule)
            
            logger.info(f"✅ Schedule generated with confidence: {confidence:.2f}")
            
            return generated_schedule
            
        except Exception as e:
            logger.error(f"Error generating schedule: {e}")
            return None
    
    async def _prepare_trainset_data(self, request: ScheduleRequest) -> List[TrainsetData]:
        """Prepare trainset data for optimization"""
        
        trainsets = await self._get_current_trainset_status()
        available_trainsets = request.constraints['available_trainsets']
        
        trainset_data = []
        
        for trainset in trainsets:
            if trainset['trainset_id'] not in available_trainsets:
                continue
            
            # Get maintenance predictions for this trainset
            maintenance_predictions = await self.predictive_maintenance.analyze_trainset_health(trainset['trainset_id'])
            
            # Calculate health scores
            avg_health_score = np.mean([
                {'excellent': 1.0, 'good': 0.8, 'fair': 0.6, 'poor': 0.4, 'critical': 0.2}.get(
                    p.health_status.value, 0.6
                ) for p in maintenance_predictions
            ]) if maintenance_predictions else 0.8
            
            # Create TrainsetData
            data = TrainsetData(
                trainset_id=trainset['trainset_id'],
                fitness_valid=trainset.get('fitness_valid', True),
                has_high_priority_jobs=trainset.get('has_high_priority_jobs', False),
                current_mileage=trainset.get('current_mileage', 0),
                branding_priority=trainset.get('branding_priority', 1),
                last_cleaning_date=trainset.get('last_cleaning_date'),
                stabling_preference=trainset.get('stabling_preference', 0)
            )
            
            # Add AI-enhanced attributes
            data.health_score = avg_health_score
            data.maintenance_urgency = max([p.urgency_score for p in maintenance_predictions] + [0.0])
            data.predicted_reliability = min(1.0, avg_health_score * 1.2)
            
            trainset_data.append(data)
        
        return trainset_data
    
    async def _create_enhanced_optimization_request(
        self, 
        request: ScheduleRequest, 
        trainset_data: List[TrainsetData]
    ) -> OptimizationRequest:
        """Create an enhanced optimization request with AI parameters"""
        
        # AI-enhanced parameters based on schedule type and priority
        parameters = {
            'schedule_type': request.schedule_type.value,
            'priority': request.priority.value,
            'expected_demand': request.expected_demand,
            'weather_factor': self.weather_impact.get(request.weather_conditions, 1.0),
            'energy_limit': request.constraints['energy_limit'],
            'cost_limit': request.constraints['cost_limit']
        }
        
        # Add priority-specific parameters
        if request.priority == SchedulePriority.PASSENGER_COMFORT:
            parameters['passenger_weight'] = 0.4
            parameters['reliability_weight'] = 0.3
            parameters['comfort_weight'] = 0.3
        elif request.priority == SchedulePriority.EFFICIENCY:
            parameters['efficiency_weight'] = 0.5
            parameters['cost_weight'] = 0.3
            parameters['reliability_weight'] = 0.2
        elif request.priority == SchedulePriority.ENERGY_SAVINGS:
            parameters['energy_weight'] = 0.5
            parameters['efficiency_weight'] = 0.3
            parameters['cost_weight'] = 0.2
        elif request.priority == SchedulePriority.MAINTENANCE_OPTIMIZATION:
            parameters['maintenance_weight'] = 0.4
            parameters['reliability_weight'] = 0.4
            parameters['cost_weight'] = 0.2
        
        # Add special event considerations
        if request.special_events:
            parameters['high_demand_mode'] = True
            parameters['reliability_boost'] = 1.2
        
        return OptimizationRequest(
            optimization_id=request.schedule_id,
            algorithm='constraint_programming',  # Will be overridden
            max_trainsets=request.constraints['max_trainsets'],
            parameters=parameters
        )
    
    async def _enhance_schedule_with_ai(
        self, 
        request: ScheduleRequest, 
        optimization_result, 
        trainset_data: List[TrainsetData]
    ) -> Dict[str, Any]:
        """Enhance optimization result with AI insights"""
        
        # Calculate detailed performance metrics
        performance_metrics = {
            'efficiency_score': optimization_result.score / 1000,  # Normalize
            'predicted_reliability': self._calculate_reliability_score(optimization_result, trainset_data),
            'energy_efficiency': self._calculate_energy_efficiency(optimization_result, request),
            'passenger_satisfaction': self._calculate_passenger_satisfaction(optimization_result, request),
            'maintenance_optimality': self._calculate_maintenance_optimality(optimization_result, trainset_data),
            'cost_effectiveness': self._calculate_cost_effectiveness(optimization_result, request)
        }
        
        # Risk assessment
        risk_assessment = {
            'operational_risk': self._assess_operational_risk(optimization_result, trainset_data),
            'maintenance_risk': self._assess_maintenance_risk(optimization_result, trainset_data),
            'weather_risk': self._assess_weather_risk(request),
            'demand_mismatch_risk': self._assess_demand_risk(optimization_result, request),
            'overall_risk': 0.0  # Will be calculated
        }
        
        # Calculate overall risk
        risk_assessment['overall_risk'] = np.mean(list(risk_assessment.values())[:-1])
        
        # Generate alternatives
        alternatives = await self._generate_schedule_alternatives(request, optimization_result, trainset_data)
        
        return {
            'trainset_assignments': optimization_result.trainset_assignments,
            'performance_metrics': performance_metrics,
            'risk_assessment': risk_assessment,
            'alternatives': alternatives,
            'ai_insights': {
                'optimization_algorithm': optimization_result.algorithm,
                'generation_time': optimization_result.execution_time,
                'confidence_factors': self._analyze_confidence_factors(optimization_result, trainset_data)
            }
        }
    
    def _calculate_reliability_score(self, optimization_result, trainset_data: List[TrainsetData]) -> float:
        """Calculate predicted reliability score"""
        
        assigned_trainsets = list(optimization_result.trainset_assignments.keys())
        trainset_dict = {ts.trainset_id: ts for ts in trainset_data}
        
        reliability_scores = []
        for trainset_id in assigned_trainsets:
            trainset = trainset_dict.get(trainset_id)
            if trainset and hasattr(trainset, 'predicted_reliability'):
                reliability_scores.append(trainset.predicted_reliability)
            else:
                reliability_scores.append(0.8)  # Default
        
        return np.mean(reliability_scores) if reliability_scores else 0.8
    
    def _calculate_energy_efficiency(self, optimization_result, request: ScheduleRequest) -> float:
        """Calculate energy efficiency score"""
        
        # Simplified energy calculation based on number of trainsets and schedule type
        num_trainsets = len(optimization_result.trainset_assignments)
        
        if request.schedule_type == ScheduleType.NIGHT_SERVICE:
            base_efficiency = 0.9
        elif request.schedule_type == ScheduleType.PEAK_HOUR:
            base_efficiency = 0.7
        else:
            base_efficiency = 0.8
        
        # Adjust for weather
        weather_factor = self.weather_impact.get(request.weather_conditions, 1.0)
        efficiency = base_efficiency / weather_factor
        
        return min(1.0, efficiency)
    
    def _calculate_passenger_satisfaction(self, optimization_result, request: ScheduleRequest) -> float:
        """Calculate predicted passenger satisfaction"""
        
        num_trainsets = len(optimization_result.trainset_assignments)
        expected_demand = request.expected_demand
        
        # Calculate service coverage
        max_capacity = num_trainsets * 1000  # Assume 1000 passengers per trainset
        utilization = min(1.0, expected_demand / max_capacity)
        
        # Higher satisfaction with lower utilization (less crowding)
        base_satisfaction = max(0.5, 1.0 - utilization * 0.5)
        
        # Boost for peak hour service
        if request.schedule_type == ScheduleType.PEAK_HOUR:
            base_satisfaction *= 1.1
        
        return min(1.0, base_satisfaction)
    
    def _calculate_maintenance_optimality(self, optimization_result, trainset_data: List[TrainsetData]) -> float:
        """Calculate maintenance optimization score"""
        
        assigned_trainsets = list(optimization_result.trainset_assignments.keys())
        trainset_dict = {ts.trainset_id: ts for ts in trainset_data}
        
        maintenance_scores = []
        for trainset_id in assigned_trainsets:
            trainset = trainset_dict.get(trainset_id)
            if trainset and hasattr(trainset, 'health_score'):
                # Higher health score = better maintenance state
                maintenance_scores.append(trainset.health_score)
            else:
                maintenance_scores.append(0.8)
        
        return np.mean(maintenance_scores) if maintenance_scores else 0.8
    
    def _calculate_cost_effectiveness(self, optimization_result, request: ScheduleRequest) -> float:
        """Calculate cost effectiveness score"""
        
        num_trainsets = len(optimization_result.trainset_assignments)
        
        # Estimate operational cost
        hourly_cost = num_trainsets * 200  # INR per trainset per hour
        duration = (request.end_time - request.start_time).total_seconds() / 3600
        total_cost = hourly_cost * duration
        
        # Compare with cost limit
        cost_limit = request.constraints['cost_limit']
        cost_ratio = total_cost / cost_limit if cost_limit > 0 else 1.0
        
        # Better score for lower cost ratio
        return max(0.2, 1.0 - (cost_ratio - 1.0) * 0.5) if cost_ratio > 1.0 else 1.0
    
    def _assess_operational_risk(self, optimization_result, trainset_data: List[TrainsetData]) -> float:
        """Assess operational risk"""
        
        assigned_trainsets = list(optimization_result.trainset_assignments.keys())
        trainset_dict = {ts.trainset_id: ts for ts in trainset_data}
        
        risk_factors = []
        for trainset_id in assigned_trainsets:
            trainset = trainset_dict.get(trainset_id)
            if trainset:
                # Higher maintenance urgency = higher risk
                urgency = getattr(trainset, 'maintenance_urgency', 0.0)
                risk_factors.append(urgency)
        
        return np.mean(risk_factors) if risk_factors else 0.2
    
    def _assess_maintenance_risk(self, optimization_result, trainset_data: List[TrainsetData]) -> float:
        """Assess maintenance-related risk"""
        
        assigned_trainsets = list(optimization_result.trainset_assignments.keys())
        trainset_dict = {ts.trainset_id: ts for ts in trainset_data}
        
        high_risk_count = 0
        for trainset_id in assigned_trainsets:
            trainset = trainset_dict.get(trainset_id)
            if trainset:
                urgency = getattr(trainset, 'maintenance_urgency', 0.0)
                if urgency > 0.7:  # High urgency threshold
                    high_risk_count += 1
        
        total_assigned = len(assigned_trainsets)
        risk_ratio = high_risk_count / total_assigned if total_assigned > 0 else 0
        
        return min(1.0, risk_ratio * 2)  # Scale to 0-1
    
    def _assess_weather_risk(self, request: ScheduleRequest) -> float:
        """Assess weather-related risk"""
        
        weather_risk = {
            'sunny': 0.1,
            'cloudy': 0.2,
            'rainy': 0.5,
            'heavy_rain': 0.8,
            'stormy': 1.0
        }
        
        return weather_risk.get(request.weather_conditions, 0.3)
    
    def _assess_demand_risk(self, optimization_result, request: ScheduleRequest) -> float:
        """Assess demand mismatch risk"""
        
        num_trainsets = len(optimization_result.trainset_assignments)
        max_capacity = num_trainsets * 1000
        expected_demand = request.expected_demand
        
        utilization = expected_demand / max_capacity if max_capacity > 0 else 0
        
        # Risk is higher for both over-utilization and under-utilization
        if utilization > 0.9:  # Over-capacity
            return min(1.0, (utilization - 0.9) * 10)
        elif utilization < 0.3:  # Under-utilization
            return min(1.0, (0.3 - utilization) * 2)
        else:
            return 0.1  # Optimal range
    
    async def _generate_schedule_alternatives(
        self, 
        request: ScheduleRequest, 
        primary_result, 
        trainset_data: List[TrainsetData]
    ) -> List[Dict[str, Any]]:
        """Generate alternative schedule options"""
        
        alternatives = []
        
        # Alternative 1: More conservative (fewer trainsets)
        if len(primary_result.trainset_assignments) > request.constraints['min_trainsets']:
            conservative_request = OptimizationRequest(
                optimization_id=f"{request.schedule_id}_conservative",
                algorithm="constraint_programming",
                max_trainsets=max(request.constraints['min_trainsets'], 
                                 len(primary_result.trainset_assignments) - 3),
                parameters=request.constraints
            )
            
            try:
                conservative_result = await self.optimizer.optimize_schedule(conservative_request, trainset_data)
                if conservative_result.status == "completed":
                    alternatives.append({
                        'type': 'conservative',
                        'trainsets': len(conservative_result.trainset_assignments),
                        'score': conservative_result.score,
                        'description': 'Lower cost, reduced capacity'
                    })
            except:
                pass
        
        # Alternative 2: More aggressive (more trainsets)
        if len(primary_result.trainset_assignments) < request.constraints['max_trainsets']:
            aggressive_request = OptimizationRequest(
                optimization_id=f"{request.schedule_id}_aggressive",
                algorithm="genetic_algorithm",
                max_trainsets=min(request.constraints['max_trainsets'], 
                                 len(primary_result.trainset_assignments) + 3),
                parameters=request.constraints
            )
            
            try:
                aggressive_result = await self.optimizer.optimize_schedule(aggressive_request, trainset_data)
                if aggressive_result.status == "completed":
                    alternatives.append({
                        'type': 'aggressive',
                        'trainsets': len(aggressive_result.trainset_assignments),
                        'score': aggressive_result.score,
                        'description': 'Higher capacity, increased cost'
                    })
            except:
                pass
        
        return alternatives[:2]  # Return max 2 alternatives
    
    def _analyze_confidence_factors(self, optimization_result, trainset_data: List[TrainsetData]) -> Dict[str, float]:
        """Analyze factors that contribute to confidence"""
        
        factors = {
            'optimization_quality': min(1.0, optimization_result.score / 1000),
            'data_completeness': 1.0 if len(trainset_data) >= 10 else len(trainset_data) / 10,
            'algorithm_reliability': 0.9 if optimization_result.algorithm == 'constraint_programming' else 0.8,
            'execution_time': 1.0 if optimization_result.execution_time < 30 else 0.8,
            'constraint_satisfaction': 0.95  # Simplified
        }
        
        return factors
    
    async def _calculate_schedule_confidence(
        self, 
        enhanced_schedule: Dict[str, Any], 
        request: ScheduleRequest
    ) -> float:
        """Calculate overall confidence in the generated schedule"""
        
        confidence_factors = enhanced_schedule['ai_insights']['confidence_factors']
        performance_metrics = enhanced_schedule['performance_metrics']
        risk_assessment = enhanced_schedule['risk_assessment']
        
        # Weight different factors
        weights = {
            'optimization_quality': 0.25,
            'data_completeness': 0.15,
            'algorithm_reliability': 0.10,
            'performance_average': 0.30,
            'risk_inverse': 0.20
        }
        
        # Calculate weighted confidence
        performance_average = np.mean(list(performance_metrics.values()))
        risk_inverse = 1.0 - risk_assessment['overall_risk']
        
        confidence = (
            confidence_factors['optimization_quality'] * weights['optimization_quality'] +
            confidence_factors['data_completeness'] * weights['data_completeness'] +
            confidence_factors['algorithm_reliability'] * weights['algorithm_reliability'] +
            performance_average * weights['performance_average'] +
            risk_inverse * weights['risk_inverse']
        )
        
        return min(1.0, max(0.0, confidence))
    
    async def _create_execution_plan(
        self, 
        enhanced_schedule: Dict[str, Any], 
        request: ScheduleRequest
    ) -> List[Dict[str, Any]]:
        """Create step-by-step execution plan"""
        
        current_time = datetime.now()
        
        plan = [
            {
                'step': 1,
                'action': 'Validate trainset availability',
                'scheduled_time': current_time + timedelta(minutes=2),
                'duration_minutes': 3,
                'description': 'Confirm all assigned trainsets are available and ready'
            },
            {
                'step': 2,
                'action': 'Update trainset assignments',
                'scheduled_time': current_time + timedelta(minutes=5),
                'duration_minutes': 2,
                'description': 'Apply new scheduling assignments to trainsets'
            },
            {
                'step': 3,
                'action': 'Notify operations team',
                'scheduled_time': current_time + timedelta(minutes=7),
                'duration_minutes': 1,
                'description': 'Send schedule update notifications to operators'
            },
            {
                'step': 4,
                'action': 'Monitor initial performance',
                'scheduled_time': current_time + timedelta(minutes=15),
                'duration_minutes': 30,
                'description': 'Monitor schedule performance for first 30 minutes'
            },
            {
                'step': 5,
                'action': 'Performance evaluation',
                'scheduled_time': current_time + timedelta(hours=1),
                'duration_minutes': 10,
                'description': 'Evaluate actual vs predicted performance'
            }
        ]
        
        return plan
    
    async def _create_monitoring_alerts(
        self, 
        enhanced_schedule: Dict[str, Any], 
        request: ScheduleRequest
    ) -> List[str]:
        """Create monitoring alerts for the schedule"""
        
        alerts = []
        
        # Risk-based alerts
        if enhanced_schedule['risk_assessment']['overall_risk'] > 0.7:
            alerts.append("HIGH RISK: Monitor schedule closely for potential issues")
        
        if enhanced_schedule['risk_assessment']['maintenance_risk'] > 0.6:
            alerts.append("MAINTENANCE ALERT: Several assigned trainsets have high maintenance urgency")
        
        if enhanced_schedule['risk_assessment']['weather_risk'] > 0.5:
            alerts.append(f"WEATHER ALERT: {request.weather_conditions} conditions may impact operations")
        
        # Performance alerts
        if enhanced_schedule['performance_metrics']['predicted_reliability'] < 0.7:
            alerts.append("RELIABILITY CONCERN: Lower than optimal predicted reliability")
        
        if enhanced_schedule['performance_metrics']['energy_efficiency'] < 0.6:
            alerts.append("ENERGY ALERT: Schedule may consume more energy than optimal")
        
        # Special alerts for schedule type
        if request.schedule_type == ScheduleType.PEAK_HOUR:
            alerts.append("PEAK HOUR: Monitor passenger satisfaction and capacity utilization")
        elif request.schedule_type == ScheduleType.NIGHT_SERVICE:
            alerts.append("NIGHT SERVICE: Focus on energy efficiency and minimal disruption")
        
        return alerts
    
    async def _execute_schedule_automatically(self, schedule: GeneratedSchedule):
        """Execute a high-confidence schedule automatically"""
        
        logger.info(f"🚀 Executing schedule automatically: {schedule.schedule_id}")
        
        try:
            # Execute each step in the plan
            for step in schedule.execution_plan:
                logger.info(f"   Step {step['step']}: {step['action']}")
                
                if step['action'] == 'Update trainset assignments':
                    await self._apply_trainset_assignments(schedule.trainset_assignments)
                elif step['action'] == 'Notify operations team':
                    await self._send_schedule_notification(schedule)
                
                # Wait for step completion
                await asyncio.sleep(step['duration_minutes'] * 5)  # Accelerated for demo
            
            logger.info(f"✅ Schedule executed successfully: {schedule.schedule_id}")
            
            # Record execution for learning
            self.performance_history.append({
                'schedule_id': schedule.schedule_id,
                'executed_at': datetime.now(),
                'confidence': schedule.confidence,
                'auto_executed': True,
                'performance_metrics': schedule.estimated_performance
            })
            
        except Exception as e:
            logger.error(f"❌ Failed to execute schedule {schedule.schedule_id}: {e}")
    
    async def _request_schedule_approval(self, schedule: GeneratedSchedule):
        """Request human approval for medium-confidence schedules"""
        
        logger.warning(f"📋 Schedule requires approval: {schedule.schedule_id} (Confidence: {schedule.confidence:.2f})")
        
        # In real implementation, this would send notifications to operators
        approval_details = {
            'schedule_id': schedule.schedule_id,
            'confidence': schedule.confidence,
            'trainsets_assigned': len(schedule.trainset_assignments),
            'estimated_performance': schedule.estimated_performance,
            'risk_level': schedule.risk_assessment['overall_risk'],
            'monitoring_alerts': schedule.monitoring_alerts
        }
        
        logger.info("📧 Approval request sent to operations team")
    
    async def _apply_trainset_assignments(self, assignments: Dict[str, int]):
        """Apply trainset assignments to the system"""
        
        logger.info(f"🔧 Applying assignments to {len(assignments)} trainsets")
        
        # In real implementation, this would update the database
        for trainset_id, position in assignments.items():
            logger.info(f"   {trainset_id} → Position {position}")
        
        return True
    
    async def _send_schedule_notification(self, schedule: GeneratedSchedule):
        """Send schedule notification to operations team"""
        
        logger.info(f"📢 Sending notifications for schedule: {schedule.schedule_id}")
        
        # In real implementation, this would send emails/SMS
        return True
    
    # Helper methods for getting system data
    async def _get_current_trainset_status(self) -> List[Dict]:
        """Get current trainset status from system"""
        
        # Simplified mock data
        return [
            {"trainset_id": "TS001", "status": "AVAILABLE", "fitness_valid": True, "current_mileage": 50000},
            {"trainset_id": "TS002", "status": "AVAILABLE", "fitness_valid": True, "current_mileage": 45000},
            {"trainset_id": "TS003", "status": "MAINTENANCE", "fitness_valid": True, "current_mileage": 55000},
            {"trainset_id": "TS004", "status": "AVAILABLE", "fitness_valid": True, "current_mileage": 42000},
            {"trainset_id": "TS005", "status": "AVAILABLE", "fitness_valid": True, "current_mileage": 48000},
            {"trainset_id": "TS006", "status": "CLEANING", "fitness_valid": True, "current_mileage": 46000},
            {"trainset_id": "TS007", "status": "AVAILABLE", "fitness_valid": True, "current_mileage": 51000},
            {"trainset_id": "TS008", "status": "AVAILABLE", "fitness_valid": True, "current_mileage": 43000},
        ]
    
    async def _analyze_schedule_performance(self):
        """Analyze performance of active schedules"""
        
        if not self.performance_history:
            return
        
        recent_schedules = self.performance_history[-10:]  # Last 10 schedules
        
        avg_confidence = np.mean([s['confidence'] for s in recent_schedules])
        auto_execution_rate = sum(1 for s in recent_schedules if s.get('auto_executed', False)) / len(recent_schedules)
        
        logger.info(f"📊 Schedule Performance - Avg Confidence: {avg_confidence:.2f}, Auto Execution: {auto_execution_rate:.1%}")
    
    async def _update_demand_patterns(self):
        """Update demand prediction patterns based on historical data"""
        
        # In real implementation, this would analyze historical ridership data
        logger.info("📈 Updating demand prediction patterns")
    
    async def _optimize_scheduling_parameters(self):
        """Optimize AI scheduling parameters based on performance"""
        
        if len(self.performance_history) < 10:
            return
        
        # Analyze recent performance and adjust parameters
        recent_performance = self.performance_history[-20:]
        
        # Calculate success rate
        success_rate = sum(1 for p in recent_performance 
                          if p.get('actual_performance', 0.8) > 0.7) / len(recent_performance)
        
        # Adjust confidence thresholds based on success rate
        if success_rate > 0.9:
            self.confidence_threshold = max(0.70, self.confidence_threshold - 0.01)
            self.auto_execution_threshold = max(0.80, self.auto_execution_threshold - 0.01)
        elif success_rate < 0.7:
            self.confidence_threshold = min(0.85, self.confidence_threshold + 0.01)
            self.auto_execution_threshold = min(0.95, self.auto_execution_threshold + 0.01)
        
        logger.info(f"🎯 Updated thresholds - Confidence: {self.confidence_threshold:.2f}, Auto-exec: {self.auto_execution_threshold:.2f}")
    
    def get_scheduler_status(self) -> Dict[str, Any]:
        """Get current scheduler status and statistics"""
        
        recent_schedules = self.generated_schedules[-10:] if self.generated_schedules else []
        
        status = {
            'active': True,
            'total_schedules_generated': len(self.generated_schedules),
            'recent_schedules': len(recent_schedules),
            'average_confidence': np.mean([s.confidence for s in recent_schedules]) if recent_schedules else 0,
            'auto_execution_rate': sum(1 for s in recent_schedules if s.confidence >= self.auto_execution_threshold) / len(recent_schedules) if recent_schedules else 0,
            'current_thresholds': {
                'confidence_threshold': self.confidence_threshold,
                'auto_execution_threshold': self.auto_execution_threshold
            },
            'schedule_types_generated': {
                schedule_type.value: sum(1 for s in self.generated_schedules if s.schedule_type == schedule_type)
                for schedule_type in ScheduleType
            }
        }
        
        return status


# Global intelligent scheduler instance
intelligent_scheduler = IntelligentAutoScheduler()