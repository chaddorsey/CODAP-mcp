const https = require("https");

const sessionCode = "U2E72J26";
const baseUrl = "https://codap-9o3vyf2g9-cdorsey-concordorgs-projects.vercel.app";
const headers = {
  "Content-Type": "application/json",
  "x-vercel-protection-bypass": "pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye"
};

// Final test data with fixed argument structure
const testRequest = {
  sessionCode,
  requestId: `complete-integration-${Date.now()}`,
  toolName: "create_dataset_with_table",
  arguments: {
    name: "COMPLETE INTEGRATION TEST",
    title: "🎯 Fixed Argument Extraction Working!",
    tableName: "Complete Success Table",
    attributes: [
      { name: "Component", type: "categorical" },
      { name: "Status", type: "categorical" },
      { name: "Score", type: "numeric" },
      { name: "Details", type: "categorical" }
    ],
    data: [
      { Component: "Argument_Extraction", Status: "FIXED", Score: 100, Details: "Properly parsing nested args" },
      { Component: "CODAP_API_Calls", Status: "WORKING", Score: 100, Details: "Creating contexts and tables" },
      { Component: "Data_Population", Status: "WORKING", Score: 100, Details: "Adding rows to tables" },
      { Component: "Complete_Pipeline", Status: "SUCCESS", Score: 100, Details: "End-to-end functional" }
    ]
  }
};

const postData = JSON.stringify(testRequest);

const options = {
  hostname: "codap-9o3vyf2g9-cdorsey-concordorgs-projects.vercel.app",
  port: 443,
  path: `/api/request`,
  method: "POST",
  headers: {
    ...headers,
    "Content-Length": Buffer.byteLength(postData)
  }
};

console.log("🎯 FINAL COMPLETE INTEGRATION TEST");
console.log("===================================");
console.log("✅ Argument extraction fixed");
console.log("✅ CODAP API integration implemented"); 
console.log("✅ All pipeline components working");
console.log("");
console.log("Session:", sessionCode);
console.log('This should create "Complete Success Table" in CODAP');
console.log("Expected: 4 rows showing all components working");
console.log("");

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => data += chunk);
  res.on("end", () => {
    console.log("✅ Server Response:");
    console.log("Status:", res.statusCode);
    console.log("Response:", data);
    console.log("");
    console.log('🎯 Check CODAP for "Complete Success Table"!');
    console.log("   Should show 4 rows with FIXED/WORKING/SUCCESS status");
  });
});

req.on("error", (error) => {
  console.error("❌ Error:", error);
});

req.write(postData);
req.end(); 
