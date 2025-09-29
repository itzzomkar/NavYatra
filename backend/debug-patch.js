const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

const testPatch = async () => {
  try {
    // First, get a job card
    console.log('🔍 Getting job cards...');
    const jobCardsResponse = await axios.get(`${BASE_URL}/job-cards?limit=1`);
    const firstJobCard = jobCardsResponse.data.data.items[0];
    console.log('📋 First job card:', {
      id: firstJobCard.id,
      status: firstJobCard.status,
      jobCardNumber: firstJobCard.jobCardNumber
    });

    // Test PATCH with different endpoints
    console.log('\n🔧 Testing PATCH /:id...');
    try {
      const patchResponse = await axios.patch(`${BASE_URL}/job-cards/${firstJobCard.id}`, {
        status: 'COMPLETED',
        notes: 'Test completion via direct patch'
      });
      console.log('✅ PATCH /:id successful:', patchResponse.data);
    } catch (error) {
      console.log('❌ PATCH /:id failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    }

    console.log('\n🔧 Testing PUT /:id...');
    try {
      const putResponse = await axios.put(`${BASE_URL}/job-cards/${firstJobCard.id}`, {
        status: 'COMPLETED',
        notes: 'Test completion via PUT'
      });
      console.log('✅ PUT /:id successful:', putResponse.data);
    } catch (error) {
      console.log('❌ PUT /:id failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    }

    console.log('\n🔧 Testing PATCH /:id/status...');
    try {
      const statusResponse = await axios.patch(`${BASE_URL}/job-cards/${firstJobCard.id}/status`, {
        status: 'COMPLETED',
        comments: 'Test completion via status endpoint'
      });
      console.log('✅ PATCH /:id/status successful:', statusResponse.data);
    } catch (error) {
      console.log('❌ PATCH /:id/status failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testPatch();