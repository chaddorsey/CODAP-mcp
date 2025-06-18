const axios = require('axios');

const BASE_URL = process.env.VERCEL_URL || 'https://codap-mcp-cdorsey-1448-cdorsey-concordorgs-projects.vercel.app';
const SSO_BYPASS_SECRET = "pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye";

// Helper function to get headers with bypass
const getHeaders = () => {
  const headers = {
    "Content-Type": "application/json"
  };
  
  // Add bypass header for Vercel deployments
  if (BASE_URL.includes("vercel.app")) {
    headers["x-sso-bypass"] = SSO_BYPASS_SECRET;
  }
  
  return headers;
};

async function testMetadataEndpoint() {
  console.log('🧪 Testing Metadata Endpoint...\n');
  console.log('🔑 Using SSO bypass for Vercel deployment\n');

  try {
    // First, create a session to get a valid code
    console.log('1. Creating session...');
    const sessionResponse = await axios.post(`${BASE_URL}/api/sessions`, {}, {
      headers: getHeaders()
    });
    console.log('✅ Session created:', sessionResponse.data);
    
    const sessionCode = sessionResponse.data.code;
    
    // Test the metadata endpoint with valid session
    console.log('\n2. Testing metadata endpoint with valid session...');
    const metadataResponse = await axios.get(`${BASE_URL}/api/metadata?code=${sessionCode}`, {
      headers: getHeaders()
    });
    console.log('✅ Metadata retrieved successfully');
    console.log('📊 Response structure:');
    console.log('- Version:', metadataResponse.data.version);
    console.log('- Session Code:', metadataResponse.data.sessionCode);
    console.log('- Generated At:', metadataResponse.data.generatedAt);
    console.log('- Number of tools:', metadataResponse.data.tools?.length || 0);
    
    if (metadataResponse.data.tools && metadataResponse.data.tools.length > 0) {
      console.log('- Sample tool:', metadataResponse.data.tools[0].name);
    }
    
    // Test with invalid session code
    console.log('\n3. Testing with invalid session code...');
    try {
      await axios.get(`${BASE_URL}/api/metadata?code=INVALID1`, {
        headers: getHeaders()
      });
      console.log('❌ Should have failed with invalid session');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly rejected invalid session code format');
      } else {
        console.log('⚠️  Unexpected error for invalid session:', error.response?.status);
      }
    }
    
    // Test with missing session code
    console.log('\n4. Testing with missing session code...');
    try {
      await axios.get(`${BASE_URL}/api/metadata`, {
        headers: getHeaders()
      });
      console.log('❌ Should have failed with missing session code');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly rejected missing session code');
      } else {
        console.log('⚠️  Unexpected error for missing session:', error.response?.status);
      }
    }
    
    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testMetadataEndpoint(); 