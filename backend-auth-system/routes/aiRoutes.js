const express = require('express');
const router = express.Router();
const AIDecisionEngine = require('../services/aiDecisionEngine');
const MultiObjectiveOptimizer = require('../services/multiObjectiveOptimizer');
const WhatIfSimulator = require('../services/whatIfSimulator');
const { authenticate } = require('../middleware/auth');

// Initialize services
const aiEngine = new AIDecisionEngine();
const optimizer = new MultiObjectiveOptimizer();
const simulator = new WhatIfSimulator();

/**
 * @route   POST /api/ai/decision
 * @desc    Generate AI-driven induction decision
 * @access  Private
 */
router.post('/decision', authenticate, async (req, res) => {
  try {
    const { date, shift, constraints = {} } = req.body;
    
    if (!date || !shift) {
      return res.status(400).json({
        success: false,
        message: 'Date and shift are required'
      });
    }

    const decision = await aiEngine.generateInductionDecision(date, shift, constraints);
    
    res.json({
      success: true,
      data: decision,
      message: 'AI decision generated successfully'
    });
    
  } catch (error) {
    console.error('AI Decision Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate AI decision',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/ai/optimize
 * @desc    Run multi-objective optimization
 * @access  Private
 */
router.post('/optimize', authenticate, async (req, res) => {
  try {
    const { trainsets, context, preferences = {} } = req.body;
    
    if (!trainsets || !context) {
      return res.status(400).json({
        success: false,
        message: 'Trainsets and context are required'
      });
    }

    const optimization = await optimizer.optimizeInductionSchedule(trainsets, context, preferences);
    
    res.json({
      success: true,
      data: optimization,
      message: 'Optimization completed successfully'
    });
    
  } catch (error) {
    console.error('Optimization Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run optimization',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/ai/simulate
 * @desc    Run what-if simulation
 * @access  Private
 */
router.post('/simulate', authenticate, async (req, res) => {
  try {
    const { baseScenario, variations = [] } = req.body;
    
    if (!baseScenario) {
      return res.status(400).json({
        success: false,
        message: 'Base scenario is required'
      });
    }

    const simulation = await simulator.runSimulation(baseScenario, variations);
    
    res.json({
      success: true,
      data: simulation,
      message: 'Simulation completed successfully'
    });
    
  } catch (error) {
    console.error('Simulation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run simulation',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/ai/scenarios
 * @desc    Get predefined scenarios
 * @access  Private
 */
router.get('/scenarios', authenticate, (req, res) => {
  try {
    const scenarios = simulator.createPredefinedScenarios();
    
    res.json({
      success: true,
      data: scenarios,
      message: 'Predefined scenarios retrieved successfully'
    });
    
  } catch (error) {
    console.error('Scenarios Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve scenarios',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/ai/simulations
 * @desc    Get simulation history
 * @access  Private
 */
router.get('/simulations', authenticate, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = simulator.getSimulationHistory(limit);
    
    res.json({
      success: true,
      data: history,
      message: 'Simulation history retrieved successfully'
    });
    
  } catch (error) {
    console.error('Simulation History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve simulation history',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/ai/simulations/:id
 * @desc    Get specific simulation
 * @access  Private
 */
router.get('/simulations/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const simulation = simulator.getSimulation(id);
    
    if (!simulation) {
      return res.status(404).json({
        success: false,
        message: 'Simulation not found'
      });
    }
    
    res.json({
      success: true,
      data: simulation,
      message: 'Simulation retrieved successfully'
    });
    
  } catch (error) {
    console.error('Simulation Get Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve simulation',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/ai/simulations/:id/export
 * @desc    Export simulation results
 * @access  Private
 */
router.get('/simulations/:id/export', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'json' } = req.query;
    
    const results = simulator.exportSimulationResults(id, format);
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="simulation_${id}.csv"`);
    } else {
      res.setHeader('Content-Type', 'application/json');
    }
    
    res.send(results);
    
  } catch (error) {
    console.error('Simulation Export Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export simulation',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/ai/explain
 * @desc    Get explainable reasoning for a decision
 * @access  Private
 */
router.post('/explain', authenticate, async (req, res) => {
  try {
    const { decisionId, context } = req.body;
    
    if (!decisionId) {
      return res.status(400).json({
        success: false,
        message: 'Decision ID is required'
      });
    }

    // Get decision from AI engine
    const decision = aiEngine.getDecisionHistory().find(d => d.decision.timestamp === decisionId);
    
    if (!decision) {
      return res.status(404).json({
        success: false,
        message: 'Decision not found'
      });
    }

    const explanation = {
      decisionId,
      reasoning: decision.decision.reasoning,
      keyFactors: decision.decision.reasoning.keyFactors,
      recommendations: decision.decision.recommendations,
      conflicts: decision.decision.conflicts,
      confidence: decision.decision.confidence,
      metadata: decision.decision.metadata
    };
    
    res.json({
      success: true,
      data: explanation,
      message: 'Explanation generated successfully'
    });
    
  } catch (error) {
    console.error('Explanation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate explanation',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/ai/status
 * @desc    Get AI services status
 * @access  Private
 */
router.get('/status', authenticate, (req, res) => {
  try {
    const status = {
      aiEngine: {
        status: 'ACTIVE',
        decisionsProcessed: aiEngine.getDecisionHistory().length,
        lastActivity: new Date()
      },
      optimizer: {
        status: 'ACTIVE',
        lastActivity: new Date()
      },
      simulator: {
        status: 'ACTIVE',
        simulationsRun: simulator.getSimulationHistory().length,
        lastActivity: new Date()
      }
    };
    
    res.json({
      success: true,
      data: status,
      message: 'AI services status retrieved successfully'
    });
    
  } catch (error) {
    console.error('Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve AI services status',
      error: error.message
    });
  }
});

module.exports = router;
