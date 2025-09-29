"""
Advanced AI Decision Engine for KMRL Train Induction System
This module provides fully autonomous decision-making capabilities
"""

import asyncio
import numpy as np
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
from loguru import logger
import json

from ..ml.model_manager import ModelManager
from ..ml.feedback_loop import MLFeedbackLoop, FeedbackType, ScheduleOutcome
from ..optimization.engine import SchedulingOptimizer
from ..models.optimization import OptimizationRequest, TrainsetData


class DecisionType(Enum):
    """Types of automated decisions the AI can make"""
    SCHEDULE_OPTIMIZATION = "schedule_optimization"
    MAINTENANCE_SCHEDULING = "maintenance_scheduling"
    EMERGENCY_RESPONSE = "emergency_response"
    RESOURCE_ALLOCATION = "resource_allocation"
    ROUTE_ADJUSTMENT = "route_adjustment"
    CLEANING_SCHEDULE = "cleaning_schedule"


class DecisionUrgency(Enum):
    """Urgency levels for AI decisions"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class AIDecision:
    """Represents an AI-made decision"""
    decision_id: str
    decision_type: DecisionType
    urgency: DecisionUrgency
    timestamp: datetime
    confidence: float
    rationale: str
    action_plan: Dict[str, Any]
    affected_trainsets: List[str]
    estimated_impact: Dict[str, float]
    requires_human_approval: bool
    execution_deadline: Optional[datetime] = None
    alternatives: List[Dict[str, Any]] = None


class AutonomousAIEngine:
    """
    Central AI Decision Engine that operates autonomously
    """
    
    def __init__(self):
        self.model_manager = ModelManager()
        self.feedback_loop = MLFeedbackLoop()
        self.optimizer = SchedulingOptimizer()
        self.decision_history = []
        self.active_decisions = {}
        self.decision_counter = 0
        
        # AI Configuration
        self.confidence_threshold = 0.75  # Minimum confidence for autonomous decisions
        self.human_approval_threshold = 0.60  # Below this, human approval required
        self.max_autonomous_trainsets = 15  # Max trainsets AI can control automatically
        
        # Decision weights
        self.decision_weights = {
            'safety': 0.40,
            'efficiency': 0.25,
            'cost': 0.20,
            'passenger_impact': 0.15
        }
        
    async def initialize(self):
        """Initialize the AI engine"""
        logger.info("🤖 Initializing Autonomous AI Decision Engine...")
        
        await self.model_manager.load_models()
        await self.feedback_loop.load_models()
        
        # Start continuous monitoring
        asyncio.create_task(self._continuous_monitoring())
        asyncio.create_task(self._decision_executor())
        
        logger.info("✅ AI Engine initialized and running autonomously")
        
    async def _continuous_monitoring(self):
        """Continuously monitor system and make decisions"""
        while True:
            try:
                # Check every 30 seconds for decisions needed
                await self._evaluate_system_state()
                await asyncio.sleep(30)
                
            except Exception as e:
                logger.error(f"Error in continuous monitoring: {e}")
                await asyncio.sleep(60)  # Wait longer if there's an error
                
    async def _decision_executor(self):
        """Execute approved decisions automatically"""
        while True:
            try:
                # Execute pending decisions every 10 seconds
                await self._execute_pending_decisions()
                await asyncio.sleep(10)
                
            except Exception as e:
                logger.error(f"Error in decision executor: {e}")
                await asyncio.sleep(30)
                
    async def _evaluate_system_state(self):
        """Evaluate current system state and make necessary decisions"""
        
        # Get current system data
        trainsets = await self._get_current_trainsets()
        current_time = datetime.now()
        
        # Check for various decision triggers
        decisions = []
        
        # 1. Schedule optimization decisions
        schedule_decision = await self._evaluate_schedule_optimization(trainsets, current_time)
        if schedule_decision:
            decisions.append(schedule_decision)
            
        # 2. Maintenance scheduling decisions
        maintenance_decisions = await self._evaluate_maintenance_needs(trainsets, current_time)
        decisions.extend(maintenance_decisions)
        
        # 3. Emergency response decisions
        emergency_decisions = await self._evaluate_emergency_situations(trainsets, current_time)
        decisions.extend(emergency_decisions)
        
        # 4. Resource allocation decisions
        resource_decisions = await self._evaluate_resource_allocation(trainsets, current_time)
        decisions.extend(resource_decisions)
        
        # Process and store decisions
        for decision in decisions:
            await self._process_decision(decision)
            
    async def _evaluate_schedule_optimization(self, trainsets: List[Dict], current_time: datetime) -> Optional[AIDecision]:
        """Evaluate if schedule optimization is needed"""
        
        # Check if it's time for automatic schedule generation
        hour = current_time.hour
        
        # Generate schedules at key times: 6 AM, 10 AM, 2 PM, 6 PM, 10 PM
        schedule_times = [6, 10, 14, 18, 22]
        
        if hour in schedule_times and current_time.minute < 5:
            
            # Predict schedule success
            schedule_features = {
                'hour': hour,
                'weekday': current_time.weekday(),
                'day': current_time.day,
                'month': current_time.month,
                'trainset_count': len(trainsets),
                'mileage_balance': self._calculate_mileage_balance(trainsets),
                'energy_efficiency': 0.85,  # Estimated
                'maintenance_score': self._calculate_maintenance_score(trainsets)
            }
            
            predictions = self.feedback_loop.predict_schedule_success(schedule_features)
            confidence = predictions.get('success_probability', 0.5)
            
            if confidence > self.confidence_threshold:
                return AIDecision(
                    decision_id=f"AUTO_SCHEDULE_{self.decision_counter}",
                    decision_type=DecisionType.SCHEDULE_OPTIMIZATION,
                    urgency=DecisionUrgency.HIGH,
                    timestamp=current_time,
                    confidence=confidence,
                    rationale=f"Automatic schedule optimization for {hour}:00 - High success probability ({confidence:.2f})",
                    action_plan={
                        "action": "optimize_schedule",
                        "algorithm": "constraint_programming",
                        "max_trainsets": min(len(trainsets), self.max_autonomous_trainsets),
                        "parameters": {
                            "focus": "efficiency" if hour in [10, 14] else "passenger_comfort"
                        }
                    },
                    affected_trainsets=[ts['trainset_id'] for ts in trainsets if ts['status'] == 'AVAILABLE'],
                    estimated_impact={
                        "efficiency_gain": 0.15,
                        "energy_saving": 0.08,
                        "passenger_satisfaction": 0.12
                    },
                    requires_human_approval=False,
                    execution_deadline=current_time + timedelta(minutes=15)
                )
                
        return None
        
    async def _evaluate_maintenance_needs(self, trainsets: List[Dict], current_time: datetime) -> List[AIDecision]:
        """Evaluate maintenance scheduling decisions"""
        
        decisions = []
        
        for trainset in trainsets:
            # Check if maintenance is approaching
            if trainset.get('next_maintenance_date'):
                days_until_maintenance = (trainset['next_maintenance_date'] - current_time.date()).days
                
                if days_until_maintenance <= 3 and trainset['status'] == 'AVAILABLE':
                    confidence = 0.90  # High confidence for scheduled maintenance
                    
                    decision = AIDecision(
                        decision_id=f"MAINT_{trainset['trainset_id']}_{self.decision_counter}",
                        decision_type=DecisionType.MAINTENANCE_SCHEDULING,
                        urgency=DecisionUrgency.HIGH if days_until_maintenance <= 1 else DecisionUrgency.MEDIUM,
                        timestamp=current_time,
                        confidence=confidence,
                        rationale=f"Predictive maintenance scheduling for {trainset['trainset_id']} - {days_until_maintenance} days remaining",
                        action_plan={
                            "action": "schedule_maintenance",
                            "trainset_id": trainset['trainset_id'],
                            "maintenance_window": self._find_optimal_maintenance_window(trainset, current_time),
                            "priority": "high" if days_until_maintenance <= 1 else "medium"
                        },
                        affected_trainsets=[trainset['trainset_id']],
                        estimated_impact={
                            "availability_reduction": 0.04,  # One trainset out of 25
                            "safety_improvement": 0.95,
                            "cost_saving": 0.20  # Preventive vs reactive
                        },
                        requires_human_approval=days_until_maintenance <= 1,  # Critical maintenance needs approval
                        execution_deadline=current_time + timedelta(hours=24)
                    )
                    
                    decisions.append(decision)
                    self.decision_counter += 1
                    
        return decisions
        
    async def _evaluate_emergency_situations(self, trainsets: List[Dict], current_time: datetime) -> List[AIDecision]:
        """Evaluate emergency response decisions"""
        
        decisions = []
        
        for trainset in trainsets:
            # Check for fitness certificate expiry
            if trainset.get('fitness_expiry_date'):
                days_until_expiry = (trainset['fitness_expiry_date'] - current_time.date()).days
                
                if days_until_expiry <= 0 and trainset['status'] != 'OUT_OF_ORDER':
                    # Emergency: Expired fitness certificate
                    decision = AIDecision(
                        decision_id=f"EMERGENCY_FITNESS_{trainset['trainset_id']}_{self.decision_counter}",
                        decision_type=DecisionType.EMERGENCY_RESPONSE,
                        urgency=DecisionUrgency.CRITICAL,
                        timestamp=current_time,
                        confidence=1.0,  # Absolute requirement
                        rationale=f"CRITICAL: Fitness certificate expired for {trainset['trainset_id']} - Immediate deactivation required",
                        action_plan={
                            "action": "emergency_deactivate",
                            "trainset_id": trainset['trainset_id'],
                            "reason": "fitness_expired",
                            "immediate_replacement": True
                        },
                        affected_trainsets=[trainset['trainset_id']],
                        estimated_impact={
                            "safety_compliance": 1.0,
                            "service_disruption": 0.04,
                            "regulatory_risk": -0.99  # Avoid penalties
                        },
                        requires_human_approval=False,  # Safety critical, no approval needed
                        execution_deadline=current_time + timedelta(minutes=5)
                    )
                    
                    decisions.append(decision)
                    self.decision_counter += 1
                    
        return decisions
        
    async def _evaluate_resource_allocation(self, trainsets: List[Dict], current_time: datetime) -> List[AIDecision]:
        """Evaluate resource allocation decisions"""
        
        decisions = []
        
        # Check for cleaning schedule optimization
        if current_time.hour == 22 and current_time.minute < 10:  # 10 PM cleaning time
            available_trainsets = [ts for ts in trainsets if ts['status'] == 'AVAILABLE']
            
            if len(available_trainsets) >= 6:  # Need sufficient trains
                cleaning_count = max(2, len(available_trainsets) // 4)  # 25% for cleaning
                
                decision = AIDecision(
                    decision_id=f"AUTO_CLEANING_{self.decision_counter}",
                    decision_type=DecisionType.CLEANING_SCHEDULE,
                    urgency=DecisionUrgency.MEDIUM,
                    timestamp=current_time,
                    confidence=0.85,
                    rationale=f"Automated cleaning schedule - {cleaning_count} trainsets selected for optimal rotation",
                    action_plan={
                        "action": "schedule_cleaning",
                        "trainset_count": cleaning_count,
                        "selection_criteria": "least_recently_cleaned",
                        "duration_hours": 2,
                        "completion_time": "00:00"
                    },
                    affected_trainsets=[ts['trainset_id'] for ts in available_trainsets[:cleaning_count]],
                    estimated_impact={
                        "hygiene_improvement": 0.30,
                        "passenger_satisfaction": 0.15,
                        "operational_availability": -0.02  # Slight reduction during cleaning
                    },
                    requires_human_approval=False,
                    execution_deadline=current_time + timedelta(minutes=30)
                )
                
                decisions.append(decision)
                self.decision_counter += 1
                
        return decisions
        
    async def _process_decision(self, decision: AIDecision):
        """Process and store a decision"""
        
        logger.info(f"🤖 AI Decision Generated: {decision.decision_type.value} - Confidence: {decision.confidence:.2f}")
        
        # Store decision
        self.active_decisions[decision.decision_id] = decision
        self.decision_history.append(decision)
        
        # Log decision details
        logger.info(f"   Rationale: {decision.rationale}")
        logger.info(f"   Affected trainsets: {len(decision.affected_trainsets)}")
        logger.info(f"   Requires approval: {decision.requires_human_approval}")
        
        # If decision requires human approval, send notification
        if decision.requires_human_approval:
            await self._send_approval_request(decision)
            
    async def _execute_pending_decisions(self):
        """Execute decisions that are ready for execution"""
        
        current_time = datetime.now()
        
        for decision_id, decision in list(self.active_decisions.items()):
            
            # Check if decision is ready for execution
            if self._is_decision_ready_for_execution(decision, current_time):
                
                try:
                    # Execute the decision
                    result = await self._execute_decision(decision)
                    
                    if result['success']:
                        logger.info(f"✅ Decision executed successfully: {decision_id}")
                        
                        # Record success feedback
                        await self._record_decision_outcome(decision, True, result)
                        
                    else:
                        logger.error(f"❌ Decision execution failed: {decision_id} - {result.get('error')}")
                        await self._record_decision_outcome(decision, False, result)
                        
                    # Remove from active decisions
                    del self.active_decisions[decision_id]
                    
                except Exception as e:
                    logger.error(f"Exception executing decision {decision_id}: {e}")
                    await self._record_decision_outcome(decision, False, {"error": str(e)})
                    
    def _is_decision_ready_for_execution(self, decision: AIDecision, current_time: datetime) -> bool:
        """Check if decision is ready for execution"""
        
        # Check if deadline has passed
        if decision.execution_deadline and current_time > decision.execution_deadline:
            return False
            
        # Check if approval is required and not yet received
        if decision.requires_human_approval:
            return hasattr(decision, 'approved') and decision.approved
            
        # For autonomous decisions, execute immediately
        return True
        
    async def _execute_decision(self, decision: AIDecision) -> Dict[str, Any]:
        """Execute a specific decision"""
        
        action = decision.action_plan.get('action')
        
        if action == "optimize_schedule":
            return await self._execute_schedule_optimization(decision)
        elif action == "schedule_maintenance":
            return await self._execute_maintenance_scheduling(decision)
        elif action == "emergency_deactivate":
            return await self._execute_emergency_deactivation(decision)
        elif action == "schedule_cleaning":
            return await self._execute_cleaning_schedule(decision)
        else:
            return {"success": False, "error": f"Unknown action: {action}"}
            
    async def _execute_schedule_optimization(self, decision: AIDecision) -> Dict[str, Any]:
        """Execute schedule optimization"""
        
        try:
            # Get current trainsets
            trainsets = await self._get_current_trainsets()
            
            # Convert to TrainsetData format
            trainset_data = []
            for ts in trainsets:
                if ts['trainset_id'] in decision.affected_trainsets:
                    trainset_data.append(TrainsetData(
                        trainset_id=ts['trainset_id'],
                        fitness_valid=ts.get('fitness_valid', True),
                        has_high_priority_jobs=ts.get('has_high_priority_jobs', False),
                        current_mileage=ts.get('current_mileage', 0),
                        branding_priority=ts.get('branding_priority', 1),
                        last_cleaning_date=ts.get('last_cleaning_date'),
                        stabling_preference=ts.get('stabling_preference', 0)
                    ))
                    
            # Create optimization request
            request = OptimizationRequest(
                optimization_id=decision.decision_id,
                algorithm=decision.action_plan.get('algorithm', 'constraint_programming'),
                max_trainsets=decision.action_plan.get('max_trainsets', 20),
                parameters=decision.action_plan.get('parameters', {})
            )
            
            # Run optimization
            result = await self.optimizer.optimize_schedule(request, trainset_data)
            
            if result.status == "completed":
                # Apply the optimized schedule
                await self._apply_optimized_schedule(result)
                
                return {
                    "success": True,
                    "optimization_result": result,
                    "trainsets_assigned": len(result.trainset_assignments),
                    "score": result.score
                }
            else:
                return {"success": False, "error": "Optimization failed"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
            
    async def _execute_maintenance_scheduling(self, decision: AIDecision) -> Dict[str, Any]:
        """Execute maintenance scheduling"""
        
        try:
            trainset_id = decision.action_plan['trainset_id']
            maintenance_window = decision.action_plan['maintenance_window']
            
            # Update trainset status to MAINTENANCE
            result = await self._update_trainset_status(trainset_id, 'MAINTENANCE', {
                'scheduled_by': 'AI_ENGINE',
                'maintenance_window': maintenance_window,
                'reason': 'predictive_maintenance'
            })
            
            if result:
                logger.info(f"🔧 Trainset {trainset_id} scheduled for maintenance")
                return {"success": True, "trainset_id": trainset_id, "status": "maintenance_scheduled"}
            else:
                return {"success": False, "error": "Failed to update trainset status"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
            
    async def _execute_emergency_deactivation(self, decision: AIDecision) -> Dict[str, Any]:
        """Execute emergency deactivation"""
        
        try:
            trainset_id = decision.action_plan['trainset_id']
            reason = decision.action_plan['reason']
            
            # Immediately deactivate trainset
            result = await self._update_trainset_status(trainset_id, 'OUT_OF_ORDER', {
                'deactivated_by': 'AI_EMERGENCY_SYSTEM',
                'reason': reason,
                'timestamp': datetime.now().isoformat(),
                'requires_immediate_attention': True
            })
            
            if result:
                logger.critical(f"🚨 EMERGENCY: Trainset {trainset_id} deactivated - {reason}")
                
                # Send immediate alert to operations team
                await self._send_emergency_alert(decision)
                
                return {"success": True, "trainset_id": trainset_id, "status": "emergency_deactivated"}
            else:
                return {"success": False, "error": "Failed to deactivate trainset"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
            
    async def _execute_cleaning_schedule(self, decision: AIDecision) -> Dict[str, Any]:
        """Execute cleaning schedule"""
        
        try:
            trainset_count = decision.action_plan['trainset_count']
            affected_trainsets = decision.affected_trainsets[:trainset_count]
            
            successful_updates = 0
            
            for trainset_id in affected_trainsets:
                result = await self._update_trainset_status(trainset_id, 'CLEANING', {
                    'scheduled_by': 'AI_ENGINE',
                    'cleaning_start': datetime.now().isoformat(),
                    'estimated_completion': (datetime.now() + timedelta(hours=2)).isoformat()
                })
                
                if result:
                    successful_updates += 1
                    
            if successful_updates > 0:
                logger.info(f"🧹 {successful_updates} trainsets scheduled for cleaning")
                return {
                    "success": True,
                    "scheduled_count": successful_updates,
                    "trainsets": affected_trainsets
                }
            else:
                return {"success": False, "error": "No trainsets could be scheduled for cleaning"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
            
    # Helper methods
    async def _get_current_trainsets(self) -> List[Dict]:
        """Get current trainset data - placeholder for actual database query"""
        # In real implementation, this would query the database
        return [
            {"trainset_id": "TS001", "status": "AVAILABLE", "fitness_valid": True, "current_mileage": 50000},
            {"trainset_id": "TS002", "status": "AVAILABLE", "fitness_valid": True, "current_mileage": 45000},
            # ... more trainsets
        ]
        
    def _calculate_mileage_balance(self, trainsets: List[Dict]) -> float:
        """Calculate mileage balance score"""
        mileages = [ts.get('current_mileage', 0) for ts in trainsets]
        if not mileages:
            return 0.5
            
        avg_mileage = np.mean(mileages)
        std_mileage = np.std(mileages)
        
        # Lower standard deviation means better balance
        balance_score = max(0, 1 - (std_mileage / avg_mileage) if avg_mileage > 0 else 0.5)
        return balance_score
        
    def _calculate_maintenance_score(self, trainsets: List[Dict]) -> float:
        """Calculate overall maintenance score"""
        scores = []
        for ts in trainsets:
            if ts.get('next_maintenance_date'):
                days_until = (ts['next_maintenance_date'] - datetime.now().date()).days
                score = min(1.0, days_until / 30)  # Normalize to 30 days
                scores.append(score)
                
        return np.mean(scores) if scores else 0.5
        
    def _find_optimal_maintenance_window(self, trainset: Dict, current_time: datetime) -> Dict[str, str]:
        """Find optimal maintenance window"""
        # Find next available maintenance slot (simplified)
        start_time = current_time + timedelta(hours=2)
        end_time = start_time + timedelta(hours=4)
        
        return {
            "start": start_time.isoformat(),
            "end": end_time.isoformat(),
            "type": "predictive_maintenance"
        }
        
    async def _update_trainset_status(self, trainset_id: str, status: str, metadata: Dict) -> bool:
        """Update trainset status - placeholder for actual database update"""
        logger.info(f"Updating {trainset_id} status to {status}")
        # In real implementation, this would update the database
        return True
        
    async def _apply_optimized_schedule(self, optimization_result):
        """Apply optimized schedule to trainsets"""
        logger.info(f"Applying optimized schedule with {len(optimization_result.trainset_assignments)} assignments")
        # In real implementation, this would update the database with new assignments
        
    async def _send_approval_request(self, decision: AIDecision):
        """Send approval request to human operators"""
        logger.warning(f"📋 Approval required for decision: {decision.decision_id}")
        # In real implementation, this would send notification to operators
        
    async def _send_emergency_alert(self, decision: AIDecision):
        """Send emergency alert"""
        logger.critical(f"🚨 EMERGENCY ALERT: {decision.rationale}")
        # In real implementation, this would send SMS/email alerts
        
    async def _record_decision_outcome(self, decision: AIDecision, success: bool, result: Dict):
        """Record decision outcome for learning"""
        
        outcome = ScheduleOutcome(
            schedule_id=decision.decision_id,
            timestamp=datetime.now(),
            trainset_ids=decision.affected_trainsets,
            planned_metrics=decision.estimated_impact,
            actual_metrics=result,
            feedback_type=FeedbackType.SCHEDULE_SUCCESS if success else FeedbackType.SCHEDULE_FAILURE,
            success_score=1.0 if success else 0.0,
            operator_feedback=f"AI Decision: {decision.decision_type.value}"
        )
        
        # Feed back to ML system for learning
        await self.feedback_loop.process_feedback(outcome)
        
    def get_decision_summary(self) -> Dict[str, Any]:
        """Get summary of AI decisions"""
        return {
            "total_decisions": len(self.decision_history),
            "active_decisions": len(self.active_decisions),
            "decision_types": {
                dt.value: sum(1 for d in self.decision_history if d.decision_type == dt)
                for dt in DecisionType
            },
            "average_confidence": np.mean([d.confidence for d in self.decision_history]) if self.decision_history else 0,
            "autonomous_decisions": sum(1 for d in self.decision_history if not d.requires_human_approval)
        }


# Global AI Engine instance
ai_engine = AutonomousAIEngine()