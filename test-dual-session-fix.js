const https = require("https");

async function testDualSessionFix() {
  console.log("🧪 TESTING: Dual Session SageModeler Fix");
  console.log("=" * 50);
  
  const baseUrl = "https://codap-mcp-stable.vercel.app";
  
  // Step 1: Connect to dual session
  console.log("\n📋 Step 1: Connecting to dual session YG6MZV4Y...");
  try {
    const connectRequest = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "connect_to_session",
        arguments: {
          sessionId: "YG6MZV4Y"
        }
      },
      id: 1
    };
    
    const connectResponse = await makeRequest(baseUrl + "/api/mcp", connectRequest);
    
    if (connectResponse.result) {
      const message = connectResponse.result.content[0].text;
      console.log("✅ Connection successful!");
      
      // Check if it's detected as dual-capability
      if (message.includes("CODAP- and SageModeler-equipped session")) {
        console.log("✅ Dual-capability session detected correctly");
      } else {
        console.log("❌ Session capabilities not detected correctly");
      }
      
      if (message.includes("60 total")) {
        console.log("✅ All 60 tools (34 CODAP + 25 SageModeler + 1 connection) available");
      }
    } else {
      console.log("❌ Connection failed:", connectResponse.error?.message);
      return;
    }
    
  } catch (error) {
    console.error("❌ Connection test failed:", error.message);
    return;
  }
  
  // Step 2: Test SageModeler tool
  console.log("\n📋 Step 2: Testing SageModeler tool...");
  try {
    const sageRequest = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "sage_get_all_nodes",
        arguments: {}
      },
      id: 2
    };
    
    const sageResponse = await makeRequest(baseUrl + "/api/mcp", sageRequest);
    
    if (sageResponse.result) {
      const message = sageResponse.result.content[0].text;
      
      if (message.includes("Tool execution completed successfully")) {
        console.log("🎉 SageModeler tool executed successfully!");
        console.log("📄 Response preview:", message.substring(0, 200) + "...");
      } else if (message.includes("not available in this session")) {
        console.log("❌ Tool still being filtered incorrectly");
        console.log("📄 Error:", message.substring(0, 300) + "...");
      } else {
        console.log("⚠️  Unexpected response:");
        console.log("📄 Response:", message.substring(0, 300) + "...");
      }
    } else if (sageResponse.error) {
      console.log("❌ SageModeler tool failed:");
      console.log("📄 Error:", sageResponse.error.message);
    }
    
  } catch (error) {
    console.error("❌ SageModeler test failed:", error.message);
  }
  
  console.log("\n" + "=" * 50);
  console.log("🎯 FIX VERIFICATION COMPLETE");
}

function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        "x-vercel-protection-bypass": "development-override"
      }
    };
    
    const req = https.request(url, options, (res) => {
      let responseData = "";
      
      res.on("data", (chunk) => {
        responseData += chunk;
      });
      
      res.on("end", () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });
    });
    
    req.on("error", (error) => {
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

testDualSessionFix().catch(console.error); 
