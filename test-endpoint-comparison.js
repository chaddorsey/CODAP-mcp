const axios = require('axios');

const BASE_URL = 'https://codap-mcp-cdorsey-concordorgs-projects.vercel.app';

console.log('🔍 Endpoint Comparison Test');
console.log('===========================');

async function testBothEndpoints() {
  try {
    // Create a session first
    console.log('\n1️⃣ Creating session...');
    const sessionResponse = await axios.post(`${BASE_URL}/api/sessions`, {}, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    const { code } = sessionResponse.data;
    console.log(`✅ Session created: ${code}`);

    // Test the original /api/request endpoint
    console.log('\n2️⃣ Testing /api/request endpoint...');
    try {
      const requestResponse = await axios.post(`${BASE_URL}/api/request`, {
        sessionCode: code,
        requestId: 'test-original-001',
        toolName: 'create_dataset_with_table',
        params: { name: 'test_original' }
      }, {
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true
      });
      
      console.log('📋 /api/request Response:');
      console.log('  Status:', requestResponse.status);
      console.log('  Message:', requestResponse.data.message);
      console.log('  Full Data:', JSON.stringify(requestResponse.data, null, 2));
    } catch (error) {
      console.log('❌ /api/request Error:', error.message);
    }

    // Test the new /api/tool-request endpoint
    console.log('\n3️⃣ Testing /api/tool-request endpoint...');
    try {
      const toolRequestResponse = await axios.post(`${BASE_URL}/api/tool-request`, {
        sessionCode: code,
        requestId: 'test-alternative-001',
        toolName: 'create_dataset_with_table',
        params: { name: 'test_alternative' }
      }, {
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true
      });
      
      console.log('📋 /api/tool-request Response:');
      console.log('  Status:', toolRequestResponse.status);
      console.log('  Message:', toolRequestResponse.data.message);
      console.log('  Full Data:', JSON.stringify(toolRequestResponse.data, null, 2));
    } catch (error) {
      console.log('❌ /api/tool-request Error:', error.message);
    }

    console.log('\n🔍 Analysis:');
    console.log('If /api/tool-request shows the new message but /api/request shows old demo message,');
    console.log('then the /api/request path is being hijacked or cached.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBothEndpoints().catch(console.error); 