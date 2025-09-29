const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// Test functions
const testJobCardAPI = async () => {
  console.log('🧪 Testing KMRL Job Card System with IBM Maximo Integration\n');
  
  try {
    // 1. Health check
    console.log('1️⃣ Checking server health...');
    const healthResponse = await axios.get('http://localhost:3001/health');
    console.log('✅ Server is healthy:', healthResponse.data);
    console.log();

    // 2. Create sample job cards
    console.log('2️⃣ Creating sample job cards from Maximo...');
    const sampleResponse = await axios.post(`${BASE_URL}/job-cards/sample/create`, {
      count: 15
    });
    console.log('✅ Sample job cards created:', sampleResponse.data);
    console.log();

    // 3. Get all job cards with pagination
    console.log('3️⃣ Fetching job cards with pagination...');
    const jobCardsResponse = await axios.get(`${BASE_URL}/job-cards?page=1&limit=10`);
    console.log('✅ Job cards fetched:', {
      totalItems: jobCardsResponse.data.data.pagination.totalItems,
      currentPage: jobCardsResponse.data.data.pagination.currentPage,
      count: jobCardsResponse.data.data.items.length
    });
    console.log();

    // 4. Filter job cards by status
    console.log('4️⃣ Filtering job cards by status (IN_PROGRESS)...');
    const filteredResponse = await axios.get(`${BASE_URL}/job-cards?status=IN_PROGRESS&limit=5`);
    console.log('✅ Filtered job cards:', {
      count: filteredResponse.data.data.items.length,
      statuses: filteredResponse.data.data.items.map(jc => jc.status)
    });
    console.log();

    // 5. Get job card analytics
    console.log('5️⃣ Getting job card analytics...');
    const analyticsResponse = await axios.get(`${BASE_URL}/job-cards/analytics/dashboard`);
    console.log('✅ Job card analytics:', analyticsResponse.data);
    console.log();

    // 6. Get a specific job card
    if (jobCardsResponse.data.data.items.length > 0) {
      const firstJobCard = jobCardsResponse.data.data.items[0];
      console.log('6️⃣ Getting specific job card details...');
      const detailResponse = await axios.get(`${BASE_URL}/job-cards/${firstJobCard.id}`);
      console.log('✅ Job card details:', {
        id: detailResponse.data.data.jobCard.id,
        jobCardNumber: detailResponse.data.data.jobCard.jobCardNumber,
        status: detailResponse.data.data.jobCard.status,
        priority: detailResponse.data.data.jobCard.priority,
        workType: detailResponse.data.data.jobCard.category
      });
      console.log();

      // 7. Update job card status
      console.log('7️⃣ Updating job card status...');
      const updateResponse = await axios.put(`${BASE_URL}/job-cards/${firstJobCard.id}`, {
        status: 'COMPLETED',
        notes: 'Test completion via API - completed by test_technician at ' + new Date().toISOString()
      });
      console.log('✅ Job card updated:', {
        id: updateResponse.data.id,
        oldStatus: firstJobCard.status,
        newStatus: updateResponse.data.status
      });
      console.log();

      // 8. Add comment to job card
      console.log('8️⃣ Adding comment to job card...');
      const commentResponse = await axios.post(`${BASE_URL}/job-cards/${firstJobCard.id}/comments`, {
        comment: 'This is a test comment added via API testing'
      });
      console.log('✅ Comment added:', commentResponse.data);
      console.log();
    }

    // 9. Test Maximo synchronization
    console.log('9️⃣ Testing Maximo synchronization...');
    const syncResponse = await axios.post(`${BASE_URL}/job-cards/maximo/sync`);
    console.log('✅ Maximo sync completed:', syncResponse.data);
    console.log();

    // 10. Get final analytics
    console.log('🔟 Getting final analytics after updates...');
    const finalAnalyticsResponse = await axios.get(`${BASE_URL}/job-cards/analytics/dashboard`);
    console.log('✅ Final analytics:', finalAnalyticsResponse.data);

    console.log('\n🎉 All tests completed successfully!');
    console.log('🌟 Your KMRL job card system is fully functional with IBM Maximo integration!');

  } catch (error) {
    console.error('❌ Test failed:', error.response ? error.response.data : error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
};

// Run tests
testJobCardAPI();