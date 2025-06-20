/**
 * Debug script to test response endpoint format
 * Tests different response formats to understand the validation error
 */

const SESSION_CODE = '2WB73EBX';
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
      data: { error: error.message },
      headers: {}
    };
  }
}

async function testResponseFormats() {
  console.log('🧪 Testing Response Endpoint Format Validation');
  console.log('📋 Session:', SESSION_CODE);
  console.log('🌐 Server:', BASE_URL);
  console.log('==================================================\n');

  const testCases = [
    {
      name: "✅ Valid Success Response (result only)",
      payload: {
        sessionCode: SESSION_CODE,
        requestId: "test-success-1",
        result: { message: "Success!" }
      }
    },
    {
      name: "✅ Valid Error Response (error only)",
      payload: {
        sessionCode: SESSION_CODE,
        requestId: "test-error-1",
        error: { type: "test_error", message: "Test error" }
      }
    },
    {
      name: "❌ Invalid Response (both result and error)",
      payload: {
        sessionCode: SESSION_CODE,
        requestId: "test-invalid-1",
        result: { message: "Success!" },
        error: { type: "test_error", message: "Test error" }
      }
    },
    {
      name: "❌ Invalid Response (neither result nor error)",
      payload: {
        sessionCode: SESSION_CODE,
        requestId: "test-invalid-2"
      }
    },
    {
      name: "❌ Invalid Response (null result and error)",
      payload: {
        sessionCode: SESSION_CODE,
        requestId: "test-invalid-3",
        result: null,
        error: null
      }
    },
    {
      name: "❌ Invalid Response (undefined result and error)",
      payload: {
        sessionCode: SESSION_CODE,
        requestId: "test-invalid-4",
        result: undefined,
        error: undefined
      }
    }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`${i + 1}️⃣ ${testCase.name}`);
    console.log('   Payload:', JSON.stringify(testCase.payload, null, 2));
    
    const result = await makeRequest(`${BASE_URL}/api/response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sso-bypass': BYPASS_HEADER
      },
      body: JSON.stringify(testCase.payload)
    });
    
    console.log(`   📡 Response: ${result.status} ${result.statusText}`);
    if (result.status !== 200) {
      console.log('   ❌ Error:', JSON.stringify(result.data, null, 2));
    } else {
      console.log('   ✅ Success:', JSON.stringify(result.data, null, 2));
    }
    console.log();
  }
}

// Run the tests
testResponseFormats().catch(console.error); 