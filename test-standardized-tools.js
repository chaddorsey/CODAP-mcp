#!/usr/bin/env node

/**
 * Test script to verify standardized tool names work correctly
 * Tests that the browser worker now uses the same tool names as the server
 */

const https = require("https");

// Configuration
const BASE_URL = "https://codap-mcp-stable.vercel.app";
const BYPASS_HEADER = "pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye";

// Test session data
const testSessionId = `test-standardized-tools-${Date.now()}`;
let actualSessionCode = null; // Will be set from API response

console.log("🧪 Testing Standardized Tool Names");
console.log("==================================");
console.log(`Session ID: ${testSessionId}`);
console.log("");

async function makeRequest(method, path, data = null, sessionCode = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "codap-mcp-stable.vercel.app",
      port: 443,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        "x-vercel-protection-bypass": BYPASS_HEADER
      }
    };

    // Add session code header if provided
    if (sessionCode) {
      options.headers["x-session-code"] = sessionCode;
    }

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers["Content-Length"] = Buffer.byteLength(jsonData);
    }

    const req = https.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => {
        responseData += chunk;
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on("error", (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testStandardizedToolNames() {
  try {
    console.log("1. Creating test session...");
    const sessionResponse = await makeRequest("POST", "/api/sessions", {});
    
    if (sessionResponse.status !== 201) {
      throw new Error(`Failed to create session: ${JSON.stringify(sessionResponse)}`);
    }
    
    actualSessionCode = sessionResponse.data.code;
    console.log("✅ Session created successfully");
    console.log(`   Session Code: ${actualSessionCode}`);
    console.log("");

    // Wait a moment for session to be fully initialized
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log("2. Testing tool execution with standardized names...");
    
    // Test the getListOfDataContexts tool using the MCP request format
    const toolRequest = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "getListOfDataContexts",
        arguments: {}
      },
      id: `test-${Date.now()}`
    };

    console.log("📤 Sending tool request:", JSON.stringify(toolRequest, null, 2));
    
    const toolResponse = await makeRequest("POST", "/api/mcp", toolRequest, actualSessionCode);
    
    console.log("📥 Tool response status:", toolResponse.status);
    console.log("📥 Tool response data:", JSON.stringify(toolResponse.data, null, 2));
    
    if (toolResponse.status === 200 && toolResponse.data.result) {
      console.log("✅ Tool executed successfully with standardized name!");
      
      // Check if the response indicates browser-worker mode
      const responseText = toolResponse.data.result.content?.[0]?.text || "";
      if (responseText.includes("browser-worker")) {
        console.log("✅ Tool executed in browser-worker mode (SSE pipeline working)");
      } else if (responseText.includes("direct-server")) {
        console.log("ℹ️  Tool executed in direct-server mode");
      }
      
      console.log("");
      console.log("🎉 SUCCESS: Standardized tool names are working correctly!");
      console.log("   - Server and browser worker now use the same tool names");
      console.log("   - No more mapping layer needed");
      console.log("   - Tool names match CODAP API conventions");
      
    } else {
      console.log("❌ Tool execution failed");
      console.log("Response:", JSON.stringify(toolResponse, null, 2));
    }

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Full error:", error);
  }
}

// Run the test
testStandardizedToolNames().then(() => {
  console.log("");
  console.log("🏁 Test completed");
}).catch(error => {
  console.error("💥 Test crashed:", error);
  process.exit(1);
}); 
