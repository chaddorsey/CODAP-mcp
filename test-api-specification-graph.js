/**
 * CODAP API Specification Graph Test
 * Tests multiple approaches based on official CODAP Data Interactive Plugin API
 * Explores different ways to reference attributes in graph creation
 */

const SESSION_CODE = 'SPEC01';
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

async function testAPISpecificationGraph() {
  console.log('🎯 CODAP API SPECIFICATION GRAPH TEST');
  console.log(`📋 Session: ${SESSION_CODE}`);
  console.log('🎯 Goal: Test multiple graph creation approaches per official API spec');
  console.log('==================================================\n');

  try {
    // Step 1: Create data context
    console.log('1️⃣ Creating data context...');
    const dataContext = await submitToolRequest('create_data_context', {
      name: 'SpecTest',
      title: 'API Specification Test'
    });

    if (!dataContext.success) {
      console.log('❌ Failed to create data context');
      return;
    }

    // Step 2: Create collection with attributes
    console.log('\n2️⃣ Creating collection with attributes...');
    const collection = await submitToolRequest('create_collection', {
      dataContextName: 'SpecTest',
      collectionName: 'Measurements',
      attributes: [
        { name: 'temperature', type: 'numeric', title: 'Temperature (°C)' },
        { name: 'pressure', type: 'numeric', title: 'Pressure (kPa)' },
        { name: 'location', type: 'categorical', title: 'Location' }
      ]
    });

    if (!collection.success) {
      console.log('❌ Failed to create collection');
      return;
    }

    // Step 3: Add sample data
    console.log('\n3️⃣ Adding sample data...');
    const items = await submitToolRequest('create_items', {
      dataContextName: 'SpecTest',
      collectionName: 'Measurements',
      items: [
        { temperature: 20, pressure: 101, location: 'Lab A' },
        { temperature: 25, pressure: 102, location: 'Lab B' },
        { temperature: 18, pressure: 100, location: 'Lab A' },
        { temperature: 30, pressure: 105, location: 'Lab C' },
        { temperature: 22, pressure: 103, location: 'Lab B' }
      ]
    });

    if (!items.success) {
      console.log('❌ Failed to create items');
      return;
    }

    // Step 4: Test different graph creation approaches

    // Approach 1: Using create_component with exact API spec format
    console.log('\n4️⃣ Testing Approach 1: create_component with API spec format');
    const graph1 = await submitToolRequest('create_component', {
      type: 'graph',
      name: 'Spec Graph 1',
      title: 'Temperature vs Pressure (API Spec)',
      dataContext: 'SpecTest',
      xAttributeName: 'temperature',
      yAttributeName: 'pressure',
      position: { x: 50, y: 50 },
      dimensions: { width: 400, height: 300 }
    });

    if (graph1.success) {
      console.log(`   📊 API Spec Graph created with ID: ${graph1.data.id}`);
    }

    await pause(3, '🔍 CHECK: Does Graph 1 show attribute names on axes?');

    // Approach 2: Using fully qualified attribute names
    console.log('\n5️⃣ Testing Approach 2: Fully qualified attribute names');
    const graph2 = await submitToolRequest('create_component', {
      type: 'graph',
      name: 'Spec Graph 2',
      title: 'Qualified Names Graph',
      dataContext: 'SpecTest',
      xAttributeName: 'SpecTest.Measurements.temperature',
      yAttributeName: 'SpecTest.Measurements.pressure',
      position: { x: 500, y: 50 },
      dimensions: { width: 400, height: 300 }
    });

    if (graph2.success) {
      console.log(`   📊 Qualified Names Graph created with ID: ${graph2.data.id}`);
    }

    await pause(3, '🔍 CHECK: Does Graph 2 show attribute names on axes?');

    // Approach 3: Using collection reference
    console.log('\n6️⃣ Testing Approach 3: With collection reference');
    const graph3 = await submitToolRequest('create_component', {
      type: 'graph',
      name: 'Spec Graph 3',
      title: 'Collection Reference Graph',
      dataContext: 'SpecTest',
      collection: 'Measurements',
      xAttributeName: 'temperature',
      yAttributeName: 'pressure',
      position: { x: 50, y: 400 },
      dimensions: { width: 400, height: 300 }
    });

    if (graph3.success) {
      console.log(`   📊 Collection Reference Graph created with ID: ${graph3.data.id}`);
    }

    await pause(3, '🔍 CHECK: Does Graph 3 show attribute names on axes?');

    // Approach 4: Using attribute titles instead of names
    console.log('\n7️⃣ Testing Approach 4: Using attribute titles');
    const graph4 = await submitToolRequest('create_component', {
      type: 'graph',
      name: 'Spec Graph 4',
      title: 'Attribute Titles Graph',
      dataContext: 'SpecTest',
      xAttributeName: 'Temperature (°C)',
      yAttributeName: 'Pressure (kPa)',
      position: { x: 500, y: 400 },
      dimensions: { width: 400, height: 300 }
    });

    if (graph4.success) {
      console.log(`   📊 Attribute Titles Graph created with ID: ${graph4.data.id}`);
    }

    await pause(3, '🔍 CHECK: Does Graph 4 show attribute names on axes?');

    // Approach 5: Using our original create_graph tool
    console.log('\n8️⃣ Testing Approach 5: Original create_graph tool');
    const graph5 = await submitToolRequest('create_graph', {
      dataContextName: 'SpecTest',
      title: 'Original Tool Graph',
      xAttribute: 'temperature',
      yAttribute: 'pressure',
      position: { x: 50, y: 750 },
      dimensions: { width: 400, height: 300 }
    });

    if (graph5.success) {
      console.log(`   📊 Original Tool Graph created with ID: ${graph5.data.id}`);
    }

    await pause(3, '🔍 CHECK: Does Graph 5 show attribute names on axes?');

    console.log('\n🎉 API SPECIFICATION GRAPH TEST FINISHED!');
    console.log('📊 What should be visible in CODAP:');
    console.log('   • Data table with 5 measurement records');
    console.log('   • 5 graphs testing different attribute reference approaches');
    console.log('\n🔧 Approaches tested:');
    console.log('   1. Direct API spec format (create_component)');
    console.log('   2. Fully qualified attribute names');
    console.log('   3. With collection reference');
    console.log('   4. Using attribute titles');
    console.log('   5. Original create_graph tool');
    console.log('\n❓ CRITICAL QUESTION: Which approach (if any) shows attribute names on axes?');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAPISpecificationGraph().catch(console.error); 