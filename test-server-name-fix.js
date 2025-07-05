#!/usr/bin/env node

/**
 * Test Server Name Fix
 * 
 * This test verifies that the server name fix prevents Claude Desktop from
 * prefixing tool names with "CODAP MCP Server:" which causes "Tool not found" errors.
 */

const BASE_URL = 'https://codap-mcp-stable.vercel.app';

async function testServerNameFix() {
  console.log('🧪 Testing Server Name Fix for Tool Prefixing');
  console.log('='.repeat(60));
  
  try {
    // Test 1: Check capabilities endpoint server name
    console.log('\n📋 Testing capabilities endpoint server name...');
    
    const capabilitiesRequest = {
      jsonrpc: "2.0",
      method: "capabilities",
      params: {},
      id: 1
    };

    const capResponse = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vercel-protection-bypass': 'test-server-name-fix',
        'user-agent': 'test-server-name-fix'
      },
      body: JSON.stringify(capabilitiesRequest)
    });

    if (!capResponse.ok) {
      throw new Error(`HTTP ${capResponse.status}: ${capResponse.statusText}`);
    }

    const capData = await capResponse.json();
    const serverName = capData.result?.serverInfo?.name;
    
    console.log(`📄 Capabilities server name: "${serverName}"`);
    
    // Test 2: Check initialize endpoint server name
    console.log('\n📋 Testing initialize endpoint server name...');
    
    const initRequest = {
      jsonrpc: "2.0",
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {}
        },
        clientInfo: {
          name: "test-client",
          version: "1.0.0"
        }
      },
      id: 2
    };

    const initResponse = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vercel-protection-bypass': 'test-server-name-fix',
        'user-agent': 'test-server-name-fix'
      },
      body: JSON.stringify(initRequest)
    });

    if (!initResponse.ok) {
      throw new Error(`HTTP ${initResponse.status}: ${initResponse.statusText}`);
    }

    const initData = await initResponse.json();
    const initServerName = initData.result?.serverInfo?.name;
    
    console.log(`📄 Initialize server name: "${initServerName}"`);
    
    // Test 3: Verify both names are consistent and clean
    console.log('\n✅ Server Name Verification:');
    console.log('-'.repeat(40));
    
    const checks = [
      { name: 'Capabilities server name is clean', check: serverName === 'codap-mcp' },
      { name: 'Initialize server name is clean', check: initServerName === 'codap-mcp' },
      { name: 'Both names are consistent', check: serverName === initServerName },
      { name: 'No spaces in server name', check: !serverName?.includes(' ') },
      { name: 'No colons in server name', check: !serverName?.includes(':') },
      { name: 'Server name is not empty', check: serverName && serverName.length > 0 }
    ];
    
    let allPassed = true;
    checks.forEach(({ name, check }) => {
      const status = check ? '✅' : '❌';
      console.log(`${status} ${name}: ${check ? 'PASS' : 'FAIL'}`);
      if (!check) allPassed = false;
    });
    
    console.log('\n📊 Overall Result:');
    console.log(`${allPassed ? '✅' : '❌'} Server name fix: ${allPassed ? 'SUCCESS' : 'NEEDS ATTENTION'}`);
    
    if (allPassed) {
      console.log('\n🎉 SUCCESS: Server name is clean and consistent!');
      console.log('   Claude Desktop should no longer prefix tool names with server name.');
      console.log('   SageModeler tools should work without "CODAP MCP Server:" prefix.');
    } else {
      console.log('\n⚠️  Server name issues detected - tool prefixing may still occur.');
    }
    
    // Test 4: Test actual tool call to verify no prefixing
    console.log('\n📋 Testing actual tool call (connect_to_session)...');
    
    const toolRequest = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "connect_to_session",  // This should work without prefix
        arguments: {
          sessionId: "TEST1234"
        }
      },
      id: 3
    };

    const toolResponse = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vercel-protection-bypass': 'test-server-name-fix',
        'user-agent': 'test-server-name-fix'
      },
      body: JSON.stringify(toolRequest)
    });

    if (!toolResponse.ok) {
      throw new Error(`HTTP ${toolResponse.status}: ${toolResponse.statusText}`);
    }

    const toolData = await toolResponse.json();
    const toolWorked = !toolData.error || !toolData.error.message?.includes('Tool not found');
    
    console.log(`📄 Tool call result: ${toolWorked ? 'SUCCESS (no "Tool not found")' : 'FAILED (Tool not found)'}`);
    
    if (toolWorked) {
      console.log('\n🎉 FINAL SUCCESS: Tool calls work without prefixing!');
    } else {
      console.log('\n⚠️  Tool calls still failing - may need further investigation.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testServerNameFix(); 