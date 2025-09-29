const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test configuration
const testConfig = {
  email: 'admin@kmrl.com', 
  password: 'Admin123!'
};

let authToken = '';

// Test authentication first
async function authenticate() {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, testConfig);
    if (response.data.success && response.data.token) {
      authToken = response.data.token;
      console.log('✅ Authentication successful');
      return true;
    } else {
      console.error('❌ Authentication failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Authentication error:', error.response?.data?.message || error.message);
    return false;
  }
}

// Test AI service status
async function testAIServiceStatus() {
  try {
    console.log('\n🤖 Testing AI Service Status...');
    
    const response = await axios.get(`${BASE_URL}/api/ai-service/status`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ AI service status endpoint working');
      console.log('🧠 AI Service Status:', {
        isInitialized: response.data.data.isInitialized,
        modelAccuracy: response.data.data.modelAccuracy,
        dataPoints: response.data.data.dataPoints,
        healthScore: response.data.data.healthScore?.toFixed(2) || '0',
        totalPredictions: response.data.data.modelPredictions || 0
      });
      
      return response.data.data.isInitialized;
    } else {
      console.log('❌ AI service status failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ AI service status error:', error.response?.data?.message || error.message);
    return false;
  }
}

// Test AI service initialization
async function testAIServiceInitialization() {
  try {
    console.log('\n🚀 Testing AI Service Initialization...');
    
    const response = await axios.post(`${BASE_URL}/api/ai-service/initialize`, {}, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ AI service initialization successful');
      console.log('🎯 Initialization details:', {
        modelAccuracy: response.data.status.modelAccuracy,
        dataPoints: response.data.status.dataPoints,
        patterns: response.data.status.patterns,
        healthScore: response.data.status.healthScore?.toFixed(2) || '0'
      });
      
      return true;
    } else {
      console.log('❌ AI service initialization failed:', response.data.message);
      return false;
    }
    
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('⚠️ Admin access required for AI service initialization');
      return true; // This is expected behavior for non-admin users
    } else {
      console.log('❌ AI service initialization error:', error.response?.data?.message || error.message);
      return false;
    }
  }
}

// Test AI algorithm recommendation
async function testAIAlgorithmRecommendation() {
  try {
    console.log('\n🎯 Testing AI Algorithm Recommendation...');
    
    // Test different operational scenarios
    const scenarios = [
      {
        name: 'Peak Hour High Load',
        context: {
          totalPassengerLoad: 0.85,
          onTimePerformance: 0.88,
          energyEfficiency: 0.75,
          activeTrains: 18,
          weatherImpact: 'minimal',
          energyPrice: 6.2,
          periodType: 'morning_peak'
        }
      },
      {
        name: 'Off-Peak Energy Focus',
        context: {
          totalPassengerLoad: 0.35,
          onTimePerformance: 0.92,
          energyEfficiency: 0.68,
          activeTrains: 12,
          weatherImpact: 'none',
          energyPrice: 7.1,
          periodType: 'day_time'
        }
      },
      {
        name: 'Severe Weather Emergency',
        context: {
          totalPassengerLoad: 0.65,
          onTimePerformance: 0.76,
          energyEfficiency: 0.71,
          activeTrains: 15,
          weatherImpact: 'severe',
          energyPrice: 5.8,
          periodType: 'evening_peak'
        }
      }
    ];

    for (const scenario of scenarios) {
      console.log(`\n📊 Testing scenario: ${scenario.name}`);
      
      const response = await axios.post(`${BASE_URL}/api/ai-service/algorithm-recommendation`, scenario.context, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (response.data.success) {
        console.log('✅ AI algorithm recommendation successful');
        console.log('🧠 Recommendation details:', {
          algorithm: response.data.data.algorithm,
          confidence: (response.data.data.confidence * 100).toFixed(1) + '%',
          primaryReasons: response.data.data.reasoning?.primaryReasons?.slice(0, 2) || [],
          predictions: {
            passengerDemand: (response.data.data.predictions?.passengerDemand * 100)?.toFixed(1) + '%',
            delayProbability: (response.data.data.predictions?.delayProbability * 100)?.toFixed(1) + '%',
            systemStress: (response.data.data.predictions?.systemStress * 100)?.toFixed(1) + '%'
          }
        });
      } else {
        console.log('❌ AI algorithm recommendation failed:', response.data.message);
      }
    }
    
  } catch (error) {
    console.log('❌ AI algorithm recommendation error:', error.response?.data?.message || error.message);
  }
}

// Test AI predictions
async function testAIPredictions() {
  try {
    console.log('\n🔮 Testing AI Predictions...');
    
    const operationalContext = {
      totalPassengerLoad: 0.7,
      onTimePerformance: 0.85,
      energyEfficiency: 0.72,
      activeTrains: 16,
      weatherImpact: 'moderate',
      energyPrice: 6.5,
      periodType: 'morning_peak'
    };
    
    const response = await axios.post(`${BASE_URL}/api/ai-service/predictions`, operationalContext, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ AI predictions generated successfully');
      console.log('🔮 Prediction details:', {
        passengerDemand: (response.data.data.predictions.passengerDemand * 100).toFixed(1) + '%',
        energyConsumption: Math.round(response.data.data.predictions.energyConsumption) + ' kWh',
        delayProbability: (response.data.data.predictions.delayProbability * 100).toFixed(1) + '%',
        congestionLevel: (response.data.data.predictions.congestionLevel * 100).toFixed(1) + '%',
        maintenanceRisk: (response.data.data.predictions.maintenanceRisk * 100).toFixed(1) + '%',
        systemStress: (response.data.data.predictions.systemStress * 100).toFixed(1) + '%',
        modelAccuracy: response.data.data.modelAccuracy
      });
    } else {
      console.log('❌ AI predictions failed:', response.data.message);
    }
    
  } catch (error) {
    console.log('❌ AI predictions error:', error.response?.data?.message || error.message);
  }
}

// Test anomaly detection
async function testAnomalyDetection() {
  try {
    console.log('\n🚨 Testing Anomaly Detection...');
    
    // Test normal results
    const normalResult = {
      fitnessScore: 8.2,
      improvementPercentage: 12.5,
      metrics: {
        energyConsumption: 1200,
        totalDistance: 450,
        operationalCost: 18000,
        onTimePerformance: 0.88
      }
    };
    
    const normalResponse = await axios.post(`${BASE_URL}/api/ai-service/detect-anomalies`, normalResult, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (normalResponse.data.success) {
      console.log('✅ Normal result anomaly detection successful');
      console.log('📊 Normal result analysis:', {
        hasAnomaly: normalResponse.data.data.hasAnomaly,
        anomalies: normalResponse.data.data.anomalies?.length || 0,
        confidence: normalResponse.data.data.confidence?.toFixed(2) || '0'
      });
    }
    
    // Test anomalous results
    const anomalousResult = {
      fitnessScore: 4.2, // Very low fitness score
      improvementPercentage: -5.0, // Negative improvement
      metrics: {
        energyConsumption: 2800, // Very high consumption
        totalDistance: 300, // Low distance
        operationalCost: 35000,
        onTimePerformance: 0.65 // Poor performance
      }
    };
    
    const anomalousResponse = await axios.post(`${BASE_URL}/api/ai-service/detect-anomalies`, anomalousResult, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (anomalousResponse.data.success) {
      console.log('🚨 Anomalous result detection successful');
      console.log('⚠️ Anomaly details:', {
        hasAnomaly: anomalousResponse.data.data.hasAnomaly,
        anomalies: anomalousResponse.data.data.anomalies?.map(a => ({
          type: a.type,
          severity: a.severity,
          recommendation: a.recommendation
        })) || [],
        confidence: anomalousResponse.data.data.confidence?.toFixed(2) || '0'
      });
    }
    
  } catch (error) {
    console.log('❌ Anomaly detection error:', error.response?.data?.message || error.message);
  }
}

// Test operational recommendations
async function testOperationalRecommendations() {
  try {
    console.log('\n💡 Testing Operational Recommendations...');
    
    const operationalContext = {
      totalPassengerLoad: 0.88, // High load
      onTimePerformance: 0.78, // Poor performance
      energyEfficiency: 0.65, // Low efficiency
      activeTrains: 14, // Limited trains
      weatherImpact: 'moderate',
      energyPrice: 7.2, // High energy price
      periodType: 'evening_peak'
    };
    
    const response = await axios.post(`${BASE_URL}/api/ai-service/recommendations`, operationalContext, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ Operational recommendations generated successfully');
      console.log('💡 Recommendations summary:', {
        totalRecommendations: response.data.data.recommendations?.length || 0,
        overallPriority: response.data.data.priority,
        confidence: (response.data.data.confidence * 100).toFixed(1) + '%',
        timeframe: response.data.data.applicableTimeframe,
        systemStress: (response.data.data.predictions.systemStress * 100).toFixed(1) + '%'
      });
      
      // Show top 3 recommendations
      const topRecommendations = response.data.data.recommendations?.slice(0, 3) || [];
      topRecommendations.forEach((rec, index) => {
        console.log(`📋 Recommendation ${index + 1}:`, {
          title: rec.title,
          category: rec.category,
          priority: rec.priority,
          expectedImpact: rec.expectedImpact,
          timeframe: rec.timeframe
        });
      });
    } else {
      console.log('❌ Operational recommendations failed:', response.data.message);
    }
    
  } catch (error) {
    console.log('❌ Operational recommendations error:', error.response?.data?.message || error.message);
  }
}

// Test pattern insights
async function testPatternInsights() {
  try {
    console.log('\n🔍 Testing Pattern Insights...');
    
    const patternTypes = ['peak_hours', 'seasonal', 'weather'];
    
    for (const type of patternTypes) {
      const response = await axios.get(`${BASE_URL}/api/ai-service/patterns?type=${type}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (response.data.success) {
        console.log(`✅ ${type} patterns retrieved successfully`);
        
        if (type === 'peak_hours') {
          const patterns = response.data.data.peakHourPatterns || [];
          console.log('📈 Peak hour patterns:', {
            totalHours: patterns.length,
            peakHours: patterns.filter(p => p.type === 'peak').length,
            avgFitnessScore: (patterns.reduce((sum, p) => sum + (p.avgFitnessScore || 0), 0) / patterns.length).toFixed(2)
          });
        } else if (type === 'weather') {
          const patterns = response.data.data.weatherPatterns || [];
          console.log('🌦️ Weather patterns:', {
            conditions: patterns.length,
            highImpact: patterns.filter(p => p.severity === 'high').length,
            avgDelayProbability: (patterns.reduce((sum, p) => sum + (p.delayProbability || 0), 0) / patterns.length * 100).toFixed(1) + '%'
          });
        }
      } else {
        console.log(`❌ ${type} patterns failed:`, response.data.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Pattern insights error:', error.response?.data?.message || error.message);
  }
}

// Test model performance
async function testModelPerformance() {
  try {
    console.log('\n📊 Testing Model Performance...');
    
    const response = await axios.get(`${BASE_URL}/api/ai-service/model-performance`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ Model performance retrieved successfully');
      console.log('🧠 Model performance summary:', {
        overallHealthScore: (response.data.data.healthScore * 100).toFixed(1) + '%',
        avgAccuracy: Object.values(response.data.data.modelAccuracy).reduce((sum, acc) => sum + acc, 0) / Object.keys(response.data.data.modelAccuracy).length * 100,
        dataQuality: response.data.data.dataQuality,
        lastTraining: response.data.data.lastTrainingTime ? new Date(response.data.data.lastTrainingTime).toLocaleDateString() : 'Never',
        totalPredictions: Object.values(response.data.data.modelDetails).reduce((sum, model) => sum + (model.predictions || 0), 0)
      });
      
      // Show individual model accuracies
      Object.entries(response.data.data.modelAccuracy).forEach(([model, accuracy]) => {
        console.log(`🎯 ${model}: ${(accuracy * 100).toFixed(1)}%`);
      });
    } else {
      console.log('❌ Model performance failed:', response.data.message);
    }
    
  } catch (error) {
    console.log('❌ Model performance error:', error.response?.data?.message || error.message);
  }
}

// Test model retraining
async function testModelRetraining() {
  try {
    console.log('\n🎯 Testing Model Retraining...');
    
    const response = await axios.post(`${BASE_URL}/api/ai-service/retrain`, {
      type: 'incremental'
    }, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ Model retraining successful');
      console.log('🔄 Retraining results:', {
        type: 'incremental',
        newHealthScore: (response.data.healthScore * 100).toFixed(1) + '%',
        triggeredBy: response.data.triggeredBy,
        newModelAccuracy: response.data.newModelAccuracy
      });
    } else {
      console.log('❌ Model retraining failed:', response.data.message);
    }
    
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('⚠️ Admin access required for model retraining');
    } else {
      console.log('❌ Model retraining error:', error.response?.data?.message || error.message);
    }
  }
}

// Test error handling
async function testErrorHandling() {
  try {
    console.log('\n🚨 Testing Error Handling...');
    
    // Test invalid operational context
    try {
      await axios.post(`${BASE_URL}/api/ai-service/predictions`, {
        totalPassengerLoad: 1.5, // Invalid value > 1
        onTimePerformance: -0.1, // Invalid negative value
        weatherImpact: 'invalid_weather' // Invalid enum
      }, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      console.log('❌ Should have failed with invalid operational context');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Invalid operational context validation working');
      } else {
        console.log('❌ Unexpected error for invalid context:', error.message);
      }
    }
    
    // Test unauthorized access
    try {
      await axios.get(`${BASE_URL}/api/ai-service/status`);
      console.log('❌ Should have failed without authentication');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Authentication requirement working');
      } else {
        console.log('❌ Unexpected error for no authentication:', error.message);
      }
    }
    
    // Test AI service not initialized scenario (if it was not initialized)
    
  } catch (error) {
    console.log('❌ Error handling test error:', error.message);
  }
}

// Test integration with real-time engine
async function testRealTimeEngineIntegration() {
  console.log('\n🔗 Testing Real-time Engine Integration...');
  
  // Check if both services are running
  try {
    const [aiStatus, engineStatus] = await Promise.all([
      axios.get(`${BASE_URL}/api/ai-service/status`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }),
      axios.get(`${BASE_URL}/api/real-time-engine/status`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })
    ]);
    
    const aiInitialized = aiStatus.data.success && aiStatus.data.data.isInitialized;
    const engineRunning = engineStatus.data.success && engineStatus.data.data.isRunning;
    
    console.log('🔧 Integration status:', {
      aiServiceInitialized: aiInitialized,
      realTimeEngineRunning: engineRunning,
      integrationReady: aiInitialized && engineRunning
    });
    
    if (aiInitialized && engineRunning) {
      console.log('✅ AI service and real-time engine integration is ready');
      console.log('🤖 The real-time engine can now use AI recommendations for optimization strategy selection');
    } else {
      console.log('⚠️ Integration not fully ready - ensure both services are running');
    }
    
  } catch (error) {
    console.log('❌ Integration test error:', error.response?.data?.message || error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Starting AI Service Integration Tests...');
  console.log('=' .repeat(60));

  // Authenticate first
  const authSuccess = await authenticate();
  if (!authSuccess) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }

  // Check initial AI service status
  const aiInitialized = await testAIServiceStatus();
  
  // Initialize if needed (admin required)
  if (!aiInitialized) {
    await testAIServiceInitialization();
  }

  // Run comprehensive tests
  await testAIAlgorithmRecommendation();
  await testAIPredictions();
  await testAnomalyDetection();
  await testOperationalRecommendations();
  await testPatternInsights();
  await testModelPerformance();
  await testModelRetraining();
  await testErrorHandling();
  await testRealTimeEngineIntegration();

  console.log('\n' + '='.repeat(60));
  console.log('✅ AI Service Integration Testing Complete!');
  console.log('\n💡 Next Steps:');
  console.log('- Monitor AI model performance in production');
  console.log('- Set up scheduled model retraining');
  console.log('- Implement frontend AI insights dashboard');
  console.log('- Configure real-time AI-driven optimizations');
  console.log('- Set up alerting for anomaly detection');
}

// Handle process termination gracefully
process.on('unhandledRejection', (reason, promise) => {
  console.log('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the tests
runTests().catch(console.error);