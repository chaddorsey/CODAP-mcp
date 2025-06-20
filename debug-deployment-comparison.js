const fetch = require("node-fetch");

async function compareDeployments() {
  console.log("🔍 COMPARING RECENT DEPLOYMENTS");
  console.log("================================");
  
  const deployments = [
    { name: "NEWEST (18m old)", url: "https://codap-h47znpzqe-cdorsey-concordorgs-projects.vercel.app" },
    { name: "WORKING (51m old)", url: "https://codap-9801yonhe-cdorsey-concordorgs-projects.vercel.app" },
    { name: "ORIGINAL OLD", url: "https://codap-mcp-cdorsey-concordorgs-projects.vercel.app" }
  ];
  
  const BYPASS_HEADER = "pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye";
  
  for (const deployment of deployments) {
    console.log(`\\n🔗 Testing ${deployment.name}:`);
    console.log(`   URL: ${deployment.url}`);
    
    try {
      // Test SSE stream format
      const response = await fetch(`${deployment.url}/api/stream?sessionCode=T4BGTMSW`, {
        headers: { "x-vercel-protection-bypass": BYPASS_HEADER },
        timeout: 5000
      });
      
      const text = await response.text();
      
      // Analyze SSE format
      const hasEventPrefix = text.includes("event:");
      const hasDataPrefix = text.includes("data:");
      const hasConnectionEvent = text.includes("event: connection");
      const hasHeartbeatEvent = text.includes("event: heartbeat");
      
      console.log(`   📊 SSE Analysis:`);
      console.log(`      • Has 'event:' prefix: ${hasEventPrefix ? "✅" : "❌"}`);
      console.log(`      • Has 'data:' prefix: ${hasDataPrefix ? "✅" : "❌"}`);
      console.log(`      • Has connection event: ${hasConnectionEvent ? "✅" : "❌"}`);
      console.log(`      • Has heartbeat event: ${hasHeartbeatEvent ? "✅" : "❌"}`);
      
      // Determine if this deployment has the fixed SSE format
      const isFixed = hasEventPrefix && hasDataPrefix && hasConnectionEvent;
      console.log(`   🎯 SSE Format: ${isFixed ? "✅ FIXED" : "❌ BROKEN"}`);
      
      // Show raw sample
      console.log(`   📄 Raw sample (first 150 chars):`);
      console.log(`      "${text.substring(0, 150).replace(/\\n/g, "\\\\n")}..."`);
      
    } catch (error) {
      console.log(`   ❌ Test failed: ${error.message}`);
    }
  }
  
  console.log("\\n🎯 RECOMMENDATION:");
  console.log("===================");
  console.log("Based on the analysis above:");
  console.log("1. 🔄 Update PairingBanner.tsx to use the deployment with FIXED SSE format");
  console.log("2. 📱 Hard refresh browser to load the corrected code");  
  console.log("3. 🔗 Browser worker will connect to the correct endpoint");
  console.log("4. 📊 Tool requests should be processed and appear in CODAP");
}

compareDeployments(); 
