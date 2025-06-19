const axios = require('axios');

const BASE_URL = 'https://codap-mcp-cdorsey-concordorgs-projects.vercel.app';

console.log('🔧 Testing Environment Variables & Redis Connection');
console.log('==================================================');

async function testEnvironmentDebug() {
  try {
    // Let's create a simple test endpoint to check env vars
    console.log('\n1️⃣ Testing environment via metadata endpoint...');
    
    const metadataResponse = await axios.get(`${BASE_URL}/api/metadata?code=TESTCODE`, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('📋 Metadata response status:', metadataResponse.status);
    
    if (metadataResponse.status === 400) {
      const error = metadataResponse.data;
      if (error.message.includes('Session not found')) {
        console.log('✅ API endpoints are working (session validation works)');
      }
    }
    
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ API endpoints are working (expected session validation error)');
      console.log('📝 Error message:', error.response.data.message);
    } else {
      console.error('❌ Test failed:', error.response?.data || error.message);
    }
  }
}

async function testSpecificSessionValidation() {
  try {
    console.log('\n2️⃣ Creating session and testing validation...');
    
    // First create a valid session
    const sessionResponse = await axios.post(`${BASE_URL}/api/sessions`, {}, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    const { code } = sessionResponse.data;
    console.log(`✅ Session created: ${code}`);
    
    // Now test if we can validate it via metadata
    const validationResponse = await axios.get(`${BASE_URL}/api/metadata?code=${code}`, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (validationResponse.status === 200) {
      console.log('✅ Session validation working via Redis');
      console.log('📋 Tools available:', validationResponse.data.tools?.length || 0);
    }
    
    return code;
    
  } catch (error) {
    console.error('❌ Session validation test failed:', error.response?.data || error.message);
    return null;
  }
}

async function main() {
  await testEnvironmentDebug();
  const validCode = await testSpecificSessionValidation();
  
  if (validCode) {
    console.log('\n✅ Environment and Redis connection are working');
    console.log('🤔 The issue might be in the request.js deployment or caching');
  } else {
    console.log('\n❌ Environment or Redis connection issues detected');
  }
}

main().catch(console.error); 