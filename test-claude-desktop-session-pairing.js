#!/usr/bin/env node

/**
 * Test Claude Desktop Session Pairing System
 * Verifies that unique Claude instances can connect to different CODAP sessions
 */

const VERCEL_URL = "https://codap-7ehpmphrq-cdorsey-concordorgs-projects.vercel.app";
const BYPASS_HEADER = "pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye";

async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'x-vercel-protection-bypass': BYPASS_HEADER,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  const data = await response.json();
  return { response, data };
}

async function testClaudeDesktopSessionPairing() {
  console.log("🧪 Testing Claude Desktop Session Pairing System\n");
  
  const tests = [
    {
      name: "1. Unique Claude Sessions Generation",
      test: async () => {
        // Simulate two different Claude Desktop instances
        const claude1Headers = {
          'user-agent': 'Claude-Desktop/1.0 (Mac)',
          'origin': 'claude-desktop://app1'
        };
        
        const claude2Headers = {
          'user-agent': 'Claude-Desktop/1.0 (Mac)',
          'origin': 'claude-desktop://app2'
        };
        
        // Test tools list for both instances (should generate unique session IDs)
        const { data: tools1 } = await makeRequest(`${VERCEL_URL}/api/mcp`, {
          method: 'POST',
          headers: claude1Headers,
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/list",
            params: {},
            id: 1
          })
        });
        
        const { data: tools2 } = await makeRequest(`${VERCEL_URL}/api/mcp`, {
          method: 'POST',
          headers: claude2Headers,
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/list",
            params: {},
            id: 2
          })
        });
        
        console.log("Claude 1 tools:", tools1.result?.tools?.length || 0);
        console.log("Claude 2 tools:", tools2.result?.tools?.length || 0);
        
        // Both should only show connect_to_session initially
        return tools1.result?.tools?.length === 1 && 
               tools2.result?.tools?.length === 1 &&
               tools1.result.tools[0].name === "connect_to_session" &&
               tools2.result.tools[0].name === "connect_to_session";
      }
    },
    
    {
      name: "2. Claude 1 Connects to CODAP Session UBJ25TFW",
      test: async () => {
        const claude1Headers = {
          'user-agent': 'Claude-Desktop/1.0 (Mac)',
          'origin': 'claude-desktop://app1'
        };
        
        const { data } = await makeRequest(`${VERCEL_URL}/api/mcp`, {
          method: 'POST',
          headers: claude1Headers,
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
              name: "connect_to_session",
              arguments: { sessionId: "UBJ25TFW" }
            },
            id: 3
          })
        });
        
        console.log("Connection result:", data.result?.content?.[0]?.text?.substring(0, 100) + "...");
        
        return data.result?.content?.[0]?.text?.includes("Connected successfully");
      }
    },
    
    {
      name: "3. Claude 1 Now Has All CODAP Tools",
      test: async () => {
        const claude1Headers = {
          'user-agent': 'Claude-Desktop/1.0 (Mac)',
          'origin': 'claude-desktop://app1'
        };
        
        const { data } = await makeRequest(`${VERCEL_URL}/api/mcp`, {
          method: 'POST',
          headers: claude1Headers,
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/list",
            params: {},
            id: 4
          })
        });
        
        console.log("Claude 1 tools after connection:", data.result?.tools?.length || 0);
        
        // Should now have connect_to_session + all CODAP tools
        return data.result?.tools?.length > 30;
      }
    },
    
    {
      name: "4. Claude 2 Still Only Has Connection Tool",
      test: async () => {
        const claude2Headers = {
          'user-agent': 'Claude-Desktop/1.0 (Mac)',
          'origin': 'claude-desktop://app2'
        };
        
        const { data } = await makeRequest(`${VERCEL_URL}/api/mcp`, {
          method: 'POST',
          headers: claude2Headers,
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/list",
            params: {},
            id: 5
          })
        });
        
        console.log("Claude 2 tools (should still be 1):", data.result?.tools?.length || 0);
        
        // Should still only have connect_to_session
        return data.result?.tools?.length === 1 &&
               data.result.tools[0].name === "connect_to_session";
      }
    },
    
    {
      name: "5. Claude 1 Can Execute CODAP Tools",
      test: async () => {
        const claude1Headers = {
          'user-agent': 'Claude-Desktop/1.0 (Mac)',
          'origin': 'claude-desktop://app1'
        };
        
        const { data } = await makeRequest(`${VERCEL_URL}/api/mcp`, {
          method: 'POST',
          headers: claude1Headers,
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
              name: "getListOfDataContexts",
              arguments: {}
            },
            id: 6
          })
        });
        
        console.log("Claude 1 tool execution:", data.result?.content?.[0]?.text?.substring(0, 100) + "...");
        
        // Should execute successfully (not get "session not found" error)
        return !data.result?.content?.[0]?.text?.includes("Session claude-desktop-session not found");
      }
    },
    
    {
      name: "6. Claude 2 Cannot Execute CODAP Tools",
      test: async () => {
        const claude2Headers = {
          'user-agent': 'Claude-Desktop/1.0 (Mac)',
          'origin': 'claude-desktop://app2'
        };
        
        const { data } = await makeRequest(`${VERCEL_URL}/api/mcp`, {
          method: 'POST',
          headers: claude2Headers,
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
              name: "getListOfDataContexts",
              arguments: {}
            },
            id: 7
          })
        });
        
        console.log("Claude 2 tool execution:", data.result?.content?.[0]?.text?.substring(0, 100) + "...");
        
        // Should get session not found or need to connect error
        return data.result?.content?.[0]?.text?.includes("connect_to_session") ||
               data.result?.content?.[0]?.text?.includes("not found");
      }
    },
    
    {
      name: "7. Claude 2 Connects to Different CODAP Session",
      test: async () => {
        const claude2Headers = {
          'user-agent': 'Claude-Desktop/1.0 (Mac)',
          'origin': 'claude-desktop://app2'
        };
        
        // First create a test session for Claude 2
        const { data: createResult } = await makeRequest(`${VERCEL_URL}/api/request`, {
          method: 'POST',
          body: JSON.stringify({
            sessionCode: "TESTCOD2",
            tool: "ping",
            arguments: {},
            requestId: "test-req-" + Date.now()
          })
        });
        
        // Now connect Claude 2 to this session
        const { data } = await makeRequest(`${VERCEL_URL}/api/mcp`, {
          method: 'POST',
          headers: claude2Headers,
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
              name: "connect_to_session",
              arguments: { sessionId: "TESTCOD2" }
            },
            id: 8
          })
        });
        
        console.log("Claude 2 connection result:", data.result?.content?.[0]?.text?.substring(0, 100) + "...");
        
        return data.result?.content?.[0]?.text?.includes("Connected successfully");
      }
    },
    
    {
      name: "8. Both Claude Instances Independent",
      test: async () => {
        const claude1Headers = {
          'user-agent': 'Claude-Desktop/1.0 (Mac)',
          'origin': 'claude-desktop://app1'
        };
        
        const claude2Headers = {
          'user-agent': 'Claude-Desktop/1.0 (Mac)',
          'origin': 'claude-desktop://app2'
        };
        
        // Both should now have all tools
        const { data: tools1 } = await makeRequest(`${VERCEL_URL}/api/mcp`, {
          method: 'POST',
          headers: claude1Headers,
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/list",
            params: {},
            id: 9
          })
        });
        
        const { data: tools2 } = await makeRequest(`${VERCEL_URL}/api/mcp`, {
          method: 'POST',
          headers: claude2Headers,
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/list",
            params: {},
            id: 10
          })
        });
        
        console.log("Claude 1 final tools:", tools1.result?.tools?.length || 0);
        console.log("Claude 2 final tools:", tools2.result?.tools?.length || 0);
        
        return tools1.result?.tools?.length > 30 && tools2.result?.tools?.length > 30;
      }
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      console.log(`\n${test.name}`);
      const result = await test.test();
      if (result) {
        console.log("✅ PASSED");
        passed++;
      } else {
        console.log("❌ FAILED");
        failed++;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${passed}/${tests.length} tests passed`);
  
  if (passed === tests.length) {
    console.log("🎉 All tests passed! Claude Desktop session pairing is working correctly.");
  } else {
    console.log("⚠️  Some tests failed. Session pairing needs fixes.");
  }
}

testClaudeDesktopSessionPairing().catch(console.error); 