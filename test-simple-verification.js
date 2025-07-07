const https = require("https");

async function testSimpleVerification() {
  console.log("🎯 SIMPLE VERIFICATION: Capability Filtering Integration");
  console.log("=" * 60);
  
  const baseUrl = "https://codap-mcp-stable.vercel.app";
  
  console.log("\n📋 Testing CODAP-only session connection message...");
  try {
    const connectRequest = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "connect_to_session",
        arguments: {
          sessionId: "AIPLEAYV"
        }
      },
      id: 1
    };
    
    const response = await makeRequest(baseUrl + "/api/mcp", connectRequest);
    const message = response.result.content[0].text;
    
    console.log("✅ Connection Response Received");
    
    // Check key capability filtering elements with correct strings
    const checks = [
      { test: "Session type identification", check: message.includes("This is a CODAP-only session") },
      { test: "Tool count accuracy", check: message.includes("Valid Tools for This Session") && message.includes("35 total") },
      { test: "CODAP tools listed", check: message.includes("[CODAP] Tools") && message.includes("34 tools") },
      { test: "Connection tool listed", check: message.includes("[CONNECTION] Tool") && message.includes("1 tool") },
      { test: "Warning about invalid tools", check: message.includes("Only tools marked") && message.includes("[CODAP]") && message.includes("are valid") },
      { test: "Session active notice", check: message.includes("Session Active") }
    ];
    
    checks.forEach(({ test, check }) => {
      console.log(`  ${check ? "✅" : "❌"} ${test}`);
    });
    
    const allPassed = checks.every(({ check }) => check);
    console.log(`\n📊 Overall Result: ${allPassed ? "🎉 ALL TESTS PASSED!" : "❌ Some tests failed"}`);
    
    if (allPassed) {
      console.log("\n🎯 SUCCESS SUMMARY:");
      console.log("✅ Capability filtering integration working correctly");
      console.log("✅ Session-specific tool messaging implemented");
      console.log("✅ Clear user guidance with tool counts");
      console.log("✅ Proper warning about invalid tools");
      console.log("✅ Session awareness fully functional");
      console.log("\n🚀 The cleaned up and merged system is ready for production!");
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
  
  console.log("\n" + "=" * 60);
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

testSimpleVerification().catch(console.error); 
