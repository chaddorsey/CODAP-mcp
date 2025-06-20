#!/usr/bin/env node

/**
 * Single Tool Test with Debugging
 * Tests one tool with detailed debugging information
 */

const SESSION_CODE = "4SEX4QCV";
const BASE_URL = "https://codap-l1pz9li9n-cdorsey-concordorgs-projects.vercel.app";
const BYPASS_HEADER = "pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye";

async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-sso-bypass": BYPASS_HEADER,
      ...options.headers
    }
  });
  
  console.log(`📡 ${options.method || "GET"} ${url} -> ${response.status} ${response.statusText}`);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.log(`❌ Error response: ${errorText}`);
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

async function testSingleTool() {
  console.log("🧪 Single Tool Test with Debugging");
  console.log(`📋 Session: ${SESSION_CODE}`);
  console.log(`🌐 Server: ${BASE_URL}`);
  console.log("=".repeat(50));
  
  try {
    // 1. Verify session exists
    console.log("\n1️⃣ Verifying session exists...");
    const metadata = await makeRequest(`${BASE_URL}/api/metadata?sessionCode=${SESSION_CODE}`);
    console.log(`✅ Session valid, ${metadata.toolCount} tools available`);
    
    // 2. Submit a simple tool request
    console.log("\n2️⃣ Submitting tool request...");
    const requestId = `test-single-${Date.now()}`;
    const toolName = "get_data_contexts";
    
    const submitResponse = await makeRequest(`${BASE_URL}/api/request`, {
      method: "POST",
      body: JSON.stringify({
        sessionCode: SESSION_CODE,
        toolName,
        params: {},
        requestId
      })
    });
    
    console.log(`✅ Request submitted:`, submitResponse);
    
    // 3. Poll for response with detailed logging
    console.log("\n3️⃣ Polling for response...");
    const startTime = Date.now();
    const timeout = 30000; // 30 seconds
    let attempts = 0;
    
    while (Date.now() - startTime < timeout) {
      attempts++;
      console.log(`   🔄 Attempt ${attempts} (${Date.now() - startTime}ms elapsed)...`);
      
      try {
        const response = await makeRequest(`${BASE_URL}/api/response?sessionCode=${SESSION_CODE}&requestId=${requestId}`, {
          method: "GET"
        });
        
        console.log(`   📨 Response received:`, response);
        
        if (response.status === "completed") {
          console.log(`\n🎉 SUCCESS! Tool completed successfully`);
          console.log(`📊 Result:`, JSON.stringify(response.result, null, 2));
          return;
        } else if (response.status === "error") {
          console.log(`\n❌ TOOL ERROR: ${response.error}`);
          return;
        } else {
          console.log(`   ⏳ Status: ${response.status}, continuing...`);
        }
        
      } catch (error) {
        if (error.message.includes("404")) {
          console.log(`   ⏳ Response not ready yet (404), continuing...`);
        } else {
          console.log(`   ❌ Polling error: ${error.message}`);
        }
      }
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n⏰ TIMEOUT: No response received after ${timeout}ms`);
    
    // 4. Debug: Check if browser worker is connected
    console.log("\n4️⃣ Debug information:");
    console.log("   • Make sure the browser plugin is open and connected");
    console.log("   • Check browser console for connection status");
    console.log("   • Verify the session code matches in both browser and test");
    console.log(`   • Session code: ${SESSION_CODE}`);
    
  } catch (error) {
    console.error("💥 Test failed:", error.message);
  }
}

testSingleTool(); 
