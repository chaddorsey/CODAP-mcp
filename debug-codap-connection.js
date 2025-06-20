console.log("🔍 CODAP Connection Diagnostics");
console.log("================================\n");

// Check if we're in an iframe
console.log("1. Environment Check:");
console.log("   - In iframe:", window !== window.parent);
console.log("   - User agent:", navigator.userAgent.substring(0, 50) + "...");
console.log("   - Location:", window.location.href);

// Check for CODAP interface
console.log("\n2. CODAP Interface Check:");
console.log("   - window.codapInterface:", typeof window.codapInterface);
console.log("   - window.parent.codapInterface:", typeof (window.parent && window.parent.codapInterface));

// Check for postMessage capability
console.log("\n3. PostMessage Check:");
console.log("   - Can post to parent:", typeof window.parent?.postMessage === "function");

// Check for CODAP-specific objects
console.log("\n4. CODAP Objects:");
console.log("   - window.codap:", typeof window.codap);
console.log("   - window.CODAP:", typeof window.CODAP);

// Check if CODAP plugin API is loaded
console.log("\n5. Plugin API Check:");
if (window.codapInterface) {
  console.log("   ✅ CODAP Interface found!");
  console.log("   - Interface methods:", Object.keys(window.codapInterface));
} else {
  console.log("   ❌ CODAP Interface NOT found");
  console.log("   - This explains why we're in standalone mode");
}

// Test CODAP connectivity
console.log("\n6. CODAP Connectivity Test:");
if (window.codapInterface && window.codapInterface.sendRequest) {
  console.log("   Testing CODAP connection...");
  window.codapInterface.sendRequest({
    action: "get",
    resource: "interactiveFrame"
  }).then(result => {
    console.log("   ✅ CODAP connection successful:", result);
  }).catch(error => {
    console.log("   ❌ CODAP connection failed:", error);
  });
} else {
  console.log("   ❌ Cannot test - CODAP interface not available");
}

// Manual CODAP interface initialization attempt
console.log("\n7. Manual Interface Check:");
if (!window.codapInterface) {
  console.log("   Attempting to initialize CODAP interface...");
  
  // Try to load CODAP interface manually
  if (window.parent && window.parent !== window) {
    console.log("   - Detected iframe environment");
    console.log("   - Attempting parent communication...");
    
    // Try posting a test message
    try {
      window.parent.postMessage({
        message: {
          action: "get",
          resource: "interactiveFrame"
        }
      }, "*");
      console.log("   - Test message sent to parent");
    } catch (error) {
      console.log("   - Failed to send message to parent:", error);
    }
  } else {
    console.log("   - Not in iframe - CODAP interface won't be available");
  }
}

console.log("\n🎯 NEXT STEPS:");
console.log("==============");
if (window !== window.parent) {
  console.log("✅ You ARE in an iframe (good!)");
  if (!window.codapInterface) {
    console.log("❌ But CODAP interface is missing");
    console.log("   Solutions:");
    console.log("   1. Check if you're running this inside a CODAP plugin, not just a browser tab");
    console.log("   2. Ensure the CODAP plugin API script is loaded");
    console.log("   3. Try refreshing the CODAP page");
    console.log("   4. Check if there are JavaScript errors preventing the API from loading");
  }
} else {
  console.log("❌ You are NOT in an iframe");
  console.log("   Solutions:");
  console.log("   1. This needs to be running inside CODAP as a plugin");
  console.log("   2. Open CODAP (https://codap.concord.org)");
  console.log("   3. Add a plugin/interactive frame");
  console.log("   4. Point it to your app URL");
} 
