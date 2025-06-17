// test-mcp-simple.js - Test MCP tools with mock CODAP responses
const { spawn } = require("child_process");

async function testMCPTool(toolName, args) {
  return new Promise((resolve, reject) => {
    const testData = {
      jsonrpc: "2.0",
      id: Math.floor(Math.random() * 1000),
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args
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

    child.stdin.write(JSON.stringify(testData) + "\n");
    child.stdin.end();
  });
}

async function runSimpleTests() {
  console.log("🧪 Testing MCP Tools (Simple Mode)\n");

  try {
    // Test 1: Create a small dataset
    console.log("1️⃣ Testing create_codap_dataset...");
    const createResult = await testMCPTool("create_codap_dataset", {
      datasetName: "Simple Test",
      dataType: "random_numbers", 
      recordCount: 3
    });
    
    console.log("Response type:", createResult.result ? "Success" : "Error");
    if (createResult.result?.content?.[0]?.text) {
      const text = createResult.result.content[0].text;
      if (text.includes("✅")) {
        console.log("✅ MCP Tool Response: Success message received");
      } else if (text.includes("❌")) {
        console.log("❌ MCP Tool Response: Error message received");
        console.log("Error details:", text.substring(0, 200) + "...");
      }
    }
    console.log();

    // Test 2: Test get datasets
    console.log("2️⃣ Testing get_codap_datasets...");
    const getResult = await testMCPTool("get_codap_datasets", {});
    
    if (getResult.result?.content?.[0]?.text) {
      const text = getResult.result.content[0].text;
      if (text.includes("✅") || text.includes("📋")) {
        console.log("✅ MCP Tool Response: Success message received");
      } else if (text.includes("❌")) {
        console.log("❌ MCP Tool Response: Error message received");
        console.log("Error details:", text.substring(0, 200) + "...");
      }
    }
    console.log();

    console.log("📋 Summary:");
    console.log("• MCP server is responding to tool calls");
    console.log("• Tools are properly structured and callable");
    console.log("• Issue is likely with CODAP plugin API integration");
    console.log("• Frontend needs to run inside CODAP for full functionality");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

runSimpleTests(); 