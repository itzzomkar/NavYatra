"""Optimization endpoints for KMRL AI Service"""

import uuid
from typing import List
from fastapi import APIRouter, HTTPException, BackgroundTasks
from loguru import logger

from ..models.optimization import (
    OptimizationRequest, 
    OptimizationResult, 
    TrainsetData,
    OptimizationJob,
    BulkOptimizationRequest
)
from ..optimization.engine import optimizer
from ..utils.config import get_settings, OPTIMIZATION_ALGORITHMS

router = APIRouter()
settings = get_settings()

# In-memory storage for demo (would use Redis/Database in production)
active_jobs = {}
completed_optimizations = {}

@router.post("/optimize", response_model=OptimizationResult)
async def optimize_schedule(
    request: OptimizationRequest,
    trainsets: List[TrainsetData]
):
    """
    Optimize train schedule based on given constraints and trainset data
    """
    try:
        logger.info(f"Starting optimization {request.optimization_id} with {len(trainsets)} trainsets")
        
        # Validate request
        if not trainsets:
            raise HTTPException(status_code=400, detail="No trainsets provided")
        
        if len(trainsets) > settings.MAX_TRAINSETS:
            raise HTTPException(
                status_code=400, 
                detail=f"Too many trainsets. Maximum allowed: {settings.MAX_TRAINSETS}"
            )
        
        # Run optimization
        result = await optimizer.optimize_schedule(request, trainsets)
        
        # Store result
        completed_optimizations[request.optimization_id] = result
        
        logger.info(f"Optimization {request.optimization_id} completed with score {result.score}")
        return result
        
    except Exception as e:
        logger.error(f"Optimization failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/optimize/async", response_model=OptimizationJob)
async def optimize_schedule_async(
    request: OptimizationRequest,
    trainsets: List[TrainsetData],
    background_tasks: BackgroundTasks
):
    """
    Start asynchronous optimization and return job ID for tracking
    """
    job_id = str(uuid.uuid4())
    
    # Create job entry
    job = OptimizationJob(
        job_id=job_id,
        optimization_id=request.optimization_id,
        status="pending",
        message="Optimization queued for processing"
    )
    
    active_jobs[job_id] = job
    
    # Add background task
    background_tasks.add_task(run_optimization_job, job_id, request, trainsets)
    
    logger.info(f"Queued optimization job {job_id}")
    return job

@router.get("/job/{job_id}", response_model=OptimizationJob)
async def get_optimization_job(job_id: str):
    """Get status of optimization job"""
    if job_id not in active_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return active_jobs[job_id]

@router.get("/result/{optimization_id}", response_model=OptimizationResult)
async def get_optimization_result(optimization_id: str):
    """Get completed optimization result"""
    if optimization_id not in completed_optimizations:
        raise HTTPException(status_code=404, detail="Optimization result not found")
    
    return completed_optimizations[optimization_id]

@router.get("/algorithms")
async def list_algorithms():
    """List available optimization algorithms"""
    return {
        "algorithms": OPTIMIZATION_ALGORITHMS,
        "default": "constraint_programming"
    }

@router.post("/validate")
async def validate_optimization_request(
    request: OptimizationRequest,
    trainsets: List[TrainsetData]
):
    """Validate optimization request without running optimization"""
    try:
        # Basic validation
        if not trainsets:
            raise HTTPException(status_code=400, detail="No trainsets provided")
        
        valid_trainsets = [ts for ts in trainsets if ts.fitness_valid and not ts.has_high_priority_jobs]
        
        validation_result = {
            "valid": True,
            "total_trainsets": len(trainsets),
            "eligible_trainsets": len(valid_trainsets),
            "max_assignable": min(request.max_trainsets, len(valid_trainsets)),
            "warnings": [],
            "errors": []
        }
        
        # Add warnings
        if len(valid_trainsets) < request.max_trainsets:
            validation_result["warnings"].append(
                f"Only {len(valid_trainsets)} trainsets are eligible out of {request.max_trainsets} requested"
            )
        
        expired_fitness = len([ts for ts in trainsets if not ts.fitness_valid])
        if expired_fitness > 0:
            validation_result["warnings"].append(
                f"{expired_fitness} trainsets have invalid fitness certificates"
            )
        
        high_priority_jobs = len([ts for ts in trainsets if ts.has_high_priority_jobs])
        if high_priority_jobs > 0:
            validation_result["warnings"].append(
                f"{high_priority_jobs} trainsets have high priority maintenance jobs"
            )
        
        return validation_result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/simulate")
async def simulate_optimization(
    request: OptimizationRequest,
    trainsets: List[TrainsetData]
):
    """
    Run a quick simulation to estimate optimization results
    This is faster than full optimization, useful for what-if analysis
    """
    try:
        # Create a simplified request for faster processing
        sim_request = request.copy()
        sim_request.timeout_seconds = min(10, request.timeout_seconds)
        sim_request.parameters = {"quick_mode": True, **request.parameters}
        
        # Run optimization with reduced parameters
        result = await optimizer.optimize_schedule(sim_request, trainsets)
        
        # Mark as simulation
        result.explanation["simulation"] = True
        result.explanation["note"] = "This is a simulation with reduced computation time"
        
        return {
            "simulation": True,
            "estimated_score": result.score,
            "estimated_assignments": len(result.trainset_assignments),
            "execution_time": result.execution_time,
            "full_result": result
        }
        
    except Exception as e:
        logger.error(f"Simulation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def run_optimization_job(job_id: str, request: OptimizationRequest, trainsets: List[TrainsetData]):
    """Background task to run optimization"""
    try:
        # Update job status
        active_jobs[job_id].status = "running"
        active_jobs[job_id].message = "Optimization in progress"
        active_jobs[job_id].progress = 10.0
        
        logger.info(f"Starting background optimization job {job_id}")
        
        # Run optimization
        result = await optimizer.optimize_schedule(request, trainsets)
        
        # Update job with result
        active_jobs[job_id].status = "completed"
        active_jobs[job_id].progress = 100.0
        active_jobs[job_id].message = "Optimization completed successfully"
        active_jobs[job_id].result = result
        
        # Store completed result
        completed_optimizations[request.optimization_id] = result
        
        logger.info(f"Completed background optimization job {job_id}")
        
    except Exception as e:
        # Update job with error
        active_jobs[job_id].status = "failed"
        active_jobs[job_id].message = f"Optimization failed: {str(e)}"
        
        logger.error(f"Background optimization job {job_id} failed: {e}")

@router.delete("/job/{job_id}")
async def cancel_optimization_job(job_id: str):
    """Cancel a running optimization job"""
    if job_id not in active_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = active_jobs[job_id]
    if job.status == "completed":
        raise HTTPException(status_code=400, detail="Cannot cancel completed job")
    
    job.status = "cancelled"
    job.message = "Job cancelled by user"
    
    return {"message": "Job cancelled successfully"}

@router.get("/stats")
async def get_optimization_stats():
    """Get optimization statistics"""
    total_jobs = len(active_jobs)
    completed_jobs = len(completed_optimizations)
    
    active_count = len([j for j in active_jobs.values() if j.status == "running"])
    failed_count = len([j for j in active_jobs.values() if j.status == "failed"])
    
    return {
        "total_jobs": total_jobs,
        "completed_jobs": completed_jobs,
        "active_jobs": active_count,
        "failed_jobs": failed_count,
        "success_rate": (completed_jobs / max(total_jobs, 1)) * 100,
        "average_score": 0.85,  # Would calculate from actual results
        "algorithms_used": {
            "constraint_programming": 60,
            "genetic_algorithm": 30,
            "simulated_annealing": 10
        }
    }

# Backend-compatible endpoints
@router.post("/schedule")
async def optimize_train_schedule(request: dict):
    """Backend-compatible schedule optimization endpoint"""
    try:
        logger.info("Received schedule optimization request from backend")
        
        # Extract data from backend request format
        trainsets_data = request.get("trainsetsData", [])
        constraints = request.get("constraints", {})
        parameters = request.get("parameters", {})
        preferences = request.get("preferences", {})
        
        if not trainsets_data:
            raise HTTPException(status_code=400, detail="No trainsets data provided")
        
        optimization_id = str(uuid.uuid4())
        
        # Convert backend trainsets data to AI service format
        converted_trainsets = []
        for ts in trainsets_data:
            # Extract fitness information
            fitness_records = ts.get("fitnessRecords", [])
            fitness_valid = len(fitness_records) > 0 and fitness_records[0].get("status") == "VALID"
            fitness_expiry = None
            if fitness_records:
                fitness_expiry = fitness_records[0].get("expiryDate")
            
            # Extract job card information
            job_cards = ts.get("jobCards", [])
            pending_jobs = len(job_cards)
            high_priority_jobs = len([jc for jc in job_cards if jc.get("priority") in ["HIGH", "CRITICAL", "EMERGENCY"]])
            
            # Extract branding information
            branding_records = ts.get("brandingRecords", [])
            branding_priority = 1
            branding_revenue = 0.0
            if branding_records:
                branding_priority = branding_records[0].get("priority", 1)
                branding_revenue = branding_records[0].get("dailyRevenue", 0.0)
            
            # Extract maintenance information
            maintenance_records = ts.get("maintenanceRecords", [])
            days_since_maintenance = 0
            maintenance_score = 1.0
            if maintenance_records:
                from datetime import datetime
                last_maintenance = maintenance_records[0].get("performedAt")
                if last_maintenance:
                    try:
                        last_date = datetime.fromisoformat(last_maintenance.replace('Z', '+00:00'))
                        days_since_maintenance = (datetime.now() - last_date).days
                        maintenance_score = max(0.1, 1.0 - (days_since_maintenance / 90.0))
                    except:
                        pass
            
            # Extract mileage information
            mileage_records = ts.get("mileageRecords", [])
            average_daily_mileage = 0.0
            if mileage_records:
                total_mileage = sum([mr.get("distance", 0) for mr in mileage_records[-7:]])
                average_daily_mileage = total_mileage / min(7, len(mileage_records))
            
            converted_trainset = TrainsetData(
                trainset_id=ts.get("id", ""),
                trainset_number=ts.get("trainsetNumber", ""),
                manufacturer=ts.get("manufacturer", "Unknown"),
                model=ts.get("model", "Unknown"),
                capacity=ts.get("capacity", 200),
                current_mileage=ts.get("currentMileage", 0.0),
                total_mileage=ts.get("totalMileage", 0.0),
                status=ts.get("status", "AVAILABLE"),
                location=ts.get("location"),
                depot=ts.get("depot", "Muttom"),
                fitness_valid=fitness_valid,
                fitness_expiry_date=fitness_expiry,
                fitness_status="VALID" if fitness_valid else "EXPIRED",
                pending_job_cards=pending_jobs,
                high_priority_jobs=high_priority_jobs,
                has_high_priority_jobs=high_priority_jobs > 0,
                branding_priority=min(max(1, branding_priority), 5),
                branding_revenue_potential=branding_revenue,
                current_branding_campaigns=len(branding_records),
                days_since_last_maintenance=days_since_maintenance,
                maintenance_score=maintenance_score,
                average_daily_mileage=average_daily_mileage,
                energy_efficiency_score=0.8 + (ts.get("currentMileage", 0) / 1000000) * 0.1,  # Mock calculation
                reliability_score=max(0.7, maintenance_score)
            )
            converted_trainsets.append(converted_trainset)
        
        # Create optimization request
        opt_constraints = OptimizationConstraints(
            require_valid_fitness=constraints.get("fitnessRequired", True),
            exclude_high_priority_jobs=constraints.get("priorityJobCards", True),
            mileage_balance_weight=0.6 if constraints.get("mileageBalancing", True) else 0.0,
            branding_priority_weight=0.3 if constraints.get("brandingOptimization", True) else 0.0,
            energy_efficiency_weight=0.4,
            max_trainsets_to_assign=min(parameters.get("optimizationWindow", 20), 20)
        )
        
        opt_request = OptimizationRequest(
            optimization_id=optimization_id,
            schedule_date=datetime.now(),
            max_trainsets=min(len(converted_trainsets), 20),
            timeout_seconds=parameters.get("maxIterations", 30),
            constraints=opt_constraints,
            parameters={
                "convergence_threshold": parameters.get("convergenceThreshold", 0.001),
                "preference_weights": preferences.get("preferenceWeights", {})
            }
        )
        
        # Run optimization
        result = await optimizer.optimize_schedule(opt_request, converted_trainsets)
        
        # Convert result to backend format
        recommendations = []
        for trainset_id, position in result.trainset_assignments.items():
            trainset = next((ts for ts in converted_trainsets if ts.trainset_id == trainset_id), None)
            if trainset:
                assignment = {
                    "trainsetId": trainset_id,
                    "trainsetNumber": trainset.trainset_number,
                    "assignments": {
                        "inductionSlot": f"Slot-{position:02d}",
                        "stablingPosition": f"Position-{position}",
                        "cleaningSlot": f"Clean-{(position % 5) + 1}" if position % 3 == 0 else None,
                        "maintenanceWindow": None,
                        "brandingPriority": trainset.branding_priority
                    },
                    "reasons": result.reasoning.get(trainset_id, ["Optimized assignment"]),
                    "confidence": min(result.score + 0.1, 0.95)
                }
                recommendations.append(assignment)
        
        backend_result = {
            "id": optimization_id,
            "status": "COMPLETED",
            "executionTime": result.execution_time,
            "optimizationScore": result.score,
            "recommendations": recommendations,
            "constraints_satisfied": len(result.constraint_violations) == 0,
            "violations": list(result.constraint_violations.keys()) if result.constraint_violations else [],
            "metadata": {
                "algorithm": result.algorithm,
                "convergence_iterations": result.parameters.get("iterations", 100),
                "solution_quality": result.score,
                "confidence_score": result.score
            }
        }
        
        # Store result
        completed_optimizations[optimization_id] = result
        
        logger.info(f"Schedule optimization completed: {optimization_id}, score: {result.score}")
        return backend_result
        
    except Exception as e:
        logger.error(f"Schedule optimization failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{optimization_id}")
async def get_optimization_status_backend(optimization_id: str):
    """Backend-compatible optimization status endpoint"""
    if optimization_id in completed_optimizations:
        result = completed_optimizations[optimization_id]
        return {
            "id": optimization_id,
            "status": "COMPLETED",
            "optimizationScore": result.score,
            "executionTime": result.execution_time,
            "metadata": {
                "algorithm": result.algorithm,
                "solution_quality": result.score
            }
        }
    
    # Check active jobs
    for job in active_jobs.values():
        if job.optimization_id == optimization_id:
            return {
                "id": optimization_id,
                "status": job.status.upper(),
                "progress": job.progress,
                "message": job.message
            }
    
    raise HTTPException(status_code=404, detail="Optimization not found")

@router.get("/history")
async def get_optimization_history_backend(limit: int = 10):
    """Backend-compatible optimization history endpoint"""
    history = []
    for opt_id, result in list(completed_optimizations.items())[-limit:]:
        history.append({
            "id": opt_id,
            "score": result.score,
            "executionTime": result.execution_time,
            "algorithm": result.algorithm,
            "createdAt": result.created_at.isoformat(),
            "trainsetCount": len(result.trainset_assignments)
        })
    
    return history
