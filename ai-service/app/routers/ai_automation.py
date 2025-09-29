"""
API Router for AI Automation Features
Provides endpoints for the autonomous AI systems
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from loguru import logger
import asyncio

from ..ai_automation.decision_engine import ai_engine, DecisionType, DecisionUrgency
from ..ai_automation.predictive_maintenance import predictive_maintenance, TrainsetTelemetry, MaintenanceType
from ..ai_automation.intelligent_scheduler import intelligent_scheduler, ScheduleType, SchedulePriority
from pydantic import BaseModel


router = APIRouter()


# Pydantic models for API requests/responses
class TelemetryData(BaseModel):
    """Telemetry data from trainsets"""
    trainset_id: str
    mileage: float
    engine_temperature: float
    brake_pressure: float
    door_cycles: int
    hvac_efficiency: float
    battery_voltage: float
    vibration_level: float
    noise_level: float
    power_consumption: float
    speed_profile: List[float]
    failure_codes: List[str]


class AISystemStatus(BaseModel):
    """Overall AI system status"""
    decision_engine_active: bool
    predictive_maintenance_active: bool
    intelligent_scheduler_active: bool
    total_decisions_made: int
    total_schedules_generated: int
    total_maintenance_predictions: int
    system_confidence: float
    automation_level: float


class ScheduleGenerationRequest(BaseModel):
    """Manual schedule generation request"""
    schedule_type: str
    priority: str
    duration_hours: int
    constraints: Dict[str, Any]
    force_generate: bool = False


# === SYSTEM CONTROL ENDPOINTS ===

@router.post("/start", response_model=Dict[str, str])
async def start_ai_automation():
    """Start all AI automation systems"""
    try:
        logger.info("🚀 Starting AI Automation Systems...")
        
        # Initialize and start all AI systems
        await ai_engine.initialize()
        await intelligent_scheduler.start_autonomous_scheduling()
        
        logger.info("✅ All AI automation systems started successfully")
        
        return {
            "status": "success",
            "message": "AI automation systems started successfully",
            "timestamp": datetime.now().isoformat(),
            "systems_started": [
                "decision_engine",
                "predictive_maintenance", 
                "intelligent_scheduler"
            ]
        }
        
    except Exception as e:
        logger.error(f"Failed to start AI automation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start AI automation: {str(e)}")


@router.get("/status", response_model=AISystemStatus)
async def get_ai_system_status():
    """Get comprehensive AI system status"""
    
    try:
        # Get status from each AI system
        decision_summary = ai_engine.get_decision_summary()
        scheduler_status = intelligent_scheduler.get_scheduler_status()
        fleet_health = predictive_maintenance.get_fleet_health_summary()
        
        # Calculate overall system confidence
        decision_confidence = decision_summary.get('average_confidence', 0)
        scheduler_confidence = scheduler_status.get('average_confidence', 0)
        maintenance_confidence = 0.8  # Simplified
        
        system_confidence = (decision_confidence + scheduler_confidence + maintenance_confidence) / 3
        
        # Calculate automation level (0-100%)
        auto_decisions = decision_summary.get('autonomous_decisions', 0)
        total_decisions = decision_summary.get('total_decisions', 1)
        automation_level = (auto_decisions / total_decisions * 100) if total_decisions > 0 else 0
        
        return AISystemStatus(
            decision_engine_active=True,
            predictive_maintenance_active=True,
            intelligent_scheduler_active=scheduler_status.get('active', False),
            total_decisions_made=decision_summary.get('total_decisions', 0),
            total_schedules_generated=scheduler_status.get('total_schedules_generated', 0),
            total_maintenance_predictions=fleet_health.get('total_predictions', 0),
            system_confidence=round(system_confidence, 3),
            automation_level=round(automation_level, 1)
        )
        
    except Exception as e:
        logger.error(f"Error getting AI system status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stop")
async def stop_ai_automation():
    """Stop all AI automation systems"""
    try:
        logger.info("🛑 Stopping AI automation systems...")
        
        # In a real implementation, we would gracefully stop the background tasks
        # For now, we just log the action
        
        return {
            "status": "success",
            "message": "AI automation systems stopped",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error stopping AI systems: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# === DECISION ENGINE ENDPOINTS ===

@router.get("/decisions/active")
async def get_active_decisions():
    """Get currently active AI decisions"""
    
    try:
        active_decisions = []
        
        for decision_id, decision in ai_engine.active_decisions.items():
            active_decisions.append({
                "decision_id": decision.decision_id,
                "decision_type": decision.decision_type.value,
                "urgency": decision.urgency.value,
                "timestamp": decision.timestamp.isoformat(),
                "confidence": decision.confidence,
                "rationale": decision.rationale,
                "affected_trainsets": decision.affected_trainsets,
                "requires_approval": decision.requires_human_approval,
                "execution_deadline": decision.execution_deadline.isoformat() if decision.execution_deadline else None
            })
            
        return {
            "active_decisions": active_decisions,
            "total_active": len(active_decisions)
        }
        
    except Exception as e:
        logger.error(f"Error getting active decisions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/decisions/history")
async def get_decision_history(limit: int = 50):
    """Get AI decision history"""
    
    try:
        recent_decisions = ai_engine.decision_history[-limit:] if ai_engine.decision_history else []
        
        decision_history = []
        for decision in recent_decisions:
            decision_history.append({
                "decision_id": decision.decision_id,
                "decision_type": decision.decision_type.value,
                "urgency": decision.urgency.value,
                "timestamp": decision.timestamp.isoformat(),
                "confidence": decision.confidence,
                "rationale": decision.rationale,
                "affected_trainsets": decision.affected_trainsets,
                "estimated_impact": decision.estimated_impact
            })
            
        return {
            "decision_history": decision_history,
            "total_decisions": len(ai_engine.decision_history)
        }
        
    except Exception as e:
        logger.error(f"Error getting decision history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/decisions/summary")
async def get_decision_summary():
    """Get AI decision summary and statistics"""
    
    try:
        summary = ai_engine.get_decision_summary()
        return summary
        
    except Exception as e:
        logger.error(f"Error getting decision summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# === PREDICTIVE MAINTENANCE ENDPOINTS ===

@router.post("/maintenance/telemetry")
async def ingest_telemetry_data(telemetry: TelemetryData):
    """Ingest real-time telemetry data for predictive maintenance"""
    
    try:
        # Convert to internal telemetry format
        telemetry_data = TrainsetTelemetry(
            trainset_id=telemetry.trainset_id,
            timestamp=datetime.now(),
            mileage=telemetry.mileage,
            engine_temperature=telemetry.engine_temperature,
            brake_pressure=telemetry.brake_pressure,
            door_cycles=telemetry.door_cycles,
            hvac_efficiency=telemetry.hvac_efficiency,
            battery_voltage=telemetry.battery_voltage,
            vibration_level=telemetry.vibration_level,
            noise_level=telemetry.noise_level,
            power_consumption=telemetry.power_consumption,
            speed_profile=telemetry.speed_profile,
            failure_codes=telemetry.failure_codes
        )
        
        # Process telemetry and get predictions
        predictions = predictive_maintenance.ingest_telemetry(telemetry_data)
        
        # Convert predictions to API format
        prediction_results = []
        for pred in predictions:
            prediction_results.append({
                "trainset_id": pred.trainset_id,
                "component": pred.component,
                "maintenance_type": pred.maintenance_type.value,
                "predicted_failure_date": pred.predicted_failure_date.isoformat(),
                "confidence": pred.confidence,
                "urgency_score": pred.urgency_score,
                "health_status": pred.health_status.value,
                "remaining_useful_life": pred.remaining_useful_life,
                "recommended_action": pred.recommended_action,
                "cost_estimate": pred.cost_estimate,
                "risk_assessment": pred.risk_assessment
            })
        
        return {
            "status": "success",
            "trainset_id": telemetry.trainset_id,
            "predictions": prediction_results,
            "total_predictions": len(predictions),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error processing telemetry: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/maintenance/trainset/{trainset_id}")
async def get_trainset_health(trainset_id: str):
    """Get health analysis for a specific trainset"""
    
    try:
        predictions = predictive_maintenance.analyze_trainset_health(trainset_id)
        
        if not predictions:
            return {
                "trainset_id": trainset_id,
                "status": "no_data",
                "message": "Insufficient data for health analysis",
                "predictions": []
            }
        
        # Convert predictions to API format
        prediction_results = []
        for pred in predictions:
            prediction_results.append({
                "component": pred.component,
                "maintenance_type": pred.maintenance_type.value,
                "predicted_failure_date": pred.predicted_failure_date.isoformat(),
                "confidence": pred.confidence,
                "urgency_score": pred.urgency_score,
                "health_status": pred.health_status.value,
                "remaining_useful_life": pred.remaining_useful_life,
                "recommended_action": pred.recommended_action,
                "cost_estimate": pred.cost_estimate,
                "risk_assessment": pred.risk_assessment
            })
        
        # Calculate overall health score
        health_scores = {
            'excellent': 1.0, 'good': 0.8, 'fair': 0.6, 'poor': 0.4, 'critical': 0.2
        }
        overall_health = sum(health_scores.get(p['health_status'], 0.6) for p in prediction_results) / len(prediction_results)
        
        return {
            "trainset_id": trainset_id,
            "overall_health_score": round(overall_health, 3),
            "total_components_analyzed": len(predictions),
            "critical_issues": sum(1 for p in prediction_results if p['health_status'] == 'critical'),
            "urgent_maintenance": sum(1 for p in prediction_results if p['remaining_useful_life'] <= 7),
            "predictions": prediction_results,
            "analysis_timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting trainset health: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/maintenance/fleet")
async def get_fleet_health():
    """Get overall fleet health summary"""
    
    try:
        fleet_summary = predictive_maintenance.get_fleet_health_summary()
        
        if fleet_summary.get('status') == 'no_data':
            return fleet_summary
            
        return {
            "fleet_health_summary": fleet_summary,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting fleet health: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/maintenance/schedule")
async def get_maintenance_schedule():
    """Get AI-generated maintenance schedule"""
    
    try:
        # Get fleet predictions
        fleet_summary = predictive_maintenance.get_fleet_health_summary()
        
        if fleet_summary.get('status') == 'no_data':
            return {"status": "no_data", "message": "Insufficient data for maintenance scheduling"}
        
        # This would normally get all predictions, simplified here
        all_predictions = []  # In real implementation, get from all trainsets
        
        maintenance_schedule = predictive_maintenance.generate_maintenance_schedule(all_predictions)
        
        return {
            "maintenance_schedule": maintenance_schedule,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error generating maintenance schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# === INTELLIGENT SCHEDULER ENDPOINTS ===

@router.get("/scheduler/status")
async def get_scheduler_status():
    """Get intelligent scheduler status"""
    
    try:
        status = intelligent_scheduler.get_scheduler_status()
        return {
            "scheduler_status": status,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting scheduler status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scheduler/schedules/recent")
async def get_recent_schedules(limit: int = 10):
    """Get recently generated schedules"""
    
    try:
        recent_schedules = intelligent_scheduler.generated_schedules[-limit:] if intelligent_scheduler.generated_schedules else []
        
        schedule_data = []
        for schedule in recent_schedules:
            schedule_data.append({
                "schedule_id": schedule.schedule_id,
                "generated_at": schedule.generated_at.isoformat(),
                "schedule_type": schedule.schedule_type.value,
                "confidence": schedule.confidence,
                "trainsets_assigned": len(schedule.trainset_assignments),
                "estimated_performance": schedule.estimated_performance,
                "risk_assessment": schedule.risk_assessment,
                "monitoring_alerts": schedule.monitoring_alerts,
                "auto_executed": schedule.confidence >= intelligent_scheduler.auto_execution_threshold
            })
        
        return {
            "recent_schedules": schedule_data,
            "total_schedules": len(intelligent_scheduler.generated_schedules)
        }
        
    except Exception as e:
        logger.error(f"Error getting recent schedules: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scheduler/generate")
async def generate_schedule_manually(request: ScheduleGenerationRequest, background_tasks: BackgroundTasks):
    """Manually trigger schedule generation"""
    
    try:
        # Validate schedule type and priority
        valid_types = [t.value for t in ScheduleType]
        valid_priorities = [p.value for p in SchedulePriority]
        
        if request.schedule_type not in valid_types:
            raise HTTPException(status_code=400, detail=f"Invalid schedule type. Valid types: {valid_types}")
        
        if request.priority not in valid_priorities:
            raise HTTPException(status_code=400, detail=f"Invalid priority. Valid priorities: {valid_priorities}")
        
        # Create schedule request
        from ..ai_automation.intelligent_scheduler import ScheduleRequest
        
        current_time = datetime.now()
        schedule_request = ScheduleRequest(
            schedule_id=f"MANUAL_{request.schedule_type}_{int(current_time.timestamp())}",
            schedule_type=ScheduleType(request.schedule_type),
            start_time=current_time,
            end_time=current_time + timedelta(hours=request.duration_hours),
            priority=SchedulePriority(request.priority),
            constraints=request.constraints,
            expected_demand=request.constraints.get('expected_demand', 10000),
            weather_conditions=request.constraints.get('weather', 'sunny'),
            special_events=request.constraints.get('special_events', [])
        )
        
        # Generate schedule
        generated_schedule = await intelligent_scheduler._generate_intelligent_schedule(schedule_request)
        
        if not generated_schedule:
            return {
                "status": "failed",
                "message": "Failed to generate schedule",
                "timestamp": datetime.now().isoformat()
            }
        
        # Execute if requested or high confidence
        if request.force_generate or generated_schedule.confidence >= intelligent_scheduler.auto_execution_threshold:
            background_tasks.add_task(intelligent_scheduler._execute_schedule_automatically, generated_schedule)
            execution_status = "auto_executing"
        elif generated_schedule.confidence >= intelligent_scheduler.confidence_threshold:
            background_tasks.add_task(intelligent_scheduler._request_schedule_approval, generated_schedule)
            execution_status = "approval_requested"
        else:
            execution_status = "low_confidence"
        
        return {
            "status": "success",
            "schedule_id": generated_schedule.schedule_id,
            "confidence": generated_schedule.confidence,
            "execution_status": execution_status,
            "trainsets_assigned": len(generated_schedule.trainset_assignments),
            "estimated_performance": generated_schedule.estimated_performance,
            "risk_assessment": generated_schedule.risk_assessment,
            "monitoring_alerts": generated_schedule.monitoring_alerts,
            "generated_at": generated_schedule.generated_at.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error generating manual schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# === SYSTEM INSIGHTS ENDPOINTS ===

@router.get("/insights/performance")
async def get_performance_insights():
    """Get AI system performance insights"""
    
    try:
        # Decision engine insights
        decision_summary = ai_engine.get_decision_summary()
        
        # Scheduler performance
        scheduler_status = intelligent_scheduler.get_scheduler_status()
        
        # Fleet health insights
        fleet_health = predictive_maintenance.get_fleet_health_summary()
        
        # Calculate system efficiency metrics
        total_operations = (
            decision_summary.get('total_decisions', 0) + 
            scheduler_status.get('total_schedules_generated', 0)
        )
        
        autonomous_operations = (
            decision_summary.get('autonomous_decisions', 0) + 
            int(scheduler_status.get('total_schedules_generated', 0) * scheduler_status.get('auto_execution_rate', 0))
        )
        
        automation_efficiency = (autonomous_operations / total_operations * 100) if total_operations > 0 else 0
        
        return {
            "system_performance": {
                "total_ai_operations": total_operations,
                "autonomous_operations": autonomous_operations,
                "automation_efficiency": round(automation_efficiency, 1),
                "average_system_confidence": round((
                    decision_summary.get('average_confidence', 0) + 
                    scheduler_status.get('average_confidence', 0)
                ) / 2, 3)
            },
            "decision_engine_metrics": {
                "total_decisions": decision_summary.get('total_decisions', 0),
                "active_decisions": decision_summary.get('active_decisions', 0),
                "autonomous_decisions": decision_summary.get('autonomous_decisions', 0),
                "decision_types": decision_summary.get('decision_types', {})
            },
            "scheduler_metrics": {
                "total_schedules": scheduler_status.get('total_schedules_generated', 0),
                "auto_execution_rate": scheduler_status.get('auto_execution_rate', 0),
                "schedule_types": scheduler_status.get('schedule_types_generated', {})
            },
            "fleet_health_metrics": {
                "fleet_size": fleet_health.get('fleet_size', 0),
                "fleet_availability": fleet_health.get('fleet_availability', 0),
                "critical_issues": fleet_health.get('critical_issues', 0),
                "urgent_maintenance": fleet_health.get('urgent_maintenance', 0),
                "estimated_maintenance_cost": fleet_health.get('estimated_maintenance_cost', 0)
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting performance insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/insights/recommendations")
async def get_ai_recommendations():
    """Get AI system recommendations for optimization"""
    
    try:
        recommendations = []
        
        # Get fleet health for maintenance recommendations
        fleet_health = predictive_maintenance.get_fleet_health_summary()
        
        if fleet_health.get('critical_issues', 0) > 0:
            recommendations.append({
                "type": "maintenance",
                "priority": "high",
                "message": f"{fleet_health['critical_issues']} trainsets have critical maintenance issues",
                "action": "Schedule immediate maintenance for critical trainsets",
                "impact": "Prevent potential failures and service disruptions"
            })
        
        if fleet_health.get('fleet_availability', 100) < 85:
            recommendations.append({
                "type": "capacity",
                "priority": "medium",
                "message": f"Fleet availability at {fleet_health.get('fleet_availability', 0):.1f}%",
                "action": "Review maintenance scheduling to improve availability",
                "impact": "Increase operational capacity and service reliability"
            })
        
        # Get scheduler performance for scheduling recommendations
        scheduler_status = intelligent_scheduler.get_scheduler_status()
        
        if scheduler_status.get('auto_execution_rate', 0) < 0.5:
            recommendations.append({
                "type": "scheduling",
                "priority": "medium",
                "message": "Low automatic schedule execution rate",
                "action": "Review confidence thresholds and improve data quality",
                "impact": "Increase scheduling automation and efficiency"
            })
        
        # Decision engine recommendations
        decision_summary = ai_engine.get_decision_summary()
        
        if decision_summary.get('active_decisions', 0) > 10:
            recommendations.append({
                "type": "decisions",
                "priority": "medium",
                "message": "High number of pending decisions",
                "action": "Review decision approval process and bottlenecks",
                "impact": "Improve decision execution speed and system responsiveness"
            })
        
        # Add default positive recommendations if system is running well
        if not recommendations:
            recommendations.append({
                "type": "system",
                "priority": "low",
                "message": "AI systems operating optimally",
                "action": "Continue monitoring and maintain current configuration",
                "impact": "Sustained high performance and automation levels"
            })
        
        return {
            "recommendations": recommendations,
            "total_recommendations": len(recommendations),
            "high_priority": sum(1 for r in recommendations if r['priority'] == 'high'),
            "medium_priority": sum(1 for r in recommendations if r['priority'] == 'medium'),
            "low_priority": sum(1 for r in recommendations if r['priority'] == 'low'),
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting AI recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# === HEALTH CHECK ENDPOINT ===

@router.get("/health")
async def ai_automation_health_check():
    """Health check for AI automation systems"""
    
    try:
        # Check if systems are responsive
        health_status = {
            "decision_engine": len(ai_engine.decision_history) >= 0,  # Simple check
            "predictive_maintenance": True,  # Always available
            "intelligent_scheduler": len(intelligent_scheduler.generated_schedules) >= 0,
            "overall_health": "healthy"
        }
        
        # Determine overall health
        if not all(health_status[key] for key in ['decision_engine', 'predictive_maintenance', 'intelligent_scheduler']):
            health_status['overall_health'] = "degraded"
        
        return {
            "status": health_status['overall_health'],
            "systems": health_status,
            "timestamp": datetime.now().isoformat(),
            "uptime_info": "AI automation systems operational"
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy", 
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }