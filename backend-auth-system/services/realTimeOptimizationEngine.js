const Optimization = require('../models/Optimization');
const Trainset = require('../models/Trainset');
const Schedule = require('../models/Schedule');
const websocketService = require('./websocketService');
const cron = require('node-cron');
const mongoose = require('mongoose');
const aiOptimizationService = require('./aiOptimizationService');

class RealTimeOptimizationEngine {
  constructor() {
    this.isRunning = false;
    this.activeOptimizations = new Map();
    this.realTimeData = {
      passengerFlow: new Map(),
      trainPositions: new Map(),
      weatherConditions: null,
      maintenanceWindows: [],
      emergencyAlerts: [],
      energyPricing: null,
      crowdDensity: new Map(),
      platformStatus: new Map()
    };
    
    // KMRL-specific operational parameters
    this.kmrlConfig = {
      peakHours: [
        { start: '07:00', end: '10:00', type: 'morning_peak' },
        { start: '17:00', end: '20:00', type: 'evening_peak' }
      ],
      offPeakHours: [
        { start: '10:00', end: '17:00', type: 'day_time' },
        { start: '20:00', end: '23:00', type: 'night' },
        { start: '06:00', end: '07:00', type: 'early_morning' }
      ],
      stations: [
        'Aluva', 'Pulinchode', 'Companypadi', 'Ambattukavu', 'Muttom',
        'Kalamassery', 'Cochin University', 'Pathadipalam', 'Edapally',
        'Changampuzha Park', 'Palarivattom', 'JLN Stadium', 'Kaloor',
        'Town Hall', 'MG Road', 'Maharajas', 'Ernakulam South', 'Kadavanthra',
        'Elamkulam', 'Vyttila', 'Thaikoodam', 'Petta', 'Vytila Mobility Hub'
      ],
      operationalConstraints: {
        maxTrainsPerHour: 20,
        minHeadway: 180, // seconds
        maxHeadway: 900, // seconds
        maintenanceWindow: { start: '23:30', end: '05:30' },
        energyOptimizationWindow: { start: '10:00', end: '16:00' },
        maxConsecutiveHours: 18,
        mandatoryBreakTime: 30 // minutes
      }
    };
    
    this.optimizationStrategies = new Map();
    this.initializeOptimizationStrategies();
  }

  // Initialize optimization strategies for different scenarios
  initializeOptimizationStrategies() {
    this.optimizationStrategies.set('peak_hour_optimization', {
      priority: 'passenger_throughput',
      algorithm: 'GENETIC',
      parameters: {
        populationSize: 100,
        generations: 50,
        mutationRate: 0.1,
        crossoverRate: 0.8
      },
      constraints: {
        minHeadway: 120,
        maxCapacityUtilization: 0.85,
        energyEfficiency: 0.7
      }
    });

    this.optimizationStrategies.set('off_peak_optimization', {
      priority: 'energy_efficiency',
      algorithm: 'SIMULATED_ANNEALING',
      parameters: {
        initialTemperature: 1000,
        coolingRate: 0.95,
        minTemperature: 0.1
      },
      constraints: {
        maxHeadway: 600,
        minCapacityUtilization: 0.3,
        energyEfficiency: 0.9
      }
    });

    this.optimizationStrategies.set('maintenance_mode', {
      priority: 'service_continuity',
      algorithm: 'LOCAL_SEARCH',
      parameters: {
        neighborhoodSize: 20,
        maxIterations: 100
      },
      constraints: {
        reducedCapacity: 0.6,
        alternateRoutes: true,
        emergencyProtocol: true
      }
    });

    this.optimizationStrategies.set('emergency_response', {
      priority: 'safety_first',
      algorithm: 'HYBRID',
      parameters: {
        rapidResponse: true,
        riskAssessment: true
      },
      constraints: {
        safetyFirst: true,
        minimizeDisruption: true,
        quickRecovery: true
      }
    });
  }

  // Start the real-time optimization engine
  async start() {
    if (this.isRunning) {
      console.log('⚠️ Real-time optimization engine is already running');
      return;
    }

    console.log('🚀 Starting Real-time Optimization Engine...');
    this.isRunning = true;

    try {
      // Initialize real-time data collection
      await this.initializeRealTimeDataCollection();
      
      // Start continuous optimization cycles
      this.startOptimizationCycles();
      
      // Start monitoring services
      this.startMonitoringServices();
      
      // Schedule maintenance optimizations
      this.scheduleMaintenanceOptimizations();
      
      console.log('✅ Real-time Optimization Engine started successfully');
      
      // Broadcast engine status
      websocketService.broadcast('optimization_engine_status', {
        status: 'running',
        timestamp: new Date().toISOString(),
        message: 'Real-time optimization engine is now active'
      });
      
    } catch (error) {
      console.error('❌ Failed to start Real-time Optimization Engine:', error);
      this.isRunning = false;
      throw error;
    }
  }

  // Stop the real-time optimization engine
  async stop() {
    if (!this.isRunning) {
      console.log('⚠️ Real-time optimization engine is not running');
      return;
    }

    console.log('🛑 Stopping Real-time Optimization Engine...');
    this.isRunning = false;

    // Stop all running optimizations
    for (const [id, optimization] of this.activeOptimizations) {
      await this.stopOptimization(id);
    }

    // Clear scheduled jobs
    if (this.scheduledJobs) {
      this.scheduledJobs.forEach(job => job.stop());
      this.scheduledJobs = [];
    }

    console.log('✅ Real-time Optimization Engine stopped');
    
    websocketService.broadcast('optimization_engine_status', {
      status: 'stopped',
      timestamp: new Date().toISOString(),
      message: 'Real-time optimization engine has been stopped'
    });
  }

  // Initialize real-time data collection
  async initializeRealTimeDataCollection() {
    console.log('📡 Initializing real-time data collection...');

    // Simulate real-time passenger flow data
    this.updatePassengerFlowData();
    
    // Initialize train position tracking
    await this.initializeTrainPositionTracking();
    
    // Fetch current maintenance windows
    await this.fetchMaintenanceWindows();
    
    // Initialize weather monitoring
    this.initializeWeatherMonitoring();
    
    // Start energy pricing monitoring
    this.initializeEnergyPriceMonitoring();
    
    console.log('✅ Real-time data collection initialized');
  }

  // Update passenger flow data based on real-time sensors/analytics
  updatePassengerFlowData() {
    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    // Determine current period type
    const periodType = this.determinePeriodType(currentTime);
    
    // Generate realistic passenger flow data for each station
    this.kmrlConfig.stations.forEach(station => {
      const baseFlow = this.getBasePassengerFlow(station, periodType);
      const variation = this.generateFlowVariation();
      const currentFlow = Math.max(0, baseFlow + variation);
      
      this.realTimeData.passengerFlow.set(station, {
        inbound: currentFlow * 0.5,
        outbound: currentFlow * 0.5,
        waiting: Math.floor(currentFlow * 0.1),
        timestamp: new Date(),
        periodType,
        congestionLevel: this.calculateCongestionLevel(currentFlow, station)
      });
    });

    // Update crowd density for platforms
    this.updatePlatformCrowdDensity();
  }

  // Initialize train position tracking
  async initializeTrainPositionTracking() {
    try {
      const activeTrainsets = await Trainset.find({
        currentStatus: { $in: ['IN_SERVICE', 'EN_ROUTE'] }
      });

      activeTrainsets.forEach(trainset => {
        this.realTimeData.trainPositions.set(trainset.trainsetNumber, {
          currentStation: this.getRandomStation(),
          nextStation: this.getRandomStation(),
          speed: Math.floor(Math.random() * 80) + 20, // 20-100 km/h
          direction: Math.random() > 0.5 ? 'northbound' : 'southbound',
          occupancy: Math.random() * 0.9 + 0.1, // 10-100% occupancy
          onTime: Math.random() > 0.2, // 80% on-time performance
          estimatedArrival: new Date(Date.now() + Math.random() * 600000), // Next 10 minutes
          passengerCount: Math.floor(Math.random() * 300) + 50,
          energyConsumption: Math.random() * 5 + 2, // 2-7 kWh/km
          timestamp: new Date()
        });
      });
    } catch (error) {
      console.error('Error initializing train position tracking:', error);
    }
  }

  // Fetch current maintenance windows
  async fetchMaintenanceWindows() {
    // In real implementation, this would fetch from maintenance management system
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    this.realTimeData.maintenanceWindows = [
      {
        id: 'MAINT_001',
        type: 'track_maintenance',
        station: 'Aluva',
        startTime: new Date(now.getTime() + 3600000), // 1 hour from now
        endTime: new Date(now.getTime() + 7200000), // 2 hours from now
        impact: 'single_track_operation',
        priority: 'high'
      },
      {
        id: 'MAINT_002',
        type: 'signal_upgrade',
        station: 'Ernakulam South',
        startTime: new Date(tomorrow.setHours(2, 0, 0, 0)),
        endTime: new Date(tomorrow.setHours(5, 0, 0, 0)),
        impact: 'service_interruption',
        priority: 'medium'
      }
    ];
  }

  // Initialize weather monitoring
  initializeWeatherMonitoring() {
    // Simulate Kerala weather conditions
    const weatherConditions = ['clear', 'partly_cloudy', 'cloudy', 'light_rain', 'heavy_rain', 'thunderstorm'];
    const currentCondition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    
    this.realTimeData.weatherConditions = {
      condition: currentCondition,
      temperature: Math.floor(Math.random() * 10) + 25, // 25-35°C
      humidity: Math.floor(Math.random() * 30) + 60, // 60-90%
      windSpeed: Math.floor(Math.random() * 15) + 5, // 5-20 km/h
      visibility: currentCondition.includes('rain') ? 'reduced' : 'clear',
      impact: this.assessWeatherImpact(currentCondition),
      timestamp: new Date()
    };
  }

  // Initialize energy price monitoring
  initializeEnergyPriceMonitoring() {
    // Simulate dynamic energy pricing
    const currentHour = new Date().getHours();
    const basePrice = 5.50; // INR per kWh
    
    let priceMultiplier = 1.0;
    if (currentHour >= 7 && currentHour <= 10) priceMultiplier = 1.3; // Morning peak
    else if (currentHour >= 17 && currentHour <= 20) priceMultiplier = 1.4; // Evening peak
    else if (currentHour >= 22 || currentHour <= 5) priceMultiplier = 0.7; // Night time

    this.realTimeData.energyPricing = {
      currentPrice: basePrice * priceMultiplier,
      basePrice,
      priceMultiplier,
      period: this.determinePeriodType(`${currentHour}:00`),
      forecast: this.generateEnergyPriceForecast(basePrice),
      timestamp: new Date()
    };
  }

  // Start continuous optimization cycles
  startOptimizationCycles() {
    console.log('🔄 Starting continuous optimization cycles...');

    // Main optimization cycle - every 5 minutes
    this.scheduledJobs = this.scheduledJobs || [];
    
    const mainCycle = cron.schedule('*/5 * * * *', async () => {
      if (this.isRunning) {
        await this.executeOptimizationCycle();
      }
    }, { scheduled: false });

    // Peak hour intensive optimization - every 2 minutes during peak hours
    const peakCycle = cron.schedule('*/2 7-10,17-20 * * *', async () => {
      if (this.isRunning) {
        await this.executePeakHourOptimization();
      }
    }, { scheduled: false });

    // Emergency response optimization - continuous monitoring
    const emergencyCycle = cron.schedule('* * * * *', async () => {
      if (this.isRunning) {
        await this.checkEmergencyConditions();
      }
    }, { scheduled: false });

    // Real-time data update - every minute
    const dataUpdateCycle = cron.schedule('* * * * *', () => {
      if (this.isRunning) {
        this.updateRealTimeData();
      }
    }, { scheduled: false });

    this.scheduledJobs.push(mainCycle, peakCycle, emergencyCycle, dataUpdateCycle);
    
    // Start all scheduled jobs
    this.scheduledJobs.forEach(job => job.start());
  }

  // Execute main optimization cycle
  async executeOptimizationCycle() {
    try {
      console.log('🔄 Executing optimization cycle...');

      // Analyze current operational state
      const operationalState = await this.analyzeOperationalState();
      
      // Determine optimization strategy
      const strategy = this.selectOptimizationStrategy(operationalState);
      
      // Check if optimization is needed
      if (!this.isOptimizationNeeded(operationalState)) {
        console.log('ℹ️ No optimization needed at this time');
        return;
      }

      // Execute optimization
      const optimization = await this.executeOptimization(strategy, operationalState);
      
      // Monitor optimization progress
      this.monitorOptimizationProgress(optimization);

      // Broadcast optimization status
      websocketService.broadcast('optimization_cycle_complete', {
        cycleId: optimization.optimizationId,
        strategy: strategy.priority,
        operationalState,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error in optimization cycle:', error);
      websocketService.broadcast('optimization_error', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Execute peak hour optimization
  async executePeakHourOptimization() {
    try {
      console.log('🚄 Executing peak hour optimization...');

      const strategy = this.optimizationStrategies.get('peak_hour_optimization');
      const operationalState = await this.analyzeOperationalState();
      
      // Enhanced parameters for peak hour
      const enhancedStrategy = {
        ...strategy,
        parameters: {
          ...strategy.parameters,
          populationSize: 150, // Larger population for better solutions
          generations: 75, // More generations for peak hour complexity
          urgency: 'high'
        }
      };

      const optimization = await this.executeOptimization(enhancedStrategy, operationalState);
      
      websocketService.broadcast('peak_hour_optimization', {
        optimizationId: optimization.optimizationId,
        passengerLoad: this.calculateAveragePassengerLoad(),
        expectedImprovement: optimization.expectedImprovement || 15,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error in peak hour optimization:', error);
    }
  }

  // Check for emergency conditions
  async checkEmergencyConditions() {
    try {
      // Check for emergency conditions
      const emergencies = [];

      // Check weather conditions
      if (this.realTimeData.weatherConditions?.impact === 'severe') {
        emergencies.push({
          type: 'weather_emergency',
          severity: 'high',
          description: `Severe weather: ${this.realTimeData.weatherConditions.condition}`
        });
      }

      // Check train delays
      let significantDelays = 0;
      this.realTimeData.trainPositions.forEach((position, trainNumber) => {
        if (!position.onTime) {
          significantDelays++;
        }
      });

      if (significantDelays > 3) {
        emergencies.push({
          type: 'service_disruption',
          severity: 'medium',
          description: `${significantDelays} trains experiencing delays`
        });
      }

      // Check platform overcrowding
      let overcrowdedStations = 0;
      this.realTimeData.crowdDensity.forEach((density, station) => {
        if (density.level === 'critical') {
          overcrowdedStations++;
        }
      });

      if (overcrowdedStations > 2) {
        emergencies.push({
          type: 'overcrowding',
          severity: 'high',
          description: `${overcrowdedStations} stations experiencing critical overcrowding`
        });
      }

      // Execute emergency optimization if needed
      if (emergencies.length > 0) {
        await this.handleEmergencyOptimization(emergencies);
      }

    } catch (error) {
      console.error('❌ Error checking emergency conditions:', error);
    }
  }

  // Handle emergency optimization
  async handleEmergencyOptimization(emergencies) {
    console.log('🚨 Executing emergency optimization...');

    const strategy = this.optimizationStrategies.get('emergency_response');
    const operationalState = await this.analyzeOperationalState();
    
    operationalState.emergencies = emergencies;
    operationalState.urgency = 'critical';

    const optimization = await this.executeOptimization(strategy, operationalState);

    // Immediate broadcast of emergency optimization
    websocketService.broadcast('emergency_optimization', {
      optimizationId: optimization.optimizationId,
      emergencies,
      responseTime: optimization.responseTime || 30, // seconds
      expectedResolution: optimization.expectedResolution || 300, // 5 minutes
      timestamp: new Date().toISOString()
    });

    // Update emergency alerts
    this.realTimeData.emergencyAlerts = emergencies.map(emergency => ({
      ...emergency,
      optimizationId: optimization.optimizationId,
      status: 'responding',
      timestamp: new Date()
    }));
  }

  // Analyze current operational state
  async analyzeOperationalState() {
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
    
    // Calculate system-wide metrics
    const totalPassengerLoad = this.calculateAveragePassengerLoad();
    const systemCapacityUtilization = this.calculateSystemCapacityUtilization();
    const onTimePerformance = this.calculateOnTimePerformance();
    const energyEfficiency = this.calculateEnergyEfficiency();
    
    // Analyze trends
    const passengerTrend = this.analyzePassengerTrend();
    const performanceTrend = this.analyzePerformanceTrend();
    
    return {
      timestamp: currentTime,
      periodType: this.determinePeriodType(currentTimeStr),
      totalPassengerLoad,
      systemCapacityUtilization,
      onTimePerformance,
      energyEfficiency,
      passengerTrend,
      performanceTrend,
      activeTrains: this.realTimeData.trainPositions.size,
      maintenanceWindows: this.realTimeData.maintenanceWindows.filter(
        window => window.startTime <= currentTime && window.endTime >= currentTime
      ),
      weatherImpact: this.realTimeData.weatherConditions?.impact || 'none',
      energyPrice: this.realTimeData.energyPricing?.currentPrice || 5.50,
      emergencyAlerts: this.realTimeData.emergencyAlerts.filter(alert => alert.status === 'active'),
      crowdedStations: Array.from(this.realTimeData.crowdDensity.entries())
        .filter(([station, data]) => data.level === 'high' || data.level === 'critical')
        .map(([station, data]) => ({ station, level: data.level }))
    };
  }

  // Select appropriate optimization strategy
  selectOptimizationStrategy(operationalState) {
    // Use AI recommendation if available
    try {
      if (aiOptimizationService && aiOptimizationService.isInitialized) {
        const recommendation = this.getAIRecommendedStrategy(operationalState);
        if (recommendation) return recommendation;
      }
    } catch (e) {
      console.warn('AI strategy recommendation failed, falling back to rules');
    }

    // Emergency conditions take priority
    if (operationalState.emergencyAlerts.length > 0 || operationalState.weatherImpact === 'severe') {
      return this.optimizationStrategies.get('emergency_response');
    }

    // Maintenance mode
    if (operationalState.maintenanceWindows.length > 0) {
      return this.optimizationStrategies.get('maintenance_mode');
    }

    // Peak hour optimization
    if (operationalState.periodType.includes('peak') || operationalState.totalPassengerLoad > 0.7) {
      return this.optimizationStrategies.get('peak_hour_optimization');
    }

    // Default to off-peak optimization
    return this.optimizationStrategies.get('off_peak_optimization');
  }

  // Get AI-recommended strategy mapped to engine strategy config
  getAIRecommendedStrategy(operationalState) {
    // Synchronous wrapper that calls async without blocking main loop
    // Note: For simplicity, we compute synchronously using available context
    const context = {
      totalPassengerLoad: operationalState.totalPassengerLoad,
      onTimePerformance: operationalState.onTimePerformance,
      energyEfficiency: operationalState.energyEfficiency,
      activeTrains: operationalState.activeTrains,
      weatherImpact: operationalState.weatherImpact,
      maintenanceWindows: operationalState.maintenanceWindows,
      emergencyAlerts: operationalState.emergencyAlerts,
      energyPrice: operationalState.energyPrice,
      periodType: operationalState.periodType
    };

    // We can't await here; instead, we schedule async recommendation and cache result
    // For now, fallback to rule-based if no cached recommendation
    if (!this._lastAIRecommendation || Date.now() - (this._lastAIRecommendation.ts || 0) > 120000) {
      // Fire and forget async update
      aiOptimizationService.getOptimalAlgorithm(context).then(rec => {
        this._lastAIRecommendation = { ts: Date.now(), rec };
        websocketService.broadcast('ai_strategy_recommendation', {
          algorithm: rec.algorithm,
          confidence: rec.confidence,
          reasoning: rec.reasoning,
          timestamp: new Date().toISOString()
        });
      }).catch(() => {});
    }

    const rec = this._lastAIRecommendation?.rec;
    if (!rec) return null;

    // Map AI algorithm to strategy
    switch (rec.algorithm) {
      case 'GENETIC':
        return this.optimizationStrategies.get('peak_hour_optimization');
      case 'SIMULATED_ANNEALING':
        return this.optimizationStrategies.get('off_peak_optimization');
      case 'LOCAL_SEARCH':
        return this.optimizationStrategies.get('maintenance_mode');
      case 'HYBRID':
        return this.optimizationStrategies.get('emergency_response');
      default:
        return null;
    }
  }

  // Check if optimization is needed
  isOptimizationNeeded(operationalState) {
    // Always optimize during emergencies
    if (operationalState.emergencyAlerts.length > 0) return true;

    // Optimize if performance is below threshold
    if (operationalState.onTimePerformance < 0.85) return true;

    // Optimize if capacity utilization is too high or too low
    if (operationalState.systemCapacityUtilization > 0.9 || operationalState.systemCapacityUtilization < 0.3) return true;

    // Optimize if energy efficiency is poor
    if (operationalState.energyEfficiency < 0.7) return true;

    // Optimize if passenger trend is rapidly increasing
    if (operationalState.passengerTrend === 'rapidly_increasing') return true;

    // Optimize during peak hours regardless
    if (operationalState.periodType.includes('peak')) return true;

    return false;
  }

  // Execute optimization with selected strategy
  async executeOptimization(strategy, operationalState) {
    const optimizationId = `RT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🎯 Executing ${strategy.priority} optimization (${optimizationId})`);

    // Get relevant trainsets
    const trainsets = await this.getRelevantTrainsets(operationalState);
    
    // Create optimization record
    const optimizationData = {
      optimizationId,
      name: `Real-time ${strategy.priority} Optimization`,
      description: `Automated optimization for ${strategy.priority} scenario`,
      inputData: {
        trainsetIds: trainsets.map(t => t._id),
        trainsetCount: trainsets.length,
        scheduleDate: new Date(), // Required field
        shift: this.mapPeriodTypeToShift(operationalState.periodType), // Map to valid enum
        realTimeContext: {
          passengerLoad: operationalState.totalPassengerLoad,
          weatherConditions: this.realTimeData.weatherConditions,
          maintenanceWindows: operationalState.maintenanceWindows,
          emergencyAlerts: operationalState.emergencyAlerts,
          energyPrice: operationalState.energyPrice,
          timestamp: operationalState.timestamp
        }
      },
      parameters: {
        algorithm: this.mapAlgorithmName(strategy.algorithm), // Map to valid enum
        maxIterations: strategy.parameters?.maxIterations || 100,
        populationSize: strategy.parameters?.populationSize || 50,
        mutationRate: strategy.parameters?.mutationRate || 0.1,
        crossoverRate: strategy.parameters?.crossoverRate || 0.8,
        convergenceThreshold: strategy.parameters?.convergenceThreshold || 0.001
      },
      execution: {
        status: 'RUNNING', // Use valid enum value
        startTime: new Date(),
        estimatedDuration: this.estimateOptimizationDuration(strategy),
        realTimeMode: true
      },
      createdBy: null, // System-initiated - will be handled by middleware
      createdAt: new Date(),
      isArchived: false
    };

    const optimization = new Optimization(optimizationData);
    await optimization.save();

    // Add to active optimizations
    this.activeOptimizations.set(optimizationId, {
      optimization,
      strategy,
      operationalState,
      startTime: new Date()
    });

    // Start optimization execution (simulated)
    this.executeOptimizationAlgorithm(optimizationId, strategy, operationalState);

    return optimization;
  }

  // Execute optimization algorithm (simulated implementation)
  async executeOptimizationAlgorithm(optimizationId, strategy, operationalState) {
    try {
      const optimization = this.activeOptimizations.get(optimizationId);
      if (!optimization) return;

      const duration = this.estimateOptimizationDuration(strategy);
      const progressInterval = duration / 10; // 10 progress updates

      // Simulate optimization progress
      for (let i = 1; i <= 10; i++) {
        await new Promise(resolve => setTimeout(resolve, progressInterval));

        if (!this.activeOptimizations.has(optimizationId)) break;

        const progress = (i / 10) * 100;
        const currentIteration = Math.floor((i / 10) * (strategy.parameters.generations || 100));

        // Update optimization progress
        await Optimization.findOneAndUpdate(
          { optimizationId },
          {
            $set: {
              'execution.progress': progress,
              'execution.iterations': currentIteration,
              'execution.lastUpdate': new Date()
            }
          }
        );

        // Broadcast progress
        websocketService.broadcast('optimization_progress', {
          optimizationId,
          progress,
          iteration: currentIteration,
          estimatedTimeRemaining: (10 - i) * progressInterval,
          timestamp: new Date().toISOString()
        });
      }

      // Complete optimization
      await this.completeOptimization(optimizationId, strategy, operationalState);

    } catch (error) {
      console.error(`❌ Error executing optimization ${optimizationId}:`, error);
      await this.failOptimization(optimizationId, error);
    }
  }

  // Complete optimization
  async completeOptimization(optimizationId, strategy, operationalState) {
    try {
      const results = this.generateOptimizationResults(strategy, operationalState);
      const endTime = new Date();
      const optimization = this.activeOptimizations.get(optimizationId);
      const duration = endTime - optimization.startTime;

      // Update optimization record
      await Optimization.findOneAndUpdate(
        { optimizationId },
        {
          $set: {
            'execution.status': 'COMPLETED',
            'execution.endTime': endTime,
            'execution.duration': duration,
            'execution.progress': 100,
            results,
            completedAt: endTime
          }
        }
      );

      // Apply optimization results
      await this.applyOptimizationResults(optimizationId, results);

      // Update AI models with results if available
      try {
        if (aiOptimizationService && aiOptimizationService.isInitialized) {
          await aiOptimizationService.updateModelsWithResult(results, operationalState);
        }
      } catch (e) {
        console.warn('AI model update failed:', e.message);
      }

      // Remove from active optimizations
      this.activeOptimizations.delete(optimizationId);

      // Broadcast completion
      websocketService.broadcast('optimization_completed', {
        optimizationId,
        results: {
          fitnessScore: results.fitnessScore,
          improvementPercentage: results.improvementPercentage,
          energySavings: results.metrics?.energySavings || 0,
          costSavings: results.metrics?.costSavings || 0
        },
        executionTime: duration,
        appliedChanges: results.appliedChanges || [],
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Optimization ${optimizationId} completed successfully`);

    } catch (error) {
      console.error(`❌ Error completing optimization ${optimizationId}:`, error);
      await this.failOptimization(optimizationId, error);
    }
  }

  // Generate optimization results
  generateOptimizationResults(strategy, operationalState) {
    const baseFitness = 7.0;
    const fitnessScore = baseFitness + (Math.random() * 2.5) + this.getStrategyBonus(strategy, operationalState);
    
    const improvementPercentage = Math.random() * 20 + 5; // 5-25% improvement
    const scheduleCount = Math.floor(Math.random() * 15) + 8; // 8-22 schedules

    return {
      fitnessScore: Math.min(10, fitnessScore),
      improvementPercentage,
      scheduleCount,
      convergence: Math.random() * 0.3 + 0.7, // 70-100% convergence
      metrics: {
        energyConsumption: Math.random() * 1000 + 800, // 800-1800 kWh
        operationalCost: Math.random() * 15000 + 10000, // 10k-25k INR
        totalDistance: Math.random() * 200 + 300, // 300-500 km
        averageUtilization: Math.random() * 0.3 + 0.6, // 60-90%
        onTimePerformance: Math.random() * 0.15 + 0.85, // 85-100%
        passengerSatisfaction: Math.random() * 0.2 + 0.8, // 80-100%
        constraintViolations: Math.floor(Math.random() * 3), // 0-2 violations
        energySavings: Math.random() * 5000 + 2000, // 2k-7k INR
        costSavings: Math.random() * 8000 + 3000, // 3k-11k INR
        carbonReduction: Math.random() * 100 + 50 // 50-150 kg CO2
      },
      generatedSchedules: this.generateOptimizedSchedules(scheduleCount, strategy, operationalState),
      appliedChanges: this.generateAppliedChanges(strategy, operationalState),
      recommendations: this.generateRecommendations(strategy, operationalState)
    };
  }

  // Generate optimized schedules
  generateOptimizedSchedules(count, strategy, operationalState) {
    const schedules = [];
    
    for (let i = 0; i < count; i++) {
      schedules.push({
        scheduleId: `RT_SCH_${Date.now()}_${i + 1}`,
        trainsetNumber: `KMRL-${Math.floor(Math.random() * 30) + 1}`,
        route: 'Aluva ↔ Vytila Mobility Hub',
        departureTime: this.generateDepartureTime(),
        estimatedDuration: Math.random() * 30 + 45, // 45-75 minutes
        optimizationScore: Math.random() * 2 + 8, // 8-10 score
        energyOptimized: strategy.priority === 'energy_efficiency',
        capacityOptimized: strategy.priority === 'passenger_throughput',
        realTimeAdjustments: true
      });
    }
    
    return schedules;
  }

  // Generate applied changes
  generateAppliedChanges(strategy, operationalState) {
    const changes = [];
    
    if (strategy.priority === 'passenger_throughput') {
      changes.push({
        type: 'headway_reduction',
        description: 'Reduced headway during peak hours',
        impact: 'Increased service frequency by 15%'
      });
      changes.push({
        type: 'capacity_optimization',
        description: 'Optimized train consist configuration',
        impact: 'Improved passenger capacity by 8%'
      });
    }
    
    if (strategy.priority === 'energy_efficiency') {
      changes.push({
        type: 'speed_optimization',
        description: 'Optimized running speeds for energy efficiency',
        impact: 'Reduced energy consumption by 12%'
      });
      changes.push({
        type: 'regenerative_braking',
        description: 'Enhanced regenerative braking utilization',
        impact: 'Energy savings of 8%'
      });
    }
    
    if (operationalState.maintenanceWindows.length > 0) {
      changes.push({
        type: 'service_rerouting',
        description: 'Implemented alternative service routing',
        impact: 'Maintained 85% service level during maintenance'
      });
    }
    
    return changes;
  }

  // Apply optimization results to system
  async applyOptimizationResults(optimizationId, results) {
    try {
      console.log(`📋 Applying optimization results for ${optimizationId}`);

      // Update train schedules if needed
      const scheduleUpdates = results.generatedSchedules.slice(0, 5); // Apply first 5 schedules
      for (const schedule of scheduleUpdates) {
        // In real implementation, this would update the actual scheduling system
        console.log(`📅 Scheduling update: ${schedule.trainsetNumber} - ${schedule.route}`);
      }

      // Update energy management settings
      if (results.appliedChanges.some(change => change.type.includes('energy'))) {
        console.log('⚡ Applied energy optimization settings');
        // Update energy management system
      }

      // Update capacity management
      if (results.appliedChanges.some(change => change.type.includes('capacity'))) {
        console.log('👥 Applied capacity optimization settings');
        // Update capacity management system
      }

      console.log(`✅ Applied ${results.appliedChanges.length} optimization changes`);

    } catch (error) {
      console.error(`❌ Error applying optimization results for ${optimizationId}:`, error);
    }
  }

  // Monitor optimization progress
  monitorOptimizationProgress(optimization) {
    const optimizationId = optimization.optimizationId;
    
    // Set up progress monitoring
    const monitorInterval = setInterval(async () => {
      if (!this.activeOptimizations.has(optimizationId)) {
        clearInterval(monitorInterval);
        return;
      }

      const activeOpt = this.activeOptimizations.get(optimizationId);
      const elapsed = Date.now() - activeOpt.startTime;
      const estimated = this.estimateOptimizationDuration(activeOpt.strategy);

      // Check for timeout
      if (elapsed > estimated * 1.5) {
        console.log(`⏰ Optimization ${optimizationId} timeout, cancelling...`);
        await this.cancelOptimization(optimizationId, 'timeout');
        clearInterval(monitorInterval);
      }
    }, 10000); // Check every 10 seconds
  }

  // Update real-time data
  updateRealTimeData() {
    // Update passenger flow
    this.updatePassengerFlowData();
    
    // Update train positions
    this.updateTrainPositions();
    
    // Update weather conditions occasionally
    if (Math.random() < 0.1) { // 10% chance per minute
      this.initializeWeatherMonitoring();
    }
    
    // Update energy pricing occasionally
    if (Math.random() < 0.05) { // 5% chance per minute
      this.initializeEnergyPriceMonitoring();
    }
  }

  // Update train positions
  updateTrainPositions() {
    this.realTimeData.trainPositions.forEach((position, trainNumber) => {
      // Simulate movement
      position.speed = Math.max(0, position.speed + (Math.random() - 0.5) * 10);
      position.occupancy = Math.min(1, Math.max(0, position.occupancy + (Math.random() - 0.5) * 0.1));
      position.onTime = Math.random() > 0.15; // 85% on-time performance
      position.timestamp = new Date();
      
      // Occasionally change station
      if (Math.random() < 0.1) {
        position.currentStation = this.getRandomStation();
        position.nextStation = this.getRandomStation();
      }
    });
  }

  // Update platform crowd density
  updatePlatformCrowdDensity() {
    this.kmrlConfig.stations.forEach(station => {
      const passengerData = this.realTimeData.passengerFlow.get(station);
      if (passengerData) {
        const totalPeople = passengerData.waiting + passengerData.inbound;
        const platformCapacity = 200; // Average platform capacity
        const density = totalPeople / platformCapacity;
        
        let level = 'low';
        if (density > 0.8) level = 'critical';
        else if (density > 0.6) level = 'high';
        else if (density > 0.4) level = 'medium';
        
        this.realTimeData.crowdDensity.set(station, {
          density,
          level,
          totalPeople,
          platformCapacity,
          timestamp: new Date()
        });
      }
    });
  }

  // Helper methods
  determinePeriodType(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;
    
    const periods = [
      { start: 7 * 60, end: 10 * 60, type: 'morning_peak' },
      { start: 17 * 60, end: 20 * 60, type: 'evening_peak' },
      { start: 10 * 60, end: 17 * 60, type: 'day_time' },
      { start: 20 * 60, end: 23 * 60, type: 'night' },
      { start: 6 * 60, end: 7 * 60, type: 'early_morning' }
    ];
    
    const period = periods.find(p => timeInMinutes >= p.start && timeInMinutes < p.end);
    return period ? period.type : 'night';
  }

  getBasePassengerFlow(station, periodType) {
    const baseCrowdLevels = {
      'Aluva': 150, 'MG Road': 200, 'Ernakulam South': 180,
      'Vytila Mobility Hub': 250, 'Kochi University': 120
    };
    
    const baseFlow = baseCrowdLevels[station] || 100;
    
    const multipliers = {
      'morning_peak': 2.5,
      'evening_peak': 2.8,
      'day_time': 1.2,
      'night': 0.4,
      'early_morning': 0.8
    };
    
    return baseFlow * (multipliers[periodType] || 1);
  }

  generateFlowVariation() {
    return (Math.random() - 0.5) * 50; // ±25 passengers variation
  }

  calculateCongestionLevel(currentFlow, station) {
    const stationCapacity = {
      'Aluva': 300, 'MG Road': 400, 'Ernakulam South': 350,
      'Vytila Mobility Hub': 500, 'Kochi University': 250
    };
    
    const capacity = stationCapacity[station] || 200;
    const utilization = currentFlow / capacity;
    
    if (utilization > 0.9) return 'critical';
    if (utilization > 0.7) return 'high';
    if (utilization > 0.5) return 'medium';
    return 'low';
  }

  getRandomStation() {
    return this.kmrlConfig.stations[Math.floor(Math.random() * this.kmrlConfig.stations.length)];
  }

  assessWeatherImpact(condition) {
    const impacts = {
      'clear': 'none',
      'partly_cloudy': 'minimal',
      'cloudy': 'minimal',
      'light_rain': 'low',
      'heavy_rain': 'moderate',
      'thunderstorm': 'severe'
    };
    return impacts[condition] || 'none';
  }

  generateEnergyPriceForecast(basePrice) {
    const forecast = [];
    for (let i = 1; i <= 24; i++) {
      const hour = (new Date().getHours() + i) % 24;
      let multiplier = 1.0;
      if (hour >= 7 && hour <= 10) multiplier = 1.3;
      else if (hour >= 17 && hour <= 20) multiplier = 1.4;
      else if (hour >= 22 || hour <= 5) multiplier = 0.7;
      
      forecast.push({
        hour,
        price: basePrice * multiplier,
        period: this.determinePeriodType(`${hour}:00`)
      });
    }
    return forecast;
  }

  calculateAveragePassengerLoad() {
    let totalLoad = 0;
    let stationCount = 0;
    
    this.realTimeData.passengerFlow.forEach((data) => {
      totalLoad += (data.inbound + data.outbound + data.waiting);
      stationCount++;
    });
    
    return stationCount > 0 ? totalLoad / (stationCount * 200) : 0.5; // Normalized to 0-1
  }

  calculateSystemCapacityUtilization() {
    let totalUtilization = 0;
    let trainCount = 0;
    
    this.realTimeData.trainPositions.forEach((position) => {
      totalUtilization += position.occupancy;
      trainCount++;
    });
    
    return trainCount > 0 ? totalUtilization / trainCount : 0.7;
  }

  calculateOnTimePerformance() {
    let onTimeTrains = 0;
    let totalTrains = 0;
    
    this.realTimeData.trainPositions.forEach((position) => {
      if (position.onTime) onTimeTrains++;
      totalTrains++;
    });
    
    return totalTrains > 0 ? onTimeTrains / totalTrains : 0.85;
  }

  calculateEnergyEfficiency() {
    let totalEfficiency = 0;
    let trainCount = 0;
    
    this.realTimeData.trainPositions.forEach((position) => {
      // Calculate efficiency based on speed and energy consumption
      const efficiency = position.speed / (position.energyConsumption || 3);
      totalEfficiency += efficiency;
      trainCount++;
    });
    
    const avgEfficiency = trainCount > 0 ? totalEfficiency / trainCount : 20;
    return Math.min(1, avgEfficiency / 30); // Normalize to 0-1
  }

  analyzePassengerTrend() {
    // Simplified trend analysis
    const currentLoad = this.calculateAveragePassengerLoad();
    
    if (currentLoad > 0.8) return 'rapidly_increasing';
    if (currentLoad > 0.6) return 'increasing';
    if (currentLoad < 0.3) return 'decreasing';
    return 'stable';
  }

  analyzePerformanceTrend() {
    const onTimePerf = this.calculateOnTimePerformance();
    
    if (onTimePerf > 0.95) return 'excellent';
    if (onTimePerf > 0.85) return 'good';
    if (onTimePerf > 0.75) return 'fair';
    return 'poor';
  }

  async getRelevantTrainsets(operationalState) {
    return await Trainset.find({
      currentStatus: { $in: ['IN_SERVICE', 'AVAILABLE', 'EN_ROUTE'] }
    }).limit(15);
  }

  estimateOptimizationDuration(strategy) {
    const baseDurations = {
      'peak_hour_optimization': 120000, // 2 minutes
      'off_peak_optimization': 180000, // 3 minutes
      'maintenance_mode': 90000, // 1.5 minutes
      'emergency_response': 60000 // 1 minute
    };
    
    return baseDurations[strategy.priority] || 120000;
  }

  getStrategyBonus(strategy, operationalState) {
    if (strategy.priority === 'energy_efficiency' && operationalState.energyPrice > 6) return 0.5;
    if (strategy.priority === 'passenger_throughput' && operationalState.totalPassengerLoad > 0.8) return 0.8;
    if (strategy.priority === 'safety_first' && operationalState.emergencyAlerts.length > 0) return 1.0;
    return 0;
  }

  generateDepartureTime() {
    const now = new Date();
    const minutes = Math.floor(Math.random() * 60);
    const departureTime = new Date(now.getTime() + minutes * 60000);
    return departureTime.toTimeString().substr(0, 5);
  }

  generateRecommendations(strategy, operationalState) {
    const recommendations = [];
    
    if (operationalState.onTimePerformance < 0.8) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'Consider increasing service frequency during peak hours',
        impact: 'Improve on-time performance by 15%'
      });
    }
    
    if (operationalState.energyPrice > 7) {
      recommendations.push({
        type: 'energy',
        priority: 'medium',
        message: 'Implement energy-saving measures during high-price periods',
        impact: 'Reduce operational costs by 8%'
      });
    }
    
    return recommendations;
  }

  // Stop specific optimization
  async stopOptimization(optimizationId) {
    if (!this.activeOptimizations.has(optimizationId)) return;
    
    await Optimization.findOneAndUpdate(
      { optimizationId },
      {
        $set: {
          'execution.status': 'CANCELLED',
          'execution.endTime': new Date(),
          'execution.progress': 0
        }
      }
    );
    
    this.activeOptimizations.delete(optimizationId);
    
    websocketService.broadcast('optimization_cancelled', {
      optimizationId,
      timestamp: new Date().toISOString()
    });
  }

  // Cancel optimization
  async cancelOptimization(optimizationId, reason) {
    await Optimization.findOneAndUpdate(
      { optimizationId },
      {
        $set: {
          'execution.status': 'CANCELLED',
          'execution.endTime': new Date(),
          'execution.failureReason': reason
        }
      }
    );
    
    this.activeOptimizations.delete(optimizationId);
  }

  // Fail optimization
  async failOptimization(optimizationId, error) {
    await Optimization.findOneAndUpdate(
      { optimizationId },
      {
        $set: {
          'execution.status': 'FAILED',
          'execution.endTime': new Date(),
          'execution.error': error.message
        }
      }
    );
    
    this.activeOptimizations.delete(optimizationId);
  }

  // Start monitoring services
  startMonitoringServices() {
    console.log('🔍 Starting monitoring services...');
    // Additional monitoring services can be added here
  }

  // Schedule maintenance optimizations
  scheduleMaintenanceOptimizations() {
    // Schedule daily maintenance window optimization
    const maintenanceJob = cron.schedule('30 23 * * *', async () => {
      if (this.isRunning) {
        console.log('🔧 Executing scheduled maintenance optimization...');
        const strategy = this.optimizationStrategies.get('maintenance_mode');
        const operationalState = await this.analyzeOperationalState();
        await this.executeOptimization(strategy, operationalState);
      }
    }, { scheduled: false });

    this.scheduledJobs = this.scheduledJobs || [];
    this.scheduledJobs.push(maintenanceJob);
    maintenanceJob.start();
  }

  // Map period type to valid shift enum
  mapPeriodTypeToShift(periodType) {
    const shiftMap = {
      'morning': 'MORNING',
      'afternoon': 'AFTERNOON', 
      'evening': 'EVENING',
      'day_time': 'MORNING',
      'night_time': 'EVENING',
      'peak_hours': 'MORNING',
      'off_peak': 'AFTERNOON'
    };
    return shiftMap[periodType] || 'MORNING';
  }

  // Map algorithm name to valid enum
  mapAlgorithmName(algorithm) {
    const algorithmMap = {
      'genetic': 'GENETIC_ALGORITHM',
      'genetic_algorithm': 'GENETIC_ALGORITHM',
      'simulated_annealing': 'SIMULATED_ANNEALING',
      'particle_swarm': 'PARTICLE_SWARM',
      'tabu_search': 'TABU_SEARCH',
      'local_search': 'LOCAL_SEARCH',
      'hybrid': 'HYBRID'
    };
    return algorithmMap[algorithm] || 'GENETIC_ALGORITHM';
  }

  // Get engine status
  getEngineStatus() {
    return {
      isRunning: this.isRunning,
      activeOptimizations: this.activeOptimizations.size,
      realTimeData: {
        stations: this.realTimeData.passengerFlow.size,
        trains: this.realTimeData.trainPositions.size,
        emergencyAlerts: this.realTimeData.emergencyAlerts.length,
        maintenanceWindows: this.realTimeData.maintenanceWindows.length
      },
      systemMetrics: {
        averagePassengerLoad: this.calculateAveragePassengerLoad(),
        systemCapacityUtilization: this.calculateSystemCapacityUtilization(),
        onTimePerformance: this.calculateOnTimePerformance(),
        energyEfficiency: this.calculateEnergyEfficiency()
      },
      lastUpdate: new Date().toISOString()
    };
  }
}

// Export singleton instance
const realTimeOptimizationEngine = new RealTimeOptimizationEngine();
module.exports = realTimeOptimizationEngine;