const axios = require("axios");

// Use the current production deployment URL
const API_BASE_URL = "https://codap-9801yonhe-cdorsey-concordorgs-projects.vercel.app";
const BYPASS_HEADER = "pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye";

async function testCodapApiFix() {
  console.log("🔧 TESTING CODAP API FIX");
  console.log("=========================");
  
  try {
    // 1. Create a new session
    console.log("\n1. Creating new session...");
    const sessionResponse = await axios.post(`${API_BASE_URL}/api/sessions`, {}, {
      headers: { "x-vercel-protection-bypass": BYPASS_HEADER }
    });
    
    const sessionCode = sessionResponse.data.sessionCode;
    console.log("✅ Session created:", sessionCode);

    // 2. Queue a tool request with the exact structure that was working in tests
    console.log("\n2. Queueing tool request with collections format...");
    const toolRequest = {
      id: `fix-test-${Date.now()}`,
      tool: "create_dataset_with_table",
      args: {
        datasetName: "CODAP_API_Fix_Test",
        description: "Testing fixed CODAP API structure",
        collections: [
          {
            name: "Weather_Stations",
            attributes: [
              { name: "Station", type: "categorical" },
              { name: "Temperature", type: "numeric" },
              { name: "Humidity", type: "numeric" },
              { name: "Pressure", type: "numeric" }
            ],
            cases: [
              { Station: "NYC", Temperature: 72, Humidity: 65, Pressure: 1013 },
              { Station: "LA", Temperature: 78, Humidity: 45, Pressure: 1015 },
              { Station: "Chicago", Temperature: 68, Humidity: 70, Pressure: 1008 },
              { Station: "Miami", Temperature: 85, Humidity: 85, Pressure: 1012 },
              { Station: "Seattle", Temperature: 62, Humidity: 75, Pressure: 1010 }
            ]
          }
        ]
      }
    };

    const requestPayload = {
      sessionCode,
      requestId: toolRequest.id,
      toolName: toolRequest.tool,
      params: toolRequest.args
    };

    const queueResponse = await axios.post(`${API_BASE_URL}/api/request`, requestPayload, {
      headers: { "x-vercel-protection-bypass": BYPASS_HEADER }
    });

    console.log("✅ Tool request queued:", queueResponse.data);

    // 3. Test the stream to see the tool request processing
    console.log("\n3. Monitoring SSE stream for tool processing...");
    console.log(`📡 Open browser to: http://localhost:8086?sessionCode=${sessionCode}`);
    console.log("🔍 Check browser console for:");
    console.log('   • "🎉 TOOL REQUEST RECEIVED!"');
    console.log('   • "📊 Using collections format"');
    console.log('   • "🔧 Creating data context with: {name, collections: [{attrs}]}"');
    console.log('   • "✅ Data context created"');
    console.log('   • "✅ Data items created"');
    console.log('   • "✅ Table component created"');
    console.log('   • "🎉 Dataset and table creation completed successfully!"');

    // Also test the stream endpoint briefly
    const streamUrl = `${API_BASE_URL}/api/stream?sessionCode=${sessionCode}`;
    console.log("\n4. Testing stream endpoint...");
    
    const response = await fetch(streamUrl, {
      headers: { "x-vercel-protection-bypass": BYPASS_HEADER }
    });
    
    if (response.ok) {
      console.log("✅ Stream endpoint accessible");
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let toolRequestSent = false;
      
      const timeout = setTimeout(() => {
        reader.cancel();
      }, 5000);
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop();
          
          for (const chunk of lines) {
            if (chunk.includes("tool-request")) {
              toolRequestSent = true;
              console.log("✅ Tool request sent via SSE stream");
              const eventLines = chunk.split("\n");
              for (const line of eventLines) {
                if (line.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(line.substring(6));
                    console.log("📊 Tool request data structure:", {
                      tool: data.tool,
                      argsStructure: {
                        hasCollections: !!data.args?.collections,
                        collectionsLength: data.args?.collections?.length || 0,
                        firstCollectionAttributes: data.args?.collections?.[0]?.attributes?.length || 0,
                        firstCollectionCases: data.args?.collections?.[0]?.cases?.length || 0
                      }
                    });
                  } catch (e) {
                    console.log("Could not parse data:", line);
                  }
                }
              }
              reader.cancel();
              break;
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
      
      if (toolRequestSent) {
        console.log("✅ Tool request successfully transmitted");
      } else {
        console.log("⚠️ No tool request detected in stream (may have been consumed)");
      }
    } else {
      console.log("❌ Stream endpoint failed:", response.status);
    }

    console.log("\n🎯 NEXT STEPS:");
    console.log("1. Open the browser URL above");  
    console.log("2. Check console logs for the processing steps");
    console.log("3. Verify data appears in CODAP interface");
    console.log("4. Look for successful completion message");
    
    console.log("\n📋 EXPECTED RESULTS:");
    console.log("✅ Browser should connect to SSE stream");
    console.log("✅ Tool request should be received and parsed correctly");
    console.log("✅ Collections format should be detected and transformed");
    console.log("✅ CODAP data context should be created with proper structure");
    console.log("✅ Data items should be added to CODAP");
    console.log("✅ Table component should be created and displayed");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
  }
}

testCodapApiFix(); 
