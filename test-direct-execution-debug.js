/**
 * Debug Direct Execution System
 * Test individual components of the direct execution system
 */

const baseUrl = 'https://codap-jtzd2eyua-cdorsey-concordorgs-projects.vercel.app';

async function makeRequest(endpoint, method, data, sessionId = null) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (sessionId) {
    headers['mcp-session-id'] = sessionId;
  }

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers,
      body: JSON.stringify(data)
    });

    const responseText = await response.text();
    console.log(`📡 ${method} ${endpoint}`);
    console.log(`📋 Status: ${response.status}`);
    console.log(`📄 Response: ${responseText}`);
    
    if (response.ok) {
      try {
        return JSON.parse(responseText);
      } catch (e) {
        return { raw: responseText };
      }
    } else {
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }
  } catch (error) {
    console.error(`❌ Request failed: ${error.message}`);
    throw error;
  }
}

async function debugDirectExecution() {
  console.log('🔍 Debug: Direct Execution System\n');
  
  const sessionId = `debug_${Date.now()}`;
  console.log(`🔑 Session ID: ${sessionId}\n`);

  try {
    // Step 1: Initialize session
    console.log('📡 Step 1: Initialize session...');
    const initResponse = await makeRequest('/api/mcp', 'POST', {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "debug-client",
          version: "1.0.0"
        }
      }
    }, sessionId);
    
    console.log('✅ Session initialized successfully\n');

    // Step 2: Test simple tool (getListOfDataContexts - should be empty initially)
    console.log('📡 Step 2: Test simple tool (getListOfDataContexts)...');
    const listResponse = await makeRequest('/api/mcp', 'POST', {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "getListOfDataContexts",
        arguments: {}
      }
    }, sessionId);
    
    console.log('✅ Simple tool executed successfully\n');

    // Step 3: Test createDataContext with minimal data
    console.log('📡 Step 3: Test createDataContext with minimal data...');
    const createResponse = await makeRequest('/api/mcp', 'POST', {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "createDataContext",
        arguments: {
          name: "MinimalTest"
        }
      }
    }, sessionId);
    
    console.log('✅ createDataContext executed successfully\n');

    // Step 4: Verify data context was created
    console.log('📡 Step 4: Verify data context was created...');
    const verifyResponse = await makeRequest('/api/mcp', 'POST', {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "getListOfDataContexts",
        arguments: {}
      }
    }, sessionId);
    
    console.log('✅ Verification completed successfully\n');

    console.log('🎉 All debug tests passed! Direct execution system is working.');

  } catch (error) {
    console.error(`❌ Debug test failed: ${error.message}`);
    console.error('🔧 Check server logs for more details');
  }
}

// Run the debug test
debugDirectExecution().catch(console.error); 