#!/usr/bin/env node

/**
 * Test Enhanced Capability Messaging
 * 
 * This test verifies that the enhanced capability-aware messaging in connect_to_session
 * provides explicit warnings about unavailable tools to help Claude understand session limitations.
 */

const BASE_URL = "https://codap-mcp-stable.vercel.app";

async function testEnhancedCapabilityMessaging() {
  console.log("🧪 Testing Enhanced Capability Messaging");
  console.log("=".repeat(60));
  
  try {
    // Test CODAP-only session (should show enhanced warnings about SageModeler)
    console.log("\n📋 Testing CODAP-only session messaging...");
    
    const connectRequest = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "connect_to_session",
        arguments: {
          sessionId: "MTTRK5WK"  // Known CODAP-only session
        }
      },
      id: 1
    };

    const response = await fetch(`${BASE_URL}/api/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-vercel-protection-bypass": "test-enhanced-capability-messaging",
        "user-agent": "test-enhanced-capability-messaging"
      },
      body: JSON.stringify(connectRequest)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      console.error("❌ Error:", data.error);
      return;
    }

    const messageText = data.result?.content?.[0]?.text || "No text found";
    
    console.log("\n📄 Connection Message:");
    console.log("-".repeat(40));
    console.log(messageText);
    console.log("-".repeat(40));
    
    // Check for enhanced messaging elements
    const checks = [
      { name: "Session Type Identification", check: messageText.includes("This is a CODAP-only session") },
      { name: "Critical SageModeler Warning", check: messageText.includes("🚫 **CRITICAL**: SageModeler tools (sage_*) are NOT available") },
      { name: "Tool Not Found Warning", check: messageText.includes('will return "Tool not found" errors') },
      { name: "Valid Tools Section", check: messageText.includes("✅ Valid Tools for This Session") },
      { name: "CODAP Tools List", check: messageText.includes("[CODAP] Tools (34 tools)") },
      { name: "Unavailable Tools Section", check: messageText.includes("🚫 **Unavailable in this session**: All SageModeler tools") },
      { name: "Specific Tool Examples", check: messageText.includes("sage_create_node, sage_update_node") }
    ];
    
    console.log("\n✅ Enhanced Messaging Verification:");
    console.log("-".repeat(40));
    
    let allPassed = true;
    checks.forEach(({ name, check }) => {
      const status = check ? "✅" : "❌";
      console.log(`${status} ${name}: ${check ? "FOUND" : "MISSING"}`);
      if (!check) allPassed = false;
    });
    
    console.log("\n📊 Overall Result:");
    console.log(`${allPassed ? "✅" : "❌"} Enhanced capability messaging: ${allPassed ? "WORKING" : "NEEDS IMPROVEMENT"}`);
    
    if (allPassed) {
      console.log("\n🎉 SUCCESS: Enhanced capability messaging is working perfectly!");
      console.log("   Claude should now receive much clearer guidance about tool availability.");
    } else {
      console.log("\n⚠️  Some enhanced messaging elements are missing or not working as expected.");
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testEnhancedCapabilityMessaging(); 
