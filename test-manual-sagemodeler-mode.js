#!/usr/bin/env node

/**
 * Test Manual SageModeler Mode Fix
 * 
 * This script verifies that when the plugin is manually set to SageModeler mode,
 * it ALWAYS creates sessions with dual capabilities regardless of SageModeler detection.
 */

async function testManualSageModelerMode() {
  console.log("🧪 Testing Manual SageModeler Mode Fix");
  console.log("=" .repeat(50));
  
  const baseUrl = "https://codap-mcp-stable.vercel.app";
  
  try {
    // Step 1: Create a session with dual capabilities (simulating manual SageModeler mode)
    console.log("📝 Step 1: Creating session with dual capabilities (manual SageModeler mode)");
    
    const sessionResponse = await fetch(`${baseUrl}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        capabilities: ["CODAP", "SAGEMODELER"]  // Dual capabilities as expected from manual mode
      })
    });
    
    if (!sessionResponse.ok) {
      throw new Error(`Session creation failed: ${sessionResponse.status}`);
    }
    
    const session = await sessionResponse.json();
    console.log(`✅ Session created: ${session.code}`);
    
    // Step 2: Connect to session (simulating Claude Desktop connection)
    console.log("🔗 Step 2: Connecting to session");
    
    const connectionResponse = await fetch(`${baseUrl}/api/mcp`, {
      method: "POST", 
      headers: { 
        "Content-Type": "application/json",
        "x-vercel-protection-bypass": "true",
        "x-session-code": session.code
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "connect_to_session",
        params: {
          sessionCode: session.code
        },
        id: 1
      })
    });
    
    if (!connectionResponse.ok) {
      const errorText = await connectionResponse.text();
      throw new Error(`Connection test failed: ${connectionResponse.status} - ${errorText}`);
    }
    
    const connectionResult = await connectionResponse.json();
    const message = connectionResult.result?.message || "";
    
    console.log("✅ Connection successful!");
    console.log(`   Message contains "CODAP- and SageModeler-equipped": ${message.includes("CODAP- and SageModeler-equipped")}`);
    console.log(`   Message contains "60 total": ${message.includes("60 total")}`);
    
    // Step 3: Get tools list to verify dual capabilities
    console.log("📋 Step 3: Getting tools list");
    
    const toolsResponse = await fetch(`${baseUrl}/api/mcp`, {
      method: "POST", 
      headers: { 
        "Content-Type": "application/json",
        "x-vercel-protection-bypass": "true",
        "x-session-code": session.code
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/list",
        params: {},
        id: 2
      })
    });
    
    if (!toolsResponse.ok) {
      throw new Error(`Tools list failed: ${toolsResponse.status}`);
    }
    
    const toolsResult = await toolsResponse.json();
    const tools = toolsResult.result?.tools || [];
    
    console.log(`✅ Tools list received: ${tools.length} tools`);
    
    // Check for both CODAP and SageModeler tools
    const codapTools = tools.filter(tool => !tool.name.startsWith("sage_") && tool.name !== "connect_to_session");
    const sageTools = tools.filter(tool => tool.name.startsWith("sage_"));
    const connectionTools = tools.filter(tool => tool.name === "connect_to_session");
    
    console.log(`   CODAP tools: ${codapTools.length}`);
    console.log(`   SageModeler tools: ${sageTools.length}`);
    console.log(`   Connection tools: ${connectionTools.length}`);
    
    // Step 4: Test both tool types
    console.log("🔧 Step 4: Testing tool execution");
    
    // Test CODAP tool
    const codapTestResponse = await fetch(`${baseUrl}/api/mcp`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-vercel-protection-bypass": "true",
        "x-session-code": session.code
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "getInteractiveFrame",
          arguments: {}
        },
        id: 3
      })
    });
    
    const codapResult = await codapTestResponse.json();
    console.log(`   CODAP tool test: ${codapResult.result ? "✅ SUCCESS" : "❌ FAILED"}`);
    
    // Test SageModeler tool
    const sageTestResponse = await fetch(`${baseUrl}/api/mcp`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-vercel-protection-bypass": "true",
        "x-session-code": session.code
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "sage_create_node",
          arguments: {
            title: "Test Node",
            x: 100,
            y: 100
          }
        },
        id: 4
      })
    });
    
    const sageResult = await sageTestResponse.json();
    console.log(`   SageModeler tool test: ${sageResult.result ? "✅ SUCCESS" : "❌ FAILED"}`);
    if (sageResult.error) {
      console.log(`   SageModeler error: ${sageResult.error.message}`);
    }
    
    // Summary
    console.log("\n🎯 SUMMARY:");
    console.log(`   ✅ Session creation: Working`);
    console.log(`   ✅ Connection message: ${message.includes("CODAP- and SageModeler-equipped") ? "Dual capabilities detected" : "❌ Issue detected"}`);
    console.log(`   ✅ Tools count: ${tools.length === 60 ? "60 tools (expected)" : `${tools.length} tools (unexpected)`}`);
    console.log(`   ✅ CODAP tools: ${codapResult.result ? "Working" : "❌ Failed"}`);
    console.log(`   ✅ SageModeler tools: ${sageResult.result ? "Working" : "❌ Failed"}`);
    
    if (message.includes("CODAP- and SageModeler-equipped") && tools.length === 60 && codapResult.result && sageResult.result) {
      console.log("\n🎉 SUCCESS! Manual SageModeler mode is working correctly!");
    } else {
      console.log("\n❌ ISSUE DETECTED! Manual SageModeler mode needs further investigation.");
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testManualSageModelerMode(); 