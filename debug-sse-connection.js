const fetch = require("node-fetch");
const EventSource = require("eventsource");

const API_BASE_URL = "https://codap-h47znpzqe-cdorsey-concordorgs-projects.vercel.app";
const SESSION_CODE = "53W7CZYO";
const BYPASS_HEADER = "pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye";

async function debugSSEConnection() {
  console.log("🔍 DEBUGGING SSE CONNECTION ISSUE");
  console.log("==================================");
  console.log(`📋 Session: ${SESSION_CODE}`);
  console.log(`🔗 API Base: ${API_BASE_URL}`);
  console.log(`📡 Stream URL: ${API_BASE_URL}/api/stream?sessionCode=${SESSION_CODE}\n`);
  
  try {
    // Step 1: Test if session exists
    console.log("1. 🔍 Verifying session exists...");
    const sessionCheck = await fetch(`${API_BASE_URL}/api/sessions?code=${SESSION_CODE}`, {
      headers: { "x-vercel-protection-bypass": BYPASS_HEADER }
    });
    const sessionData = await sessionCheck.json();
    console.log(`   Session status: ${sessionCheck.status}`);
    console.log(`   Session data:`, JSON.stringify(sessionData, null, 2));
    
    // Step 2: Test if stream endpoint is reachable
    console.log("\n2. 🌐 Testing stream endpoint availability...");
    const streamUrl = `${API_BASE_URL}/api/stream?sessionCode=${SESSION_CODE}`;
    
    try {
      // Test with short timeout to see if connection starts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const streamResponse = await fetch(streamUrl, {
        headers: { 
          "x-vercel-protection-bypass": BYPASS_HEADER,
          "Accept": "text/event-stream",
          "Cache-Control": "no-cache"
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log(`   📊 Stream response status: ${streamResponse.status}`);
      console.log(`   📋 Stream headers:`, Object.fromEntries(streamResponse.headers.entries()));
      
      if (streamResponse.ok) {
        console.log("   ✅ Stream endpoint is reachable");
        
        // Read initial chunk to check format
        const reader = streamResponse.body.getReader();
        const decoder = new TextDecoder();
        
        try {
          const { value, done } = await reader.read();
          if (!done && value) {
            const chunk = decoder.decode(value);
            console.log("   📄 Initial SSE chunk:");
            console.log(`   "${chunk.replace(/\\n/g, "\\\\n")}"`);
            
            // Analyze format
            const hasEventPrefix = chunk.includes("event:");
            const hasDataPrefix = chunk.includes("data:");
            console.log(`   📊 Has 'event:' prefix: ${hasEventPrefix ? "✅" : "❌"}`);
            console.log(`   📊 Has 'data:' prefix: ${hasDataPrefix ? "✅" : "❌"}`);
          }
        } finally {
          reader.releaseLock();
        }
      } else {
        console.log(`   ❌ Stream endpoint returned error: ${streamResponse.status}`);
        const errorText = await streamResponse.text();
        console.log(`   Error: ${errorText}`);
      }
      
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("   ⏰ Stream connection timed out (expected for SSE)");
      } else {
        console.log(`   ❌ Stream connection failed: ${error.message}`);
      }
    }
    
    // Step 3: Test EventSource (simulating browser worker)
    console.log("\n3. 📡 Testing EventSource connection (like browser worker)...");
    
    const eventSource = new EventSource(streamUrl, {
      headers: {
        "x-vercel-protection-bypass": BYPASS_HEADER
      }
    });
    
    let eventReceived = false;
    const eventTimeout = setTimeout(() => {
      if (!eventReceived) {
        console.log("   ⏰ No events received within 5 seconds");
        eventSource.close();
      }
    }, 5000);
    
    eventSource.onopen = () => {
      console.log("   ✅ EventSource connection opened");
    };
    
    eventSource.onmessage = (event) => {
      eventReceived = true;
      clearTimeout(eventTimeout);
      console.log("   📨 Received message event:");
      console.log(`   Data: ${event.data}`);
      eventSource.close();
    };
    
    // Listen for named events (the ones we're sending)
    ["connection", "heartbeat", "tool-request"].forEach(eventName => {
      eventSource.addEventListener(eventName, (event) => {
        eventReceived = true;
        clearTimeout(eventTimeout);
        console.log(`   📨 Received '${eventName}' event:`);
        console.log(`   Data: ${event.data}`);
        eventSource.close();
      });
    });
    
    eventSource.onerror = (error) => {
      clearTimeout(eventTimeout);
      console.log("   ❌ EventSource error:", error);
      eventSource.close();
    };
    
    // Wait for EventSource test to complete
    await new Promise(resolve => {
      const checkClosed = setInterval(() => {
        if (eventSource.readyState === EventSource.CLOSED) {
          clearInterval(checkClosed);
          resolve();
        }
      }, 100);
    });
    
    console.log("\n4. 🎯 DIAGNOSIS:");
    console.log("================");
    if (sessionCheck.ok && streamResponse?.ok) {
      console.log("✅ Session exists and stream endpoint is reachable");
      if (eventReceived) {
        console.log("✅ EventSource can receive events");
        console.log("🔧 Issue might be in browser worker event handling logic");
      } else {
        console.log("❌ EventSource is not receiving events");
        console.log("🔧 Issue is with SSE event formatting or transmission");
      }
    } else {
      console.log("❌ Basic connectivity issues detected");
      console.log("🔧 Need to fix session or stream endpoint first");
    }
    
  } catch (error) {
    console.error("❌ Debug failed:", error.message);
  }
}

debugSSEConnection(); 
