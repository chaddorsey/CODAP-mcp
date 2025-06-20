/**
 * API-Compliant Graph Test - Following Official CODAP API Documentation
 * Tests graph creation using the exact format specified in the CODAP Data Interactive Plugin API
 */

const SESSION_CODE = 'API001';
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

async function testAPICompliantGraph() {
  console.log('🎯 API-COMPLIANT GRAPH CREATION TEST');
  console.log(`📋 Session: ${SESSION_CODE}`);
  console.log('🎯 Goal: Follow exact CODAP API specification for graph creation');
  console.log('==================================================\n');

  try {
    // Step 1: Create data context
    console.log('1️⃣ Creating data context...');
    const dataContext = await submitToolRequest('create_data_context', {
      name: 'APITest',
      title: 'API Compliant Test Dataset'
    });

    if (!dataContext.success) {
      console.log('❌ Failed to create data context');
      return;
    }

    // Step 2: Create collection with attributes
    console.log('\n2️⃣ Creating collection with attributes...');
    const collection = await submitToolRequest('create_collection', {
      dataContextName: 'APITest',
      collectionName: 'Data',
      attributes: [
        { name: 'height', type: 'numeric' },
        { name: 'weight', type: 'numeric' },
        { name: 'category', type: 'categorical' }
      ]
    });

    if (!collection.success) {
      console.log('❌ Failed to create collection');
      return;
    }

    // Step 3: Add sample data
    console.log('\n3️⃣ Adding sample data...');
    const items = await submitToolRequest('create_items', {
      dataContextName: 'APITest',
      collectionName: 'Data',
      items: [
        { height: 170, weight: 70, category: 'A' },
        { height: 175, weight: 75, category: 'B' },
        { height: 165, weight: 65, category: 'A' },
        { height: 180, weight: 80, category: 'C' },
        { height: 160, weight: 60, category: 'B' }
      ]
    });

    if (!items.success) {
      console.log('❌ Failed to create items');
      return;
    }

    // Step 4: Test API-compliant graph creation
    // Based on CODAP API documentation, the graph object should include:
    // - type: "graph"
    // - dataContext: reference to data context
    // - xAttributeName and yAttributeName at the top level
    
    console.log('\n4️⃣ Testing API-Compliant Graph Creation');
    console.log('📚 Following official CODAP Data Interactive Plugin API specification...');
    
    // Test with direct API-compliant structure
    const apiGraph = await submitToolRequest('create_component', {
      type: 'graph',
      name: 'API Compliant Graph',
      title: 'Height vs Weight (API Format)',
      dataContext: 'APITest',  // Direct reference to data context
      xAttributeName: 'height',  // Direct top-level property
      yAttributeName: 'weight',  // Direct top-level property
      position: { x: 50, y: 50 },
      dimensions: { width: 400, height: 300 }
    });

    if (apiGraph.success) {
      console.log(`   📊 API Graph created with ID: ${apiGraph.data.id}`);
    }

    await pause(5, '🔍 CHECK: Does the API-compliant graph show "height" on X-axis and "weight" on Y-axis?');

    console.log('\n🎉 API-COMPLIANT GRAPH TEST FINISHED!');
    console.log('📊 What should be visible in CODAP:');
    console.log('   • Data table with 5 data points');
    console.log('   • Graph with height on X-axis and weight on Y-axis');
    console.log('\n🔧 Key differences from previous attempts:');
    console.log('   • Used create_component instead of create_graph');
    console.log('   • Added direct dataContext reference');
    console.log('   • Used exact API specification format');
    console.log('\n❓ CRITICAL QUESTION: Does the graph show attribute names on axes now?');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAPICompliantGraph().catch(console.error); 