const fetch = require('node-fetch');

async function testSpecificSession() {
  console.log('🎯 Testing CODAP Session KD73EKT5');
  console.log('===================================\n');
  
  const sessionCode = 'KD73EKT5';
  const baseUrl = 'https://codap-9801yonhe-cdorsey-concordorgs-projects.vercel.app';
  const headers = {
    'Content-Type': 'application/json',
    'x-vercel-protection-bypass': 'pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye'
  };
  
  try {
    // Step 1: Verify session tools are available
    console.log(`🔧 Step 1: Checking available tools for session ${sessionCode}...`);
    const metadataResponse = await fetch(`${baseUrl}/api/metadata?code=${sessionCode}`, {
      headers
    });
    const metadata = await metadataResponse.json();
    console.log('✅ Available tools:');
    metadata.tools?.forEach((tool, i) => {
      console.log(`  ${i+1}. ${tool.name}`);
    });
    
    // Step 2: Create a test dataset
    console.log(`\n📊 Step 2: Creating test dataset in session ${sessionCode}...`);
    const datasetRequest = {
      sessionCode: sessionCode,
      requestId: `create-dataset-${Date.now()}`,
      toolName: 'create_dataset_with_table',
      params: {
        name: 'LiveTestData',
        title: 'Live Test Dataset from API',
        attributes: [
          {name: 'product', type: 'categorical', description: 'Product name'},
          {name: 'sales', type: 'numeric', description: 'Sales amount'},
          {name: 'quarter', type: 'categorical', description: 'Quarter'},
          {name: 'region', type: 'categorical', description: 'Sales region'}
        ],
        data: [
          {product: 'Widget A', sales: 15000, quarter: 'Q1', region: 'North'},
          {product: 'Widget B', sales: 23000, quarter: 'Q1', region: 'South'},
          {product: 'Widget C', sales: 18000, quarter: 'Q1', region: 'East'},
          {product: 'Widget A', sales: 17000, quarter: 'Q2', region: 'North'},
          {product: 'Widget B', sales: 25000, quarter: 'Q2', region: 'South'},
          {product: 'Widget C', sales: 21000, quarter: 'Q2', region: 'East'},
          {product: 'Widget A', sales: 19000, quarter: 'Q3', region: 'North'},
          {product: 'Widget B', sales: 27000, quarter: 'Q3', region: 'South'}
        ],
        tableName: 'SalesTable'
      }
    };
    
    const datasetResponse = await fetch(`${baseUrl}/api/request`, {
      method: 'POST',
      headers,
      body: JSON.stringify(datasetRequest)
    });
    const datasetResult = await datasetResponse.json();
    console.log('✅ Dataset creation queued:', datasetResult);
    
    const datasetRequestId = datasetResult.id;
    
    // Wait for dataset processing
    console.log('⏳ Waiting 3 seconds for dataset creation...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 3: Create a graph
    console.log(`\n📈 Step 3: Creating sales graph...`);
    const graphRequest = {
      sessionCode: sessionCode,
      requestId: `create-graph-${Date.now()}`,
      toolName: 'create_graph',
      params: {
        dataContext: 'LiveTestData',
        graphType: 'scatterplot',
        xAttribute: 'quarter',
        yAttribute: 'sales',
        title: 'Sales by Quarter',
        width: 600,
        height: 400
      }
    };
    
    const graphResponse = await fetch(`${baseUrl}/api/request`, {
      method: 'POST',
      headers,
      body: JSON.stringify(graphRequest)
    });
    const graphResult = await graphResponse.json();
    console.log('✅ Graph creation queued:', graphResult);
    
    const graphRequestId = graphResult.id;
    
    // Wait for graph processing
    console.log('⏳ Waiting 3 seconds for graph creation...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 4: Check for responses
    console.log(`\n🔍 Step 4: Checking dataset creation response...`);
    try {
      const datasetCheckResponse = await fetch(`${baseUrl}/api/response`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionCode: sessionCode,
          requestId: datasetRequestId
        })
      });
      const datasetCheck = await datasetCheckResponse.json();
      console.log('📊 Dataset response:', datasetCheck);
    } catch (error) {
      console.log('⚠️ Dataset response check failed:', error.message);
    }
    
    console.log(`\n🔍 Step 5: Checking graph creation response...`);
    try {
      const graphCheckResponse = await fetch(`${baseUrl}/api/response`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionCode: sessionCode,
          requestId: graphRequestId
        })
      });
      const graphCheck = await graphCheckResponse.json();
      console.log('📈 Graph response:', graphCheck);
    } catch (error) {
      console.log('⚠️ Graph response check failed:', error.message);
    }
    
    // Step 6: Verify data contexts
    console.log(`\n🔍 Step 6: Verifying data contexts exist...`);
    const verifyRequest = {
      sessionCode: sessionCode,
      requestId: `verify-${Date.now()}`,
      toolName: 'get_data_contexts',
      params: {}
    };
    
    const verifyResponse = await fetch(`${baseUrl}/api/request`, {
      method: 'POST',
      headers,
      body: JSON.stringify(verifyRequest)
    });
    const verifyResult = await verifyResponse.json();
    console.log('✅ Data contexts query queued:', verifyResult);
    
    // Final summary
    console.log(`\n🎉 Test completed for session ${sessionCode}!`);
    console.log('================================================');
    console.log(`📋 Session Code: ${sessionCode}`);
    console.log(`📡 Monitor real-time: ${baseUrl}/api/stream?sessionCode=${sessionCode}`);
    console.log(`\n🔍 Expected Results in your CODAP plugin:`);
    console.log(`  1. New data table "SalesTable" with 8 sales records`);
    console.log(`  2. Scatter plot "Sales by Quarter" showing quarterly performance`);
    console.log(`  3. Data context "LiveTestData" should be available`);
    console.log(`\n💡 If you don't see changes, check the stream URL above for real-time updates!`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

testSpecificSession(); 