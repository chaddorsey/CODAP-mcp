#!/usr/bin/env node

/**
 * Test tool execution via MCP to see debug output
 */

const SERVER_URL = "https://codap-mcp-stable.vercel.app";

async function testToolExecution() {
  console.log("=== Testing Tool Execution ===");
  
  // Test with the Claude session that has 60 tools
  const claudeSessionId = "X27ARLOQ";
  
  console.log(`\nTesting CODAP tool execution with session: ${claudeSessionId}`);
  
  try {
    // Test a simple CODAP tool
    const mcpRequest = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "getListOfDataContexts",
        arguments: {}
      },
      id: 1
    };
    
    console.log("Calling getListOfDataContexts...");
    
    const response = await fetch(`${SERVER_URL}/api/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "mcp-session-id": claudeSessionId
      },
      body: JSON.stringify(mcpRequest)
    });
    
    const data = await response.json();
    
    if (data.result) {
      console.log("✅ Tool execution result:");
      console.log(JSON.stringify(data.result, null, 2));
    } else if (data.error) {
      console.log("❌ Tool execution error:");
      console.log(`Code: ${data.error.code}`);
      console.log(`Message: ${data.error.message}`);
      if (data.error.data) {
        console.log(`Data: ${JSON.stringify(data.error.data, null, 2)}`);
      }
    } else {
      console.log("❓ Unexpected response format:");
      console.log(JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
  
  // Test SageModeler tool as well
  console.log(`\nTesting SageModeler tool execution with session: ${claudeSessionId}`);
  
  try {
    const sageRequest = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "sage_get_all_nodes",
        arguments: {}
      },
      id: 2
    };
    
    console.log("Calling sage_get_all_nodes...");
    
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
      console.log(JSON.stringify(data.result, null, 2));
    } else if (data.error) {
      console.log("❌ SageModeler tool execution error:");
      console.log(`Code: ${data.error.code}`);
      console.log(`Message: ${data.error.message}`);
    } else {
      console.log("❓ Unexpected SageModeler response:");
      console.log(JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.log(`❌ SageModeler network error: ${error.message}`);
  }
}

testToolExecution().catch(console.error); 