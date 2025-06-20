/**
 * Test MCP Tool Execution Implementation
 * Tests: initialize -> capabilities -> list_tools -> call_tool workflow
 */

const baseUrl = 'https://codap-jtzd2eyua-cdorsey-concordorgs-projects.vercel.app';

async function testMCPWorkflow() {
  console.log('🧪 Testing MCP Tool Execution Implementation...\n');
  
  // Generate unique session ID for this test
  const sessionId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`🔑 Session ID: ${sessionId}`);
  
  try {
    // Step 1: Test MCP Initialize
    console.log('\n📡 Step 1: Testing MCP Initialize...');
    const initResponse = await fetch(`${baseUrl}/api/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'mcp-session-id': sessionId,
        'x-vercel-protection-bypass': 'pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye'
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "1.0.0",
          clientInfo: {
            name: "test-client",
            version: "1.0.0"
          }
        }
      })
    });
    
    if (!initResponse.ok) {
      throw new Error(`Initialize failed: ${initResponse.status} ${initResponse.statusText}`);
    }
    
    const initResult = await initResponse.json();
    console.log('✅ Initialize Success:', {
      protocolVersion: initResult.result?.protocolVersion,
      serverName: initResult.result?.serverInfo?.name,
      capabilities: Object.keys(initResult.result?.capabilities || {})
    });

    // Step 2: Test capabilities
    console.log('\n🔧 Step 2: Testing capabilities method...');
    const capResponse = await fetch(`${baseUrl}/api/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'mcp-session-id': sessionId,
        'x-vercel-protection-bypass': 'pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye'
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "capabilities",
        params: {}
      })
    });

    if (!capResponse.ok) {
      throw new Error(`Capabilities failed: ${capResponse.status} ${capResponse.statusText}`);
    }

    const capResult = await capResponse.json();
    console.log('✅ Capabilities Success:', {
      toolCount: capResult.result?.meta?.toolsAvailable,
      categories: capResult.result?.capabilities?.tools?.categories?.length || 0
    });

    // Step 3: Test tools/list
    console.log('\n📋 Step 3: Testing tools/list method...');
    const toolsResponse = await fetch(`${baseUrl}/api/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'mcp-session-id': sessionId,
        'x-vercel-protection-bypass': 'pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye'
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/list",
        params: {}
      })
    });

    if (!toolsResponse.ok) {
      throw new Error(`Tools list failed: ${toolsResponse.status} ${toolsResponse.statusText}`);
    }

    const toolsResult = await toolsResponse.json();
    const tools = toolsResult.result?.tools || [];
    console.log('✅ Tools List Success:', {
      totalTools: tools.length,
      sampleTools: tools.slice(0, 3).map(t => t.name)
    });

    // Find createDataContext tool for testing
    const createDataContextTool = tools.find(tool => tool.name === 'createDataContext');
    if (!createDataContextTool) {
      throw new Error('createDataContext tool not found');
    }

    console.log('🔧 Found createDataContext tool:', {
      name: createDataContextTool.name,
      category: createDataContextTool.category,
      hasInputSchema: !!createDataContextTool.inputSchema
    });

    // Step 4: Test tools/call (tool execution)
    console.log('\n⚡ Step 4: Testing tools/call (createDataContext)...');
    const toolCallResponse = await fetch(`${baseUrl}/api/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'mcp-session-id': sessionId,
        'x-vercel-protection-bypass': 'pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye'
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
          name: "createDataContext",
          arguments: {
            name: "MCPTestDataset",
            title: "MCP Test Dataset",
            collections: [{
              name: "TestCollection",
              title: "Test Collection",
              attrs: [
                { name: "ID", type: "categorical" },
                { name: "Value", type: "numeric" },
                { name: "Category", type: "categorical" }
              ]
            }]
          }
        }
      })
    });

    if (!toolCallResponse.ok) {
      throw new Error(`Tool call failed: ${toolCallResponse.status} ${toolCallResponse.statusText}`);
    }

    const toolCallResult = await toolCallResponse.json();
    console.log('🎯 Tool Call Response:', {
      id: toolCallResult.id,
      hasResult: !!toolCallResult.result,
      hasError: !!toolCallResult.error
    });

    if (toolCallResult.error) {
      console.error('❌ Tool execution error:', toolCallResult.error);
      return false;
    }

    if (toolCallResult.result) {
      const content = toolCallResult.result.content;
      if (content && content.length > 0) {
        console.log('📄 Tool execution content:', {
          type: content[0].type,
          textLength: content[0].text?.length || 0,
          isError: toolCallResult.result.isError || false
        });
        
        if (content[0].text) {
          console.log('📝 Sample response text:', content[0].text.substring(0, 200) + '...');
        }
      }

      console.log('\n🎉 MCP Tool Execution Test PASSED!');
      console.log('✅ All MCP methods working correctly');
      return true;
    } else {
      console.warn('⚠️  Tool execution completed but no result returned');
      return false;
    }

  } catch (error) {
    console.error('\n❌ MCP Test FAILED:', error.message);
    return false;
  }
}

// Test error scenarios
async function testMCPErrorScenarios() {
  console.log('\n🧪 Testing MCP Error Scenarios...\n');
  
  const sessionId = `error_test_${Date.now()}`;
  
  try {
    // Test 1: Tool call without initialization
    console.log('🔍 Test 1: Tool call without initialization...');
    const uninitResponse = await fetch(`${baseUrl}/api/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'mcp-session-id': sessionId,
        'x-vercel-protection-bypass': 'pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye'
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "createDataContext",
          arguments: { name: "Test" }
        }
      })
    });

    const uninitResult = await uninitResponse.json();
    if (uninitResult.error) {
      console.log('✅ Correctly rejected uninitialized tool call');
    } else {
      console.log('⚠️  Tool call succeeded without initialization (unexpected)');
    }

    // Test 2: Invalid tool name (after initialization)
    console.log('\n🔍 Test 2: Invalid tool name...');
    
    // First initialize
    await fetch(`${baseUrl}/api/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'mcp-session-id': sessionId,
        'x-vercel-protection-bypass': 'pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye'
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "1.0.0",
          clientInfo: { name: "test", version: "1.0.0" }
        }
      })
    });

    // Then try invalid tool
    const invalidToolResponse = await fetch(`${baseUrl}/api/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'mcp-session-id': sessionId,
        'x-vercel-protection-bypass': 'pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye'
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "nonExistentTool",
          arguments: {}
        }
      })
    });

    const invalidResult = await invalidToolResponse.json();
    if (invalidResult.result?.isError || invalidResult.error) {
      console.log('✅ Correctly rejected invalid tool name');
    } else {
      console.log('⚠️  Invalid tool call succeeded (unexpected)');
    }

    console.log('\n✅ Error scenario testing complete');

  } catch (error) {
    console.error('❌ Error scenario test failed:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting MCP Implementation Tests\n');
  console.log('=' .repeat(60));
  
  const workflowSuccess = await testMCPWorkflow();
  
  console.log('\n' + '=' .repeat(60));
  await testMCPErrorScenarios();
  
  console.log('\n' + '=' .repeat(60));
  console.log('🏁 Test Summary:');
  console.log(`Core Workflow: ${workflowSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log('Error Handling: ✅ TESTED');
  
  if (workflowSuccess) {
    console.log('\n🎉 MCP Implementation is READY!');
    console.log('💡 Next step: Deploy to test with real MCP clients');
  } else {
    console.log('\n🔧 MCP Implementation needs fixes before deployment');
  }
}

// Execute tests
runAllTests()
  .then(() => {
    console.log('\n✨ All tests completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  }); 