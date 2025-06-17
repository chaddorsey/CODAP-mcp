// debug-codap-data.js - Debug CODAP data creation
const fetch = require("node-fetch");

const API_SERVER_URL = "http://localhost:8083";

async function debugDataCreation() {
  console.log("🔍 Debugging CODAP Data Creation\n");

  try {
    // Step 1: Check API server health
    console.log("1. Checking API server...");
    const healthResponse = await fetch(`${API_SERVER_URL}/api/health`);
    const health = await healthResponse.json();
    console.log("✅ API Server:", health);
    console.log();

    // Step 2: Create a simple dataset with minimal data
    console.log("2. Creating simple dataset...");
    const createResponse = await fetch(`${API_SERVER_URL}/api/codap/createDataset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Debug Dataset",
        attributes: [
          { name: "id", type: "numeric" },
          { name: "value", type: "numeric" },
          { name: "label", type: "categorical" }
        ],
        data: [
          { id: 1, value: 10, label: "A" },
          { id: 2, value: 20, label: "B" },
          { id: 3, value: 30, label: "C" }
        ]
      })
    });

    const createResult = await createResponse.json();
    console.log("📊 Create Dataset Response:");
    console.log(JSON.stringify(createResult, null, 2));
    console.log();

    // Step 3: Wait a moment for processing
    console.log("3. Waiting for command processing...");
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Get datasets to see what was created
    console.log("4. Getting datasets...");
    const getDatasetsResponse = await fetch(`${API_SERVER_URL}/api/codap/getDatasets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });

    const getDatasetsResult = await getDatasetsResponse.json();
    console.log("📋 Get Datasets Response:");
    console.log(JSON.stringify(getDatasetsResult, null, 2));
    console.log();

    // Step 5: Export the data to see what's actually in CODAP
    console.log("5. Exporting data to see contents...");
    const exportResponse = await fetch(`${API_SERVER_URL}/api/codap/exportData`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        datasetName: "Debug Dataset",
        format: "json"
      })
    });

    const exportResult = await exportResponse.json();
    console.log("📤 Export Data Response:");
    console.log(JSON.stringify(exportResult, null, 2));
    console.log();

    // Step 6: Check API server status again
    console.log("6. Final API server status...");
    const finalHealthResponse = await fetch(`${API_SERVER_URL}/api/health`);
    const finalHealth = await finalHealthResponse.json();
    console.log("✅ Final API Server Status:", finalHealth);

  } catch (error) {
    console.error("❌ Debug failed:", error);
  }
}

debugDataCreation(); 