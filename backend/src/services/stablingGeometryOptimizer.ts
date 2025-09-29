/**
 * Stabling Geometry Optimizer
 * Optimizes physical bay positions to minimize nightly shunting and morning turn-out time
 * Addresses the critical requirement for efficient depot operations
 */

interface TrainsetPosition {
  trainsetId: string;
  currentBay: string;
  targetBay: string;
  departureTime: string; // Morning departure time
  priority: number; // 1-10, higher = earlier departure
}

interface BayConfiguration {
  bayId: string;
  track: string;
  position: number; // Position on track (1 = closest to exit)
  capacity: number;
  occupied: boolean;
  trainsetId?: string;
  type: 'STABLING' | 'INSPECTION' | 'MAINTENANCE' | 'CLEANING';
}

interface ShuntingMove {
  trainsetId: string;
  fromBay: string;
  toBay: string;
  moveType: 'DIRECT' | 'PULL_PUSH' | 'TRIANGLE';
  estimatedTime: number; // minutes
  energyConsumption: number; // kWh
  conflictsWith: string[]; // Other trainset IDs that block this move
}

interface StablingPlan {
  timestamp: Date;
  depot: string;
  configuration: BayConfiguration[];
  trainsetPositions: TrainsetPosition[];
  shuntingSequence: ShuntingMove[];
  metrics: {
    totalShuntingMoves: number;
    totalShuntingTime: number; // minutes
    totalEnergyConsumption: number; // kWh
    morningTurnoutTime: number; // minutes
    conflictCount: number;
    efficiency: number; // 0-100%
  };
}

export class StablingGeometryOptimizer {
  private readonly DEPOT_LAYOUT = {
    MUTTOM: {
      tracks: [
        { id: 'T1', positions: 5, exitDistance: 0 },
        { id: 'T2', positions: 5, exitDistance: 50 },
        { id: 'T3', positions: 5, exitDistance: 100 },
        { id: 'T4', positions: 5, exitDistance: 150 }
      ],
      inspectionBays: 5,
      maintenanceBays: 3,
      cleaningBays: 4
    }
  };

  private readonly SHUNTING_PARAMETERS = {
    MOVE_TIME_PER_100M: 2, // minutes
    COUPLING_TIME: 3, // minutes
    UNCOUPLING_TIME: 2, // minutes
    ENERGY_PER_MOVE: 15, // kWh base
    ENERGY_PER_100M: 5, // kWh additional
    SAFETY_CHECK_TIME: 1, // minutes
    MAX_SIMULTANEOUS_MOVES: 2
  };

  /**
   * Main optimization function for nightly stabling arrangement
   */
  public optimizeStablingGeometry(
    trainsets: Array<{
      id: string;
      status: string;
      nextDepartureTime: string;
      requiresCleaning: boolean;
      requiresInspection: boolean;
    }>,
    currentTime: Date = new Date()
  ): StablingPlan {
    // Step 1: Categorize trainsets by morning departure priority
    const categorizedTrainsets = this.categorizeByDeparture(trainsets);
    
    // Step 2: Generate initial bay configuration
    const bayConfiguration = this.generateBayConfiguration();
    
    // Step 3: Apply First-In-First-Out (FIFO) strategy for minimal shunting
    const optimalPositions = this.applyFIFOStrategy(categorizedTrainsets, bayConfiguration);
    
    // Step 4: Calculate required shunting moves from current to optimal
    const shuntingSequence = this.calculateShuntingSequence(
      this.getCurrentPositions(trainsets),
      optimalPositions
    );
    
    // Step 5: Optimize shunting sequence to minimize conflicts
    const optimizedSequence = this.optimizeShuntingSequence(shuntingSequence);
    
    // Step 6: Calculate metrics
    const metrics = this.calculateMetrics(optimizedSequence, trainsets.length);
    
    return {
      timestamp: currentTime,
      depot: 'MUTTOM',
      configuration: bayConfiguration,
      trainsetPositions: optimalPositions,
      shuntingSequence: optimizedSequence,
      metrics
    };
  }

  /**
   * Categorize trainsets by departure priority
   */
  private categorizeByDeparture(trainsets: any[]): Map<number, any[]> {
    const categories = new Map<number, any[]>();
    
    trainsets.forEach(trainset => {
      const departureHour = parseInt(trainset.nextDepartureTime?.split(':')[0] || '6');
      let priority: number;
      
      // Assign priority based on departure time
      if (departureHour < 6) priority = 10; // Early morning (before 6 AM)
      else if (departureHour < 7) priority = 9; // 6-7 AM
      else if (departureHour < 8) priority = 8; // 7-8 AM
      else if (departureHour < 9) priority = 7; // 8-9 AM
      else if (departureHour < 10) priority = 6; // 9-10 AM
      else priority = 5; // After 10 AM or standby
      
      // Adjust for maintenance/cleaning requirements
      if (trainset.requiresCleaning) priority -= 2;
      if (trainset.requiresInspection) priority -= 3;
      
      if (!categories.has(priority)) {
        categories.set(priority, []);
      }
      categories.get(priority)!.push(trainset);
    });
    
    return categories;
  }

  /**
   * Generate depot bay configuration
   */
  private generateBayConfiguration(): BayConfiguration[] {
    const configuration: BayConfiguration[] = [];
    const layout = this.DEPOT_LAYOUT.MUTTOM;
    
    // Generate stabling bays
    layout.tracks.forEach(track => {
      for (let pos = 1; pos <= track.positions; pos++) {
        configuration.push({
          bayId: `${track.id}-${pos}`,
          track: track.id,
          position: pos,
          capacity: 1,
          occupied: false,
          type: 'STABLING'
        });
      }
    });
    
    // Add special bays
    for (let i = 1; i <= layout.inspectionBays; i++) {
      configuration.push({
        bayId: `INS-${i}`,
        track: 'INSPECTION',
        position: i,
        capacity: 1,
        occupied: false,
        type: 'INSPECTION'
      });
    }
    
    for (let i = 1; i <= layout.maintenanceBays; i++) {
      configuration.push({
        bayId: `MNT-${i}`,
        track: 'MAINTENANCE',
        position: i,
        capacity: 1,
        occupied: false,
        type: 'MAINTENANCE'
      });
    }
    
    for (let i = 1; i <= layout.cleaningBays; i++) {
      configuration.push({
        bayId: `CLN-${i}`,
        track: 'CLEANING',
        position: i,
        capacity: 1,
        occupied: false,
        type: 'CLEANING'
      });
    }
    
    return configuration;
  }

  /**
   * Apply FIFO strategy - trains departing first should be closest to exit
   */
  private applyFIFOStrategy(
    categorizedTrainsets: Map<number, any[]>,
    bays: BayConfiguration[]
  ): TrainsetPosition[] {
    const positions: TrainsetPosition[] = [];
    const stablingBays = bays.filter(b => b.type === 'STABLING');
    
    // Sort by track and position (closest to exit first)
    stablingBays.sort((a, b) => {
      if (a.track !== b.track) return a.track.localeCompare(b.track);
      return a.position - b.position;
    });
    
    let bayIndex = 0;
    
    // Assign high-priority trainsets to positions closest to exit
    const priorities = Array.from(categorizedTrainsets.keys()).sort((a, b) => b - a);
    
    priorities.forEach(priority => {
      const trainsets = categorizedTrainsets.get(priority) || [];
      
      trainsets.forEach(trainset => {
        if (trainset.requiresInspection) {
          // Assign to inspection bay
          const inspectionBay = bays.find(b => b.type === 'INSPECTION' && !b.occupied);
          if (inspectionBay) {
            positions.push({
              trainsetId: trainset.id,
              currentBay: this.getCurrentBay(trainset.id),
              targetBay: inspectionBay.bayId,
              departureTime: trainset.nextDepartureTime,
              priority
            });
            inspectionBay.occupied = true;
            inspectionBay.trainsetId = trainset.id;
          }
        } else if (trainset.requiresCleaning) {
          // Assign to cleaning bay
          const cleaningBay = bays.find(b => b.type === 'CLEANING' && !b.occupied);
          if (cleaningBay) {
            positions.push({
              trainsetId: trainset.id,
              currentBay: this.getCurrentBay(trainset.id),
              targetBay: cleaningBay.bayId,
              departureTime: trainset.nextDepartureTime,
              priority
            });
            cleaningBay.occupied = true;
            cleaningBay.trainsetId = trainset.id;
          }
        } else {
          // Assign to stabling bay
          if (bayIndex < stablingBays.length) {
            const bay = stablingBays[bayIndex];
            positions.push({
              trainsetId: trainset.id,
              currentBay: this.getCurrentBay(trainset.id),
              targetBay: bay.bayId,
              departureTime: trainset.nextDepartureTime,
              priority
            });
            bay.occupied = true;
            bay.trainsetId = trainset.id;
            bayIndex++;
          }
        }
      });
    });
    
    return positions;
  }

  /**
   * Calculate shunting sequence from current to target positions
   */
  private calculateShuntingSequence(
    currentPositions: Map<string, string>,
    targetPositions: TrainsetPosition[]
  ): ShuntingMove[] {
    const moves: ShuntingMove[] = [];
    const moveGraph = this.buildMoveGraph(currentPositions, targetPositions);
    
    targetPositions.forEach(target => {
      const currentBay = currentPositions.get(target.trainsetId);
      if (currentBay && currentBay !== target.targetBay) {
        const move = this.calculateMove(
          target.trainsetId,
          currentBay,
          target.targetBay,
          moveGraph
        );
        moves.push(move);
      }
    });
    
    return moves;
  }

  /**
   * Calculate individual shunting move
   */
  private calculateMove(
    trainsetId: string,
    fromBay: string,
    toBay: string,
    moveGraph: Map<string, string[]>
  ): ShuntingMove {
    // Determine move type based on bay positions
    let moveType: 'DIRECT' | 'PULL_PUSH' | 'TRIANGLE' = 'DIRECT';
    let estimatedTime = this.SHUNTING_PARAMETERS.SAFETY_CHECK_TIME;
    let energyConsumption = this.SHUNTING_PARAMETERS.ENERGY_PER_MOVE;
    
    // Check if direct move is possible
    const conflicts = this.findConflicts(fromBay, toBay, moveGraph);
    
    if (conflicts.length === 0) {
      moveType = 'DIRECT';
      estimatedTime += this.SHUNTING_PARAMETERS.MOVE_TIME_PER_100M * 2;
    } else if (conflicts.length === 1) {
      moveType = 'PULL_PUSH';
      estimatedTime += this.SHUNTING_PARAMETERS.MOVE_TIME_PER_100M * 4;
      estimatedTime += this.SHUNTING_PARAMETERS.COUPLING_TIME;
      estimatedTime += this.SHUNTING_PARAMETERS.UNCOUPLING_TIME;
      energyConsumption *= 1.5;
    } else {
      moveType = 'TRIANGLE';
      estimatedTime += this.SHUNTING_PARAMETERS.MOVE_TIME_PER_100M * 6;
      estimatedTime += this.SHUNTING_PARAMETERS.COUPLING_TIME * 2;
      estimatedTime += this.SHUNTING_PARAMETERS.UNCOUPLING_TIME * 2;
      energyConsumption *= 2;
    }
    
    // Add distance-based energy
    const distance = this.calculateDistance(fromBay, toBay);
    energyConsumption += (distance / 100) * this.SHUNTING_PARAMETERS.ENERGY_PER_100M;
    
    return {
      trainsetId,
      fromBay,
      toBay,
      moveType,
      estimatedTime: Math.round(estimatedTime),
      energyConsumption: Math.round(energyConsumption),
      conflictsWith: conflicts
    };
  }

  /**
   * Optimize shunting sequence to minimize conflicts
   */
  private optimizeShuntingSequence(moves: ShuntingMove[]): ShuntingMove[] {
    // Sort moves to minimize conflicts
    // Priority: Direct moves first, then pull-push, then triangle
    const optimized = [...moves].sort((a, b) => {
      // Sort by move type complexity
      const typeOrder = { 'DIRECT': 0, 'PULL_PUSH': 1, 'TRIANGLE': 2 };
      const typeDiff = typeOrder[a.moveType] - typeOrder[b.moveType];
      if (typeDiff !== 0) return typeDiff;
      
      // Then by estimated time
      return a.estimatedTime - b.estimatedTime;
    });
    
    // Apply dependency resolution
    const resolved: ShuntingMove[] = [];
    const pending = new Set(optimized);
    
    while (pending.size > 0) {
      let added = false;
      
      for (const move of pending) {
        // Check if all conflicts are resolved
        const canMove = move.conflictsWith.every(conflictId =>
          !pending.has(optimized.find(m => m.trainsetId === conflictId)!)
        );
        
        if (canMove) {
          resolved.push(move);
          pending.delete(move);
          added = true;
          break;
        }
      }
      
      // If no move can be made, force one (deadlock resolution)
      if (!added && pending.size > 0) {
        const forced = pending.values().next().value;
        if (forced) {
          resolved.push(forced);
          pending.delete(forced);
        }
      }
    }
    
    return resolved;
  }

  /**
   * Calculate performance metrics
   */
  private calculateMetrics(moves: ShuntingMove[], totalTrainsets: number): any {
    const totalShuntingMoves = moves.length;
    const totalShuntingTime = moves.reduce((sum, m) => sum + m.estimatedTime, 0);
    const totalEnergyConsumption = moves.reduce((sum, m) => sum + m.energyConsumption, 0);
    
    // Calculate morning turnout time (time to get all trains out)
    // Assuming parallel moves where possible
    const parallelGroups = this.groupParallelMoves(moves);
    const morningTurnoutTime = parallelGroups.reduce((sum, group) => {
      return sum + Math.max(...group.map(m => m.estimatedTime));
    }, 0);
    
    const conflictCount = moves.filter(m => m.conflictsWith.length > 0).length;
    
    // Efficiency calculation
    const idealMoves = Math.max(0, totalTrainsets - 10); // Assuming 10 trains don't need moving
    const efficiency = idealMoves > 0 
      ? Math.max(0, 100 - ((totalShuntingMoves - idealMoves) / idealMoves * 100))
      : 100;
    
    return {
      totalShuntingMoves,
      totalShuntingTime,
      totalEnergyConsumption,
      morningTurnoutTime,
      conflictCount,
      efficiency: Math.round(efficiency)
    };
  }

  // Helper methods
  
  private getCurrentPositions(trainsets: any[]): Map<string, string> {
    const positions = new Map<string, string>();
    
    // Simulate current positions
    trainsets.forEach((trainset, index) => {
      const track = `T${(index % 4) + 1}`;
      const position = Math.floor(index / 4) + 1;
      positions.set(trainset.id, `${track}-${position}`);
    });
    
    return positions;
  }

  private getCurrentBay(trainsetId: string): string {
    // Simulate getting current bay
    const trackNum = (parseInt(trainsetId.slice(-2)) % 4) + 1;
    const position = Math.floor(Math.random() * 5) + 1;
    return `T${trackNum}-${position}`;
  }

  private buildMoveGraph(
    current: Map<string, string>,
    target: TrainsetPosition[]
  ): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    
    // Build adjacency for conflict detection
    current.forEach((bay, trainsetId) => {
      const track = bay.split('-')[0];
      const position = parseInt(bay.split('-')[1]);
      
      // Find trainsets that might block this one
      const blockers: string[] = [];
      current.forEach((otherBay, otherId) => {
        if (otherId !== trainsetId) {
          const otherTrack = otherBay.split('-')[0];
          const otherPosition = parseInt(otherBay.split('-')[1]);
          
          // Same track, blocking position
          if (track === otherTrack && otherPosition < position) {
            blockers.push(otherId);
          }
        }
      });
      
      graph.set(trainsetId, blockers);
    });
    
    return graph;
  }

  private findConflicts(
    fromBay: string,
    toBay: string,
    moveGraph: Map<string, string[]>
  ): string[] {
    // Simplified conflict detection
    const conflicts: string[] = [];
    
    const fromTrack = fromBay.split('-')[0];
    const toTrack = toBay.split('-')[0];
    
    if (fromTrack === toTrack) {
      // Moving within same track - check for blocking trainsets
      moveGraph.forEach((blockers, trainsetId) => {
        if (blockers.length > 0 && Math.random() > 0.7) {
          conflicts.push(trainsetId);
        }
      });
    }
    
    return conflicts.slice(0, Math.min(2, conflicts.length));
  }

  private calculateDistance(fromBay: string, toBay: string): number {
    // Calculate distance between bays in meters
    const fromTrack = fromBay.split('-')[0];
    const toTrack = toBay.split('-')[0];
    const fromPos = parseInt(fromBay.split('-')[1]) || 1;
    const toPos = parseInt(toBay.split('-')[1]) || 1;
    
    let distance = 0;
    
    // Track change distance
    if (fromTrack !== toTrack) {
      const trackMap: any = { 'T1': 0, 'T2': 50, 'T3': 100, 'T4': 150 };
      distance += Math.abs((trackMap[toTrack] || 0) - (trackMap[fromTrack] || 0));
    }
    
    // Position change distance
    distance += Math.abs(toPos - fromPos) * 50;
    
    return distance;
  }

  private groupParallelMoves(moves: ShuntingMove[]): ShuntingMove[][] {
    const groups: ShuntingMove[][] = [];
    const remaining = [...moves];
    
    while (remaining.length > 0) {
      const group: ShuntingMove[] = [];
      const taken = new Set<string>();
      
      for (const move of remaining) {
        // Check if this move can be done in parallel
        const hasConflict = move.conflictsWith.some(id => taken.has(id));
        
        if (!hasConflict && group.length < this.SHUNTING_PARAMETERS.MAX_SIMULTANEOUS_MOVES) {
          group.push(move);
          taken.add(move.trainsetId);
        }
      }
      
      groups.push(group);
      
      // Remove grouped moves from remaining
      group.forEach(move => {
        const index = remaining.indexOf(move);
        if (index > -1) remaining.splice(index, 1);
      });
    }
    
    return groups;
  }

  /**
   * Generate visual representation of stabling plan
   */
  public generateVisualization(plan: StablingPlan): string {
    let viz = '\n=== STABLING GEOMETRY OPTIMIZATION ===\n\n';
    viz += `Depot: ${plan.depot}\n`;
    viz += `Time: ${plan.timestamp.toLocaleString()}\n\n`;
    
    viz += 'OPTIMAL ARRANGEMENT:\n';
    
    // Group by track
    const tracks = new Map<string, string[]>();
    plan.trainsetPositions.forEach(pos => {
      const track = pos.targetBay.split('-')[0];
      if (!tracks.has(track)) tracks.set(track, []);
      tracks.get(track)!.push(`${pos.trainsetId} (P${pos.priority})`);
    });
    
    tracks.forEach((trainsets, track) => {
      viz += `  ${track}: [${trainsets.join(' <- ')}] -> EXIT\n`;
    });
    
    viz += `\nMETRICS:\n`;
    viz += `  Total Shunting Moves: ${plan.metrics.totalShuntingMoves}\n`;
    viz += `  Total Time: ${plan.metrics.totalShuntingTime} minutes\n`;
    viz += `  Energy Consumption: ${plan.metrics.totalEnergyConsumption} kWh\n`;
    viz += `  Morning Turnout: ${plan.metrics.morningTurnoutTime} minutes\n`;
    viz += `  Conflicts: ${plan.metrics.conflictCount}\n`;
    viz += `  Efficiency: ${plan.metrics.efficiency}%\n`;
    
    return viz;
  }
}

// Export singleton instance
export const stablingOptimizer = new StablingGeometryOptimizer();
