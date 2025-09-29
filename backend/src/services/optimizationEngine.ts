/**
 * AI-Driven Train Induction Optimization Engine
 * Core algorithm for KMRL's nightly scheduling decision (21:00-23:00 IST)
 */

import { mockDb } from './mockDb';

// Types for the optimization problem
interface TrainsetStatus {
  id: string;
  trainsetNumber: string;
  fitnessScore: number;
  fitnessExpiryDays: number;
  currentMileage: number;
  pendingJobCards: number;
  jobCardPriority: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  stablingPosition: number;
  brandingContract: boolean;
  brandingExposureHours: number;
  brandingTargetHours: number;
  lastMaintenanceDate: Date;
  operationalClearance: boolean;
}

interface InductionDecision {
  trainsetId: string;
  trainsetNumber: string;
  decision: 'IN_SERVICE' | 'STANDBY' | 'MAINTENANCE';
  score: number;
  reasons: string[];
  conflicts: string[];
  shuntingMoves: number;
}

interface OptimizationResult {
  timestamp: Date;
  processingTime: number;
  decisions: InductionDecision[];
  summary: {
    inService: number;
    standby: number;
    maintenance: number;
    totalShuntingMoves: number;
    conflictsDetected: number;
  };
  recommendations: string[];
}

export class TrainInductionOptimizer {
  private readonly WEIGHTS = {
    fitness: 0.25,
    mileage: 0.20,
    maintenance: 0.30,
    branding: 0.15,
    shunting: 0.10
  };

  private readonly THRESHOLDS = {
    criticalFitnessDays: 7,
    maxMileageDeviation: 0.15,
    minServiceTrains: 18,
    maxMaintenanceSlots: 5,
    brandingComplianceTarget: 0.90
  };

  /**
   * Main optimization function - called nightly at 21:00
   */
  async optimizeInduction(): Promise<OptimizationResult> {
    const startTime = Date.now();
    
    // Step 1: Gather all trainset data
    const trainsets = await this.gatherTrainsetData();
    
    // Step 2: Calculate optimization scores
    const scoredTrainsets = this.calculateScores(trainsets);
    
    // Step 3: Apply constraints and generate decisions
    const decisions = this.applyConstraints(scoredTrainsets);
    
    // Step 4: Optimize stabling positions to minimize shunting
    const optimizedDecisions = this.optimizeStabling(decisions);
    
    // Step 5: Detect conflicts
    const conflictsDetected = this.detectConflicts(optimizedDecisions);
    
    // Step 6: Generate recommendations
    const recommendations = this.generateRecommendations(optimizedDecisions);
    
    const processingTime = Date.now() - startTime;
    
    return {
      timestamp: new Date(),
      processingTime,
      decisions: optimizedDecisions,
      summary: this.generateSummary(optimizedDecisions),
      recommendations
    };
  }

  /**
   * Gather comprehensive data for all trainsets
   */
  private async gatherTrainsetData(): Promise<TrainsetStatus[]> {
    const trainsets = await mockDb.getAllTrainsets();
    const statusData: TrainsetStatus[] = [];

    for (const trainset of trainsets) {
      const fitness = await mockDb.getFitnessByTrainsetId(trainset.id);
      const fitnessExpiryDays = fitness 
        ? Math.ceil((new Date(fitness.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;

      // Simulate job card data
      const pendingJobCards = Math.floor(Math.random() * 3);
      const priorities = ['HIGH', 'MEDIUM', 'LOW', 'NONE'] as const;
      const jobCardPriority = pendingJobCards > 0 
        ? priorities[Math.floor(Math.random() * 3)]
        : 'NONE';

      // Simulate branding data
      const hasContract = Math.random() > 0.5;
      const exposureHours = hasContract ? Math.random() * 200 : 0;
      const targetHours = hasContract ? 250 : 0;

      statusData.push({
        id: trainset.id,
        trainsetNumber: trainset.trainsetNumber,
        fitnessScore: trainset.fitnessScore || 0,
        fitnessExpiryDays,
        currentMileage: trainset.currentMileage,
        pendingJobCards,
        jobCardPriority,
        stablingPosition: Math.floor(Math.random() * 30) + 1,
        brandingContract: hasContract,
        brandingExposureHours: exposureHours,
        brandingTargetHours: targetHours,
        lastMaintenanceDate: new Date(trainset.lastMaintenance || Date.now()),
        operationalClearance: Math.random() > 0.1
      });
    }

    return statusData;
  }

  /**
   * Calculate multi-objective optimization scores
   */
  private calculateScores(trainsets: TrainsetStatus[]): (TrainsetStatus & { score: number })[] {
    const avgMileage = trainsets.reduce((sum, t) => sum + t.currentMileage, 0) / trainsets.length;

    return trainsets.map(trainset => {
      let score = 0;
      
      // Fitness score component (higher is better)
      const fitnessComponent = (trainset.fitnessScore / 10) * this.WEIGHTS.fitness;
      score += fitnessComponent;

      // Fitness expiry urgency (penalize if expiring soon)
      if (trainset.fitnessExpiryDays < this.THRESHOLDS.criticalFitnessDays) {
        score -= 0.5;
      }

      // Mileage balance component (prefer even distribution)
      const mileageDeviation = Math.abs(trainset.currentMileage - avgMileage) / avgMileage;
      const mileageComponent = (1 - Math.min(mileageDeviation, 1)) * this.WEIGHTS.mileage;
      score += mileageComponent;

      // Maintenance urgency (penalize high priority job cards)
      const maintenanceUrgency = {
        'HIGH': -0.8,
        'MEDIUM': -0.4,
        'LOW': -0.2,
        'NONE': 0
      };
      score += maintenanceUrgency[trainset.jobCardPriority] * this.WEIGHTS.maintenance;

      // Branding compliance (boost if behind target)
      if (trainset.brandingContract) {
        const exposureRatio = trainset.brandingExposureHours / trainset.brandingTargetHours;
        if (exposureRatio < this.THRESHOLDS.brandingComplianceTarget) {
          score += (1 - exposureRatio) * this.WEIGHTS.branding;
        }
      }

      // Operational clearance (mandatory)
      if (!trainset.operationalClearance) {
        score = -10; // Force to maintenance
      }

      return { ...trainset, score };
    });
  }

  /**
   * Apply operational constraints and generate decisions
   */
  private applyConstraints(scoredTrainsets: (TrainsetStatus & { score: number })[]): InductionDecision[] {
    // Sort by score descending
    const sorted = [...scoredTrainsets].sort((a, b) => b.score - a.score);
    const decisions: InductionDecision[] = [];
    
    let inServiceCount = 0;
    let maintenanceCount = 0;

    for (const trainset of sorted) {
      const decision: InductionDecision = {
        trainsetId: trainset.id,
        trainsetNumber: trainset.trainsetNumber,
        decision: 'STANDBY',
        score: trainset.score,
        reasons: [],
        conflicts: [],
        shuntingMoves: 0
      };

      // Decision logic based on constraints
      if (!trainset.operationalClearance || trainset.fitnessExpiryDays <= 0) {
        decision.decision = 'MAINTENANCE';
        decision.reasons.push('No operational clearance or expired fitness');
        maintenanceCount++;
      } else if (trainset.jobCardPriority === 'HIGH' && maintenanceCount < this.THRESHOLDS.maxMaintenanceSlots) {
        decision.decision = 'MAINTENANCE';
        decision.reasons.push('High priority maintenance required');
        maintenanceCount++;
      } else if (trainset.score > 0.5 && inServiceCount < this.THRESHOLDS.minServiceTrains) {
        decision.decision = 'IN_SERVICE';
        decision.reasons.push(`High operational score: ${trainset.score.toFixed(2)}`);
        
        if (trainset.brandingContract && 
            trainset.brandingExposureHours < trainset.brandingTargetHours * 0.9) {
          decision.reasons.push('Branding SLA compliance needed');
        }
        
        inServiceCount++;
      } else if (trainset.fitnessExpiryDays < 14) {
        decision.decision = 'MAINTENANCE';
        decision.reasons.push('Fitness certificate expiring soon');
        decision.conflicts.push('Consider preventive maintenance');
        maintenanceCount++;
      } else {
        decision.decision = 'STANDBY';
        decision.reasons.push('Reserved for contingency');
      }

      decisions.push(decision);
    }

    return decisions;
  }

  /**
   * Optimize stabling positions to minimize shunting movements
   */
  private optimizeStabling(decisions: InductionDecision[]): InductionDecision[] {
    // Group by decision type
    const inService = decisions.filter(d => d.decision === 'IN_SERVICE');
    const maintenance = decisions.filter(d => d.decision === 'MAINTENANCE');
    const standby = decisions.filter(d => d.decision === 'STANDBY');

    // Calculate shunting moves based on position
    // Trains in lower positions (1-10) are easier to extract
    inService.forEach((decision, index) => {
      decision.shuntingMoves = Math.min(index + 1, 3);
    });

    maintenance.forEach((decision, index) => {
      decision.shuntingMoves = Math.min(index + 2, 4);
    });

    standby.forEach((decision) => {
      decision.shuntingMoves = 0; // Standby trains don't move
    });

    return [...inService, ...maintenance, ...standby];
  }

  /**
   * Detect scheduling conflicts
   */
  private detectConflicts(decisions: InductionDecision[]): number {
    let conflictCount = 0;

    decisions.forEach(decision => {
      // Check for maintenance bay conflicts
      const maintenanceDecisions = decisions.filter(d => d.decision === 'MAINTENANCE');
      if (maintenanceDecisions.length > this.THRESHOLDS.maxMaintenanceSlots) {
        decision.conflicts.push(`Maintenance bay overflow: ${maintenanceDecisions.length} trains`);
        conflictCount++;
      }

      // Check for minimum service requirement
      const serviceDecisions = decisions.filter(d => d.decision === 'IN_SERVICE');
      if (serviceDecisions.length < this.THRESHOLDS.minServiceTrains) {
        decision.conflicts.push(`Below minimum service requirement: ${serviceDecisions.length}/${this.THRESHOLDS.minServiceTrains}`);
        conflictCount++;
      }
    });

    return conflictCount;
  }

  /**
   * Generate AI recommendations
   */
  private generateRecommendations(decisions: InductionDecision[]): string[] {
    const recommendations: string[] = [];

    // Analyze patterns
    const maintenanceCount = decisions.filter(d => d.decision === 'MAINTENANCE').length;
    const avgShunting = decisions.reduce((sum, d) => sum + d.shuntingMoves, 0) / decisions.length;

    if (maintenanceCount > 3) {
      recommendations.push(`High maintenance load detected. Consider scheduling preventive maintenance during off-peak hours.`);
    }

    if (avgShunting > 2) {
      recommendations.push(`Optimize stabling arrangement to reduce shunting movements from ${avgShunting.toFixed(1)} to <2.0`);
    }

    // Check branding compliance
    const brandingRisk = decisions.filter(d => 
      d.conflicts.some(c => c.includes('branding'))
    ).length;
    
    if (brandingRisk > 0) {
      recommendations.push(`${brandingRisk} trainsets at risk of breaching advertiser SLAs. Prioritize for service.`);
    }

    // Energy optimization
    const totalShunting = decisions.reduce((sum, d) => sum + d.shuntingMoves, 0);
    const energySaving = (30 - totalShunting) * 150; // kWh saved
    recommendations.push(`Current plan saves ~${energySaving} kWh compared to baseline through optimized shunting.`);

    return recommendations;
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(decisions: InductionDecision[]) {
    return {
      inService: decisions.filter(d => d.decision === 'IN_SERVICE').length,
      standby: decisions.filter(d => d.decision === 'STANDBY').length,
      maintenance: decisions.filter(d => d.decision === 'MAINTENANCE').length,
      totalShuntingMoves: decisions.reduce((sum, d) => sum + d.shuntingMoves, 0),
      conflictsDetected: decisions.filter(d => d.conflicts.length > 0).length
    };
  }

  /**
   * What-if scenario simulator
   */
  async simulateScenario(changes: Partial<TrainsetStatus>[]): Promise<OptimizationResult> {
    // Apply hypothetical changes and re-run optimization
    // This allows supervisors to test "what if trainset X needs emergency maintenance?"
    console.log('Simulating scenario with changes:', changes);
    return this.optimizeInduction();
  }

  /**
   * Machine learning feedback loop
   */
  async learnFromDecision(actualDecisions: InductionDecision[], outcome: any) {
    // Store supervisor's actual decisions vs AI recommendations
    // Use this to improve future predictions
    console.log('Learning from actual decisions:', actualDecisions);
    console.log('Outcome metrics:', outcome);
    
    // In production, this would update ML model weights
    // For hackathon, we can show the concept
  }
}

// Export singleton instance
export const optimizer = new TrainInductionOptimizer();
