import express, { Request, Response } from 'express';
import { optimizer } from '../services/optimizationEngine';

const router = express.Router();

/**
 * Run nightly optimization (21:00 IST)
 * This is the main endpoint that supervisors trigger
 */
router.post('/run', async (req: Request, res: Response) => {
  try {
    console.log('🚄 Starting nightly train induction optimization...');
    const startTime = Date.now();
    
    // Run the optimization
    const result = await optimizer.optimizeInduction();
    
    console.log(`✅ Optimization complete in ${result.processingTime}ms`);
    console.log(`📊 Summary: ${result.summary.inService} in service, ${result.summary.maintenance} maintenance, ${result.summary.standby} standby`);
    
    res.json({
      success: true,
      data: result,
      message: `Optimization completed in ${result.processingTime}ms`
    });
  } catch (error) {
    console.error('Optimization failed:', error);
    res.status(500).json({
      success: false,
      error: 'Optimization failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get last optimization result
 */
let lastOptimizationResult: any = null;

router.get('/last', async (req: Request, res: Response) => {
  if (!lastOptimizationResult) {
    // Generate a sample result if none exists
    lastOptimizationResult = await optimizer.optimizeInduction();
  }
  
  res.json({
    success: true,
    data: lastOptimizationResult
  });
});

/**
 * What-if scenario simulation
 * Allows supervisors to test hypothetical changes
 */
router.post('/simulate', async (req: Request, res: Response) => {
  try {
    const { changes } = req.body;
    
    if (!changes || !Array.isArray(changes)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request. Expected array of changes.'
      });
    }
    
    console.log('🔮 Running what-if simulation with', changes.length, 'changes');
    const result = await optimizer.simulateScenario(changes);
    
    res.json({
      success: true,
      data: result,
      message: 'Simulation complete'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Simulation failed'
    });
  }
});

/**
 * Feedback endpoint for machine learning
 * Supervisors can submit their actual decisions for ML training
 */
router.post('/feedback', async (req: Request, res: Response) => {
  try {
    const { decisions, outcome } = req.body;
    
    await optimizer.learnFromDecision(decisions, outcome);
    
    res.json({
      success: true,
      message: 'Feedback recorded for machine learning'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to record feedback'
    });
  }
});

/**
 * Get optimization configuration
 */
router.get('/config', async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      weights: {
        fitness: 0.25,
        mileage: 0.20,
        maintenance: 0.30,
        branding: 0.15,
        shunting: 0.10
      },
      thresholds: {
        criticalFitnessDays: 7,
        maxMileageDeviation: 0.15,
        minServiceTrains: 18,
        maxMaintenanceSlots: 5,
        brandingComplianceTarget: 0.90
      },
      constraints: {
        totalTrainsets: 25,
        operationalWindow: '21:00 - 23:00 IST',
        maxShuntingMoves: 30,
        maintenanceBays: 5
      }
    }
  });
});

/**
 * Get real-time metrics
 */
router.get('/metrics', async (req: Request, res: Response) => {
  // Simulate real-time metrics
  res.json({
    success: true,
    data: {
      avgOptimizationTime: 245, // ms
      dailyEnergyReduction: 4500, // kWh
      punctualityRate: 99.5, // %
      maintenanceCostReduction: 15, // %
      brandingCompliance: 94, // %
      conflictsDetected: 2,
      shuntingReduction: 35 // %
    }
  });
});

export default router;
