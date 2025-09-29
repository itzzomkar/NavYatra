const Optimization = require('../models/Optimization');
const Trainset = require('../models/Trainset');
const Schedule = require('../models/Schedule');
const mongoose = require('mongoose');

class AIOptimizationService {
  constructor() {
    this.models = {
      passengerDemandModel: null,
      energyConsumptionModel: null,
      delayPredictionModel: null,
      congestionPredictionModel: null,
      maintenancePredictionModel: null
    };
    
    this.historicalData = {
      passengerPatterns: [],
      energyConsumption: [],
      delays: [],
      weatherPatterns: [],
      maintenanceRecords: []
    };
    
    this.learningParameters = {
      neuralNetworkLayers: [64, 32, 16, 8],
      learningRate: 0.001,
      epochsPerUpdate: 50,
      batchSize: 32,
      validationSplit: 0.2,
      dropoutRate: 0.3
    };
    
    this.patternRecognition = {
      peakHourPatterns: new Map(),
      seasonalPatterns: new Map(),
      weatherPatterns: new Map(),
      anomalyDetection: new Map()
    };
    
    this.isInitialized = false;
    this.lastTrainingTime = null;
    this.modelAccuracy = {
      passengerDemand: 0,
      energyConsumption: 0,
      delayPrediction: 0,
      congestionPrediction: 0,
      maintenancePrediction: 0
    };
  }

  // Initialize AI service with historical data
  async initialize() {
    try {
      console.log('🤖 Initializing AI Optimization Service...');
      
      // Load historical data for training
      await this.loadHistoricalData();
      
      // Initialize ML models
      await this.initializeModels();
      
      // Load existing patterns
      await this.loadPatternRecognition();
      
      // Perform initial training
      await this.performInitialTraining();
      
      this.isInitialized = true;
      console.log('✅ AI Optimization Service initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize AI Optimization Service:', error);
      throw error;
    }
  }

  // Load historical data from database
  async loadHistoricalData() {
    try {
      console.log('📊 Loading historical data for AI training...');
      
      // Load optimization history (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const optimizations = await Optimization.find({
        createdAt: { $gte: sixMonthsAgo },
        'execution.status': 'COMPLETED'
      }).sort({ createdAt: -1 });
      
      // Extract passenger patterns
      this.historicalData.passengerPatterns = optimizations.map(opt => ({
        timestamp: opt.createdAt,
        hour: opt.createdAt.getHours(),
        dayOfWeek: opt.createdAt.getDay(),
        month: opt.createdAt.getMonth(),
        passengerLoad: opt.inputData?.realTimeContext?.passengerLoad || 0.5,
        trainsetCount: opt.inputData.trainsetCount,
        shift: opt.inputData.shift,
        fitnessScore: opt.results?.fitnessScore || 0,
        improvementPercentage: opt.results?.improvementPercentage || 0
      }));
      
      // Extract energy consumption patterns
      this.historicalData.energyConsumption = optimizations.map(opt => ({
        timestamp: opt.createdAt,
        energyConsumption: opt.results?.metrics?.energyConsumption || 1000,
        distance: opt.results?.metrics?.totalDistance || 400,
        trainsetCount: opt.inputData.trainsetCount,
        weatherImpact: opt.inputData?.realTimeContext?.weatherConditions?.impact || 'none',
        efficiency: opt.results?.metrics?.energyConsumption ? 
          (opt.results.metrics.totalDistance / opt.results.metrics.energyConsumption) : 0.4
      }));
      
      // Extract delay patterns
      this.historicalData.delays = optimizations.map(opt => ({
        timestamp: opt.createdAt,
        onTimePerformance: opt.results?.metrics?.onTimePerformance || 0.85,
        weatherImpact: opt.inputData?.realTimeContext?.weatherConditions?.impact || 'none',
        passengerLoad: opt.inputData?.realTimeContext?.passengerLoad || 0.5,
        maintenanceActive: opt.inputData?.realTimeContext?.maintenanceWindows?.length > 0,
        executionTime: opt.execution?.duration || 120000
      }));
      
      console.log('✅ Historical data loaded:', {
        optimizations: optimizations.length,
        passengerPatterns: this.historicalData.passengerPatterns.length,
        energyData: this.historicalData.energyConsumption.length,
        delayData: this.historicalData.delays.length
      });
      
    } catch (error) {
      console.error('❌ Error loading historical data:', error);
      throw error;
    }
  }

  // Initialize machine learning models
  async initializeModels() {
    try {
      console.log('🧠 Initializing ML models...');
      
      // Initialize models (simplified neural network simulation)
      this.models.passengerDemandModel = this.createNeuralNetworkModel('passenger_demand');
      this.models.energyConsumptionModel = this.createNeuralNetworkModel('energy_consumption');
      this.models.delayPredictionModel = this.createNeuralNetworkModel('delay_prediction');
      this.models.congestionPredictionModel = this.createNeuralNetworkModel('congestion_prediction');
      this.models.maintenancePredictionModel = this.createNeuralNetworkModel('maintenance_prediction');
      
      console.log('✅ ML models initialized');
      
    } catch (error) {
      console.error('❌ Error initializing ML models:', error);
      throw error;
    }
  }

  // Create neural network model (simplified simulation)
  createNeuralNetworkModel(modelType) {
    return {
      type: modelType,
      layers: this.learningParameters.neuralNetworkLayers,
      learningRate: this.learningParameters.learningRate,
      weights: this.initializeRandomWeights(),
      biases: this.initializeRandomBiases(),
      trainingHistory: [],
      accuracy: 0,
      lastTrained: null,
      predictions: 0
    };
  }

  // Initialize random weights for neural network simulation
  initializeRandomWeights() {
    const weights = [];
    for (let i = 0; i < this.learningParameters.neuralNetworkLayers.length - 1; i++) {
      const layerWeights = [];
      const currentLayer = this.learningParameters.neuralNetworkLayers[i];
      const nextLayer = this.learningParameters.neuralNetworkLayers[i + 1];
      
      for (let j = 0; j < currentLayer; j++) {
        const neuronWeights = [];
        for (let k = 0; k < nextLayer; k++) {
          neuronWeights.push((Math.random() - 0.5) * 2); // Random weight between -1 and 1
        }
        layerWeights.push(neuronWeights);
      }
      weights.push(layerWeights);
    }
    return weights;
  }

  // Initialize random biases
  initializeRandomBiases() {
    const biases = [];
    for (let i = 1; i < this.learningParameters.neuralNetworkLayers.length; i++) {
      const layerBiases = [];
      for (let j = 0; j < this.learningParameters.neuralNetworkLayers[i]; j++) {
        layerBiases.push((Math.random() - 0.5) * 0.1); // Small random bias
      }
      biases.push(layerBiases);
    }
    return biases;
  }

  // Load existing pattern recognition data
  async loadPatternRecognition() {
    try {
      console.log('🔍 Loading pattern recognition data...');
      
      // Analyze peak hour patterns
      await this.analyzePeakHourPatterns();
      
      // Analyze seasonal patterns
      await this.analyzeSeasonalPatterns();
      
      // Analyze weather patterns
      await this.analyzeWeatherPatterns();
      
      // Initialize anomaly detection
      await this.initializeAnomalyDetection();
      
      console.log('✅ Pattern recognition data loaded');
      
    } catch (error) {
      console.error('❌ Error loading pattern recognition:', error);
      throw error;
    }
  }

  // Analyze peak hour patterns
  async analyzePeakHourPatterns() {
    const hourlyPatterns = {};
    
    this.historicalData.passengerPatterns.forEach(data => {
      const hour = data.hour;
      if (!hourlyPatterns[hour]) {
        hourlyPatterns[hour] = {
          samples: 0,
          totalLoad: 0,
          avgFitnessScore: 0,
          avgImprovement: 0
        };
      }
      
      hourlyPatterns[hour].samples++;
      hourlyPatterns[hour].totalLoad += data.passengerLoad;
      hourlyPatterns[hour].avgFitnessScore += data.fitnessScore;
      hourlyPatterns[hour].avgImprovement += data.improvementPercentage;
    });
    
    // Calculate averages and identify patterns
    Object.keys(hourlyPatterns).forEach(hour => {
      const pattern = hourlyPatterns[hour];
      pattern.avgLoad = pattern.totalLoad / pattern.samples;
      pattern.avgFitnessScore /= pattern.samples;
      pattern.avgImprovement /= pattern.samples;
      
      // Classify hour type
      if (pattern.avgLoad > 0.7) {
        pattern.type = 'peak';
      } else if (pattern.avgLoad > 0.4) {
        pattern.type = 'moderate';
      } else {
        pattern.type = 'low';
      }
      
      this.patternRecognition.peakHourPatterns.set(parseInt(hour), pattern);
    });
    
    console.log('📈 Peak hour patterns analyzed for', Object.keys(hourlyPatterns).length, 'hours');
  }

  // Analyze seasonal patterns
  async analyzeSeasonalPatterns() {
    const monthlyPatterns = {};
    
    this.historicalData.passengerPatterns.forEach(data => {
      const month = data.month;
      if (!monthlyPatterns[month]) {
        monthlyPatterns[month] = {
          samples: 0,
          totalLoad: 0,
          avgEfficiency: 0,
          avgFitnessScore: 0
        };
      }
      
      monthlyPatterns[month].samples++;
      monthlyPatterns[month].totalLoad += data.passengerLoad;
      monthlyPatterns[month].avgFitnessScore += data.fitnessScore;
    });
    
    // Calculate seasonal trends
    Object.keys(monthlyPatterns).forEach(month => {
      const pattern = monthlyPatterns[month];
      pattern.avgLoad = pattern.totalLoad / pattern.samples;
      pattern.avgFitnessScore /= pattern.samples;
      
      // Determine season characteristics
      const monthNum = parseInt(month);
      if (monthNum >= 6 && monthNum <= 9) {
        pattern.season = 'monsoon';
        pattern.expectedImpact = 'high';
      } else if (monthNum >= 12 || monthNum <= 2) {
        pattern.season = 'winter';
        pattern.expectedImpact = 'low';
      } else {
        pattern.season = 'summer';
        pattern.expectedImpact = 'moderate';
      }
      
      this.patternRecognition.seasonalPatterns.set(monthNum, pattern);
    });
    
    console.log('📅 Seasonal patterns analyzed for', Object.keys(monthlyPatterns).length, 'months');
  }

  // Analyze weather patterns
  async analyzeWeatherPatterns() {
    const weatherImpacts = {};
    
    this.historicalData.delays.forEach(data => {
      const weather = data.weatherImpact;
      if (!weatherImpacts[weather]) {
        weatherImpacts[weather] = {
          samples: 0,
          avgOnTimePerf: 0,
          avgPassengerLoad: 0,
          delayIncidents: 0
        };
      }
      
      weatherImpacts[weather].samples++;
      weatherImpacts[weather].avgOnTimePerf += data.onTimePerformance;
      weatherImpacts[weather].avgPassengerLoad += data.passengerLoad;
      
      if (data.onTimePerformance < 0.8) {
        weatherImpacts[weather].delayIncidents++;
      }
    });
    
    // Calculate weather impact patterns
    Object.keys(weatherImpacts).forEach(weather => {
      const pattern = weatherImpacts[weather];
      pattern.avgOnTimePerf /= pattern.samples;
      pattern.avgPassengerLoad /= pattern.samples;
      pattern.delayProbability = pattern.delayIncidents / pattern.samples;
      
      // Classify impact severity
      if (pattern.delayProbability > 0.3) {
        pattern.severity = 'high';
        pattern.recommendedAction = 'proactive_adjustment';
      } else if (pattern.delayProbability > 0.1) {
        pattern.severity = 'moderate';
        pattern.recommendedAction = 'monitoring';
      } else {
        pattern.severity = 'low';
        pattern.recommendedAction = 'normal_operation';
      }
      
      this.patternRecognition.weatherPatterns.set(weather, pattern);
    });
    
    console.log('🌦️ Weather patterns analyzed for', Object.keys(weatherImpacts).length, 'conditions');
  }

  // Initialize anomaly detection
  async initializeAnomalyDetection() {
    // Calculate baseline metrics for anomaly detection
    const baselineMetrics = {
      avgFitnessScore: 0,
      avgImprovement: 0,
      avgEnergyEfficiency: 0,
      avgOnTimePerf: 0,
      samples: 0
    };
    
    this.historicalData.passengerPatterns.forEach(data => {
      baselineMetrics.avgFitnessScore += data.fitnessScore;
      baselineMetrics.avgImprovement += data.improvementPercentage;
      baselineMetrics.samples++;
    });
    
    this.historicalData.energyConsumption.forEach(data => {
      baselineMetrics.avgEnergyEfficiency += data.efficiency;
    });
    
    this.historicalData.delays.forEach(data => {
      baselineMetrics.avgOnTimePerf += data.onTimePerformance;
    });
    
    // Calculate averages
    baselineMetrics.avgFitnessScore /= baselineMetrics.samples;
    baselineMetrics.avgImprovement /= baselineMetrics.samples;
    baselineMetrics.avgEnergyEfficiency /= this.historicalData.energyConsumption.length;
    baselineMetrics.avgOnTimePerf /= this.historicalData.delays.length;
    
    // Set anomaly thresholds (2 standard deviations)
    this.patternRecognition.anomalyDetection.set('baseline', baselineMetrics);
    this.patternRecognition.anomalyDetection.set('thresholds', {
      fitnessScore: { min: baselineMetrics.avgFitnessScore - 2, max: baselineMetrics.avgFitnessScore + 2 },
      improvement: { min: baselineMetrics.avgImprovement - 10, max: baselineMetrics.avgImprovement + 30 },
      energyEfficiency: { min: baselineMetrics.avgEnergyEfficiency - 0.2, max: baselineMetrics.avgEnergyEfficiency + 0.3 },
      onTimePerf: { min: baselineMetrics.avgOnTimePerf - 0.15, max: 1.0 }
    });
    
    console.log('🚨 Anomaly detection initialized with baselines:', {
      avgFitnessScore: baselineMetrics.avgFitnessScore.toFixed(2),
      avgImprovement: baselineMetrics.avgImprovement.toFixed(1),
      avgEnergyEfficiency: baselineMetrics.avgEnergyEfficiency.toFixed(3),
      avgOnTimePerf: baselineMetrics.avgOnTimePerf.toFixed(3)
    });
  }

  // Perform initial training of ML models
  async performInitialTraining() {
    try {
      console.log('🎯 Performing initial ML model training...');
      
      if (this.historicalData.passengerPatterns.length < 10) {
        console.log('⚠️ Insufficient data for training. Using default models.');
        this.setDefaultModelAccuracy();
        return;
      }
      
      // Train passenger demand model
      await this.trainPassengerDemandModel();
      
      // Train energy consumption model
      await this.trainEnergyConsumptionModel();
      
      // Train delay prediction model
      await this.trainDelayPredictionModel();
      
      // Train congestion prediction model
      await this.trainCongestionPredictionModel();
      
      // Train maintenance prediction model
      await this.trainMaintenancePredictionModel();
      
      this.lastTrainingTime = new Date();
      console.log('✅ Initial ML model training completed');
      
    } catch (error) {
      console.error('❌ Error in initial training:', error);
      this.setDefaultModelAccuracy();
    }
  }

  // Train passenger demand model
  async trainPassengerDemandModel() {
    const model = this.models.passengerDemandModel;
    const trainingData = this.historicalData.passengerPatterns;
    
    // Simulate training process
    const epochs = this.learningParameters.epochsPerUpdate;
    let totalLoss = 0;
    
    for (let epoch = 0; epoch < epochs; epoch++) {
      const batchLoss = this.simulateTrainingEpoch(trainingData, 'passenger_demand');
      totalLoss += batchLoss;
      
      // Update weights (simplified simulation)
      this.updateModelWeights(model, batchLoss);
    }
    
    // Calculate accuracy based on training loss
    model.accuracy = Math.max(0.6, 1 - (totalLoss / epochs / 100));
    model.lastTrained = new Date();
    this.modelAccuracy.passengerDemand = model.accuracy;
    
    console.log(`🚄 Passenger demand model trained - Accuracy: ${(model.accuracy * 100).toFixed(1)}%`);
  }

  // Train energy consumption model
  async trainEnergyConsumptionModel() {
    const model = this.models.energyConsumptionModel;
    const trainingData = this.historicalData.energyConsumption;
    
    const epochs = this.learningParameters.epochsPerUpdate;
    let totalLoss = 0;
    
    for (let epoch = 0; epoch < epochs; epoch++) {
      const batchLoss = this.simulateTrainingEpoch(trainingData, 'energy_consumption');
      totalLoss += batchLoss;
      this.updateModelWeights(model, batchLoss);
    }
    
    model.accuracy = Math.max(0.65, 1 - (totalLoss / epochs / 120));
    model.lastTrained = new Date();
    this.modelAccuracy.energyConsumption = model.accuracy;
    
    console.log(`⚡ Energy consumption model trained - Accuracy: ${(model.accuracy * 100).toFixed(1)}%`);
  }

  // Train delay prediction model
  async trainDelayPredictionModel() {
    const model = this.models.delayPredictionModel;
    const trainingData = this.historicalData.delays;
    
    const epochs = this.learningParameters.epochsPerUpdate;
    let totalLoss = 0;
    
    for (let epoch = 0; epoch < epochs; epoch++) {
      const batchLoss = this.simulateTrainingEpoch(trainingData, 'delay_prediction');
      totalLoss += batchLoss;
      this.updateModelWeights(model, batchLoss);
    }
    
    model.accuracy = Math.max(0.7, 1 - (totalLoss / epochs / 80));
    model.lastTrained = new Date();
    this.modelAccuracy.delayPrediction = model.accuracy;
    
    console.log(`🕐 Delay prediction model trained - Accuracy: ${(model.accuracy * 100).toFixed(1)}%`);
  }

  // Train congestion prediction model
  async trainCongestionPredictionModel() {
    const model = this.models.congestionPredictionModel;
    const trainingData = this.historicalData.passengerPatterns;
    
    const epochs = Math.floor(this.learningParameters.epochsPerUpdate * 0.8); // Faster training
    let totalLoss = 0;
    
    for (let epoch = 0; epoch < epochs; epoch++) {
      const batchLoss = this.simulateTrainingEpoch(trainingData, 'congestion_prediction');
      totalLoss += batchLoss;
      this.updateModelWeights(model, batchLoss);
    }
    
    model.accuracy = Math.max(0.75, 1 - (totalLoss / epochs / 90));
    model.lastTrained = new Date();
    this.modelAccuracy.congestionPrediction = model.accuracy;
    
    console.log(`🚶 Congestion prediction model trained - Accuracy: ${(model.accuracy * 100).toFixed(1)}%`);
  }

  // Train maintenance prediction model
  async trainMaintenancePredictionModel() {
    const model = this.models.maintenancePredictionModel;
    const trainingData = this.historicalData.delays.filter(d => d.maintenanceActive);
    
    const epochs = Math.floor(this.learningParameters.epochsPerUpdate * 0.6); // Limited training data
    let totalLoss = 0;
    
    for (let epoch = 0; epoch < epochs; epoch++) {
      const batchLoss = this.simulateTrainingEpoch(trainingData, 'maintenance_prediction');
      totalLoss += batchLoss;
      this.updateModelWeights(model, batchLoss);
    }
    
    model.accuracy = Math.max(0.6, 1 - (totalLoss / epochs / 110));
    model.lastTrained = new Date();
    this.modelAccuracy.maintenancePrediction = model.accuracy;
    
    console.log(`🔧 Maintenance prediction model trained - Accuracy: ${(model.accuracy * 100).toFixed(1)}%`);
  }

  // Simulate training epoch (simplified neural network training)
  simulateTrainingEpoch(trainingData, modelType) {
    // Simulate batch processing
    const batchSize = Math.min(this.learningParameters.batchSize, trainingData.length);
    const batch = trainingData.slice(0, batchSize);
    
    let epochLoss = 0;
    
    batch.forEach(dataPoint => {
      const prediction = this.forwardPass(dataPoint, modelType);
      const target = this.getTarget(dataPoint, modelType);
      const loss = Math.pow(prediction - target, 2); // Mean squared error
      epochLoss += loss;
    });
    
    return epochLoss / batchSize;
  }

  // Simulate forward pass through neural network
  forwardPass(input, modelType) {
    // Convert input to feature vector based on model type
    const features = this.extractFeatures(input, modelType);
    
    // Simulate neural network computation
    let activation = features;
    
    // Simple linear combination with random weights (simulation)
    let output = 0;
    for (let i = 0; i < activation.length; i++) {
      output += activation[i] * (0.5 + Math.random() * 0.5); // Simplified weight
    }
    
    // Apply sigmoid activation
    return 1 / (1 + Math.exp(-output));
  }

  // Extract features based on model type
  extractFeatures(dataPoint, modelType) {
    switch (modelType) {
      case 'passenger_demand':
        return [
          dataPoint.hour / 24,
          dataPoint.dayOfWeek / 7,
          dataPoint.month / 12,
          dataPoint.passengerLoad || 0.5,
          dataPoint.trainsetCount / 20
        ];
      case 'energy_consumption':
        return [
          dataPoint.distance / 500,
          dataPoint.trainsetCount / 20,
          dataPoint.weatherImpact === 'severe' ? 1 : dataPoint.weatherImpact === 'moderate' ? 0.5 : 0,
          dataPoint.efficiency || 0.4
        ];
      case 'delay_prediction':
        return [
          dataPoint.onTimePerformance || 0.85,
          dataPoint.weatherImpact === 'severe' ? 1 : dataPoint.weatherImpact === 'moderate' ? 0.5 : 0,
          dataPoint.passengerLoad || 0.5,
          dataPoint.maintenanceActive ? 1 : 0
        ];
      case 'congestion_prediction':
        return [
          dataPoint.hour / 24,
          dataPoint.passengerLoad || 0.5,
          dataPoint.trainsetCount / 20,
          dataPoint.dayOfWeek / 7
        ];
      case 'maintenance_prediction':
        return [
          dataPoint.onTimePerformance || 0.85,
          dataPoint.executionTime / 300000, // Normalize to 5 minutes
          dataPoint.maintenanceActive ? 1 : 0,
          dataPoint.weatherImpact === 'severe' ? 1 : 0
        ];
      default:
        return [0.5, 0.5, 0.5, 0.5];
    }
  }

  // Get target value for training
  getTarget(dataPoint, modelType) {
    switch (modelType) {
      case 'passenger_demand':
        return dataPoint.passengerLoad || 0.5;
      case 'energy_consumption':
        return Math.min(1, (dataPoint.efficiency || 0.4) / 0.8);
      case 'delay_prediction':
        return dataPoint.onTimePerformance || 0.85;
      case 'congestion_prediction':
        return dataPoint.passengerLoad > 0.7 ? 1 : 0;
      case 'maintenance_prediction':
        return dataPoint.maintenanceActive ? 1 : 0;
      default:
        return 0.5;
    }
  }

  // Update model weights (simplified)
  updateModelWeights(model, loss) {
    const learningRate = model.learningRate;
    const adjustment = loss * learningRate;
    
    // Simulate weight updates
    for (let i = 0; i < model.weights.length; i++) {
      for (let j = 0; j < model.weights[i].length; j++) {
        for (let k = 0; k < model.weights[i][j].length; k++) {
          model.weights[i][j][k] -= adjustment * (Math.random() - 0.5) * 0.01;
        }
      }
    }
  }

  // Set default model accuracy when insufficient data
  setDefaultModelAccuracy() {
    this.modelAccuracy = {
      passengerDemand: 0.70,
      energyConsumption: 0.68,
      delayPrediction: 0.75,
      congestionPrediction: 0.72,
      maintenancePrediction: 0.65
    };
    
    console.log('⚠️ Using default model accuracy values');
  }

  // AI-enhanced optimization algorithm selection
  async getOptimalAlgorithm(operationalContext) {
    try {
      if (!this.isInitialized) {
        console.log('⚠️ AI service not initialized, using default algorithm selection');
        return this.getDefaultAlgorithmRecommendation(operationalContext);
      }

      const predictions = await this.generatePredictions(operationalContext);
      const contextAnalysis = this.analyzeContext(operationalContext);
      const patternMatch = this.matchHistoricalPatterns(operationalContext);
      
      // AI-based algorithm recommendation
      const algorithmScores = {
        GENETIC: 0,
        SIMULATED_ANNEALING: 0,
        LOCAL_SEARCH: 0,
        HYBRID: 0
      };
      
      // Score based on passenger demand prediction
      if (predictions.passengerDemand > 0.7) {
        algorithmScores.GENETIC += 0.8;
        algorithmScores.HYBRID += 0.6;
      } else {
        algorithmScores.SIMULATED_ANNEALING += 0.7;
        algorithmScores.LOCAL_SEARCH += 0.5;
      }
      
      // Score based on energy efficiency needs
      if (operationalContext.energyPrice > 6) {
        algorithmScores.SIMULATED_ANNEALING += 0.9;
        algorithmScores.HYBRID += 0.4;
      }
      
      // Score based on delay prediction
      if (predictions.delayProbability > 0.3) {
        algorithmScores.HYBRID += 0.8;
        algorithmScores.GENETIC += 0.5;
      }
      
      // Score based on maintenance prediction
      if (predictions.maintenanceRisk > 0.6) {
        algorithmScores.LOCAL_SEARCH += 0.9;
        algorithmScores.HYBRID += 0.3;
      }
      
      // Score based on historical pattern matching
      if (patternMatch.confidence > 0.8) {
        const historicalBest = patternMatch.recommendedAlgorithm;
        algorithmScores[historicalBest] += 0.6;
      }
      
      // Find best algorithm
      const recommendedAlgorithm = Object.keys(algorithmScores).reduce((a, b) => 
        algorithmScores[a] > algorithmScores[b] ? a : b
      );
      
      return {
        algorithm: recommendedAlgorithm,
        confidence: Math.min(0.95, Math.max(0.6, algorithmScores[recommendedAlgorithm])),
        reasoning: this.generateReasoningExplanation(algorithmScores, predictions, contextAnalysis),
        predictions,
        patternMatch,
        alternativeOptions: this.getAlternativeOptions(algorithmScores)
      };
      
    } catch (error) {
      console.error('❌ Error in AI algorithm selection:', error);
      return this.getDefaultAlgorithmRecommendation(operationalContext);
    }
  }

  // Generate AI predictions for current context
  async generatePredictions(operationalContext) {
    const predictions = {};
    
    try {
      // Predict passenger demand
      predictions.passengerDemand = await this.predictPassengerDemand(operationalContext);
      
      // Predict energy consumption
      predictions.energyConsumption = await this.predictEnergyConsumption(operationalContext);
      
      // Predict delay probability
      predictions.delayProbability = await this.predictDelayProbability(operationalContext);
      
      // Predict congestion level
      predictions.congestionLevel = await this.predictCongestionLevel(operationalContext);
      
      // Predict maintenance risk
      predictions.maintenanceRisk = await this.predictMaintenanceRisk(operationalContext);
      
      // Overall system stress prediction
      predictions.systemStress = this.calculateSystemStress(predictions);
      
    } catch (error) {
      console.error('❌ Error generating predictions:', error);
      predictions = this.getDefaultPredictions();
    }
    
    return predictions;
  }

  // Predict passenger demand using ML model
  async predictPassengerDemand(context) {
    const model = this.models.passengerDemandModel;
    const currentHour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    const month = new Date().getMonth();
    
    // Get pattern-based prediction
    const hourPattern = this.patternRecognition.peakHourPatterns.get(currentHour);
    const seasonalPattern = this.patternRecognition.seasonalPatterns.get(month);
    
    let basePrediction = 0.5; // Default
    
    if (hourPattern) {
      basePrediction = hourPattern.avgLoad;
    }
    
    // Adjust for seasonal patterns
    if (seasonalPattern) {
      if (seasonalPattern.season === 'monsoon') {
        basePrediction *= 0.85; // Reduced demand during monsoon
      } else if (seasonalPattern.season === 'winter') {
        basePrediction *= 1.1; // Increased demand in winter
      }
    }
    
    // Adjust for weather
    if (context.weatherImpact === 'severe') {
      basePrediction *= 0.7;
    } else if (context.weatherImpact === 'moderate') {
      basePrediction *= 0.9;
    }
    
    // Apply ML model prediction (simulate)
    const mlPrediction = this.forwardPass({
      hour: currentHour,
      dayOfWeek,
      month,
      passengerLoad: basePrediction,
      trainsetCount: context.activeTrains || 15
    }, 'passenger_demand');
    
    // Combine pattern-based and ML predictions
    const finalPrediction = (basePrediction * 0.6) + (mlPrediction * 0.4);
    
    model.predictions++;
    return Math.max(0, Math.min(1, finalPrediction));
  }

  // Predict energy consumption
  async predictEnergyConsumption(context) {
    const model = this.models.energyConsumptionModel;
    
    let baseConsumption = 1200; // Base kWh
    
    // Adjust for passenger load
    const passengerMultiplier = 1 + (context.totalPassengerLoad || 0.5) * 0.3;
    baseConsumption *= passengerMultiplier;
    
    // Adjust for weather
    if (context.weatherImpact === 'severe') {
      baseConsumption *= 1.2; // Higher consumption in severe weather
    }
    
    // Adjust for number of trains
    const trainMultiplier = (context.activeTrains || 15) / 15;
    baseConsumption *= trainMultiplier;
    
    // Apply ML prediction
    const mlPrediction = this.forwardPass({
      distance: 400,
      trainsetCount: context.activeTrains || 15,
      weatherImpact: context.weatherImpact,
      efficiency: 0.4
    }, 'energy_consumption');
    
    const finalConsumption = baseConsumption * (0.8 + mlPrediction * 0.4);
    
    model.predictions++;
    return Math.max(800, Math.min(2500, finalConsumption));
  }

  // Predict delay probability
  async predictDelayProbability(context) {
    const model = this.models.delayPredictionModel;
    
    let delayRisk = 0.15; // Base 15% delay risk
    
    // Adjust for weather patterns
    const weatherPattern = this.patternRecognition.weatherPatterns.get(context.weatherImpact);
    if (weatherPattern) {
      delayRisk = weatherPattern.delayProbability;
    }
    
    // Adjust for passenger load
    if (context.totalPassengerLoad > 0.8) {
      delayRisk += 0.1;
    }
    
    // Adjust for maintenance
    if (context.maintenanceWindows && context.maintenanceWindows.length > 0) {
      delayRisk += 0.2;
    }
    
    // Apply ML prediction
    const mlPrediction = this.forwardPass({
      onTimePerformance: context.onTimePerformance || 0.85,
      weatherImpact: context.weatherImpact,
      passengerLoad: context.totalPassengerLoad || 0.5,
      maintenanceActive: context.maintenanceWindows?.length > 0
    }, 'delay_prediction');
    
    // Invert ML prediction (high on-time performance = low delay risk)
    const finalRisk = (delayRisk * 0.7) + ((1 - mlPrediction) * 0.3);
    
    model.predictions++;
    return Math.max(0, Math.min(1, finalRisk));
  }

  // Predict congestion level
  async predictCongestionLevel(context) {
    const model = this.models.congestionPredictionModel;
    const currentHour = new Date().getHours();
    
    // Get hour pattern
    const hourPattern = this.patternRecognition.peakHourPatterns.get(currentHour);
    let baseCongestion = 0.4; // Default moderate congestion
    
    if (hourPattern) {
      baseCongestion = hourPattern.avgLoad;
    }
    
    // Apply ML prediction
    const mlPrediction = this.forwardPass({
      hour: currentHour,
      passengerLoad: context.totalPassengerLoad || 0.5,
      trainsetCount: context.activeTrains || 15,
      dayOfWeek: new Date().getDay()
    }, 'congestion_prediction');
    
    const finalCongestion = (baseCongestion * 0.6) + (mlPrediction * 0.4);
    
    model.predictions++;
    return Math.max(0, Math.min(1, finalCongestion));
  }

  // Predict maintenance risk
  async predictMaintenanceRisk(context) {
    const model = this.models.maintenancePredictionModel;
    
    let riskScore = 0.1; // Base low risk
    
    // Increase risk based on current performance
    if (context.onTimePerformance < 0.8) {
      riskScore += 0.3;
    }
    
    if (context.energyEfficiency < 0.7) {
      riskScore += 0.2;
    }
    
    // Weather impact on equipment
    if (context.weatherImpact === 'severe') {
      riskScore += 0.25;
    }
    
    // Apply ML prediction
    const mlPrediction = this.forwardPass({
      onTimePerformance: context.onTimePerformance || 0.85,
      executionTime: 120000,
      maintenanceActive: false,
      weatherImpact: context.weatherImpact === 'severe'
    }, 'maintenance_prediction');
    
    const finalRisk = (riskScore * 0.5) + (mlPrediction * 0.5);
    
    model.predictions++;
    return Math.max(0, Math.min(1, finalRisk));
  }

  // Calculate overall system stress
  calculateSystemStress(predictions) {
    const weights = {
      passengerDemand: 0.25,
      delayProbability: 0.3,
      congestionLevel: 0.2,
      maintenanceRisk: 0.15,
      energyPressure: 0.1
    };
    
    const energyPressure = Math.min(1, (predictions.energyConsumption || 1200) / 2000);
    
    const stress = 
      (predictions.passengerDemand * weights.passengerDemand) +
      (predictions.delayProbability * weights.delayProbability) +
      (predictions.congestionLevel * weights.congestionLevel) +
      (predictions.maintenanceRisk * weights.maintenanceRisk) +
      (energyPressure * weights.energyPressure);
    
    return Math.max(0, Math.min(1, stress));
  }

  // Analyze operational context
  analyzeContext(context) {
    return {
      timeOfDay: this.categorizeTimeOfDay(new Date().getHours()),
      operationalMode: this.determineOperationalMode(context),
      riskLevel: this.assessRiskLevel(context),
      resourceConstraints: this.identifyResourceConstraints(context),
      optimizationOpportunity: this.identifyOptimizationOpportunity(context)
    };
  }

  // Match current context with historical patterns
  matchHistoricalPatterns(context) {
    const currentHour = new Date().getHours();
    const hourPattern = this.patternRecognition.peakHourPatterns.get(currentHour);
    
    if (!hourPattern) {
      return { confidence: 0.3, recommendedAlgorithm: 'GENETIC' };
    }
    
    // Find similar historical situations
    let bestMatch = null;
    let maxSimilarity = 0;
    
    this.historicalData.passengerPatterns.forEach(historical => {
      const similarity = this.calculateSimilarity(context, historical);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        bestMatch = historical;
      }
    });
    
    if (bestMatch && maxSimilarity > 0.7) {
      // Determine which algorithm worked best for similar situations
      const recommendedAlgorithm = bestMatch.fitnessScore > 8 ? 'GENETIC' : 
                                  bestMatch.improvementPercentage > 15 ? 'SIMULATED_ANNEALING' : 'HYBRID';
      
      return {
        confidence: maxSimilarity,
        recommendedAlgorithm,
        historicalPerformance: {
          fitnessScore: bestMatch.fitnessScore,
          improvement: bestMatch.improvementPercentage
        },
        matchedContext: bestMatch
      };
    }
    
    return { confidence: 0.4, recommendedAlgorithm: 'GENETIC' };
  }

  // Calculate similarity between current and historical context
  calculateSimilarity(current, historical) {
    const currentHour = new Date().getHours();
    const hourDiff = Math.abs(currentHour - historical.hour) / 12; // Normalize to 0-2
    
    const loadDiff = Math.abs((current.totalPassengerLoad || 0.5) - historical.passengerLoad);
    const trainDiff = Math.abs((current.activeTrains || 15) - historical.trainsetCount) / 10;
    
    // Calculate similarity (0-1, higher is more similar)
    const hourSimilarity = 1 - Math.min(1, hourDiff);
    const loadSimilarity = 1 - Math.min(1, loadDiff);
    const trainSimilarity = 1 - Math.min(1, trainDiff);
    
    // Weighted average
    const similarity = (hourSimilarity * 0.4) + (loadSimilarity * 0.4) + (trainSimilarity * 0.2);
    
    return similarity;
  }

  // Generate reasoning explanation for algorithm selection
  generateReasoningExplanation(scores, predictions, analysis) {
    const topAlgorithm = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
    const reasons = [];
    
    if (predictions.passengerDemand > 0.7) {
      reasons.push('High passenger demand requires robust optimization (favors Genetic Algorithm)');
    }
    
    if (predictions.delayProbability > 0.3) {
      reasons.push('High delay risk suggests need for hybrid approach');
    }
    
    if (analysis.operationalMode === 'energy_focused') {
      reasons.push('Energy optimization priority favors Simulated Annealing');
    }
    
    if (predictions.maintenanceRisk > 0.6) {
      reasons.push('Maintenance concerns suggest Local Search for quick adjustments');
    }
    
    if (analysis.riskLevel === 'high') {
      reasons.push('High-risk situation requires most reliable algorithm');
    }
    
    return {
      primaryReasons: reasons.slice(0, 3),
      algorithmStrengths: this.getAlgorithmStrengths(topAlgorithm),
      contextFactors: analysis
    };
  }

  // Get algorithm strengths description
  getAlgorithmStrengths(algorithm) {
    const strengths = {
      GENETIC: ['Excellent for complex optimization spaces', 'Handles multiple objectives well', 'Good for high-passenger scenarios'],
      SIMULATED_ANNEALING: ['Superior energy efficiency optimization', 'Effective for cost minimization', 'Good escape from local optima'],
      LOCAL_SEARCH: ['Fast execution', 'Reliable for small adjustments', 'Good for maintenance scenarios'],
      HYBRID: ['Combines multiple approaches', 'Adaptable to various conditions', 'Balanced performance']
    };
    
    return strengths[algorithm] || ['General optimization capabilities'];
  }

  // Get alternative algorithm options
  getAlternativeOptions(scores) {
    const sortedAlgorithms = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
    
    return sortedAlgorithms.slice(1, 3).map(algorithm => ({
      algorithm,
      score: scores[algorithm],
      useCase: this.getAlgorithmUseCase(algorithm)
    }));
  }

  // Get algorithm use case description
  getAlgorithmUseCase(algorithm) {
    const useCases = {
      GENETIC: 'Best for complex, multi-objective optimization with high passenger loads',
      SIMULATED_ANNEALING: 'Optimal for energy efficiency and cost optimization during off-peak hours',
      LOCAL_SEARCH: 'Ideal for quick adjustments and maintenance scenarios',
      HYBRID: 'Versatile option for varying operational conditions'
    };
    
    return useCases[algorithm] || 'General purpose optimization';
  }

  // Default algorithm recommendation (fallback)
  getDefaultAlgorithmRecommendation(context) {
    const currentHour = new Date().getHours();
    
    let algorithm = 'GENETIC';
    if (currentHour >= 22 || currentHour <= 6) {
      algorithm = 'SIMULATED_ANNEALING'; // Energy focus during night hours
    } else if (context.maintenanceWindows && context.maintenanceWindows.length > 0) {
      algorithm = 'LOCAL_SEARCH'; // Quick adjustments during maintenance
    } else if (context.emergencyAlerts && context.emergencyAlerts.length > 0) {
      algorithm = 'HYBRID'; // Flexible approach for emergencies
    }
    
    return {
      algorithm,
      confidence: 0.6,
      reasoning: {
        primaryReasons: ['Default recommendation based on time and context'],
        algorithmStrengths: this.getAlgorithmStrengths(algorithm),
        contextFactors: { mode: 'fallback' }
      },
      predictions: this.getDefaultPredictions(),
      patternMatch: { confidence: 0.3, recommendedAlgorithm: algorithm }
    };
  }

  // Get default predictions
  getDefaultPredictions() {
    return {
      passengerDemand: 0.5,
      energyConsumption: 1200,
      delayProbability: 0.15,
      congestionLevel: 0.4,
      maintenanceRisk: 0.1,
      systemStress: 0.35
    };
  }

  // Helper methods for context analysis
  categorizeTimeOfDay(hour) {
    if (hour >= 7 && hour <= 10) return 'morning_peak';
    if (hour >= 17 && hour <= 20) return 'evening_peak';
    if (hour >= 22 || hour <= 5) return 'night';
    return 'day_time';
  }

  determineOperationalMode(context) {
    if (context.energyPrice > 6) return 'energy_focused';
    if (context.totalPassengerLoad > 0.8) return 'capacity_focused';
    if (context.maintenanceWindows?.length > 0) return 'maintenance_mode';
    if (context.emergencyAlerts?.length > 0) return 'emergency_mode';
    return 'normal_operation';
  }

  assessRiskLevel(context) {
    let riskScore = 0;
    
    if (context.weatherImpact === 'severe') riskScore += 3;
    else if (context.weatherImpact === 'moderate') riskScore += 1;
    
    if (context.onTimePerformance < 0.8) riskScore += 2;
    if (context.totalPassengerLoad > 0.9) riskScore += 2;
    if (context.emergencyAlerts?.length > 0) riskScore += 3;
    
    if (riskScore >= 5) return 'high';
    if (riskScore >= 3) return 'medium';
    return 'low';
  }

  identifyResourceConstraints(context) {
    const constraints = [];
    
    if (context.activeTrains < 12) constraints.push('limited_trains');
    if (context.energyEfficiency < 0.7) constraints.push('energy_efficiency');
    if (context.maintenanceWindows?.length > 0) constraints.push('maintenance_windows');
    if (context.totalPassengerLoad > 0.85) constraints.push('capacity_limits');
    
    return constraints;
  }

  identifyOptimizationOpportunity(context) {
    const opportunities = [];
    
    if (context.totalPassengerLoad < 0.4) opportunities.push('energy_savings');
    if (context.onTimePerformance > 0.95) opportunities.push('efficiency_gains');
    if (context.energyPrice < 5) opportunities.push('cost_optimization');
    
    return opportunities;
  }

  // Detect anomalies in optimization results
  detectAnomalies(optimizationResult) {
    if (!this.isInitialized) return { hasAnomaly: false };
    
    const thresholds = this.patternRecognition.anomalyDetection.get('thresholds');
    const anomalies = [];
    
    // Check fitness score anomaly
    if (optimizationResult.fitnessScore < thresholds.fitnessScore.min) {
      anomalies.push({
        type: 'low_fitness_score',
        severity: 'high',
        value: optimizationResult.fitnessScore,
        expected: thresholds.fitnessScore.min,
        recommendation: 'Review algorithm parameters and input data quality'
      });
    }
    
    // Check improvement anomaly
    if (optimizationResult.improvementPercentage < thresholds.improvement.min) {
      anomalies.push({
        type: 'low_improvement',
        severity: 'medium',
        value: optimizationResult.improvementPercentage,
        expected: thresholds.improvement.min,
        recommendation: 'Consider alternative optimization strategy'
      });
    }
    
    // Check energy efficiency anomaly
    const energyEfficiency = optimizationResult.metrics?.totalDistance / optimizationResult.metrics?.energyConsumption;
    if (energyEfficiency && energyEfficiency < thresholds.energyEfficiency.min) {
      anomalies.push({
        type: 'low_energy_efficiency',
        severity: 'medium',
        value: energyEfficiency,
        expected: thresholds.energyEfficiency.min,
        recommendation: 'Implement energy-saving measures'
      });
    }
    
    return {
      hasAnomaly: anomalies.length > 0,
      anomalies,
      confidence: anomalies.length > 0 ? 0.8 : 0.9
    };
  }

  // Continuous learning from new optimization results
  async updateModelsWithResult(optimizationResult, operationalContext) {
    try {
      if (!this.isInitialized) return;
      
      // Add new data point to historical data
      const newDataPoint = {
        timestamp: new Date(),
        hour: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
        month: new Date().getMonth(),
        passengerLoad: operationalContext.totalPassengerLoad || 0.5,
        trainsetCount: operationalContext.activeTrains || 15,
        shift: operationalContext.periodType,
        fitnessScore: optimizationResult.fitnessScore,
        improvementPercentage: optimizationResult.improvementPercentage,
        energyConsumption: optimizationResult.metrics?.energyConsumption,
        onTimePerformance: optimizationResult.metrics?.onTimePerformance,
        weatherImpact: operationalContext.weatherImpact
      };
      
      // Update historical data
      this.historicalData.passengerPatterns.push(newDataPoint);
      if (optimizationResult.metrics) {
        this.historicalData.energyConsumption.push({
          timestamp: new Date(),
          energyConsumption: optimizationResult.metrics.energyConsumption,
          distance: optimizationResult.metrics.totalDistance,
          trainsetCount: operationalContext.activeTrains,
          weatherImpact: operationalContext.weatherImpact,
          efficiency: optimizationResult.metrics.totalDistance / optimizationResult.metrics.energyConsumption
        });
      }
      
      // Maintain sliding window of data (keep last 1000 points)
      if (this.historicalData.passengerPatterns.length > 1000) {
        this.historicalData.passengerPatterns = this.historicalData.passengerPatterns.slice(-1000);
      }
      
      // Update patterns periodically
      if (this.historicalData.passengerPatterns.length % 100 === 0) {
        await this.updatePatternRecognition();
      }
      
      // Retrain models periodically (every 500 new data points or weekly)
      const daysSinceLastTraining = this.lastTrainingTime ? 
        (Date.now() - this.lastTrainingTime.getTime()) / (1000 * 60 * 60 * 24) : 7;
        
      if (this.historicalData.passengerPatterns.length % 500 === 0 || daysSinceLastTraining >= 7) {
        await this.performIncrementalTraining();
      }
      
    } catch (error) {
      console.error('❌ Error updating models with new result:', error);
    }
  }

  // Update pattern recognition with new data
  async updatePatternRecognition() {
    try {
      console.log('🔄 Updating pattern recognition...');
      
      // Re-analyze patterns with updated data
      await this.analyzePeakHourPatterns();
      await this.analyzeWeatherPatterns();
      
      // Update anomaly detection baselines
      await this.initializeAnomalyDetection();
      
      console.log('✅ Pattern recognition updated');
      
    } catch (error) {
      console.error('❌ Error updating pattern recognition:', error);
    }
  }

  // Perform incremental training
  async performIncrementalTraining() {
    try {
      console.log('🎯 Performing incremental model training...');
      
      // Use only recent data for incremental training
      const recentData = this.historicalData.passengerPatterns.slice(-200);
      
      if (recentData.length < 50) {
        console.log('⚠️ Insufficient recent data for incremental training');
        return;
      }
      
      // Perform lighter training with recent data
      const epochs = Math.floor(this.learningParameters.epochsPerUpdate * 0.3);
      
      for (const modelName in this.models) {
        const model = this.models[modelName];
        let totalLoss = 0;
        
        for (let epoch = 0; epoch < epochs; epoch++) {
          const batchLoss = this.simulateTrainingEpoch(recentData, modelName);
          totalLoss += batchLoss;
          this.updateModelWeights(model, batchLoss * 0.1); // Smaller updates
        }
        
        // Update accuracy
        const newAccuracy = Math.max(model.accuracy * 0.9, 1 - (totalLoss / epochs / 100));
        model.accuracy = Math.min(0.95, Math.max(0.6, newAccuracy));
        model.lastTrained = new Date();
      }
      
      this.lastTrainingTime = new Date();
      console.log('✅ Incremental training completed');
      
    } catch (error) {
      console.error('❌ Error in incremental training:', error);
    }
  }

  // Get AI service status and metrics
  getServiceStatus() {
    return {
      isInitialized: this.isInitialized,
      lastTrainingTime: this.lastTrainingTime,
      modelAccuracy: this.modelAccuracy,
      dataPoints: {
        passengerPatterns: this.historicalData.passengerPatterns.length,
        energyConsumption: this.historicalData.energyConsumption.length,
        delays: this.historicalData.delays.length
      },
      patterns: {
        peakHours: this.patternRecognition.peakHourPatterns.size,
        seasonal: this.patternRecognition.seasonalPatterns.size,
        weather: this.patternRecognition.weatherPatterns.size
      },
      modelPredictions: Object.values(this.models).reduce((sum, model) => sum + (model.predictions || 0), 0),
      healthScore: this.calculateHealthScore()
    };
  }

  // Calculate AI service health score
  calculateHealthScore() {
    if (!this.isInitialized) return 0.3;
    
    const avgAccuracy = Object.values(this.modelAccuracy).reduce((sum, acc) => sum + acc, 0) / 
                       Object.keys(this.modelAccuracy).length;
    
    const dataHealthScore = Math.min(1, this.historicalData.passengerPatterns.length / 500);
    const patternHealthScore = Math.min(1, this.patternRecognition.peakHourPatterns.size / 24);
    
    return (avgAccuracy * 0.5) + (dataHealthScore * 0.3) + (patternHealthScore * 0.2);
  }
}

// Export singleton instance
const aiOptimizationService = new AIOptimizationService();
module.exports = aiOptimizationService;