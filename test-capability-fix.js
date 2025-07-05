const https = require('https');

async function testCapabilityFix() {
  console.log("🧪 TESTING: Capability Lookup Fix");
  console.log("=" * 50);
  
  const baseUrl = 'https://codap-mcp-stable.vercel.app';
  
  // Test SageModeler tool in dual-capability session
  console.log("\n📋 Testing SageModeler tool in dual session...");
  try {
    const sageRequest = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "sage_get_all_nodes",
        arguments: {}
      },
      id: 1
    };
    
    const response = await makeRequest(baseUrl + '/api/mcp', sageRequest);
    console.log("📝 Response received:");
    
    if (response.result) {
      const message = response.result.content[0].text;
      console.log("✅ Tool executed successfully!");
      console.log("📄 Response:", message.substring(0, 200) + "...");
    } else if (response.error) {
      console.log("❌ Error response:");
      console.log("📄 Error:", response.error.message);
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
  
  console.log("\n" + "=" * 50);
}

function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-vercel-protection-bypass': 'development-override'
      }
    };
    
    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

testCapabilityFix().catch(console.error); 