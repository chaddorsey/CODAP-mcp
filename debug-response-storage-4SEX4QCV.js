/**
 * Debug script to check response storage and retrieval
 */

const SESSION_CODE = '4SEX4QCV';
const BASE_URL = 'https://codap-l1pz9li9n-cdorsey-concordorgs-projects.vercel.app';
const BYPASS_HEADER = 'pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye';

async function makeRequest(url, options) {
  try {
    const response = await fetch(url, options);
    const responseText = await response.text();
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }
    
    return {
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return {
      status: 0,
      statusText: 'Network Error',
      data: error.message,
      headers: {}
    };
  }
}

async function debugResponseStorage() {
  console.log('🔍 Debug Response Storage and Retrieval');
  console.log('📋 Session:', SESSION_CODE);
  console.log('🌐 Server:', BASE_URL);
  console.log('==================================================\n');

  // Test recent request IDs from the browser logs
  const testRequestIds = [
    'test-get_case_count-1750393902705',
    'test-get_item_by_id-1750393892449', 
    'test-get_items-1750393882191',
    'test-create_items-1750393871716',
    'test-get_attribute-1750393861393'
  ];

  for (const requestId of testRequestIds) {
    console.log(`🔍 Checking response for: ${requestId}`);
    
    const response = await makeRequest(`${BASE_URL}/api/response?sessionCode=${SESSION_CODE}&requestId=${requestId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-sso-bypass': BYPASS_HEADER
      }
    });
    
    console.log(`📡 GET /api/response -> ${response.status} ${response.statusText}`);
    
    if (response.status === 200) {
      console.log('✅ Response found:', JSON.stringify(response.data, null, 2));
    } else {
      console.log('❌ Response not found:', response.data);
    }
    console.log('');
  }

  // Also test a wildcard query to see all responses for this session
  console.log('🔍 Checking all responses for session...');
  const allResponses = await makeRequest(`${BASE_URL}/api/response?sessionCode=${SESSION_CODE}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-sso-bypass': BYPASS_HEADER
    }
  });
  
  console.log(`📡 GET /api/response (all) -> ${allResponses.status} ${allResponses.statusText}`);
  console.log('📄 All responses:', JSON.stringify(allResponses.data, null, 2));
}

debugResponseStorage().catch(console.error); 