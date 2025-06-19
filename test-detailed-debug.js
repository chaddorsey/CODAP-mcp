const axios = require('axios');

const BASE_URL = 'https://codap-mcp-cdorsey-concordorgs-projects.vercel.app';

console.log('🔍 Detailed HTTP Debug Analysis');
console.log('================================');

async function detailedDebug() {
  try {
    console.log('\n1️⃣ Creating session with detailed headers...');
    const sessionResponse = await axios.post(`${BASE_URL}/api/sessions`, {}, {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true // Don't throw on any status
    });
    
    console.log('📋 Session Response:');
    console.log('  Status:', sessionResponse.status);
    console.log('  Headers:', JSON.stringify(sessionResponse.headers, null, 2));
    console.log('  Data:', JSON.stringify(sessionResponse.data, null, 2));
    
    if (sessionResponse.data.code) {
      const { code } = sessionResponse.data;
      
      console.log('\n2️⃣ Making tool request with detailed analysis...');
      const requestResponse = await axios.post(`${BASE_URL}/api/request`, {
        sessionCode: code,
        requestId: 'debug-request-001',
        toolName: 'create_dataset_with_table',
        params: { name: 'debug_test' }
      }, {
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true
      });
      
      console.log('📋 Request Response:');
      console.log('  Status:', requestResponse.status);
      console.log('  Headers:', JSON.stringify(requestResponse.headers, null, 2));
      console.log('  Data:', JSON.stringify(requestResponse.data, null, 2));
      
      // Check for specific indicators
      if (requestResponse.data.message) {
        console.log('\n🔍 Message Analysis:');
        console.log('  Message:', requestResponse.data.message);
        
        if (requestResponse.data.message.includes('UPDATED VERSION')) {
          console.log('  ✅ New code is being served!');
        } else if (requestResponse.data.message.includes('Tool request queued successfully')) {
          console.log('  ❌ Old demo code is still being served');
        } else {
          console.log('  🤔 Unknown message format');
        }
      }
      
      // Check response headers for deployment info
      console.log('\n🔍 Deployment Analysis:');
      if (requestResponse.headers['x-vercel-id']) {
        console.log('  Vercel ID:', requestResponse.headers['x-vercel-id']);
      }
      if (requestResponse.headers['x-vercel-cache']) {
        console.log('  Vercel Cache:', requestResponse.headers['x-vercel-cache']);
      }
      if (requestResponse.headers.server) {
        console.log('  Server:', requestResponse.headers.server);
      }
    }
    
  } catch (error) {
    console.error('❌ Detailed debug failed:', error.message);
    if (error.response) {
      console.log('Error Response:', error.response.data);
      console.log('Error Headers:', error.response.headers);
    }
  }
}

detailedDebug().catch(console.error); 