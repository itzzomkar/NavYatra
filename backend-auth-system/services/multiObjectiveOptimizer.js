const mongoose = require('mongoose');

/**
 * Multi-Objective Optimization Engine for KMRL Train Induction
 * 
 * Implements advanced optimization algorithms to handle the six interdependent variables:
 * 1. Fitness Certificates
 * 2. Job-Card Status  
 * 3. Branding Priorities
 * 4. Mileage Balancing
 * 5. Cleaning & Detailing Slots
 * 6. Stabling Geometry
 */
class MultiObjectiveOptimizer {
  constructor() {
    this.objectives = {
      SERVICE_READINESS: { weight: 0.30, priority: 'HIGH' },
      RELIABILITY: { weight: 0.25, priority: 'HIGH' },
      COST_EFFICIENCY: { weight: 0.20, priority: 'MEDIUM' },
      BRANDING_EXPOSURE: { weight: 0.15, priority: 'MEDIUM' },
      ENERGY_EFFICIENCY: { weight: 0.10, priority: 'LOW' }
    };
    
    this.constraints = {
      MIN_TRAINSETS: 15,
      MAX_TRAINSETS: 25,
      FITNESS_VALIDITY_DAYS: 7,
      MAINTENANCE_WINDOW_HOURS: 4,
      CLEANING_CYCLE_DAYS: 7
    };
    
    this.optimizationHistory = new Map();
  }

  /**
   * Main optimization function using NSGA-II (Non-dominated Sorting Genetic Algorithm)
   */
  async optimizeInductionSchedule(trainsets, context, preferences = {}) {
    try {
      console.log('🎯 Starting multi-objective optimization...');
      
      // Initialize population
      const population = this.initializePopulation(trainsets, context);
      
      // Run NSGA-II algorithm
      const generations = preferences.generations || 100;
      const populationSize = preferences.populationSize || 50;
      
      let currentPopulation = population;
      
      for (let generation = 0; generation < generations; generation++) {
        // Evaluate fitness for all individuals
        const evaluatedPopulation = await this.evaluatePopulation(currentPopulation, context);
        
        // Non-dominated sorting
        const fronts = this.nonDominatedSorting(evaluatedPopulation);
        
        // Crowding distance calculation
        const crowdedPopulation = this.calculateCrowdingDistance(fronts);
        
        // Selection, crossover, and mutation
        currentPopulation = this.evolvePopulation(crowdedPopulation, populationSize);
        
        // Log progress
        if (generation % 20 === 0) {
          console.log(`Generation ${generation}: Best fitness = ${this.getBestFitness(evaluatedPopulation)}`);
        }
      }
      
      // Final evaluation and ranking
      const finalPopulation = await this.evaluatePopulation(currentPopulation, context);
      const rankedSolutions = this.rankSolutions(finalPopulation);
      
      // Generate optimization report
      const report = this.generateOptimizationReport(rankedSolutions, context);
      
      return {
        solutions: rankedSolutions,
        report,
        metadata: {
          algorithm: 'NSGA-II',
          generations,
          populationSize,
          timestamp: new Date()
        }
      };
      
    } catch (error) {
      console.error('❌ Multi-objective optimization error:', error);
      throw new Error(`Optimization failed: ${error.message}`);
    }
  }

  /**
   * Initialize population with random solutions
   */
  initializePopulation(trainsets, context) {
    const population = [];
    const populationSize = 50;
    
    for (let i = 0; i < populationSize; i++) {
      const solution = this.generateRandomSolution(trainsets, context);
      population.push(solution);
    }
    
    return population;
  }

  /**
   * Generate a random solution (induction schedule)
   */
  generateRandomSolution(trainsets, context) {
    const solution = {
      id: `SOL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      selectedTrainsets: [],
      schedule: [],
      objectives: {},
      constraints: {},
      violations: [],
      fitness: 0
    };
    
    // Randomly select trainsets for induction
    const availableTrainsets = trainsets.filter(t => this.isEligibleForInduction(t, context));
    const numToSelect = Math.min(
      Math.floor(Math.random() * (this.constraints.MAX_TRAINSETS - this.constraints.MIN_TRAINSETS + 1)) + this.constraints.MIN_TRAINSETS,
      availableTrainsets.length
    );
    
    const shuffled = availableTrainsets.sort(() => 0.5 - Math.random());
    solution.selectedTrainsets = shuffled.slice(0, numToSelect);
    
    // Generate schedule for selected trainsets
    solution.schedule = this.generateSchedule(solution.selectedTrainsets, context);
    
    return solution;
  }

  /**
   * Check if a trainset is eligible for induction
   */
  isEligibleForInduction(trainset, context) {
    // Check fitness certificate
    const fitnessValid = this.checkFitnessValidity(trainset, context);
    
    // Check job card status
    const jobCardsClear = this.checkJobCardStatus(trainset, context);
    
    // Check maintenance status
    const maintenanceClear = this.checkMaintenanceStatus(trainset, context);
    
    return fitnessValid && jobCardsClear && maintenanceClear;
  }

  /**
   * Check fitness certificate validity
   */
  checkFitnessValidity(trainset, context) {
    const fitness = context.fitnessRecords?.find(f => f.trainsetId.toString() === trainset._id.toString());
    if (!fitness) return false;
    
    const daysToExpiry = Math.ceil((new Date(fitness.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    return daysToExpiry > this.constraints.FITNESS_VALIDITY_DAYS;
  }

  /**
   * Check job card status
   */
  checkJobCardStatus(trainset, context) {
    const jobCards = context.jobCards?.filter(jc => jc.trainsetId?.toString() === trainset._id.toString()) || [];
    const criticalJobs = jobCards.filter(jc => jc.priority === 'CRITICAL' && jc.status !== 'COMPLETED');
    return criticalJobs.length === 0;
  }

  /**
   * Check maintenance status
   */
  checkMaintenanceStatus(trainset, context) {
    const lastMaintenance = new Date(trainset.lastMaintenanceDate);
    const daysSinceMaintenance = Math.ceil((new Date() - lastMaintenance) / (1000 * 60 * 60 * 24));
    return daysSinceMaintenance < 30; // Assume maintenance valid for 30 days
  }

  /**
   * Generate schedule for selected trainsets
   */
  generateSchedule(selectedTrainsets, context) {
    const schedule = [];
    const shift = context.shift || 'MORNING';
    
    selectedTrainsets.forEach((trainset, index) => {
      schedule.push({
        trainsetId: trainset._id,
        trainsetNumber: trainset.trainsetNumber,
        position: index + 1,
        route: this.assignRoute(trainset, context),
        startTime: this.calculateStartTime(index, shift),
        endTime: this.calculateEndTime(index, shift),
        priority: this.calculatePriority(trainset, context)
      });
    });
    
    return schedule;
  }

  /**
   * Assign route to trainset
   */
  assignRoute(trainset, context) {
    // Simple route assignment logic
    const routes = ['ALWAYS_TO_MAHARAJAS', 'MAHARAJAS_TO_ALUVA', 'ALUVA_TO_MAHARAJAS'];
    return routes[Math.floor(Math.random() * routes.length)];
  }

  /**
   * Calculate start time for trainset
   */
  calculateStartTime(index, shift) {
    const baseTime = shift === 'MORNING' ? 6 : shift === 'AFTERNOON' ? 12 : 18;
    return `${String(baseTime + index).padStart(2, '0')}:00`;
  }

  /**
   * Calculate end time for trainset
   */
  calculateEndTime(index, shift) {
    const baseTime = shift === 'MORNING' ? 6 : shift === 'AFTERNOON' ? 12 : 18;
    return `${String(baseTime + index + 8).padStart(2, '0')}:00`;
  }

  /**
   * Calculate priority for trainset
   */
  calculatePriority(trainset, context) {
    let priority = 50; // Base priority
    
    // Increase priority for newer trainsets
    if (trainset.yearOfManufacture >= 2020) priority += 20;
    
    // Increase priority for lower mileage
    if (trainset.currentMileage < 100000) priority += 15;
    
    // Increase priority for high reliability
    if (trainset.performance?.reliabilityScore > 90) priority += 10;
    
    return Math.min(priority, 100);
  }

  /**
   * Evaluate population fitness
   */
  async evaluatePopulation(population, context) {
    const evaluatedPopulation = [];
    
    for (const solution of population) {
      const evaluated = await this.evaluateSolution(solution, context);
      evaluatedPopulation.push(evaluated);
    }
    
    return evaluatedPopulation;
  }

  /**
   * Evaluate a single solution
   */
  async evaluateSolution(solution, context) {
    // Calculate objective values
    const objectives = await this.calculateObjectives(solution, context);
    
    // Check constraints
    const constraints = this.checkConstraints(solution, context);
    
    // Calculate overall fitness
    const fitness = this.calculateFitness(objectives, constraints);
    
    return {
      ...solution,
      objectives,
      constraints,
      fitness,
      violations: constraints.violations
    };
  }

  /**
   * Calculate objective values
   */
  async calculateObjectives(solution, context) {
    const objectives = {};
    
    // Service Readiness (0-100)
    objectives.serviceReadiness = this.calculateServiceReadiness(solution, context);
    
    // Reliability (0-100)
    objectives.reliability = this.calculateReliability(solution, context);
    
    // Cost Efficiency (0-100)
    objectives.costEfficiency = this.calculateCostEfficiency(solution, context);
    
    // Branding Exposure (0-100)
    objectives.brandingExposure = this.calculateBrandingExposure(solution, context);
    
    // Energy Efficiency (0-100)
    objectives.energyEfficiency = this.calculateEnergyEfficiency(solution, context);
    
    return objectives;
  }

  /**
   * Calculate service readiness score
   */
  calculateServiceReadiness(solution, context) {
    const selectedCount = solution.selectedTrainsets.length;
    const requiredCount = this.constraints.MIN_TRAINSETS;
    
    if (selectedCount >= requiredCount) {
      return 100;
    } else {
      return (selectedCount / requiredCount) * 100;
    }
  }

  /**
   * Calculate reliability score
   */
  calculateReliability(solution, context) {
    if (solution.selectedTrainsets.length === 0) return 0;
    
    const avgReliability = solution.selectedTrainsets.reduce((sum, trainset) => {
      return sum + (trainset.performance?.reliabilityScore || 50);
    }, 0) / solution.selectedTrainsets.length;
    
    return avgReliability;
  }

  /**
   * Calculate cost efficiency score
   */
  calculateCostEfficiency(solution, context) {
    if (solution.selectedTrainsets.length === 0) return 0;
    
    // Consider maintenance costs, energy costs, and operational efficiency
    const avgMileage = solution.selectedTrainsets.reduce((sum, t) => sum + t.currentMileage, 0) / solution.selectedTrainsets.length;
    const avgAge = solution.selectedTrainsets.reduce((sum, t) => sum + (2024 - t.yearOfManufacture), 0) / solution.selectedTrainsets.length;
    
    // Lower mileage and newer trainsets are more cost-efficient
    const mileageScore = Math.max(0, 100 - (avgMileage / 1000));
    const ageScore = Math.max(0, 100 - (avgAge * 5));
    
    return (mileageScore + ageScore) / 2;
  }

  /**
   * Calculate branding exposure score
   */
  calculateBrandingExposure(solution, context) {
    // Simulate branding exposure calculation
    const brandingScore = solution.selectedTrainsets.reduce((sum, trainset) => {
      // Simulate branding priority based on trainset characteristics
      let score = 50;
      if (trainset.yearOfManufacture >= 2020) score += 20;
      if (trainset.currentMileage < 80000) score += 15;
      return sum + score;
    }, 0);
    
    return brandingScore / solution.selectedTrainsets.length;
  }

  /**
   * Calculate energy efficiency score
   */
  calculateEnergyEfficiency(solution, context) {
    // Consider shunting distance, train positioning, and operational efficiency
    let efficiency = 100;
    
    // Reduce efficiency for complex shunting
    const complexShunting = solution.selectedTrainsets.filter(t => 
      t.location !== t.depot
    ).length;
    
    efficiency -= complexShunting * 5;
    
    // Reduce efficiency for older trainsets
    const oldTrainsets = solution.selectedTrainsets.filter(t => 
      t.yearOfManufacture < 2018
    ).length;
    
    efficiency -= oldTrainsets * 3;
    
    return Math.max(0, efficiency);
  }

  /**
   * Check constraints
   */
  checkConstraints(solution, context) {
    const violations = [];
    let constraintScore = 100;
    
    // Check minimum trainset count
    if (solution.selectedTrainsets.length < this.constraints.MIN_TRAINSETS) {
      violations.push({
        type: 'MIN_TRAINSETS',
        severity: 'HIGH',
        message: `Only ${solution.selectedTrainsets.length} trainsets selected, minimum ${this.constraints.MIN_TRAINSETS} required`
      });
      constraintScore -= 50;
    }
    
    // Check maximum trainset count
    if (solution.selectedTrainsets.length > this.constraints.MAX_TRAINSETS) {
      violations.push({
        type: 'MAX_TRAINSETS',
        severity: 'MEDIUM',
        message: `${solution.selectedTrainsets.length} trainsets selected, maximum ${this.constraints.MAX_TRAINSETS} allowed`
      });
      constraintScore -= 20;
    }
    
    // Check fitness validity
    const invalidFitness = solution.selectedTrainsets.filter(t => 
      !this.checkFitnessValidity(t, context)
    ).length;
    
    if (invalidFitness > 0) {
      violations.push({
        type: 'FITNESS_VALIDITY',
        severity: 'CRITICAL',
        message: `${invalidFitness} trainsets have invalid fitness certificates`
      });
      constraintScore -= 100;
    }
    
    // Check job card status
    const criticalJobs = solution.selectedTrainsets.filter(t => 
      !this.checkJobCardStatus(t, context)
    ).length;
    
    if (criticalJobs > 0) {
      violations.push({
        type: 'JOB_CARD_STATUS',
        severity: 'HIGH',
        message: `${criticalJobs} trainsets have critical job cards`
      });
      constraintScore -= 75;
    }
    
    return {
      score: Math.max(0, constraintScore),
      violations,
      isValid: violations.filter(v => v.severity === 'CRITICAL').length === 0
    };
  }

  /**
   * Calculate overall fitness
   */
  calculateFitness(objectives, constraints) {
    if (!constraints.isValid) {
      return 0; // Invalid solutions get zero fitness
    }
    
    // Weighted sum of objectives
    let fitness = 0;
    for (const [objective, value] of Object.entries(objectives)) {
      const weight = this.objectives[objective.toUpperCase()]?.weight || 0;
      fitness += value * weight;
    }
    
    // Apply constraint penalty
    fitness *= (constraints.score / 100);
    
    return Math.max(0, Math.min(100, fitness));
  }

  /**
   * Non-dominated sorting (NSGA-II)
   */
  nonDominatedSorting(population) {
    const fronts = [];
    const dominatedCount = new Map();
    const dominatedSolutions = new Map();
    
    // Initialize
    population.forEach(solution => {
      dominatedCount.set(solution.id, 0);
      dominatedSolutions.set(solution.id, []);
    });
    
    // Calculate domination relationships
    for (let i = 0; i < population.length; i++) {
      for (let j = 0; j < population.length; j++) {
        if (i !== j) {
          if (this.dominates(population[i], population[j])) {
            dominatedSolutions.get(population[i].id).push(population[j].id);
          } else if (this.dominates(population[j], population[i])) {
            dominatedCount.set(population[i].id, dominatedCount.get(population[i].id) + 1);
          }
        }
      }
    }
    
    // Build fronts
    let currentFront = population.filter(s => dominatedCount.get(s.id) === 0);
    let remaining = population.filter(s => dominatedCount.get(s.id) > 0);
    
    while (currentFront.length > 0) {
      fronts.push(currentFront);
      const nextFront = [];
      
      for (const solution of currentFront) {
        for (const dominatedId of dominatedSolutions.get(solution.id)) {
          const count = dominatedCount.get(dominatedId) - 1;
          dominatedCount.set(dominatedId, count);
          if (count === 0) {
            nextFront.push(population.find(s => s.id === dominatedId));
          }
        }
      }
      
      currentFront = nextFront;
      remaining = remaining.filter(s => dominatedCount.get(s.id) > 0);
    }
    
    return fronts;
  }

  /**
   * Check if solution A dominates solution B
   */
  dominates(solutionA, solutionB) {
    const objectivesA = solutionA.objectives;
    const objectivesB = solutionB.objectives;
    
    let betterInAtLeastOne = false;
    
    for (const objective of Object.keys(objectivesA)) {
      if (objectivesA[objective] < objectivesB[objective]) {
        return false; // A is worse in at least one objective
      }
      if (objectivesA[objective] > objectivesB[objective]) {
        betterInAtLeastOne = true;
      }
    }
    
    return betterInAtLeastOne;
  }

  /**
   * Calculate crowding distance
   */
  calculateCrowdingDistance(fronts) {
    const crowdedPopulation = [];
    
    for (const front of fronts) {
      if (front.length <= 2) {
        crowdedPopulation.push(...front);
        continue;
      }
      
      // Initialize crowding distance
      front.forEach(solution => {
        solution.crowdingDistance = 0;
      });
      
      // Calculate crowding distance for each objective
      for (const objective of Object.keys(front[0].objectives)) {
        // Sort by objective value
        front.sort((a, b) => a.objectives[objective] - b.objectives[objective]);
        
        // Set boundary points
        front[0].crowdingDistance = Infinity;
        front[front.length - 1].crowdingDistance = Infinity;
        
        // Calculate distance for intermediate points
        const minValue = front[0].objectives[objective];
        const maxValue = front[front.length - 1].objectives[objective];
        const range = maxValue - minValue;
        
        if (range > 0) {
          for (let i = 1; i < front.length - 1; i++) {
            const distance = (front[i + 1].objectives[objective] - front[i - 1].objectives[objective]) / range;
            front[i].crowdingDistance += distance;
          }
        }
      }
      
      // Sort by crowding distance (descending)
      front.sort((a, b) => b.crowdingDistance - a.crowdingDistance);
      crowdedPopulation.push(...front);
    }
    
    return crowdedPopulation;
  }

  /**
   * Evolve population (selection, crossover, mutation)
   */
  evolvePopulation(population, populationSize) {
    const newPopulation = [];
    
    // Elitism: keep best solutions
    const eliteCount = Math.floor(populationSize * 0.1);
    newPopulation.push(...population.slice(0, eliteCount));
    
    // Generate offspring
    while (newPopulation.length < populationSize) {
      const parent1 = this.tournamentSelection(population);
      const parent2 = this.tournamentSelection(population);
      
      const offspring = this.crossover(parent1, parent2);
      const mutatedOffspring = this.mutate(offspring);
      
      newPopulation.push(mutatedOffspring);
    }
    
    return newPopulation.slice(0, populationSize);
  }

  /**
   * Tournament selection
   */
  tournamentSelection(population, tournamentSize = 3) {
    const tournament = [];
    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * population.length);
      tournament.push(population[randomIndex]);
    }
    
    return tournament.reduce((best, current) => 
      current.fitness > best.fitness ? current : best
    );
  }

  /**
   * Crossover operation
   */
  crossover(parent1, parent2) {
    const offspring = {
      id: `SOL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      selectedTrainsets: [],
      schedule: [],
      objectives: {},
      constraints: {},
      violations: [],
      fitness: 0
    };
    
    // Uniform crossover for selected trainsets
    const allTrainsets = [...new Set([...parent1.selectedTrainsets, ...parent2.selectedTrainsets])];
    const numToSelect = Math.floor((parent1.selectedTrainsets.length + parent2.selectedTrainsets.length) / 2);
    
    const shuffled = allTrainsets.sort(() => 0.5 - Math.random());
    offspring.selectedTrainsets = shuffled.slice(0, numToSelect);
    
    return offspring;
  }

  /**
   * Mutation operation
   */
  mutate(solution) {
    const mutated = { ...solution };
    
    // Randomly add or remove a trainset
    if (Math.random() < 0.1) { // 10% mutation rate
      if (Math.random() < 0.5 && mutated.selectedTrainsets.length > this.constraints.MIN_TRAINSETS) {
        // Remove a random trainset
        const randomIndex = Math.floor(Math.random() * mutated.selectedTrainsets.length);
        mutated.selectedTrainsets.splice(randomIndex, 1);
      } else if (mutated.selectedTrainsets.length < this.constraints.MAX_TRAINSETS) {
        // Add a random trainset (simplified - would need available trainsets)
        // This is a placeholder for the actual implementation
      }
    }
    
    return mutated;
  }

  /**
   * Rank solutions by fitness and crowding distance
   */
  rankSolutions(population) {
    return population.sort((a, b) => {
      // First by fitness (descending)
      if (b.fitness !== a.fitness) {
        return b.fitness - a.fitness;
      }
      // Then by crowding distance (descending)
      return (b.crowdingDistance || 0) - (a.crowdingDistance || 0);
    });
  }

  /**
   * Get best fitness from population
   */
  getBestFitness(population) {
    return Math.max(...population.map(s => s.fitness));
  }

  /**
   * Generate optimization report
   */
  generateOptimizationReport(solutions, context) {
    const bestSolution = solutions[0];
    const topSolutions = solutions.slice(0, 5);
    
    return {
      bestSolution: {
        id: bestSolution.id,
        fitness: bestSolution.fitness,
        objectives: bestSolution.objectives,
        selectedTrainsets: bestSolution.selectedTrainsets.length,
        violations: bestSolution.violations.length
      },
      topSolutions: topSolutions.map(s => ({
        id: s.id,
        fitness: s.fitness,
        objectives: s.objectives,
        selectedTrainsets: s.selectedTrainsets.length
      })),
      statistics: {
        totalSolutions: solutions.length,
        averageFitness: solutions.reduce((sum, s) => sum + s.fitness, 0) / solutions.length,
        bestFitness: bestSolution.fitness,
        validSolutions: solutions.filter(s => s.constraints.isValid).length,
        constraintViolations: solutions.reduce((sum, s) => sum + s.violations.length, 0)
      },
      recommendations: this.generateRecommendations(solutions, context)
    };
  }

  /**
   * Generate recommendations based on optimization results
   */
  generateRecommendations(solutions, context) {
    const recommendations = [];
    
    const bestSolution = solutions[0];
    
    // Service readiness recommendations
    if (bestSolution.objectives.serviceReadiness < 90) {
      recommendations.push({
        type: 'SERVICE_READINESS',
        priority: 'HIGH',
        message: 'Consider increasing the number of trainsets for better service coverage',
        action: 'Review trainset availability and maintenance schedules'
      });
    }
    
    // Reliability recommendations
    if (bestSolution.objectives.reliability < 80) {
      recommendations.push({
        type: 'RELIABILITY',
        priority: 'HIGH',
        message: 'Focus on trainsets with higher reliability scores',
        action: 'Prioritize newer trainsets and those with better maintenance records'
      });
    }
    
    // Cost efficiency recommendations
    if (bestSolution.objectives.costEfficiency < 70) {
      recommendations.push({
        type: 'COST_EFFICIENCY',
        priority: 'MEDIUM',
        message: 'Optimize trainset selection for cost efficiency',
        action: 'Balance mileage distribution and consider maintenance costs'
      });
    }
    
    return recommendations;
  }
}

module.exports = MultiObjectiveOptimizer;
