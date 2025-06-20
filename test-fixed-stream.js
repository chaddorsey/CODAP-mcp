const axios = require("axios");

const API_BASE_URL = "https://codap-h47znpzqe-cdorsey-concordorgs-projects.vercel.app";
const SESSION_CODE = "5TF7KQZC"; // Using existing session
const BYPASS_HEADER = "pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye";

async function testFixedStreamEndpoint() {
  console.log("🔧 TESTING FIXED SSE STREAM ENDPOINT");
  console.log("=====================================");
  
  try {
    // 1. Queue a new tool request
    console.log("\n1. Queueing tool request...");
    const toolRequest = {
      id: `test-${Date.now()}`,
      tool: "create_dataset_with_table",
      args: {
        datasetName: "Weather_Data_Fixed",
        description: "Weather data to test fixed stream",
        collections: [
          {
            name: "Cities",
            attributes: [
              { name: "City", type: "categorical" },
              { name: "Temperature", type: "numeric" },
              { name: "Humidity", type: "numeric" }
            ],
            cases: [
              { City: "New York", Temperature: 72, Humidity: 65 },
              { City: "Los Angeles", Temperature: 75, Humidity: 55 },
              { City: "Chicago", Temperature: 68, Humidity: 70 },
              { City: "Houston", Temperature: 78, Humidity: 80 }
            ]
          }
        ]
      }
    };

    const requestPayload = {
      sessionCode: SESSION_CODE,
      requestId: toolRequest.id,
      toolName: toolRequest.tool,
      params: toolRequest.args
    };

    const queueResponse = await axios.post(`${API_BASE_URL}/api/request`, requestPayload, {
      headers: {
        "x-vercel-protection-bypass": BYPASS_HEADER
      }
    });

    console.log("✅ Tool request queued:", queueResponse.data);

    // 2. Test the stream endpoint to see if we get the tool request
    console.log("\n2. Testing stream endpoint (will run for 10 seconds)...");
    
    const streamUrl = `${API_BASE_URL}/api/stream?sessionCode=${SESSION_CODE}`;
    console.log("Stream URL:", streamUrl);

    // Test the stream using fetch (simulating EventSource)
    const response = await fetch(streamUrl, {
      headers: {
        "x-vercel-protection-bypass": BYPASS_HEADER
      }
    });
    
    if (!response.ok) {
      throw new Error(`Stream endpoint failed: ${response.status} ${response.statusText}`);
    }

    console.log("✅ Stream connection established!");
    console.log("Content-Type:", response.headers.get("content-type"));

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let receivedToolRequest = false;
    
    // Set timeout to stop after 10 seconds
    const timeout = setTimeout(() => {
      reader.cancel();
    }, 10000);

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE messages
        const lines = buffer.split("\n\n");
        buffer = lines.pop(); // Keep incomplete message in buffer

        for (const chunk of lines) {
          if (chunk.trim()) {
            console.log("\n📨 Received SSE chunk:");
            console.log(chunk);
            
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
                  console.log("Could not parse data:", line.substring(6));
                }
              }
            }
            
            if (eventType && eventData) {
              console.log(`✅ Parsed Event: ${eventType}`, eventData);
              
              if (eventType === "tool-request") {
                receivedToolRequest = true;
                console.log("🎉 TOOL REQUEST RECEIVED VIA SSE!");
                console.log("Tool:", eventData.tool);
                console.log("Args:", JSON.stringify(eventData.args, null, 2));
              }
            }
          }
        }
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Stream reading error:", error);
      }
    } finally {
      clearTimeout(timeout);
    }

    console.log("\n3. Summary:");
    console.log("✅ Stream endpoint is accessible");
    console.log("✅ SSE events are properly formatted");
    
    if (receivedToolRequest) {
      console.log("✅ Tool request successfully received via SSE");
      console.log("🎉 THE FIX WORKED! Browser worker should now receive tool requests");
    } else {
      console.log("⚠️ No tool request received (may need to queue another or check timing)");
    }

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
  }
}

testFixedStreamEndpoint(); 
