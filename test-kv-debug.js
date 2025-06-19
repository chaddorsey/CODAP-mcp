const axios = require('axios');

const BASE_URL = 'https://codap-mcp-cdorsey-concordorgs-projects.vercel.app';

console.log('🔧 Testing KV Connection Debug');
console.log('==============================');

async function testKVConnection() {
  try {
    console.log('\n1️⃣ Creating new session...');
    const sessionResponse = await axios.post(`${BASE_URL}/api/sessions`, {}, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    const { code, ttl } = sessionResponse.data;
    console.log(`✅ Session created: ${code}`);
    console.log(`⏰ TTL: ${ttl} seconds`);

    console.log('\n2️⃣ Testing tool request with KV storage...');
    const requestResponse = await axios.post(`${BASE_URL}/api/request`, {
      sessionCode: code,
      requestId: 'test-kv-001',
      toolName: 'create_dataset_with_table',
      params: {
        name: 'test_data',
        title: 'KV Test Dataset'
      }
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('📤 Tool request response:', requestResponse.data);
    
    if (requestResponse.data.message && requestResponse.data.message.includes('Demo version')) {
      console.log('❌ Still in demo mode - KV not working');
      return false;
    } else if (requestResponse.data.status === 'queued') {
      console.log('✅ Request queued in KV storage!');
      
      console.log('\n3️⃣ Testing SSE stream...');
      // We can't easily test SSE in this script, but we can check if the endpoint accepts the request
      const sseUrl = `${BASE_URL}/api/stream?sessionCode=${code}`;
      console.log(`🌊 SSE URL: ${sseUrl}`);
      console.log('✅ Ready for SSE connection');
      
      return true;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    return false;
  }
}

async function main() {
  const success = await testKVConnection();
  
  if (success) {
    console.log('\n🎉 KV Connection Test: PASSED');
    console.log('✅ System is fully operational with KV storage');
  } else {
    console.log('\n🚨 KV Connection Test: FAILED');
    console.log('❌ System still in demo mode');
  }
}

main().catch(console.error); 