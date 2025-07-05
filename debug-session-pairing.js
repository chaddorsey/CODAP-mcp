#!/usr/bin/env node

/**
 * Debug Session Pairing Logic
 */

const VERCEL_URL = "https://codap-7ehpmphrq-cdorsey-concordorgs-projects.vercel.app";
const BYPASS_HEADER = "pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye";

async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "x-vercel-protection-bypass": BYPASS_HEADER,
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  });
  
  const data = await response.json();
  return { response, data };
}

async function debugSessionPairing() {
  console.log("🔍 Debugging Session Pairing Logic\n");
  
  const claudeHeaders = {
    "user-agent": "Claude-Desktop/1.0 (Mac)",
    "origin": "claude-desktop://debug-test"
  };
  
  console.log("1. Initial tools list (should be 1 tool):");
  const { data: initialTools } = await makeRequest(`${VERCEL_URL}/api/mcp`, {
    method: "POST",
    headers: claudeHeaders,
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/list",
      params: {},
      id: 1
    })
  });
  console.log(`   Tools: ${initialTools.result?.tools?.length || 0}`);
  console.log(`   First tool: ${initialTools.result?.tools?.[0]?.name}`);
  
  console.log("\n2. Try to connect to UBJ25TFW (might fail if session doesn't exist):");
  const { data: connectResult } = await makeRequest(`${VERCEL_URL}/api/mcp`, {
    method: "POST",
    headers: claudeHeaders,
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "connect_to_session",
        arguments: { sessionId: "UBJ25TFW" }
      },
      id: 2
    })
  });
  console.log(`   Result: ${connectResult.result?.content?.[0]?.text?.substring(0, 80)}...`);
  
  console.log("\n3. Tools list after connection attempt:");
  const { data: afterTools } = await makeRequest(`${VERCEL_URL}/api/mcp`, {
    method: "POST",
    headers: claudeHeaders,
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/list",
      params: {},
      id: 3
    })
  });
  console.log(`   Tools: ${afterTools.result?.tools?.length || 0}`);
  
  console.log("\n4. Try to execute a CODAP tool:");
  const { data: toolResult } = await makeRequest(`${VERCEL_URL}/api/mcp`, {
    method: "POST",
    headers: claudeHeaders,
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "getListOfDataContexts",
        arguments: {}
      },
      id: 4
    })
  });
  console.log(`   Result: ${toolResult.result?.content?.[0]?.text?.substring(0, 80)}...`);
  
  console.log("\n5. Check session metrics:");
  const { data: metrics } = await makeRequest(`${VERCEL_URL}/api/mcp/metrics`, {
    method: "GET",
    headers: claudeHeaders
  });
  console.log(`   Global metrics:`, JSON.stringify(metrics.globalMetrics, null, 2));
}

debugSessionPairing().catch(console.error); 
