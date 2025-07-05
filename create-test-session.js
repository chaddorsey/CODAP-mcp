#!/usr/bin/env node

/**
 * Create a test CODAP session for Claude Desktop to connect to
 */

const VERCEL_URL = "https://codap-mcp-stable.vercel.app";
const BYPASS_HEADER = "pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye";

async function createTestSession() {
  console.log("🔧 Creating test CODAP session...");
  
  const sessionId = "5YTKQDKM"; // Use the session ID Claude tried to connect to
  
  // Create a minimal session in KV storage by making a request to the MCP server
  // that will trigger session creation
  try {
    const response = await fetch(`${VERCEL_URL}/api/mcp`, {
      method: "POST",
      headers: {
        "x-vercel-protection-bypass": BYPASS_HEADER,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "connect_to_session",
          arguments: { sessionId }
        },
        id: 1
      })
    });
    
    const data = await response.json();
    console.log("Response:", data.result?.content?.[0]?.text?.substring(0, 100) + "...");
    
    if (data.result?.content?.[0]?.text?.includes("not found")) {
      console.log("\n❌ Session creation failed - session doesn't exist in KV store");
      console.log("💡 You need to create a CODAP session first by:");
      console.log("   1. Opening CODAP in a browser");
      console.log("   2. Loading the MCP plugin");
      console.log("   3. Using the session ID it generates");
      console.log(`   4. Or manually creating session ${sessionId} in the KV store`);
    } else if (data.result?.content?.[0]?.text?.includes("Connected successfully")) {
      console.log("\n✅ Session connection successful!");
      console.log(`   Session ${sessionId} is now available for Claude Desktop`);
    } else {
      console.log("\n❓ Unexpected response:", data);
    }
    
  } catch (error) {
    console.error("❌ Error creating test session:", error.message);
  }
}

createTestSession().catch(console.error); 
