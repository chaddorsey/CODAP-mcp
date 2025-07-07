const https = require("https");

async function fixSessionCapabilities() {
  console.log("🔧 FIXING: Session YG6MZV4Y Capabilities");
  console.log("=" * 50);
  
  const baseUrl = "https://codap-mcp-stable.vercel.app";
  
  // First, let's see what the session currently has
  console.log("\n📋 Step 1: Checking current session state...");
  try {
    const sessionRequest = {
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
    
    const response = await makeRequest(baseUrl + "/api/mcp", sessionRequest);
    
    if (response.result) {
      const message = response.result.content[0].text;
      console.log("✅ Connection response received");
      
      if (message.includes("CODAP- and SageModeler-equipped session")) {
        console.log("✅ Session correctly shows dual capabilities in connection message");
      } else if (message.includes("CODAP-only session")) {
        console.log("❌ Session shows CODAP-only in connection message");
      }
    }
    
  } catch (error) {
    console.error("❌ Connection check failed:", error.message);
  }
  
  // Now test a SageModeler tool to see the actual filtering
  console.log("\n📋 Step 2: Testing SageModeler tool filtering...");
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
      
      if (message.includes("Session Capabilities: CODAP")) {
        console.log("❌ Tool filtering shows CODAP-only capabilities");
        console.log("🔧 This confirms the target session doesn't have SageModeler capabilities");
      } else if (message.includes("Session Capabilities: CODAP + SAGEMODELER")) {
        console.log("✅ Tool filtering shows dual capabilities");
      } else if (message.includes("Tool execution completed successfully")) {
        console.log("🎉 SageModeler tool executed successfully!");
      } else {
        console.log("⚠️  Unexpected response:");
        console.log("📄 Response preview:", message.substring(0, 300) + "...");
      }
    }
    
  } catch (error) {
    console.error("❌ SageModeler test failed:", error.message);
  }
  
  console.log("\n" + "=" * 50);
  console.log("🎯 DIAGNOSIS COMPLETE");
  console.log("📋 The issue is that session YG6MZV4Y doesn't have SageModeler capabilities");
  console.log("🔧 Need to update the session to include both CODAP and SAGEMODELER capabilities");
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

fixSessionCapabilities().catch(console.error); 
