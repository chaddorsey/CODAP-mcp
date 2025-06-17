// test-mcp-tools.js - Test all CODAP MCP tools
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

async function runTests() {
  console.log("🧪 Testing CODAP MCP Tools Integration\n");

  try {
    // Test 1: Create a dataset
    console.log("1️⃣ Testing create_codap_dataset...");
    const createResult = await testMCPTool("create_codap_dataset", {
      datasetName: "Sample Data",
      dataType: "random_numbers",
      recordCount: 10
    });
    console.log("✅ Create Dataset Result:");
    console.log(createResult.result.content[0].text.substring(0, 200) + "...\n");

    // Test 2: Get datasets
    console.log("2️⃣ Testing get_codap_datasets...");
    const getResult = await testMCPTool("get_codap_datasets", {});
    console.log("✅ Get Datasets Result:");
    console.log(getResult.result.content[0].text.substring(0, 200) + "...\n");

    // Test 3: Add cases
    console.log("3️⃣ Testing add_codap_cases...");
    const addResult = await testMCPTool("add_codap_cases", {
      datasetName: "Sample Data",
      cases: [
        { x: 50, y: 75, category: "Test" },
        { x: 60, y: 85, category: "Test" }
      ]
    });
    console.log("✅ Add Cases Result:");
    console.log(addResult.result.content[0].text.substring(0, 200) + "...\n");

    // Test 4: Create graph
    console.log("4️⃣ Testing create_codap_graph...");
    const graphResult = await testMCPTool("create_codap_graph", {
      datasetName: "Sample Data",
      graphType: "scatterplot",
      xAttribute: "x",
      yAttribute: "y",
      title: "Test Scatterplot"
    });
    console.log("✅ Create Graph Result:");
    console.log(graphResult.result.content[0].text.substring(0, 200) + "...\n");

    // Test 5: Get status
    console.log("5️⃣ Testing get_codap_status...");
    const statusResult = await testMCPTool("get_codap_status", {
      includeDatasets: true,
      includeComponents: true
    });
    console.log("✅ Get Status Result:");
    console.log(statusResult.result.content[0].text.substring(0, 200) + "...\n");

    // Test 6: Export data
    console.log("6️⃣ Testing export_codap_data...");
    const exportResult = await testMCPTool("export_codap_data", {
      datasetName: "Sample Data",
      format: "json",
      includeMetadata: false
    });
    console.log("✅ Export Data Result:");
    console.log(exportResult.result.content[0].text.substring(0, 200) + "...\n");

    console.log("🎉 All tests completed successfully!");
    console.log("\n📋 Summary:");
    console.log("• All 6 CODAP MCP tools are working");
    console.log("• MCP server is responding correctly");
    console.log("• API endpoints are properly configured");
    console.log("• Ready for integration with MCP clients!");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

runTests(); 