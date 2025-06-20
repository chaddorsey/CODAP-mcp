/**
 * Complete Graph Axes Test - Browser Worker Format
 * Creates data context, collection, and sample data, then tests graph axes assignment
 */

const SESSION_CODE = 'K6G4UQHM';
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

async function testCompleteGraphAxes() {
  console.log('🎯 COMPLETE GRAPH AXES TEST');
  console.log(`📋 Session: ${SESSION_CODE}`);
  console.log('🎯 Goal: Create data and test graph axes assignment');
  console.log('==================================================\n');

  try {
    // 1. Create data context
    console.log('1️⃣ Creating data context...');
    const dataContext = await submitToolRequest('create_data_context', {
      name: 'GraphTest',
      title: 'Graph Axes Test Dataset'
    });

    if (!dataContext.success) {
      console.log('❌ Failed to create data context');
      return;
    }

    // 2. Create collection with attributes
    console.log('\n2️⃣ Creating collection with attributes...');
    const collection = await submitToolRequest('create_collection', {
      dataContextName: 'GraphTest',
      collectionName: 'Students',
      attributes: [
        { name: 'name', type: 'categorical' },
        { name: 'age', type: 'numeric' },
        { name: 'score', type: 'numeric' },
        { name: 'gpa', type: 'numeric' }
      ]
    });

    if (!collection.success) {
      console.log('❌ Failed to create collection');
      return;
    }

    // 3. Add sample data
    console.log('\n3️⃣ Adding sample data...');
    const items = await submitToolRequest('create_items', {
      dataContextName: 'GraphTest',
      collectionName: 'Students',
      items: [
        { name: 'Alice', age: 16, score: 85, gpa: 3.4 },
        { name: 'Bob', age: 17, score: 92, gpa: 3.8 },
        { name: 'Charlie', age: 15, score: 78, gpa: 3.1 },
        { name: 'Diana', age: 16, score: 88, gpa: 3.6 },
        { name: 'Ethan', age: 17, score: 95, gpa: 3.9 }
      ]
    });

    if (!items.success) {
      console.log('❌ Failed to create items');
      return;
    }

    // 4. Create table component for visibility
    console.log('\n4️⃣ Creating table component...');
    await submitToolRequest('create_table', {
      dataContextName: 'GraphTest',
      title: 'Student Data Table',
      position: { x: 50, y: 50 },
      dimensions: { width: 500, height: 200 }
    });

    await pause(3, 'Data table should now be visible with 5 students!');

    // 5. Test Method 1: Direct attributes (current server format)
    console.log('\n5️⃣ Method 1: Direct xAttribute/yAttribute');
    const graph1 = await submitToolRequest('create_graph', {
      dataContextName: 'GraphTest',
      title: 'Age vs Score (Method 1)',
      xAttribute: 'age',
      yAttribute: 'score',
      position: { x: 50, y: 300 },
      dimensions: { width: 400, height: 300 }
    });

    if (graph1.success) {
      console.log(`   📊 Graph 1 created with ID: ${graph1.data.id}`);
    }

    await pause(3, 'Check Graph 1: Does it show age on X-axis and score on Y-axis?');

    // 6. Test Method 2: Browser worker format with dataContext
    console.log('\n6️⃣ Method 2: Browser worker format (dataContext + configuration)');
    const graph2 = await submitToolRequest('create_graph', {
      dataContext: 'GraphTest',  // Note: dataContext not dataContextName
      title: 'GPA vs Score (Method 2)',
      configuration: {
        xAttributeName: 'gpa',
        yAttributeName: 'score'
      },
      position: { x: 500, y: 300 },
      dimensions: { width: 400, height: 300 }
    });

    if (graph2.success) {
      console.log(`   📊 Graph 2 created with ID: ${graph2.data.id}`);
    }

    await pause(3, 'Check Graph 2: Does it show gpa on X-axis and score on Y-axis?');

    // 7. Test Method 3: Mixed format
    console.log('\n7️⃣ Method 3: Mixed format test');
    const graph3 = await submitToolRequest('create_graph', {
      dataContextName: 'GraphTest',
      title: 'Age vs GPA (Method 3)',
      configuration: {
        xAttributeName: 'age',
        yAttributeName: 'gpa'
      },
      position: { x: 50, y: 650 },
      dimensions: { width: 400, height: 300 }
    });

    if (graph3.success) {
      console.log(`   📊 Graph 3 created with ID: ${graph3.data.id}`);
    }

    await pause(3, 'Check Graph 3: Does it show age on X-axis and gpa on Y-axis?');

    console.log('\n🎉 GRAPH AXES TEST COMPLETE!');
    console.log('📊 Please check your CODAP interface:');
    console.log('   • Table with 5 students should be visible');
    console.log('   • 3 graphs should be created');
    console.log('   • Each graph should have attributes on both axes');
    console.log('\n❓ KEY QUESTION: Do any of the graphs show attributes on their axes?');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCompleteGraphAxes().catch(console.error); 