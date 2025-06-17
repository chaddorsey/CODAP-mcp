// test-create-dataset.js - Test the create_codap_dataset tool
const { spawn } = require("child_process");

async function testCreateDataset() {
  return new Promise((resolve, reject) => {
    const testData = {
      jsonrpc: "2.0",
      id: Math.floor(Math.random() * 1000),
      method: "tools/call",
      params: {
        name: "create_codap_dataset",
        arguments: {
          datasetName: "MCP Test Dataset",
          dataType: "random_numbers",
          recordCount: 5
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
  console.log("🧪 Testing create_codap_dataset tool...\n");

  try {
    const result = await testCreateDataset();
    console.log("✅ Result:");
    console.log(JSON.stringify(result, null, 2));
    
    if (result.result?.content?.[0]?.text) {
      const text = result.result.content[0].text;
      if (text.includes("❌")) {
        console.log("\n🔍 Error detected in response:");
        console.log(text);
      } else if (text.includes("✅")) {
        console.log("\n✅ Success! Dataset creation tool executed successfully.");
        console.log("🔍 Check CODAP to see if 'MCP Test Dataset' was created with data.");
      }
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

runTest(); 
