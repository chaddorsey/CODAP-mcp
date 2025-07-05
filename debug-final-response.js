const https = require('https');

async function debugFinalResponse() {
  console.log("🔍 DEBUG: Final Response Content Analysis");
  console.log("=" * 50);
  
  const baseUrl = 'https://codap-mcp-stable.vercel.app';
  
  // Test 1: Connection message content
  console.log("\n📋 Test 1: Connection message actual content");
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
    
    const response = await makeRequest(baseUrl + '/api/mcp', connectRequest);
    console.log("📝 Full Response Structure:");
    console.log(JSON.stringify(response, null, 2));
    
    if (response.result && response.result.content) {
      console.log("\n📝 Message Content:");
      console.log(response.result.content[0].text);
    }
    
  } catch (error) {
    console.error("❌ Connection test failed:", error.message);
  }
  
  // Test 2: Metadata endpoint
  console.log("\n📋 Test 2: Metadata endpoint actual content");
  try {
    const metadataResponse = await makeRequest(baseUrl + '/api/metadata', {});
    console.log("📝 Metadata Response Structure:");
    console.log(JSON.stringify(metadataResponse, null, 2));
    
  } catch (error) {
    console.error("❌ Metadata test failed:", error.message);
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
    
    // Handle GET requests for metadata
    if (url.includes('/metadata')) {
      options.method = 'GET';
      delete options.headers['Content-Length'];
    }
    
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
          console.log("Raw response data:", responseData);
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (options.method === 'POST') {
      req.write(postData);
    }
    req.end();
  });
}

debugFinalResponse().catch(console.error); 