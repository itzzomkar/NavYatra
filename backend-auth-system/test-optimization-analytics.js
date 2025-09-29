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

// Test functions for each analytics endpoint
async function testAnalyticsEndpoints() {
  const headers = { 'Authorization': `Bearer ${authToken}` };

  console.log('\n📊 Testing Optimization Analytics Endpoints...\n');

  // 1. Test Dashboard Analytics
  console.log('1. Testing Dashboard Analytics...');
  try {
    const response = await axios.get(`${BASE_URL}/api/optimizations/analytics/dashboard`, {
      headers,
      params: { period: '30d', algorithm: 'all' }
    });
    
    if (response.data.success) {
      console.log('✅ Dashboard analytics endpoint working');
      console.log('📈 Dashboard data preview:', {
        period: response.data.data.period,
        totalOptimizations: response.data.data.overallStats?.totalOptimizations || 0,
        avgFitnessScore: response.data.data.overallStats?.avgFitnessScore || 0,
        successRate: response.data.data.overallStats?.successRate || 0,
        algorithmsTestedCount: response.data.data.algorithmPerformance?.length || 0,
        insights: response.data.data.insights?.length || 0
      });
    } else {
      console.log('❌ Dashboard analytics failed:', response.data.message);
    }
  } catch (error) {
    console.log('❌ Dashboard analytics error:', error.response?.data?.message || error.message);
  }

  // 2. Test Cost-Benefit Analysis
  console.log('\n2. Testing Cost-Benefit Analysis...');
  try {
    const response = await axios.get(`${BASE_URL}/api/optimizations/analytics/cost-benefit`, {
      headers,
      params: { period: '30d', groupBy: 'algorithm' }
    });
    
    if (response.data.success) {
      console.log('✅ Cost-benefit analysis endpoint working');
      console.log('💰 Cost-benefit data preview:', {
        period: response.data.data.period,
        groupBy: response.data.data.groupBy,
        categoriesCount: response.data.data.costBenefitAnalysis?.length || 0,
        totalOptimizations: response.data.data.summary?.totalOptimizations || 0,
        totalCostSavings: response.data.data.summary?.totalCostSavings || 0,
        bestPerforming: response.data.data.summary?.bestPerforming || 'N/A'
      });
    } else {
      console.log('❌ Cost-benefit analysis failed:', response.data.message);
    }
  } catch (error) {
    console.log('❌ Cost-benefit analysis error:', error.response?.data?.message || error.message);
  }

  // 3. Test Resource Utilization Analytics
  console.log('\n3. Testing Resource Utilization Analytics...');
  try {
    const response = await axios.get(`${BASE_URL}/api/optimizations/analytics/resource-utilization`, {
      headers,
      params: { period: '30d' }
    });
    
    if (response.data.success) {
      console.log('✅ Resource utilization analytics endpoint working');
      console.log('🔧 Resource utilization data preview:', {
        period: response.data.data.period,
        trainsetUtilizationCategories: response.data.data.trainsetUtilization?.length || 0,
        algorithmResourceUsage: response.data.data.algorithmResourceUsage?.length || 0,
        timeBasedUtilization: response.data.data.timeBasedUtilization?.length || 0,
        insights: response.data.data.insights?.length || 0
      });
    } else {
      console.log('❌ Resource utilization analytics failed:', response.data.message);
    }
  } catch (error) {
    console.log('❌ Resource utilization analytics error:', error.response?.data?.message || error.message);
  }

  // 4. Test Predictive Analytics
  console.log('\n4. Testing Predictive Analytics...');
  try {
    const response = await axios.get(`${BASE_URL}/api/optimizations/analytics/predictive`, {
      headers,
      params: { type: 'performance', horizon: '7d' }
    });
    
    if (response.data.success) {
      console.log('✅ Predictive analytics endpoint working');
      console.log('🔮 Predictive analytics data preview:', {
        type: response.data.data.type,
        horizon: response.data.data.horizon,
        confidence: response.data.data.confidence,
        hasPredictions: !!response.data.data.predictions,
        recommendationsCount: response.data.data.recommendations?.length || 0
      });
    } else {
      console.log('❌ Predictive analytics failed:', response.data.message);
    }
  } catch (error) {
    console.log('❌ Predictive analytics error:', error.response?.data?.message || error.message);
  }

  // 5. Test Export Functionality
  console.log('\n5. Testing Export Functionality...');
  try {
    const response = await axios.get(`${BASE_URL}/api/optimizations/analytics/export`, {
      headers,
      params: { format: 'json', period: '30d', includeDetails: false }
    });
    
    if (response.data.success) {
      console.log('✅ Export functionality endpoint working');
      console.log('📄 Export data preview:', {
        format: 'json',
        period: response.data.data?.period || 'N/A',
        generatedAt: response.data.data?.generatedAt || 'N/A',
        hasDetails: !!response.data.data?.details
      });
    } else {
      console.log('❌ Export functionality failed:', response.data.message);
    }
  } catch (error) {
    console.log('❌ Export functionality error:', error.response?.data?.message || error.message);
  }

  // 6. Test Different Parameters
  console.log('\n6. Testing Different Parameters...');
  
  // Test different periods
  const periods = ['7d', '30d', '90d'];
  for (const period of periods) {
    try {
      const response = await axios.get(`${BASE_URL}/api/optimizations/analytics/dashboard`, {
        headers,
        params: { period, algorithm: 'all' }
      });
      
      if (response.data.success) {
        console.log(`✅ Period ${period} working - Total optimizations: ${response.data.data.overallStats?.totalOptimizations || 0}`);
      } else {
        console.log(`❌ Period ${period} failed`);
      }
    } catch (error) {
      console.log(`❌ Period ${period} error:`, error.response?.data?.message || error.message);
    }
  }

  // Test different algorithms
  const algorithms = ['all', 'GENETIC', 'SIMULATED_ANNEALING', 'LOCAL_SEARCH'];
  for (const algorithm of algorithms) {
    try {
      const response = await axios.get(`${BASE_URL}/api/optimizations/analytics/dashboard`, {
        headers,
        params: { period: '30d', algorithm }
      });
      
      if (response.data.success) {
        console.log(`✅ Algorithm filter ${algorithm} working`);
      } else {
        console.log(`❌ Algorithm filter ${algorithm} failed`);
      }
    } catch (error) {
      console.log(`❌ Algorithm filter ${algorithm} error:`, error.response?.data?.message || error.message);
    }
  }

  // Test different groupBy options
  const groupByOptions = ['algorithm', 'shift', 'trainsetCount'];
  for (const groupBy of groupByOptions) {
    try {
      const response = await axios.get(`${BASE_URL}/api/optimizations/analytics/cost-benefit`, {
        headers,
        params: { period: '30d', groupBy }
      });
      
      if (response.data.success) {
        console.log(`✅ GroupBy ${groupBy} working - Categories: ${response.data.data.costBenefitAnalysis?.length || 0}`);
      } else {
        console.log(`❌ GroupBy ${groupBy} failed`);
      }
    } catch (error) {
      console.log(`❌ GroupBy ${groupBy} error:`, error.response?.data?.message || error.message);
    }
  }

  // Test different prediction types
  const predictionTypes = ['performance', 'cost', 'energy', 'demand'];
  for (const type of predictionTypes) {
    try {
      const response = await axios.get(`${BASE_URL}/api/optimizations/analytics/predictive`, {
        headers,
        params: { type, horizon: '7d' }
      });
      
      if (response.data.success) {
        console.log(`✅ Prediction type ${type} working - Confidence: ${response.data.data.confidence || 0}`);
      } else {
        console.log(`❌ Prediction type ${type} failed`);
      }
    } catch (error) {
      console.log(`❌ Prediction type ${type} error:`, error.response?.data?.message || error.message);
    }
  }
}

// Test specific optimization performance details (if optimizations exist)
async function testOptimizationSpecificAnalytics() {
  const headers = { 'Authorization': `Bearer ${authToken}` };

  console.log('\n🎯 Testing Specific Optimization Analytics...\n');

  try {
    // First, get some optimizations to test with
    const optimizationsResponse = await axios.get(`${BASE_URL}/api/optimizations`, { headers });
    
    if (optimizationsResponse.data.success && optimizationsResponse.data.data.length > 0) {
      const firstOptimization = optimizationsResponse.data.data[0];
      console.log(`📋 Testing with optimization: ${firstOptimization.optimizationId}`);
      
      // Test performance details for specific optimization
      const detailsResponse = await axios.get(
        `${BASE_URL}/api/optimizations/analytics/performance/${firstOptimization._id}`,
        { headers }
      );
      
      if (detailsResponse.data.success) {
        console.log('✅ Specific optimization performance details working');
        console.log('📊 Performance details preview:', {
          optimizationId: detailsResponse.data.data.basic?.optimizationId,
          algorithm: detailsResponse.data.data.basic?.algorithm,
          fitnessScore: detailsResponse.data.data.basic?.fitnessScore,
          hasEfficiency: !!detailsResponse.data.data.efficiency,
          hasComparison: !!detailsResponse.data.data.comparison,
          recommendationsCount: detailsResponse.data.data.recommendations?.length || 0
        });
      } else {
        console.log('❌ Specific optimization performance details failed:', detailsResponse.data.message);
      }
    } else {
      console.log('⚠️  No optimizations found to test specific analytics with');
      console.log('💡 You may need to run optimization seeding first');
    }
  } catch (error) {
    console.log('❌ Specific optimization analytics error:', error.response?.data?.message || error.message);
  }
}

// Test validation errors
async function testValidationErrors() {
  const headers = { 'Authorization': `Bearer ${authToken}` };

  console.log('\n🚨 Testing Validation Errors...\n');

  // Test invalid period
  try {
    await axios.get(`${BASE_URL}/api/optimizations/analytics/dashboard`, {
      headers,
      params: { period: 'invalid', algorithm: 'all' }
    });
    console.log('❌ Should have failed with invalid period');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Invalid period validation working');
    } else {
      console.log('❌ Unexpected error for invalid period:', error.message);
    }
  }

  // Test invalid algorithm
  try {
    await axios.get(`${BASE_URL}/api/optimizations/analytics/dashboard`, {
      headers,
      params: { period: '30d', algorithm: 'INVALID_ALGO' }
    });
    console.log('❌ Should have failed with invalid algorithm');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Invalid algorithm validation working');
    } else {
      console.log('❌ Unexpected error for invalid algorithm:', error.message);
    }
  }

  // Test invalid MongoDB ID for specific optimization
  try {
    await axios.get(`${BASE_URL}/api/optimizations/analytics/performance/invalid-id`, { headers });
    console.log('❌ Should have failed with invalid MongoDB ID');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Invalid MongoDB ID validation working');
    } else {
      console.log('❌ Unexpected error for invalid MongoDB ID:', error.message);
    }
  }

  // Test unauthorized access (no token)
  try {
    await axios.get(`${BASE_URL}/api/optimizations/analytics/dashboard`);
    console.log('❌ Should have failed with no authentication');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Authentication requirement working');
    } else {
      console.log('❌ Unexpected error for no authentication:', error.message);
    }
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Starting Optimization Analytics API Tests...');
  console.log('=' .repeat(60));

  // Authenticate first
  const authSuccess = await authenticate();
  if (!authSuccess) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }

  // Run all tests
  await testAnalyticsEndpoints();
  await testOptimizationSpecificAnalytics();
  await testValidationErrors();

  console.log('\n' + '='.repeat(60));
  console.log('✅ Optimization Analytics API Testing Complete!');
  console.log('\n💡 Tips:');
  console.log('- If some endpoints return empty data, make sure you have seeded optimizations');
  console.log('- Run `node seed-optimizations.js` to populate test data');
  console.log('- Check server logs for any error details');
}

// Handle process termination gracefully
process.on('unhandledRejection', (reason, promise) => {
  console.log('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the tests
runTests().catch(console.error);