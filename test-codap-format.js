// test-codap-format.js - Test different CODAP data formats
const fetch = require("node-fetch");

const API_SERVER_URL = "http://localhost:8083";

async function testDataFormat() {
  console.log("🔍 Testing CODAP Data Formats\n");

  try {
    // Test 1: Try creating dataset with explicit values structure
    console.log("1. Testing with explicit values structure...");
    const response1 = await fetch(`${API_SERVER_URL}/api/codap/createDataset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Format Test 1",
        attributes: [
          { name: "id", type: "numeric" },
          { name: "value", type: "numeric" }
        ],
        data: [
          { values: { id: 1, value: 10 } },
          { values: { id: 2, value: 20 } }
        ]
      })
    });

    const result1 = await response1.json();
    console.log("Response 1:", result1.success ? "Success" : `Error: ${result1.error}`);
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 2: Try a different approach - create context first, then add items differently
    console.log("\n2. Testing manual item addition...");
    
    // First create just the context
    const response2 = await fetch(`${API_SERVER_URL}/api/codap/createDataset`, {
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Format Test 2",
        attributes: [
          { name: "id", type: "numeric" },
          { name: "value", type: "numeric" }
        ],
        data: [] // No data initially
      })
    });

    const result2 = await response2.json();
    console.log("Context creation:", result2.success ? "Success" : `Error: ${result2.error}`);

    if (result2.success) {
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Now try adding cases with different format
      const response3 = await fetch(`${API_SERVER_URL}/api/codap/addCases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datasetName: "Format Test 2",
          cases: [
            { id: 1, value: 10 },
            { id: 2, value: 20 }
          ]
        })
      });

      const result3 = await response3.json();
      console.log("Add cases:", result3.success ? "Success" : `Error: ${result3.error}`);
    }

    console.log("\n📋 Check CODAP to see which format worked!");
    console.log("Look for tables: 'Format Test 1' and 'Format Test 2'");

  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testDataFormat(); 