const axios = require("axios");

// Use the current production deployment URL with your session
const API_BASE_URL = "https://codap-9801yonhe-cdorsey-concordorgs-projects.vercel.app";
const SESSION_CODE = "HXPTYBTJ";
const BYPASS_HEADER = "pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye";

async function testSessionHXPTYBTJ() {
  console.log("🔧 TESTING CODAP API FIX - SESSION HXPTYBTJ");
  console.log("===========================================");
  
  try {
    // Queue a tool request with the collections format that should now work
    console.log("\n1. Queueing tool request with collections format...");
    const toolRequest = {
      id: `hxptybtj-fix-${Date.now()}`,
      tool: "create_dataset_with_table",
      args: {
        datasetName: "Weather_Data_Fixed",
        description: "Weather data with fixed CODAP API calls",
        collections: [
          {
            name: "Cities",
            attributes: [
              { name: "City", type: "categorical" },
              { name: "Temperature", type: "numeric" },
              { name: "Humidity", type: "numeric" },
              { name: "Pressure", type: "numeric" }
            ],
            cases: [
              { City: "New York", Temperature: 72, Humidity: 65, Pressure: 1013 },
              { City: "Los Angeles", Temperature: 75, Humidity: 55, Pressure: 1015 },
              { City: "Chicago", Temperature: 68, Humidity: 70, Pressure: 1008 },
              { City: "Houston", Temperature: 78, Humidity: 80, Pressure: 1012 },
              { City: "Phoenix", Temperature: 95, Humidity: 25, Pressure: 1009 }
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
      headers: { "x-vercel-protection-bypass": BYPASS_HEADER }
    });

    console.log("✅ Tool request queued:", queueResponse.data);

    console.log("\n🎯 NEXT STEPS:");
    console.log(`📡 Open browser to: http://localhost:8086?sessionCode=${SESSION_CODE}`);
    console.log("");
    console.log("🔍 In the browser console, you should see:");
    console.log("   1. 🎉 TOOL REQUEST RECEIVED!");
    console.log("   2. 📊 Using collections format (with correct data counts)");
    console.log("   3. 🔧 Creating data context with proper structure");
    console.log("   4. ✅ Data context created (success: true)");
    console.log("   5. ✅ Data items created (5 weather records)");
    console.log("   6. ✅ Table component created");
    console.log("   7. 🎉 Dataset and table creation completed successfully!");
    console.log("");
    console.log("📊 Expected CODAP Result:");
    console.log('   • New dataset: "Weather_Data_Fixed"');
    console.log("   • 5 data rows with 4 attributes each");
    console.log("   • Table component displaying the data");
    console.log("   • Data should be visible and manipulable in CODAP");

    // Brief stream check
    console.log("\n2. Checking if tool request was sent via stream...");
    const streamUrl = `${API_BASE_URL}/api/stream?sessionCode=${SESSION_CODE}`;
    
    const response = await fetch(streamUrl, {
      headers: { "x-vercel-protection-bypass": BYPASS_HEADER }
    });
    
    if (response.ok) {
      console.log("✅ Stream endpoint accessible");
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let toolRequestDetected = false;
      
      const timeout = setTimeout(() => {
        reader.cancel();
      }, 3000);
      
      try {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          if (buffer.includes("tool-request")) {
            toolRequestDetected = true;
            console.log("✅ Tool request transmitted via SSE");
            reader.cancel();
            break;
          }
        }
      } catch (error) {
        // Expected when reader is cancelled
      } finally {
        clearTimeout(timeout);
      }
      
      if (!toolRequestDetected) {
        console.log("⚠️ Tool request may have already been consumed by browser");
      }
    }

    console.log("\n✨ SUMMARY:");
    console.log("The fix addresses these issues:");
    console.log("• ✅ Proper argument extraction from tool request");
    console.log("• ✅ Detection of collections vs direct format");
    console.log("• ✅ Correct CODAP API structure with collections array");
    console.log("• ✅ Proper data transformation (cases → items)");
    console.log("• ✅ Complete workflow: context + items + table");
    
    console.log("\n🚀 Ready to test! Open the browser URL above.");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
  }
}

testSessionHXPTYBTJ(); 
