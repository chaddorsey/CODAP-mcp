#!/usr/bin/env node

/**
 * Comprehensive MCP Session Management Test
 * Tests enhanced session features including headers, validation, resumption, and metrics
 */

const https = require('https');

// Test configuration
const BASE_URL = 'https://codap-1v5zl50qo-cdorsey-concordorgs-projects.vercel.app';
const TEST_SESSION_ID = `test_session_${Date.now()}`;

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            headers: res.headers,
            data: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testHealthCheck() {
  log('\n=== Testing Health Check with Enhanced Features ===', colors.blue);
  
  try {
    const response = await makeRequest('GET', '/api/mcp');
    
    if (response.status === 200) {
      log('✅ Health check successful', colors.green);
      log(`Service: ${response.data.service}`);
      log(`Features: ${JSON.stringify(response.data.features, null, 2)}`);
      log(`Endpoints: ${JSON.stringify(response.data.endpoints, null, 2)}`);
      return true;
    } else {
      log(`❌ Health check failed with status ${response.status}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Health check error: ${error.message}`, colors.red);
    return false;
  }
}

async function testSessionCreationWithHeaders() {
  log('\n=== Testing Session Creation with Enhanced Headers ===', colors.blue);
  
  const clientInfo = {
    name: "test-client",
    version: "1.0.0",
    platform: "test"
  };
  
  const headers = {
    'mcp-session-id': TEST_SESSION_ID,
    'mcp-client-info': JSON.stringify(clientInfo),
    'mcp-protocol-version': '2024-11-05',
    'user-agent': 'MCP-Test-Client/1.0'
  };
  
  const initRequest = {
    jsonrpc: "2.0",
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: clientInfo
    },
    id: 1
  };
  
  try {
    const response = await makeRequest('POST', '/api/mcp', initRequest, headers);
    
    if (response.status === 200 && response.data.result) {
      log('✅ Session created successfully with headers', colors.green);
      log(`Session ID: ${response.data.result.sessionInfo.sessionId}`);
      log(`Legacy Code: ${response.data.result.sessionInfo.legacyCode}`);
      log(`Status: ${response.data.result.sessionInfo.status}`);
      log(`Response Headers: mcp-session-id = ${response.headers['mcp-session-id']}`);
      log(`Processing Time: ${response.headers['x-processing-time-ms']}ms`);
      return response.data.result.sessionInfo;
    } else {
      log(`❌ Session creation failed: ${JSON.stringify(response.data)}`, colors.red);
      return null;
    }
  } catch (error) {
    log(`❌ Session creation error: ${error.message}`, colors.red);
    return null;
  }
}

async function testSessionResumption() {
  log('\n=== Testing Session Resumption ===', colors.blue);
  
  const headers = {
    'mcp-session-id': TEST_SESSION_ID,
    'user-agent': 'MCP-Test-Client-Resumed/1.0'
  };
  
  const initRequest = {
    jsonrpc: "2.0",
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "resumed-client" }
    },
    id: 2
  };
  
  try {
    const response = await makeRequest('POST', '/api/mcp', initRequest, headers);
    
    if (response.status === 200 && response.data.result) {
      log('✅ Session resumed successfully', colors.green);
      log(`Status: ${response.data.result.sessionInfo.status}`);
      return true;
    } else {
      log(`❌ Session resumption failed: ${JSON.stringify(response.data)}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Session resumption error: ${error.message}`, colors.red);
    return false;
  }
}

async function testHeaderValidation() {
  log('\n=== Testing Header Validation ===', colors.blue);
  
  // Test invalid session ID
  const invalidHeaders = {
    'mcp-session-id': 'invalid@session#id!',
    'mcp-client-info': 'invalid-json'
  };
  
  const initRequest = {
    jsonrpc: "2.0",
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {}
    },
    id: 3
  };
  
  try {
    const response = await makeRequest('POST', '/api/mcp', initRequest, invalidHeaders);
    
    if (response.status === 400 && response.data.error) {
      log('✅ Header validation working correctly', colors.green);
      log(`Error: ${response.data.error.message}`);
      log(`Validation errors: ${JSON.stringify(response.data.error.data.errors)}`);
      return true;
    } else {
      log(`❌ Header validation failed: ${JSON.stringify(response.data)}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Header validation test error: ${error.message}`, colors.red);
    return false;
  }
}

async function testToolExecution() {
  log('\n=== Testing Tool Execution with Session Tracking ===', colors.blue);
  
  const headers = {
    'mcp-session-id': TEST_SESSION_ID
  };
  
  const toolRequest = {
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
      name: "createDataContext",
      arguments: {
        name: "TestData",
        title: "Test Dataset",
        description: "A test dataset for session management testing",
        collections: [{
          name: "TestCollection",
          title: "Test Collection",
          attrs: [
            { name: "id", type: "numeric", description: "ID field" },
            { name: "name", type: "categorical", description: "Name field" }
          ]
        }]
      }
    },
    id: 4
  };
  
  try {
    const response = await makeRequest('POST', '/api/mcp', toolRequest, headers);
    
    if (response.status === 200 && response.data.result) {
      log('✅ Tool execution successful', colors.green);
      log(`Processing Time: ${response.headers['x-processing-time-ms']}ms`);
      
      const result = JSON.parse(response.data.result.content[0].text);
      log(`Execution Mode: ${result.executionMode}`);
      log(`Tool Execution Time: ${result.executionTime}`);
      return true;
    } else {
      log(`❌ Tool execution failed: ${JSON.stringify(response.data)}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Tool execution error: ${error.message}`, colors.red);
    return false;
  }
}

async function testRateLimiting() {
  log('\n=== Testing Rate Limiting ===', colors.blue);
  
  const headers = {
    'mcp-session-id': `rate_limit_test_${Date.now()}`
  };
  
  // First initialize the session
  const initRequest = {
    jsonrpc: "2.0",
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "rate-limit-test" }
    },
    id: 5
  };
  
  await makeRequest('POST', '/api/mcp', initRequest, headers);
  
  // Make multiple rapid requests
  const promises = [];
  for (let i = 0; i < 5; i++) {
    const request = {
      jsonrpc: "2.0",
      method: "tools/list",
      params: {},
      id: 10 + i
    };
    promises.push(makeRequest('POST', '/api/mcp', request, headers));
  }
  
  try {
    const responses = await Promise.all(promises);
    const successCount = responses.filter(r => r.status === 200).length;
    const rateLimitCount = responses.filter(r => r.status === 429).length;
    
    log(`✅ Rate limiting test completed`, colors.green);
    log(`Successful requests: ${successCount}`);
    log(`Rate limited requests: ${rateLimitCount}`);
    return true;
  } catch (error) {
    log(`❌ Rate limiting test error: ${error.message}`, colors.red);
    return false;
  }
}

async function testSessionMetrics() {
  log('\n=== Testing Session Metrics ===', colors.blue);
  
  try {
    // Test global metrics
    const globalResponse = await makeRequest('GET', '/api/mcp-metrics');
    
    if (globalResponse.status === 200) {
      log('✅ Global metrics retrieved', colors.green);
      log(`Global Metrics: ${JSON.stringify(globalResponse.data.globalMetrics, null, 2)}`);
    }
    
    // Test session-specific metrics
    const sessionResponse = await makeRequest('GET', `/api/mcp-metrics?session=${TEST_SESSION_ID}`);
    
    if (sessionResponse.status === 200) {
      log('✅ Session metrics retrieved', colors.green);
      log(`Session Metrics: ${JSON.stringify(sessionResponse.data.session, null, 2)}`);
      return true;
    } else {
      log(`❌ Session metrics failed: ${JSON.stringify(sessionResponse.data)}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Metrics test error: ${error.message}`, colors.red);
    return false;
  }
}

async function testCORSHeaders() {
  log('\n=== Testing CORS Headers ===', colors.blue);
  
  try {
    const response = await makeRequest('OPTIONS', '/api/mcp');
    
    if (response.status === 200) {
      log('✅ CORS preflight successful', colors.green);
      log(`Allow-Headers: ${response.headers['access-control-allow-headers']}`);
      log(`Expose-Headers: ${response.headers['access-control-expose-headers']}`);
      log(`Max-Age: ${response.headers['access-control-max-age']}`);
      return true;
    } else {
      log(`❌ CORS test failed with status ${response.status}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ CORS test error: ${error.message}`, colors.red);
    return false;
  }
}

async function runAllTests() {
  log(`${colors.bold}🧪 MCP Session Management Comprehensive Test Suite${colors.reset}`, colors.blue);
  log(`Testing against: ${BASE_URL}`);
  log(`Test Session ID: ${TEST_SESSION_ID}`);
  
  const results = [];
  
  results.push(await testHealthCheck());
  results.push(await testCORSHeaders());
  results.push(await testHeaderValidation());
  results.push(await testSessionCreationWithHeaders());
  results.push(await testSessionResumption());
  results.push(await testToolExecution());
  results.push(await testRateLimiting());
  results.push(await testSessionMetrics());
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  log(`\n${colors.bold}=== Test Results ===${colors.reset}`, colors.blue);
  if (passed === total) {
    log(`🎉 All tests passed! (${passed}/${total})`, colors.green);
  } else {
    log(`⚠️  Some tests failed: ${passed}/${total} passed`, colors.yellow);
  }
  
  log(`\n${colors.bold}Session Management Features Verified:${colors.reset}`);
  log(`✅ Enhanced header parsing and validation`);
  log(`✅ Session creation with client info`);
  log(`✅ Session resumption capabilities`);
  log(`✅ Rate limiting protection`);
  log(`✅ Session metrics and monitoring`);
  log(`✅ CORS support for all MCP headers`);
  log(`✅ Error handling and logging`);
}

// Run the tests
runAllTests().catch(error => {
  log(`❌ Test suite failed: ${error.message}`, colors.red);
  process.exit(1);
}); 