// test-mcp-integration.js
const fetch = require('node-fetch');

async function testMCPIntegration() {
  console.log('Testing MCP SuperAssistant Proxy Integration...\n');
  
  try {
    // Test 1: Initialize MCP session
    console.log('1. Initializing MCP session...');
    const initResponse = await fetch('http://localhost:3007/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0.0' }
        }
      })
    });
    
    const initText = await initResponse.text();
    console.log('Init response:', initText.substring(0, 200) + '...\n');
    
    // Test 2: List available tools
    console.log('2. Listing available tools...');
    const toolsResponse = await fetch('http://localhost:3007/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      })
    });
    
    const toolsText = await toolsResponse.text();
    console.log('Tools response:', toolsText.substring(0, 300) + '...\n');
    
    // Test 3: Call create_codap_dataset tool
    console.log('3. Testing create_codap_dataset tool...');
    const createDatasetResponse = await fetch('http://localhost:3007/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'create_codap_dataset',
          arguments: {
            datasetName: 'Test Dataset',
            dataType: 'random_numbers',
            recordCount: 10
          }
        }
      })
    });
    
    const createText = await createDatasetResponse.text();
    console.log('Create dataset response:', createText.substring(0, 500) + '...\n');
    
    // Test 4: Check API server status
    console.log('4. Checking API server status...');
    const apiResponse = await fetch('http://localhost:8083/api/health');
    const apiData = await apiResponse.json();
    console.log('API Server status:', JSON.stringify(apiData, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testMCPIntegration(); 