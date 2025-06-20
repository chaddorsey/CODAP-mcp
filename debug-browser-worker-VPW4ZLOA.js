const fetch = require("node-fetch");

const API_BASE_URL = "https://codap-h47znpzqe-cdorsey-concordorgs-projects.vercel.app";
const SESSION_CODE = "VPW4ZLOA";
const BYPASS_HEADER = "pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye";

async function debugBrowserWorkerConnection() {
  console.log("🔍 DEBUGGING BROWSER WORKER SSE CONNECTION");
  console.log("===========================================");
  console.log(`📋 Session: ${SESSION_CODE}`);
  console.log(`🔗 Testing against: ${API_BASE_URL}\n`);
  
  try {
    // Step 1: Queue a simple tool request
    console.log("1. 🔧 Queueing a simple tool request...");
    const toolRequest = {
      sessionCode: SESSION_CODE,
      requestId: `debug-${Date.now()}`,
      toolName: "get_data_contexts",
      params: {}
    };
    
    const queueResponse = await fetch(`${API_BASE_URL}/api/request`, {
      method: "POST",
      headers: {
        "x-vercel-protection-bypass": BYPASS_HEADER,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(toolRequest)
    });
    
    const queueResult = await queueResponse.json();
    console.log("   ✅ Tool request queued:", queueResult.id);
    console.log("   📊 Status:", queueResult.status);
    
    // Step 2: Test the SSE stream like the browser worker would
    console.log("\n2. 📡 Testing SSE stream (simulating browser worker)...");
    const streamUrl = `${API_BASE_URL}/api/stream?sessionCode=${SESSION_CODE}`;
    console.log("   🔗 Stream URL:", streamUrl);
    
    const streamResponse = await fetch(streamUrl, {
      headers: {
        "x-vercel-protection-bypass": BYPASS_HEADER
      }
    });
    
    if (!streamResponse.ok) {
      throw new Error(`Stream failed: ${streamResponse.status} ${streamResponse.statusText}`);
    }
    
    console.log("   ✅ Stream connection established");
    console.log("   📋 Content-Type:", streamResponse.headers.get("content-type"));
    
    const buffer = "";
    let eventCount = 0;
    let toolRequestReceived = false;
    
    console.log("\n3. 📨 Monitoring SSE events (10 second timeout)...");
    
    // Use Node.js stream handling
    const streamText = await streamResponse.text();
    console.log("   📄 Raw stream response:");
    console.log(streamText);
    
    // Parse SSE events from the response
    const chunks = streamText.split("\n\n");
    
    for (const chunk of chunks) {
      if (chunk.trim()) {
        eventCount++;
        console.log(`\n📨 Event #${eventCount}:`);
        console.log("Raw chunk:", JSON.stringify(chunk));
        
        // Parse the SSE event
        const eventLines = chunk.split("\n");
        let eventType = null;
        let eventData = null;
        
        for (const line of eventLines) {
          if (line.startsWith("event: ")) {
            eventType = line.substring(7);
          } else if (line.startsWith("data: ")) {
            try {
              eventData = JSON.parse(line.substring(6));
            } catch (e) {
              console.log("   ⚠️ Could not parse data:", line.substring(6));
            }
          }
        }
        
        if (eventType && eventData) {
          console.log(`   🎯 Parsed Event Type: ${eventType}`);
          console.log(`   📋 Event Data:`, JSON.stringify(eventData, null, 2));
          
          if (eventType === "tool-request") {
            toolRequestReceived = true;
            console.log("   🎉 TOOL REQUEST EVENT RECEIVED!");
            console.log("   🔧 Tool:", eventData.tool);
            console.log("   🆔 ID:", eventData.id);
            
            // This is what the browser worker should process
            console.log("\n   ✨ This is the event the browser worker should receive and process!");
          } else if (eventType === "connected") {
            console.log("   ✅ Connection confirmed");
          } else if (eventType === "heartbeat") {
            console.log("   💓 Heartbeat received");
          }
        } else {
          console.log("   ⚠️ Event format issue - missing type or data");
        }
      }
    }
    
    // Step 4: Analysis and recommendations
    console.log("\n4. 📊 ANALYSIS & RECOMMENDATIONS");
    console.log("==================================");
    console.log(`📊 Total SSE events received: ${eventCount}`);
    console.log(`📨 Tool request received: ${toolRequestReceived ? "YES" : "NO"}`);
    console.log(`✅ SSE format working: ${eventCount > 0 ? "YES" : "NO"}`);
    
    if (eventCount > 0 && !toolRequestReceived) {
      console.log("\n🔍 LIKELY ISSUE: Tool request consumed or timing problem");
      console.log("   • The SSE stream format is working correctly");
      console.log("   • The tool request may have been consumed by another connection");
      console.log("   • Or there might be a timing issue with KV storage");
    } else if (eventCount === 0) {
      console.log("\n❌ CRITICAL ISSUE: No SSE events received");
      console.log("   • SSE connection might be failing");
      console.log("   • Check if the stream endpoint is working");
    } else if (toolRequestReceived) {
      console.log("\n✅ SUCCESS: Tool request properly received via SSE!");
      console.log("   • The browser worker should be getting these events");
      console.log("   • Check TypeScript compilation errors blocking processing");
    }
    
    console.log("\n🔧 NEXT TROUBLESHOOTING STEPS:");
    console.log("===============================");
    console.log("1. Fix TypeScript compilation errors (blocking browser worker)");
    console.log("2. Check browser worker EventSource implementation");
    console.log("3. Verify browser worker is using the correct deployment URL");
    console.log("4. Test with a fresh browser worker restart");
    
  } catch (error) {
    console.error("❌ Debug failed:", error.message);
    if (error.response) {
      console.error("Response:", error.response.data);
    }
  }
}

debugBrowserWorkerConnection(); 
