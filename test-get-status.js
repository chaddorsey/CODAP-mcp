// test-get-status.js - Test the get_codap_status tool
const { spawn } = require("child_process");

async function testGetStatus() {
  return new Promise((resolve, reject) => {
    const testData = {
      jsonrpc: "2.0",
      id: Math.floor(Math.random() * 1000),
      method: "tools/call",
      params: {
        name: "get_codap_status",
        arguments: {
          includeDatasets: true,
          includeComponents: true
        }
      }
    };

    const child = spawn("node", ["dist/server/mcp-server-codap-interactive.js"], {
      stdio: ["pipe", "pipe", "pipe"]
    });

    let output = "";
    let errorOutput = "";

    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        try {
          // Parse the JSON response (skip the startup message)
          const lines = output.trim().split("\n");
          const jsonLine = lines.find(line => line.startsWith("{"));
          if (jsonLine) {
            const result = JSON.parse(jsonLine);
            resolve(result);
          } else {
            reject(new Error("No JSON response found"));
          }
        } catch (error) {
          reject(error);
        }
      } else {
        reject(new Error(`Process exited with code ${code}: ${errorOutput}`));
      }
    });

    // Send the test data
    child.stdin.write(JSON.stringify(testData) + "\n");
    child.stdin.end();
  });
}

async function runTest() {
  console.log("🧪 Testing get_codap_status tool...\n");

  try {
    const result = await testGetStatus();
    console.log("✅ Result:");
    console.log(JSON.stringify(result, null, 2));
    
    if (result.result?.content?.[0]?.text) {
      const text = result.result.content[0].text;
      if (text.includes("❌")) {
        console.log("\n🔍 Error detected in response:");
        console.log(text);
      } else {
        console.log("\n✅ Success! Tool executed without errors.");
      }
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

runTest(); 
