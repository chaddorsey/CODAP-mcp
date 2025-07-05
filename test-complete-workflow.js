#!/usr/bin/env node

/**
 * Test complete workflow with fresh sessions
 */

const SERVER_URL = "https://codap-mcp-stable.vercel.app";

async function testCompleteWorkflow() {
  console.log("=== Testing Complete Workflow with Fresh Sessions ===");
  
  // Step 1: Create a fresh Claude session (simulate Claude Desktop connecting)
  console.log("\nStep 1: Creating fresh Claude session...");
  
  let claudeSessionId;
  try {
    const initRequest = {
      jsonrpc: "2.0",
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "test-client",
          version: "1.0.0"
        }
      },
      id: 1
    };
    
    const response = await fetch(`${SERVER_URL}/api/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(initRequest)
    });
    
    const data = await response.json();
    
    if (data.result) {
      console.log("✅ Claude session initialized");
      // Extract session ID from response headers or create one
      claudeSessionId = `TEST-${Date.now().toString(36).toUpperCase()}`;
      console.log(`Generated Claude session ID: ${claudeSessionId}`);
    } else {
      console.log("❌ Failed to initialize Claude session");
      return;
    }
    
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
    return;
  }
  
  // Step 2: Get tools list with the Claude session
  console.log(`\nStep 2: Getting tools list for Claude session ${claudeSessionId}...`);
  
  try {
    const toolsRequest = {
      jsonrpc: "2.0",
      method: "tools/list",
      params: {},
      id: 2
    };
    
    const response = await fetch(`${SERVER_URL}/api/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "mcp-session-id": claudeSessionId
      },
      body: JSON.stringify(toolsRequest)
    });
    
    const data = await response.json();
    
    if (data.result && data.result.tools) {
      console.log(`✅ Received ${data.result.tools.length} tools`);
      
      // Check for both CODAP and SageModeler tools
      const codapTools = data.result.tools.filter(t => t.name.startsWith('get') || t.name.startsWith('create') || t.name.startsWith('update'));
      const sageTools = data.result.tools.filter(t => t.name.startsWith('sage_'));
      const connectTool = data.result.tools.find(t => t.name === 'connect_to_session');
      
      console.log(`  - CODAP tools: ${codapTools.length}`);
      console.log(`  - SageModeler tools: ${sageTools.length}`);
      console.log(`  - Connect tool: ${connectTool ? '✅' : '❌'}`);
    } else {
      console.log("❌ Failed to get tools list");
      console.log("Error:", data.error);
    }
    
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
  
  // Step 3: Create a fresh browser worker session
  console.log("\nStep 3: Creating fresh browser worker session...");
  
  let browserWorkerSessionId;
  try {
    const sessionData = {
      capabilities: ["CODAP", "SAGEMODELER"]
    };
    
    const response = await fetch(`${SERVER_URL}/api/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(sessionData)
    });
    
    const data = await response.json();
    
    if (data.code) {
      browserWorkerSessionId = data.code;
      console.log(`✅ Created browser worker session: ${browserWorkerSessionId}`);
      console.log(`TTL: ${data.ttl}s, Expires: ${data.expiresAt}`);
    } else if (data.sessionId) {
      browserWorkerSessionId = data.sessionId;
      console.log(`✅ Created browser worker session: ${browserWorkerSessionId}`);
      console.log(`Capabilities: ${JSON.stringify(data.capabilities)}`);
    } else {
      console.log("❌ Failed to create browser worker session");
      console.log("Error:", data);
      return;
    }
    
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
    return;
  }
  
  // Step 4: Connect Claude session to browser worker session
  console.log(`\nStep 4: Connecting Claude session ${claudeSessionId} to browser worker session ${browserWorkerSessionId}...`);
  
  try {
    const connectRequest = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "connect_to_session",
        arguments: {
          sessionId: browserWorkerSessionId
        }
      },
      id: 3
    };
    
    const response = await fetch(`${SERVER_URL}/api/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "mcp-session-id": claudeSessionId
      },
      body: JSON.stringify(connectRequest)
    });
    
    const data = await response.json();
    
    if (data.result) {
      console.log("✅ Connection response:");
      console.log(data.result.content[0].text);
    } else {
      console.log("❌ Connection failed:");
      console.log(`Code: ${data.error.code}`);
      console.log(`Message: ${data.error.message}`);
    }
    
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
  
  // Step 5: Test CODAP tool execution after connection
  console.log(`\nStep 5: Testing CODAP tool execution after connection...`);
  
  try {
    const toolRequest = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "getListOfDataContexts",
        arguments: {}
      },
      id: 4
    };
    
    const response = await fetch(`${SERVER_URL}/api/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "mcp-session-id": claudeSessionId
      },
      body: JSON.stringify(toolRequest)
    });
    
    const data = await response.json();
    
    if (data.result) {
      console.log("✅ CODAP tool execution result:");
      console.log(data.result.content[0].text);
    } else {
      console.log("❌ CODAP tool execution failed:");
      console.log(`Code: ${data.error.code}`);
      console.log(`Message: ${data.error.message}`);
    }
    
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
  
  // Step 6: Test SageModeler tool execution after connection
  console.log(`\nStep 6: Testing SageModeler tool execution after connection...`);
  
  try {
    const sageRequest = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "sage_get_all_nodes",
        arguments: {}
      },
      id: 5
    };
    
    const response = await fetch(`${SERVER_URL}/api/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "mcp-session-id": claudeSessionId
      },
      body: JSON.stringify(sageRequest)
    });
    
    const data = await response.json();
    
    if (data.result) {
      console.log("✅ SageModeler tool execution result:");
      console.log(data.result.content[0].text);
    } else {
      console.log("❌ SageModeler tool execution failed:");
      console.log(`Code: ${data.error.code}`);
      console.log(`Message: ${data.error.message}`);
    }
    
  } catch (error) {
    console.log(`❌ SageModeler network error: ${error.message}`);
  }
}

testCompleteWorkflow().catch(console.error); 