#!/usr/bin/env node

/**
 * Test script to understand current session state and debug the pairing mechanism
 */

const SERVER_URL = "https://codap-mcp-stable.vercel.app";

async function testSessionState() {
  console.log("=== Testing Current Session State ===");
  
  // Test 1: Check if any sessions exist
  console.log("\n1. Testing session validation:");
  
  const knownSessions = ["X27ARLOQ", "IIUUW2M8", "PA2RC6IM"];
  
  for (const sessionId of knownSessions) {
    try {
      const response = await fetch(`${SERVER_URL}/api/metadata?sessionId=${sessionId}`);
      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ Session ${sessionId}: ${data.toolCount} tools, capabilities: ${JSON.stringify(data.capabilities || "none")}`);
      } else {
        console.log(`❌ Session ${sessionId}: ${data.error} - ${data.message}`);
      }
    } catch (error) {
      console.log(`❌ Session ${sessionId}: Network error - ${error.message}`);
    }
  }
  
  // Test 2: Test MCP endpoint with different session formats
  console.log("\n2. Testing MCP endpoint session handling:");
  
  const mcpTestSessions = [
    "claude-desktop-session",
    "IIUUW2M8", 
    "pairing-IIUUW2M8-X27ARLOQ",
    "X27ARLOQ"
  ];
  
  for (const sessionId of mcpTestSessions) {
    try {
      const mcpRequest = {
        jsonrpc: "2.0",
        method: "tools/list",
        params: {},
        id: 1
      };
      
      const response = await fetch(`${SERVER_URL}/api/mcp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "mcp-session-id": sessionId
        },
        body: JSON.stringify(mcpRequest)
      });
      
      const data = await response.json();
      
      if (data.result && data.result.tools) {
        console.log(`✅ MCP Session ${sessionId}: ${data.result.tools.length} tools available`);
      } else if (data.error) {
        console.log(`❌ MCP Session ${sessionId}: ${data.error.code} - ${data.error.message}`);
      } else {
        console.log(`❓ MCP Session ${sessionId}: Unexpected response format`);
      }
    } catch (error) {
      console.log(`❌ MCP Session ${sessionId}: Network error - ${error.message}`);
    }
  }
  
  // Test 3: Test pairing session ID extraction
  console.log("\n3. Testing pairing session ID extraction logic:");
  
  const testPairingIds = [
    "pairing-IIUUW2M8-X27ARLOQ",
    "pairing-claude-desktop-X27ARLOQ", 
    "IIUUW2M8",
    "X27ARLOQ"
  ];
  
  testPairingIds.forEach(sessionId => {
    const extracted = sessionId.split("-").pop();
    console.log(`sessionId: "${sessionId}" -> extracted: "${extracted}"`);
  });
}

testSessionState().catch(console.error); 
