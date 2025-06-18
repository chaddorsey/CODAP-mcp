const axios = require('axios');

const BASE_URL = 'https://codap-mcp-cdorsey-1448-cdorsey-concordorgs-projects.vercel.app';
const SSO_BYPASS_SECRET = "pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye";

async function testBasicEndpoints() {
  console.log('🧪 Testing Basic Endpoints...\n');

  const headers = {
    "Content-Type": "application/json",
    "x-sso-bypass": SSO_BYPASS_SECRET
  };

  try {
    // Test 1: Create session (we know this works)
    console.log('1. Testing session creation...');
    const sessionResponse = await axios.post(`${BASE_URL}/api/sessions`, {}, { headers });
    console.log('✅ Session works:', sessionResponse.data.code);
    
    const sessionCode = sessionResponse.data.code;

    // Test 2: Test metadata endpoint with minimal debugging
    console.log('\n2. Testing metadata endpoint...');
    try {
      const metadataResponse = await axios.get(`${BASE_URL}/api/metadata?code=${sessionCode}`, { headers });
      console.log('✅ Metadata works!');
      console.log('📊 Response keys:', Object.keys(metadataResponse.data));
    } catch (error) {
      console.log('❌ Metadata failed with status:', error.response?.status);
      console.log('Error details:', error.response?.data);
      
      // Test with invalid session to see if validation works
      console.log('\n3. Testing with invalid session...');
      try {
        await axios.get(`${BASE_URL}/api/metadata?code=INVALID1`, { headers });
      } catch (invalidError) {
        console.log('✅ Invalid session properly rejected:', invalidError.response?.status);
      }
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testBasicEndpoints(); 