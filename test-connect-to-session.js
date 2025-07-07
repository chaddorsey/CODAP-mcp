#!/usr/bin/env node

/**
 * Test the connect_to_session tool to establish proper session pairing
 */

const SERVER_URL = "https://codap-mcp-stable.vercel.app";

async function testConnectToSession() {
  console.log("=== Testing connect_to_session Tool ===");
  
  // Step 1: Connect Claude session IIUUW2M8 to browser worker session X27ARLOQ
  const claudeSessionId = "IIUUW2M8";
  const browserWorkerSessionId = "X27ARLOQ";
  
  console.log(`\nStep 1: Connecting Claude session ${claudeSessionId} to browser worker session ${browserWorkerSessionId}`);
  
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
      id: 1
    };
    
    console.log("Calling connect_to_session...");
    
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
      console.log("✅ Connection successful!");
      console.log("Response:", data.result.content[0].text);
    } else if (data.error) {
      console.log("❌ Connection failed:");
      console.log(`Code: ${data.error.code}`);
      console.log(`Message: ${data.error.message}`);
    }
    
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
  
  // Step 2: Test tool execution after connection
  console.log(`\nStep 2: Testing tool execution after connection with Claude session ${claudeSessionId}`);
  
  try {
    const toolRequest = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "getListOfDataContexts",
        arguments: {}
      },
      id: 2
    };
    
    console.log("Calling getListOfDataContexts after connection...");
    
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
      console.log("✅ Tool execution after connection:");
      console.log(data.result.content[0].text);
    } else if (data.error) {
      console.log("❌ Tool execution failed:");
      console.log(`Code: ${data.error.code}`);
      console.log(`Message: ${data.error.message}`);
    }
    
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
  
  // Step 3: Test SageModeler tool execution after connection
  console.log(`\nStep 3: Testing SageModeler tool execution after connection`);
  
  try {
    const sageRequest = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "sage_get_all_nodes",
        arguments: {}
      },
      id: 3
    };
    
    console.log("Calling sage_get_all_nodes after connection...");
    
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
      console.log("✅ SageModeler tool execution after connection:");
      console.log(data.result.content[0].text);
    } else if (data.error) {
      console.log("❌ SageModeler tool execution failed:");
      console.log(`Code: ${data.error.code}`);
      console.log(`Message: ${data.error.message}`);
    }
    
  } catch (error) {
    console.log(`❌ SageModeler network error: ${error.message}`);
  }
}

testConnectToSession().catch(console.error); 
