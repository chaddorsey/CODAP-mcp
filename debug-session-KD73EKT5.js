const fetch = require("node-fetch");

async function debugSession() {
  console.log("🔍 Debug Session KD73EKT5 - Full Pipeline Analysis");
  console.log("====================================================\n");
  
  const sessionCode = "KD73EKT5";
  const baseUrl = "https://codap-9801yonhe-cdorsey-concordorgs-projects.vercel.app";
  const headers = {
    "Content-Type": "application/json",
    "x-vercel-protection-bypass": "pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye"
  };
  
  try {
    // Step 1: Check if session exists in KV storage
    console.log(`🔍 Step 1: Checking session status...`);
    const metadataResponse = await fetch(`${baseUrl}/api/metadata?code=${sessionCode}`, {
      headers
    });
    const metadata = await metadataResponse.json();
    console.log("Session metadata:", JSON.stringify(metadata, null, 2));
    
    // Step 2: Send a simple test request to see detailed response
    console.log(`\n🧪 Step 2: Sending simple test request...`);
    const testRequest = {
      sessionCode,
      requestId: `debug-test-${Date.now()}`,
      toolName: "get_data_contexts",
      params: {}
    };
    
    const testResponse = await fetch(`${baseUrl}/api/request`, {
      method: "POST",
      headers,
      body: JSON.stringify(testRequest)
    });
    const testResult = await testResponse.json();
    console.log("Test request result:", JSON.stringify(testResult, null, 2));
    
    // Step 3: Check if there are any pending requests in KV
    console.log(`\n📋 Step 3: Checking for any existing requests...`);
    const existingRequests = [
      "create-dataset-1750338778553",
      "create-graph-1750338781778", 
      "verify-1750338785001",
      testResult.id
    ];
    
    for (const requestId of existingRequests) {
      if (requestId) {
        try {
          const checkResponse = await fetch(`${baseUrl}/api/response`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              sessionCode,
              requestId
            })
          });
          const checkResult = await checkResponse.json();
          console.log(`Request ${requestId}:`, JSON.stringify(checkResult, null, 2));
        } catch (error) {
          console.log(`Request ${requestId}: Error -`, error.message);
        }
        
        // Small delay between checks
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Step 4: Test stream endpoint with longer monitoring
    console.log(`\n📡 Step 4: Testing stream endpoint...`);
    console.log(`Stream URL: ${baseUrl}/api/stream?sessionCode=${sessionCode}`);
    console.log("You should manually check this URL in a browser or curl it to see live updates.\n");
    
    // Step 5: Send a very simple request that should definitely work
    console.log(`🔧 Step 5: Sending minimal test request...`);
    const minimalRequest = {
      sessionCode,
      requestId: `minimal-${Date.now()}`,
      toolName: "get_data_contexts",
      params: {}
    };
    
    const minimalResponse = await fetch(`${baseUrl}/api/request`, {
      method: "POST",
      headers,
      body: JSON.stringify(minimalRequest)
    });
    const minimalResult = await minimalResponse.json();
    console.log("Minimal request result:", JSON.stringify(minimalResult, null, 2));
    
    // Step 6: Check deployment and connectivity
    console.log(`\n🌐 Step 6: Verifying deployment info...`);
    const healthResponse = await fetch(`${baseUrl}/api/health`, { headers });
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log("Health check:", JSON.stringify(healthData, null, 2));
    } else {
      console.log("Health check failed:", healthResponse.status, healthResponse.statusText);
    }
    
    // Step 7: Debugging suggestions
    console.log(`\n🛠️  TROUBLESHOOTING STEPS:`);
    console.log("=========================");
    console.log(`1. 🌐 Check CODAP Plugin Console:`);
    console.log(`   - Open browser dev tools (F12) in your CODAP tab`);
    console.log(`   - Look for console logs, errors, or network activity`);
    console.log(`   - Check if the browser worker is running`);
    
    console.log(`\n2. 📡 Monitor Stream in Real-Time:`);
    console.log(`   - Open: ${baseUrl}/api/stream?sessionCode=${sessionCode}`);
    console.log(`   - Leave this open while sending requests`);
    console.log(`   - Look for data flowing through the stream`);
    
    console.log(`\n3. 🔄 Check Plugin Connection:`);
    console.log(`   - Verify your CODAP plugin is still active`);
    console.log(`   - Try refreshing the CODAP page`);
    console.log(`   - Make sure session ${sessionCode} is still valid`);
    
    console.log(`\n4. 🧪 Test Browser Worker:`);
    console.log(`   - In CODAP browser console, check if there's a global 'worker' or 'codapWorker' object`);
    console.log(`   - Look for any JavaScript errors in the browser console`);
    console.log(`   - Check if fetch/EventSource APIs are being blocked`);
    
    console.log(`\n5. 🔍 Manual Stream Test:`);
    console.log(`   - Run this command manually to see live stream:`);
    console.log(`   curl -H "x-vercel-protection-bypass: pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye" "${baseUrl}/api/stream?sessionCode=${sessionCode}"`);
    
    console.log(`\n6. 🌍 Network Issues:`);
    console.log(`   - Check if your browser can reach the deployment URL`);
    console.log(`   - Verify the protection bypass header is working`);
    console.log(`   - Try opening the metadata URL directly in browser:`);
    console.log(`   ${baseUrl}/api/metadata?code=${sessionCode}`);
    
  } catch (error) {
    console.error("❌ Debug failed:", error);
    console.error("Stack trace:", error.stack);
  }
}

debugSession(); 
