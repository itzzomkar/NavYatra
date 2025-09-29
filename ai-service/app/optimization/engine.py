"""
KMRL Train Scheduling Optimization Engine
Uses OR-Tools for constraint satisfaction and multi-objective optimization
"""

import time
import asyncio
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from datetime import datetime, timedelta
import numpy as np
from loguru import logger

from ortools.sat.python import cp_model
from ortools.linear_solver import pywraplp

from ..utils.config import get_settings, SCHEDULING_CONSTRAINTS
from ..models.optimization import OptimizationRequest, OptimizationResult, TrainsetData


@dataclass
class OptimizationSolution:
    """Represents a single optimization solution"""
    trainset_assignments: Dict[str, int]  # trainset_id -> position
    score: float
    constraint_violations: Dict[str, int]
    execution_time: float
    algorithm_used: str
    reasoning: Dict[str, str]


class SchedulingOptimizer:
    """Main optimization engine for train scheduling"""
    
    def __init__(self):
        self.settings = get_settings()
        self.constraints = SCHEDULING_CONSTRAINTS
        
    async def optimize_schedule(
        self,
        request: OptimizationRequest,
        trainsets: List[TrainsetData]
    ) -> OptimizationResult:
        """
        Main optimization method that coordinates different algorithms
        """
        start_time = time.time()
        logger.info(f"Starting optimization with {len(trainsets)} trainsets")
        
        try:
            # Validate input data
            self._validate_input(request, trainsets)
            
            # Choose optimization algorithm based on request
            algorithm = request.algorithm or "constraint_programming"
            
            if algorithm == "constraint_programming":
                solution = await self._solve_with_cp_sat(request, trainsets)
            elif algorithm == "genetic_algorithm":
                solution = await self._solve_with_genetic_algorithm(request, trainsets)
            elif algorithm == "simulated_annealing":
                solution = await self._solve_with_simulated_annealing(request, trainsets)
            else:
                solution = await self._solve_with_cp_sat(request, trainsets)
            
            execution_time = time.time() - start_time
            
            # Generate explanation for the solution
            explanation = self._generate_explanation(solution, trainsets)
            
            result = OptimizationResult(
                optimization_id=request.optimization_id,
                algorithm=algorithm,
                score=solution.score,
                execution_time=execution_time,
                trainset_assignments=solution.trainset_assignments,
                constraint_violations=solution.constraint_violations,
                explanation=explanation,
                alternative_solutions=[],
                parameters=request.parameters,
                status="completed" if solution.score > 0 else "failed"
            )
            
            logger.info(f"Optimization completed in {execution_time:.2f}s with score {solution.score:.3f}")
            return result
            
        except Exception as e:
            logger.error(f"Optimization failed: {e}")
            execution_time = time.time() - start_time
            
            return OptimizationResult(
                optimization_id=request.optimization_id,
                algorithm=algorithm,
                score=0.0,
                execution_time=execution_time,
                trainset_assignments={},
                constraint_violations={},
                explanation={"error": str(e)},
                alternative_solutions=[],
                parameters=request.parameters,
                status="failed"
            )
    
    async def _solve_with_cp_sat(
        self,
        request: OptimizationRequest,
        trainsets: List[TrainsetData]
    ) -> OptimizationSolution:
        """Solve using OR-Tools CP-SAT solver"""
        
        model = cp_model.CpModel()
        
        # Decision variables: trainset_vars[i][j] = 1 if trainset i is assigned to position j
        num_trainsets = len(trainsets)
        max_positions = min(request.max_trainsets, self.settings.MAX_STABLING_POSITIONS)
        
        trainset_vars = {}
        position_vars = {}
        
        for i, trainset in enumerate(trainsets):
            trainset_vars[trainset.trainset_id] = {}
            for j in range(max_positions):
                var_name = f"trainset_{trainset.trainset_id}_pos_{j}"
                trainset_vars[trainset.trainset_id][j] = model.NewBoolVar(var_name)
        
        # Each trainset can be assigned to at most one position
        for trainset in trainsets:
            model.Add(
                sum(trainset_vars[trainset.trainset_id][j] for j in range(max_positions)) <= 1
            )
        
        # Each position can have at most one trainset
        for j in range(max_positions):
            model.Add(
                sum(trainset_vars[trainset.trainset_id][j] for trainset in trainsets) <= 1
            )
        
        # Fitness certificate constraint (hard constraint)
        for trainset in trainsets:
            if not trainset.fitness_valid:
                for j in range(max_positions):
                    model.Add(trainset_vars[trainset.trainset_id][j] == 0)
        
        # Job card constraint (high priority jobs prevent assignment)
        for trainset in trainsets:
            if trainset.has_high_priority_jobs:
                for j in range(max_positions):
                    model.Add(trainset_vars[trainset.trainset_id][j] == 0)
        
        # Objective function: maximize overall score
        objective_terms = []
        
        for trainset in trainsets:
            for j in range(max_positions):
                # Base score for assignment
                base_score = 100
                
                # Fitness certificate bonus
                if trainset.fitness_valid:
                    base_score += 50
                
                # Mileage balance bonus (prefer trainsets with lower mileage)
                mileage_bonus = max(0, 50 - int(trainset.current_mileage / 1000))
                base_score += mileage_bonus
                
                # Branding priority bonus
                branding_bonus = trainset.branding_priority * 10
                base_score += branding_bonus
                
                # Position preference (some positions are better)
                position_bonus = max(0, 20 - j)  # Earlier positions are preferred
                base_score += position_bonus
                
                objective_terms.append(
                    base_score * trainset_vars[trainset.trainset_id][j]
                )
        
        model.Maximize(sum(objective_terms))
        
        # Solve the model
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = self.settings.ORTOOLS_TIME_LIMIT
        solver.parameters.num_search_workers = self.settings.ORTOOLS_THREADS
        
        status = solver.Solve(model)
        
        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            # Extract solution
            assignments = {}
            total_score = 0
            
            for trainset in trainsets:
                for j in range(max_positions):
                    if solver.Value(trainset_vars[trainset.trainset_id][j]) == 1:
                        assignments[trainset.trainset_id] = j
                        break
            
            # Calculate actual score
            total_score = self._calculate_solution_score(assignments, trainsets)
            
            # Generate reasoning
            reasoning = self._generate_reasoning(assignments, trainsets)
            
            return OptimizationSolution(
                trainset_assignments=assignments,
                score=total_score,
                constraint_violations={},
                execution_time=solver.WallTime(),
                algorithm_used="constraint_programming",
                reasoning=reasoning
            )
        
        else:
            logger.warning(f"CP-SAT solver status: {status}")
            return OptimizationSolution(
                trainset_assignments={},
                score=0.0,
                constraint_violations={"solver_status": status},
                execution_time=solver.WallTime(),
                algorithm_used="constraint_programming",
                reasoning={"error": "No feasible solution found"}
            )
    
    async def _solve_with_genetic_algorithm(
        self,
        request: OptimizationRequest,
        trainsets: List[TrainsetData]
    ) -> OptimizationSolution:
        """Solve using genetic algorithm"""
        
        # Simple genetic algorithm implementation
        population_size = request.parameters.get("population_size", 100)
        generations = request.parameters.get("generations", 1000)
        mutation_rate = request.parameters.get("mutation_rate", 0.1)
        
        # Initialize population
        population = []
        max_positions = min(request.max_trainsets, self.settings.MAX_STABLING_POSITIONS)
        
        for _ in range(population_size):
            # Create random assignment
            available_positions = list(range(max_positions))
            assignment = {}
            
            for trainset in trainsets:
                if available_positions and trainset.fitness_valid and not trainset.has_high_priority_jobs:
                    if np.random.random() > 0.3:  # 70% chance to assign
                        pos = np.random.choice(available_positions)
                        assignment[trainset.trainset_id] = pos
                        available_positions.remove(pos)
            
            population.append(assignment)
        
        best_solution = None
        best_score = -float('inf')
        
        for generation in range(generations):
            # Evaluate population
            scored_population = []
            for assignment in population:
                score = self._calculate_solution_score(assignment, trainsets)
                scored_population.append((assignment, score))
                
                if score > best_score:
                    best_score = score
                    best_solution = assignment
            
            # Selection and reproduction (simplified)
            scored_population.sort(key=lambda x: x[1], reverse=True)
            elite_size = population_size // 10
            new_population = [sol[0] for sol in scored_population[:elite_size]]
            
            # Generate offspring
            while len(new_population) < population_size:
                parent1 = scored_population[np.random.randint(0, elite_size * 2)][0]
                parent2 = scored_population[np.random.randint(0, elite_size * 2)][0]
                
                # Simple crossover
                child = {}
                all_trainsets = set(parent1.keys()) | set(parent2.keys())
                used_positions = set()
                
                for trainset_id in all_trainsets:
                    if np.random.random() < 0.5 and trainset_id in parent1:
                        if parent1[trainset_id] not in used_positions:
                            child[trainset_id] = parent1[trainset_id]
                            used_positions.add(parent1[trainset_id])
                    elif trainset_id in parent2:
                        if parent2[trainset_id] not in used_positions:
                            child[trainset_id] = parent2[trainset_id]
                            used_positions.add(parent2[trainset_id])
                
                # Mutation
                if np.random.random() < mutation_rate:
                    # Random mutation
                    if child:
                        trainset_to_mutate = np.random.choice(list(child.keys()))
                        available_pos = [p for p in range(max_positions) if p not in used_positions]
                        if available_pos:
                            old_pos = child[trainset_to_mutate]
                            new_pos = np.random.choice(available_pos)
                            child[trainset_to_mutate] = new_pos
                
                new_population.append(child)
            
            population = new_population
        
        if best_solution:
            reasoning = self._generate_reasoning(best_solution, trainsets)
            return OptimizationSolution(
                trainset_assignments=best_solution,
                score=best_score,
                constraint_violations={},
                execution_time=0.0,
                algorithm_used="genetic_algorithm",
                reasoning=reasoning
            )
        else:
            return OptimizationSolution(
                trainset_assignments={},
                score=0.0,
                constraint_violations={"error": "No solution found"},
                execution_time=0.0,
                algorithm_used="genetic_algorithm",
                reasoning={"error": "Genetic algorithm failed to find solution"}
            )
    
    async def _solve_with_simulated_annealing(
        self,
        request: OptimizationRequest,
        trainsets: List[TrainsetData]
    ) -> OptimizationSolution:
        """Solve using simulated annealing"""
        
        # Generate initial solution
        max_positions = min(request.max_trainsets, self.settings.MAX_STABLING_POSITIONS)
        current_solution = {}
        available_positions = list(range(max_positions))
        
        # Create initial random solution
        for trainset in trainsets:
            if available_positions and trainset.fitness_valid and not trainset.has_high_priority_jobs:
                if np.random.random() > 0.3:
                    pos = np.random.choice(available_positions)
                    current_solution[trainset.trainset_id] = pos
                    available_positions.remove(pos)
        
        current_score = self._calculate_solution_score(current_solution, trainsets)
        best_solution = current_solution.copy()
        best_score = current_score
        
        # Simulated annealing parameters
        initial_temp = request.parameters.get("initial_temperature", 100.0)
        cooling_rate = request.parameters.get("cooling_rate", 0.95)
        min_temp = request.parameters.get("min_temperature", 0.01)
        max_iterations = request.parameters.get("max_iterations", 10000)
        
        temperature = initial_temp
        
        for iteration in range(max_iterations):
            if temperature < min_temp:
                break
            
            # Generate neighbor solution
            neighbor_solution = current_solution.copy()
            
            # Random modification
            if neighbor_solution:
                modification_type = np.random.choice(['swap', 'move', 'add', 'remove'])
                
                if modification_type == 'swap' and len(neighbor_solution) >= 2:
                    # Swap two trainsets
                    trainsets_to_swap = np.random.choice(list(neighbor_solution.keys()), 2, replace=False)
                    pos1 = neighbor_solution[trainsets_to_swap[0]]
                    pos2 = neighbor_solution[trainsets_to_swap[1]]
                    neighbor_solution[trainsets_to_swap[0]] = pos2
                    neighbor_solution[trainsets_to_swap[1]] = pos1
                
                elif modification_type == 'move':
                    # Move one trainset to different position
                    trainset_to_move = np.random.choice(list(neighbor_solution.keys()))
                    old_pos = neighbor_solution[trainset_to_move]
                    used_positions = set(neighbor_solution.values())
                    available_pos = [p for p in range(max_positions) if p not in used_positions or p == old_pos]
                    if len(available_pos) > 1:
                        new_pos = np.random.choice([p for p in available_pos if p != old_pos])
                        neighbor_solution[trainset_to_move] = new_pos
            
            neighbor_score = self._calculate_solution_score(neighbor_solution, trainsets)
            
            # Accept or reject the neighbor
            delta = neighbor_score - current_score
            
            if delta > 0 or np.random.random() < np.exp(delta / temperature):
                current_solution = neighbor_solution
                current_score = neighbor_score
                
                if current_score > best_score:
                    best_solution = current_solution.copy()
                    best_score = current_score
            
            temperature *= cooling_rate
        
        reasoning = self._generate_reasoning(best_solution, trainsets)
        
        return OptimizationSolution(
            trainset_assignments=best_solution,
            score=best_score,
            constraint_violations={},
            execution_time=0.0,
            algorithm_used="simulated_annealing",
            reasoning=reasoning
        )
    
    def _calculate_solution_score(
        self,
        assignments: Dict[str, int],
        trainsets: List[TrainsetData]
    ) -> float:
        """Calculate the quality score of a solution"""
        
        total_score = 0.0
        trainset_dict = {ts.trainset_id: ts for ts in trainsets}
        
        for trainset_id, position in assignments.items():
            trainset = trainset_dict.get(trainset_id)
            if not trainset:
                continue
            
            # Base assignment score
            score = 100.0
            
            # Fitness certificate (mandatory)
            if not trainset.fitness_valid:
                score -= 1000  # Heavy penalty
            else:
                score += 50
            
            # Job cards penalty
            if trainset.has_high_priority_jobs:
                score -= 500  # Heavy penalty
            
            # Mileage balancing
            avg_mileage = np.mean([ts.current_mileage for ts in trainsets])
            mileage_diff = abs(trainset.current_mileage - avg_mileage)
            mileage_score = max(0, 100 - mileage_diff / 1000)
            score += mileage_score * self.constraints["mileage_balance"]["weight"]
            
            # Branding priority
            branding_score = trainset.branding_priority * 20
            score += branding_score * self.constraints["branding_priority"]["weight"]
            
            # Position preference (earlier positions are better)
            position_score = max(0, 50 - position * 2)
            score += position_score
            
            total_score += score
        
        return total_score
    
    def _generate_reasoning(
        self,
        assignments: Dict[str, int],
        trainsets: List[TrainsetData]
    ) -> Dict[str, str]:
        """Generate human-readable reasoning for assignments"""
        
        reasoning = {}
        trainset_dict = {ts.trainset_id: ts for ts in trainsets}
        
        for trainset_id, position in assignments.items():
            trainset = trainset_dict.get(trainset_id)
            if not trainset:
                continue
            
            reasons = []
            
            if trainset.fitness_valid:
                reasons.append("Valid fitness certificate")
            else:
                reasons.append("⚠️ Invalid fitness certificate")
            
            if not trainset.has_high_priority_jobs:
                reasons.append("No pending high-priority maintenance")
            else:
                reasons.append("⚠️ Has high-priority job cards")
            
            if trainset.branding_priority > 3:
                reasons.append(f"High branding priority ({trainset.branding_priority})")
            
            avg_mileage = np.mean([ts.current_mileage for ts in trainsets])
            if trainset.current_mileage < avg_mileage * 0.9:
                reasons.append("Low mileage - suitable for service")
            elif trainset.current_mileage > avg_mileage * 1.1:
                reasons.append("High mileage - consider for maintenance")
            
            reasons.append(f"Assigned to position {position + 1}")
            
            reasoning[trainset_id] = "; ".join(reasons)
        
        return reasoning
    
    def _generate_explanation(
        self,
        solution: OptimizationSolution,
        trainsets: List[TrainsetData]
    ) -> Dict[str, Any]:
        """Generate detailed explanation of the optimization result"""
        
        assigned_count = len(solution.trainset_assignments)
        total_trainsets = len(trainsets)
        
        explanation = {
            "summary": f"Assigned {assigned_count} out of {total_trainsets} trainsets",
            "algorithm": solution.algorithm_used,
            "score": round(solution.score, 2),
            "assignments": solution.trainset_assignments,
            "reasoning": solution.reasoning,
            "constraints_satisfied": {
                "fitness_certificates": sum(1 for ts in trainsets if ts.trainset_id in solution.trainset_assignments and ts.fitness_valid),
                "no_high_priority_jobs": sum(1 for ts in trainsets if ts.trainset_id in solution.trainset_assignments and not ts.has_high_priority_jobs),
                "total_assigned": assigned_count
            }
        }
        
        return explanation
    
    def _validate_input(
        self,
        request: OptimizationRequest,
        trainsets: List[TrainsetData]
    ) -> None:
        """Validate optimization request and trainset data"""
        
        if not trainsets:
            raise ValueError("No trainsets provided for optimization")
        
        if request.max_trainsets <= 0:
            raise ValueError("max_trainsets must be positive")
        
        if request.max_trainsets > self.settings.MAX_STABLING_POSITIONS:
            raise ValueError(f"max_trainsets cannot exceed {self.settings.MAX_STABLING_POSITIONS}")
        
        # Validate trainset data
        for trainset in trainsets:
            if not trainset.trainset_id:
                raise ValueError("trainset_id cannot be empty")
            
            if trainset.current_mileage < 0:
                raise ValueError(f"Invalid mileage for trainset {trainset.trainset_id}")


# Global optimizer instance
optimizer = SchedulingOptimizer()
