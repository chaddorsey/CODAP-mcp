/**
 * Debug script to test sendMessage function directly
 * Run this in the browser console when the CODAP plugin is loaded
 */

// Test the sendMessage function directly
async function testSendMessage() {
  console.log("🔧 Testing sendMessage function...");
  
  try {
    // Import the sendMessage function
    const { sendMessage } = await import("@concord-consortium/codap-plugin-api");
    console.log("✅ sendMessage imported successfully");
    
    // Test the exact call that's failing
    console.log("🔧 Calling sendMessage('get', 'dataContextList')...");
    const result = await sendMessage("get", "dataContextList");
    console.log("✅ sendMessage result:", result);
    
  } catch (error) {
    console.error("❌ sendMessage error:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  }
}

// Test with timeout
async function testSendMessageWithTimeout() {
  console.log("🔧 Testing sendMessage with timeout...");
  
  try {
    const { sendMessage } = await import("@concord-consortium/codap-plugin-api");
    
    // Create a promise that times out after 5 seconds
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Timeout after 5 seconds")), 5000);
    });
    
    const sendMessagePromise = sendMessage("get", "dataContextList");
    
    const result = await Promise.race([sendMessagePromise, timeoutPromise]);
    console.log("✅ sendMessage result:", result);
    
  } catch (error) {
    console.error("❌ sendMessage error or timeout:", error);
  }
}

// Test CODAP connection status
function testCODAPConnection() {
  console.log("🔧 Testing CODAP connection...");
  
  // Check if we're in an iframe
  console.log("In iframe:", window !== window.top);
  
  // Check if CODAP is available
  console.log("CODAP available:", typeof window.parent !== 'undefined');
  
  // Test postMessage directly
  try {
    window.parent.postMessage({
      message: "test-message",
      source: "codap-plugin"
    }, "*");
    console.log("✅ postMessage sent successfully");
  } catch (error) {
    console.error("❌ postMessage error:", error);
  }
}

// Run all tests
console.log("🚀 Starting sendMessage debug tests...");
testCODAPConnection();
testSendMessage();
testSendMessageWithTimeout(); 