/**
 * Fixed Graph Axes Test - Based on Working Version
 * Tests the corrected implementation using xAttributeName/yAttributeName flattened on component values
 */

const SESSION_CODE = 'N62K5ST2';
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
      data: responseData
    };
  } catch (error) {
    return {
      status: 0,
      statusText: 'Network Error',
      data: { error: error.message }
    };
  }
}

async function submitToolRequest(toolName, params) {
  const requestId = `test-${toolName}-${Date.now()}`;
  
  console.log(`🔧 ${toolName}...`);
  
  // Submit request
  const submitResponse = await makeRequest(`${BASE_URL}/api/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sso-bypass': BYPASS_HEADER
    },
    body: JSON.stringify({
      sessionCode: SESSION_CODE,
      toolName: toolName,
      params: params,
      requestId: requestId
    })
  });

  if (submitResponse.status !== 202) {
    console.log(`   ❌ Submit failed: ${submitResponse.statusText}`);
    return { success: false, error: submitResponse.data };
  }

  // Poll for response with timeout
  const maxAttempts = 30;
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;

    const pollResponse = await makeRequest(`${BASE_URL}/api/response?sessionCode=${SESSION_CODE}&requestId=${requestId}`, {
      method: 'GET',
      headers: {
        'x-sso-bypass': BYPASS_HEADER
      }
    });

    if (pollResponse.status === 200) {
      const result = pollResponse.data;
      if (result.result && result.result.success) {
        const valuesStr = JSON.stringify(result.result.values || result.result);
        console.log(`   ✅ Success: ${valuesStr.substring(0, 80)}${valuesStr.length > 80 ? '...' : ''}`);
        return { success: true, data: result.result.values || result.result };
      } else if (result.result && !result.result.success) {
        console.log(`   ❌ Failed: ${JSON.stringify(result.result.values || result.result)}`);
        return { success: false, error: result.result.values || result.result };
      }
    }
  }

  console.log(`   ⏰ Timeout after ${maxAttempts} seconds`);
  return { success: false, error: 'Timeout' };
}

async function pause(seconds, message) {
  console.log(`\n⏸️  PAUSE ${seconds}s: ${message}`);
  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function testFixedGraphAxes() {
  console.log('🎯 FIXED GRAPH AXES TEST');
  console.log(`📋 Session: ${SESSION_CODE}`);
  console.log('🎯 Goal: Test corrected xAttributeName/yAttributeName implementation');
  console.log('==================================================\n');

  try {
    // Use existing data from previous test
    console.log('🔍 Using existing GraphTest data context and Students collection...\n');

    // Test the fixed implementation
    console.log('1️⃣ Testing FIXED Method: Direct xAttribute/yAttribute (converted to xAttributeName/yAttributeName)');
    const graph1 = await submitToolRequest('create_graph', {
      dataContextName: 'GraphTest',
      title: 'FIXED: Age vs Score',
      xAttribute: 'age',        // Server converts this to xAttributeName
      yAttribute: 'score',      // Server converts this to yAttributeName
      position: { x: 50, y: 50 },
      dimensions: { width: 400, height: 300 }
    });

    if (graph1.success) {
      console.log(`   📊 FIXED Graph 1 created with ID: ${graph1.data.id}`);
    }

    await pause(5, '🔍 CHECK: Does Graph 1 now show "age" on X-axis and "score" on Y-axis?');

    // Test Method 2: Configuration object
    console.log('\n2️⃣ Testing FIXED Method: Configuration object (xAttributeName/yAttributeName flattened)');
    const graph2 = await submitToolRequest('create_graph', {
      dataContextName: 'GraphTest',
      title: 'FIXED: GPA vs Score (Config)',
      configuration: {
        xAttributeName: 'gpa',   // Should be flattened to top level
        yAttributeName: 'score'  // Should be flattened to top level
      },
      position: { x: 500, y: 50 },
      dimensions: { width: 400, height: 300 }
    });

    if (graph2.success) {
      console.log(`   📊 FIXED Graph 2 created with ID: ${graph2.data.id}`);
    }

    await pause(5, '🔍 CHECK: Does Graph 2 now show "gpa" on X-axis and "score" on Y-axis?');

    console.log('\n🎉 FIXED GRAPH AXES TEST COMPLETE!');
    console.log('📊 Key Changes Made:');
    console.log('   • Server: xAttribute → xAttributeName, yAttribute → yAttributeName');
    console.log('   • Browser Worker: Flattened configuration.xAttributeName to top level');
    console.log('   • Both: Direct assignment to component values (no nested configuration)');
    console.log('\n❓ CRITICAL QUESTION: Do the graphs now show attribute names on their axes?');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFixedGraphAxes().catch(console.error); 