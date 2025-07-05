#!/usr/bin/env node

/**
 * Create the legacy session that browser worker expects
 */

const SERVER_URL = "https://codap-mcp-stable.vercel.app";

async function createLegacySession() {
  console.log("=== Creating Legacy Session for Browser Worker ===");
  
  const sessionCode = "X27ARLOQ";
  const sessionData = {
    capabilities: ["CODAP", "SAGEMODELER"]
  };
  
  try {
    console.log(`Creating legacy session: ${sessionCode}`);
    console.log("Session data:", JSON.stringify(sessionData, null, 2));
    
    // Use the sessions endpoint to create the session
    const response = await fetch(`${SERVER_URL}/api/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-code": sessionCode
      },
      body: JSON.stringify(sessionData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log("✅ Legacy session created successfully!");
      console.log("Response:", JSON.stringify(result, null, 2));
      
      // Verify the session was created
      console.log("\nVerifying session creation...");
      const verifyResponse = await fetch(`${SERVER_URL}/api/metadata?sessionId=${sessionCode}`);
      const verifyData = await verifyResponse.json();
      
      if (verifyResponse.ok) {
        console.log(`✅ Session verified: ${verifyData.toolCount} tools, session: ${verifyData.sessionCode}`);
      } else {
        console.log(`❌ Session verification failed: ${verifyData.error}`);
      }
      
    } else {
      console.log("❌ Failed to create legacy session");
      console.log("Error:", JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
}

createLegacySession().catch(console.error); 