/**
 * Test script to verify CODAP timeout fix
 * This script tests that CODAP tools now have proper timeout handling
 */

const RELAY_BASE_URL = "https://codap-mcp-stable.vercel.app";

async function testTimeoutFix() {
  console.log("🧪 Testing CODAP timeout fix...");
  
  try {
    // Step 1: Create a session
    console.log("📋 Creating session...");
    const sessionResponse = await fetch(`${RELAY_BASE_URL}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capabilities: ["CODAP"] })
    });
    
    if (!sessionResponse.ok) {
      throw new Error(`Session creation failed: ${sessionResponse.status}`);
    }
    
    const session = await sessionResponse.json();
    console.log(`✅ Session created: ${session.code}`);
    
    // Step 2: Test CODAP tool execution
    console.log("🔧 Testing createDataContext tool...");
    
    const toolRequest = {
      tool: "createDataContext",
      arguments: {
        name: "TimeoutTestData",
        title: "Timeout Test Dataset",
        description: "Testing timeout fix"
      }
    };
    
    const startTime = Date.now();
    
    const mcpResponse = await fetch(`${RELAY_BASE_URL}/api/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionCode: session.code,
        ...toolRequest
      })
    });
    
    const duration = Date.now() - startTime;
    console.log(`⏱️  Request took: ${duration}ms`);
    
    if (!mcpResponse.ok) {
      const errorText = await mcpResponse.text();
      console.log(`❌ MCP request failed (${mcpResponse.status}): ${errorText}`);
      
      // Check if it's a timeout error
      if (errorText.includes("timeout") || errorText.includes("8000ms")) {
        console.log("🚨 TIMEOUT ERROR DETECTED - Fix may not be working!");
        console.log("💡 Make sure to refresh the browser tab to load updated code");
        return false;
      }
      return false;
    }
    
    const result = await mcpResponse.json();
    console.log("✅ MCP response received:", result);
    
    if (result.success) {
      console.log("🎉 SUCCESS: CODAP tool executed without timeout!");
      console.log(`⏱️  Total execution time: ${duration}ms (should be well under 8000ms)`);
      return true;
    } else {
      console.log("❌ Tool execution failed:", result.error);
      return false;
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    return false;
  }
}

// Run the test
testTimeoutFix().then(success => {
  if (success) {
    console.log("\n🎉 TIMEOUT FIX VERIFICATION: PASSED");
    console.log("✅ CODAP tools now have proper timeout handling");
  } else {
    console.log("\n❌ TIMEOUT FIX VERIFICATION: FAILED");
    console.log("🔄 Try refreshing the browser tab and testing again");
  }
}).catch(error => {
  console.error("\n💥 Test script error:", error);
}); 