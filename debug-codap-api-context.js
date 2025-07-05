/**
 * Debug script to test CODAP API availability in different contexts
 * This script will help us understand why CODAP tools timeout while SageModeler tools work
 */

const RELAY_BASE_URL = "https://codap-mcp-stable.vercel.app";

async function debugCODAPAPIContext() {
  console.log("🔍 Debugging CODAP API Context...");
  
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
    
    // Step 2: Test direct CODAP API access
    console.log("🔧 Testing direct CODAP API access...");
    
    // Check if we're in the right context
    console.log("📍 Context check:");
    console.log("- window.parent:", typeof window.parent);
    console.log("- window.location:", window.location.href);
    console.log("- document.domain:", document.domain);
    
    // Try to import CODAP plugin API
    try {
      // This will fail if we're not in the right context
      const { sendMessage } = await import("@concord-consortium/codap-plugin-api");
      console.log("✅ CODAP Plugin API imported successfully");
      
      // Try a simple CODAP API call
      console.log("🔧 Testing simple CODAP API call...");
      const startTime = Date.now();
      
      // Test with a simple get operation
      const result = await sendMessage("get", "dataContextList");
      const duration = Date.now() - startTime;
      
      console.log(`✅ CODAP API call succeeded in ${duration}ms:`, result);
      
    } catch (importError) {
      console.log("❌ CODAP Plugin API import failed:", importError.message);
      console.log("🔍 This suggests we're not in the CODAP plugin context");
      
      // Try alternative approach - check if CODAP globals exist
      console.log("🔍 Checking for CODAP globals:");
      console.log("- window.codapInterface:", typeof window.codapInterface);
      console.log("- window.parent.iframePhone:", typeof window.parent?.iframePhone);
      
      return false;
    }
    
    // Step 3: Compare with SageModeler approach
    console.log("🔧 Testing SageModeler-style messaging...");
    
    // Test postMessage approach (like SageModeler)
    const testMessage = {
      action: "get",
      resource: "dataContextList",
      requestId: "test_" + Date.now()
    };
    
    let messageReceived = false;
    const messageHandler = (event) => {
      if (event.data && event.data.requestId === testMessage.requestId) {
        console.log("✅ PostMessage response received:", event.data);
        messageReceived = true;
        window.removeEventListener("message", messageHandler);
      }
    };
    
    window.addEventListener("message", messageHandler);
    
    // Send test message
    window.parent.postMessage(testMessage, "*");
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!messageReceived) {
      console.log("❌ No postMessage response received");
      console.log("🔍 This suggests CODAP doesn't respond to generic postMessages");
    }
    
    window.removeEventListener("message", messageHandler);
    
    return true;
    
  } catch (error) {
    console.error("❌ Debug failed:", error.message);
    return false;
  }
}

// Run the debug
debugCODAPAPIContext().then(success => {
  if (success) {
    console.log("\n🎯 DIAGNOSIS: CODAP API context is available");
    console.log("💡 The timeout issue may be elsewhere - check for:");
    console.log("   - Promise resolution issues");
    console.log("   - Event loop blocking");
    console.log("   - API parameter mismatches");
  } else {
    console.log("\n🚨 DIAGNOSIS: CODAP API context issue detected");
    console.log("💡 Possible solutions:");
    console.log("   - Ensure browser worker runs in CODAP plugin iframe");
    console.log("   - Use postMessage approach like SageModeler");
    console.log("   - Initialize CODAP plugin API properly");
  }
}).catch(error => {
  console.error("\n💥 Debug script error:", error);
}); 