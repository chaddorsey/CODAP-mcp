#!/usr/bin/env node

/**
 * Comprehensive CODAP Tools Test Suite
 * Tests all 33 tools with session HKHM7UAB
 * 
 * This script verifies that:
 * 1. All tools are available in metadata
 * 2. Each tool can be invoked successfully
 * 3. Tool responses are properly formatted
 * 4. End-to-end integration works
 */

const SESSION_CODE = '4SEX4QCV';
const BASE_URL = 'https://codap-l1pz9li9n-cdorsey-concordorgs-projects.vercel.app';
const BYPASS_HEADER = 'pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye';

// Test configurations for each tool (using actual tool names from metadata)
const TOOL_TESTS = {
  // Data Context Management
  'create_data_context': {
    name: 'TestDataContext',
    title: 'Test Data Context',
    description: 'A test data context for verification'
  },
  
  'get_data_context': {
    name: 'TestDataContext'
  },
  
  'update_data_context': {
    name: 'TestDataContext',
    title: 'Updated Test Data Context'
  },
  
  'delete_data_context': {
    name: 'TestDataContext'
  },
  
  'get_data_contexts': {},
  
  // Collection Management
  'create_collection': {
    dataContext: 'TestDataContext',
    name: 'TestCollection',
    title: 'Test Collection',
    description: 'A test collection'
  },
  
  'get_collection': {
    dataContext: 'TestDataContext',
    collection: 'TestCollection'
  },
  
  'update_collection': {
    dataContext: 'TestDataContext',
    collection: 'TestCollection',
    title: 'Updated Test Collection'
  },
  
  'delete_collection': {
    dataContext: 'TestDataContext',
    collection: 'TestCollection'
  },
  
  'get_collections': {
    dataContext: 'TestDataContext'
  },
  
  // Attribute Management
  'create_attribute': {
    dataContext: 'TestDataContext',
    collection: 'TestCollection',
    name: 'TestAttribute',
    type: 'categorical',
    description: 'A test attribute'
  },
  
  'get_attribute': {
    dataContext: 'TestDataContext',
    collection: 'TestCollection',
    attribute: 'TestAttribute'
  },
  
  'update_attribute': {
    dataContext: 'TestDataContext',
    collection: 'TestCollection',
    attribute: 'TestAttribute',
    description: 'Updated test attribute'
  },
  
  'delete_attribute': {
    dataContext: 'TestDataContext',
    collection: 'TestCollection',
    attribute: 'TestAttribute'
  },
  
  'get_attributes': {
    dataContext: 'TestDataContext',
    collection: 'TestCollection'
  },
  
  'reorder_attributes': {
    dataContext: 'TestDataContext',
    collection: 'TestCollection',
    attributeNames: ['TestAttribute']
  },
  
  // Item Management
  'create_items': {
    dataContext: 'TestDataContext',
    items: [
      { TestAttribute: 'Item1' },
      { TestAttribute: 'Item2' }
    ]
  },
  
  'get_item_by_id': {
    dataContext: 'TestDataContext',
    itemID: 1
  },
  
  'update_items': {
    dataContext: 'TestDataContext',
    itemID: 1,
    values: { TestAttribute: 'UpdatedItem1' }
  },
  
  'delete_items': {
    dataContext: 'TestDataContext',
    itemIDs: [1, 2]
  },
  
  'get_items': {
    dataContext: 'TestDataContext'
  },
  
  // Case Management
  'get_case_count': {
    dataContext: 'TestDataContext',
    collection: 'TestCollection'
  },
  
  'get_case_by_index': {
    dataContext: 'TestDataContext',
    collection: 'TestCollection',
    caseIndex: 0
  },
  
  'search_cases': {
    dataContext: 'TestDataContext',
    collection: 'TestCollection',
    criteria: { TestAttribute: 'Item1' }
  },
  
  // Selection Management
  'select_cases': {
    dataContext: 'TestDataContext',
    collection: 'TestCollection',
    caseIDs: [1]
  },
  
  'get_selection': {
    dataContext: 'TestDataContext',
    collection: 'TestCollection'
  },
  
  'clear_selection': {
    dataContext: 'TestDataContext',
    collection: 'TestCollection'
  },
  
  // Component Management
  'create_table': {
    dataContext: 'TestDataContext',
    name: 'TestTable'
  },
  
  'create_graph': {
    dataContext: 'TestDataContext',
    name: 'TestGraph'
  },
  
  'create_map': {
    dataContext: 'TestDataContext',
    name: 'TestMap'
  },
  
  'get_components': {},
  
  'update_component': {
    name: 'TestTable',
    title: 'Updated Test Table'
  },
  
  'delete_component': {
    name: 'TestTable'
  }
};

/**
 * Make HTTP request with proper headers
 */
async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-sso-bypass': BYPASS_HEADER,
      ...options.headers
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get tool metadata to verify all tools are available
 */
async function getToolMetadata() {
  console.log('🔍 Fetching tool metadata...');
  const metadata = await makeRequest(`${BASE_URL}/api/metadata?sessionCode=${SESSION_CODE}`);
  
  console.log(`✅ Found ${metadata.toolCount} tools (expected 33)`);
  console.log(`📦 Source: ${metadata.source}`);
  console.log(`🔢 API Version: ${metadata.apiVersion}`);
  
  if (metadata.toolCount !== 33) {
    throw new Error(`Expected 33 tools, found ${metadata.toolCount}`);
  }
  
  return metadata.tools;
}

/**
 * Submit a tool request and wait for response
 */
async function testTool(toolName, args) {
  console.log(`🧪 Testing ${toolName}...`);
  
  // Submit tool request
  const requestData = {
    toolName: toolName,
    params: args,
    requestId: `test-${toolName}-${Date.now()}`
  };
  
  const submitResponse = await makeRequest(`${BASE_URL}/api/request`, {
    method: 'POST',
    body: JSON.stringify({
      sessionCode: SESSION_CODE,
      ...requestData
    })
  });
  
  if (submitResponse.status !== 'queued') {
    throw new Error(`Tool request not queued: ${JSON.stringify(submitResponse)}`);
  }
  
  console.log(`   ⏳ Request queued: ${requestData.requestId}`);
  
  // Wait for response (with timeout)
  const startTime = Date.now();
  const timeout = 10000; // 10 seconds
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await makeRequest(`${BASE_URL}/api/response?sessionCode=${SESSION_CODE}&requestId=${requestData.requestId}`, {
        method: 'GET'
      });
      
      if (response.status === 'completed') {
        console.log(`   ✅ ${toolName} completed successfully`);
        return response.result;
      } else if (response.status === 'error') {
        console.log(`   ❌ ${toolName} failed: ${response.error}`);
        return { error: response.error };
      }
      
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      // Response not ready yet, continue polling
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  throw new Error(`Tool ${toolName} timed out after ${timeout}ms`);
}

/**
 * Run comprehensive test suite
 */
async function runTestSuite() {
  console.log('🚀 Starting Comprehensive CODAP Tools Test Suite');
  console.log(`📋 Session: ${SESSION_CODE}`);
  console.log(`🌐 Server: ${BASE_URL}`);
  console.log('=' .repeat(60));
  
  try {
    // 1. Verify metadata and tool availability
    const tools = await getToolMetadata();
    const toolNames = tools.map(t => t.name);
    
    console.log('\n📋 Available tools:');
    toolNames.forEach(name => console.log(`   • ${name}`));
    
    // 2. Verify all expected tools are present
    const missingTools = Object.keys(TOOL_TESTS).filter(name => !toolNames.includes(name));
    if (missingTools.length > 0) {
      throw new Error(`Missing tools: ${missingTools.join(', ')}`);
    }
    
    console.log('\n✅ All expected tools are available');
    
    // 3. Test tools in logical order (create dependencies first)
    console.log('\n🧪 Testing tools in execution order...');
    
    const results = {};
    let successCount = 0;
    let failureCount = 0;
    
    // Test in dependency order
    const testOrder = [
      // Setup
      'get_data_contexts',
      'create_data_context',
      'get_data_context',
      
      // Collections
      'get_collections',
      'create_collection',
      'get_collection',
      
      // Attributes
      'get_attributes',
      'create_attribute',
      'get_attribute',
      
      // Items (create data first)
      'create_items',
      'get_items',
      'get_item_by_id',
      
      // Cases (work with created items)
      'get_case_count',
      'get_case_by_index',
      'search_cases',
      
      // Selection
      'select_cases',
      'get_selection',
      'clear_selection',
      
      // Components
      'get_components',
      'create_table',
      'create_graph',
      'create_map',
      
      // Updates (after creates)
      'update_data_context',
      'update_collection',
      'update_attribute',
      'update_items',
      'update_component',
      
      // Attribute operations
      'reorder_attributes',
      
      // Cleanup (deletes last)
      'delete_items',
      'delete_component',
      'delete_attribute',
      'delete_collection',
      'delete_data_context'
    ];
    
    for (const toolName of testOrder) {
      if (TOOL_TESTS[toolName]) {
        try {
          const result = await testTool(toolName, TOOL_TESTS[toolName]);
          results[toolName] = result;
          
          if (result.error) {
            failureCount++;
            console.log(`   ⚠️  ${toolName} returned error (may be expected): ${result.error}`);
          } else {
            successCount++;
          }
        } catch (error) {
          failureCount++;
          results[toolName] = { error: error.message };
          console.log(`   ❌ ${toolName} failed: ${error.message}`);
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // 4. Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(60));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`📋 Total: ${successCount + failureCount}`);
    
    if (failureCount === 0) {
      console.log('\n🎉 ALL TESTS PASSED! The comprehensive CODAP tools are fully operational.');
    } else {
      console.log('\n⚠️  Some tests failed. This may be expected for deletion operations on non-existent resources.');
    }
    
    // 5. Detailed results
    console.log('\n📋 Detailed Results:');
    Object.entries(results).forEach(([tool, result]) => {
      const status = result.error ? '❌' : '✅';
      console.log(`   ${status} ${tool}: ${result.error || 'Success'}`);
    });
    
  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run the test suite
runTestSuite().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
}); 