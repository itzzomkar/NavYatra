require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://localhost:5000';

async function testLogin() {
  const credentials = [
    { identifier: 'admin@kmrl.com', password: 'Password123' },
    { identifier: 'testuser@example.com', password: 'Password123' },
    { identifier: 'supervisor@kmrl.com', password: 'Password123' }
  ];

  for (const cred of credentials) {
    try {
      console.log(`Testing: ${cred.identifier} with password: ${cred.password}`);
      const response = await axios.post(`${API_BASE}/api/auth/login`, cred);
      
      if (response.data.success) {
        console.log(`✅ Login successful for ${cred.identifier}`);
        console.log(`Token: ${response.data.token?.substring(0, 20)}...`);
        console.log(`User: ${response.data.user?.name} (${response.data.user?.role})`);
        return cred;
      }
    } catch (error) {
      console.log(`❌ Login failed for ${cred.identifier}: ${error.response?.data?.message || error.message}`);
    }
  }
  
  return null;
}

testLogin().then(result => {
  if (result) {
    console.log('\n✅ Found working credentials:', result);
  } else {
    console.log('\n❌ No working credentials found');
  }
  process.exit(0);
});