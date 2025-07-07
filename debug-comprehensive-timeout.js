/**
 * Comprehensive Timeout Diagnostic Script
 * Tests the entire pipeline: MCP Server → KV Storage → Browser Worker → CODAP API → Response
 */

const Redis = require('ioredis');

// Configuration
const SESSION_ID = 'test-timeout-debug';
const BASE_URL = 'https://codap-mcp-stable.vercel.app';

// Initialize Redis client (same as production)
const redis = new Redis({
  host: "redis-19603.c57.us-east-1-4.ec2.redns.redis-cloud.com",
  port: 19603,
  password: "4mi2PHNUqQkeMxSbLFY0qY5ruQEdNxmo",
  username: "default",
  tls: null,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  lazyConnect: true
});

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testStep(stepName, testFn) {
  console.log(`\n🔍 [${stepName}] Starting...`);
  const startTime = Date.now();
  
  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    console.log(`✅ [${stepName}] Success (${duration}ms)`);
    return { success: true, duration, result };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ [${stepName}] Failed (${duration}ms):`, error.message);
    return { success: false, duration, error: error.message };
  }
}

async function testKVConnection() {
  return await testStep('KV Connection', async () => {
    await redis.set('test-key', 'test-value');
    const value = await redis.get('test-key');
    if (value !== 'test-value') throw new Error('KV read/write failed');
    await redis.del('test-key');
    return 'KV connection working';
  });
}

async function testSessionCreation() {
  return await testStep('Session Creation', async () => {
    const response = await fetch(`${BASE_URL}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_ID })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    return data;
  });
}

async function testBrowserWorkerConnection() {
  return await testStep('Browser Worker Connection Check', async () => {
    // Check if browser worker is connected by looking for session status
    const sessionData = await redis.get(`session:${SESSION_ID}`);
    if (!sessionData) throw new Error('Session not found in KV');
    
    const workerStatus = await redis.get(`worker:${SESSION_ID}`);
    return { sessionData: JSON.parse(sessionData), workerStatus };
  });
}

async function testDirectCODAPCall() {
  return await testStep('Direct CODAP Tool Call', async () => {
    const toolRequest = {
      requestId: `debug-${Date.now()}`,
      sessionId: SESSION_ID,
      toolName: 'getListOfDataContexts',
      arguments: {}
    };
    
    console.log('📤 Sending tool request:', toolRequest);
    
    // Store the request
    await redis.set(`request:${toolRequest.requestId}`, JSON.stringify(toolRequest));
    
    // Send to MCP endpoint
    const response = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toolRequest)
    });
    
    if (!response.ok) {
      throw new Error(`MCP endpoint failed: ${response.status} ${await response.text()}`);
    }
    
    const mcpResult = await response.json();
    console.log('📥 MCP endpoint response:', mcpResult);
    
    return mcpResult;
  });
}

async function testToolResponseRetrieval() {
  return await testStep('Tool Response Retrieval', async () => {
    const requestId = `debug-${Date.now()}`;
    
    // Wait a bit and check if response appears
    for (let i = 0; i < 10; i++) {
      const response = await redis.get(`toolres:${requestId}`);
      if (response) {
        return JSON.parse(response);
      }
      await sleep(1000);
    }
    
    throw new Error('No response found after 10 seconds');
  });
}

async function testSSEConnection() {
  return await testStep('SSE Connection Test', async () => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('SSE connection timeout'));
      }, 5000);
      
      const eventSource = new EventSource(`${BASE_URL}/api/stream?sessionId=${SESSION_ID}`);
      
      eventSource.onopen = () => {
        clearTimeout(timeout);
        eventSource.close();
        resolve('SSE connection successful');
      };
      
      eventSource.onerror = (error) => {
        clearTimeout(timeout);
        eventSource.close();
        reject(new Error('SSE connection failed'));
      };
    });
  });
}

async function testEndToEndFlow() {
  return await testStep('End-to-End Tool Execution', async () => {
    const requestId = `e2e-${Date.now()}`;
    
    // 1. Create tool request
    const toolRequest = {
      requestId,
      sessionId: SESSION_ID,
      toolName: 'getListOfDataContexts',
      arguments: {}
    };
    
    console.log('📤 E2E: Sending tool request');
    
    // 2. Send to MCP endpoint
    const mcpResponse = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toolRequest)
    });
    
    if (!mcpResponse.ok) {
      throw new Error(`MCP failed: ${mcpResponse.status}`);
    }
    
    console.log('📥 E2E: MCP endpoint accepted request');
    
    // 3. Wait for response with timeout
    const startTime = Date.now();
    const maxWait = 12000; // 12 seconds
    
    while (Date.now() - startTime < maxWait) {
      const response = await redis.get(`toolres:${requestId}`);
      if (response) {
        const result = JSON.parse(response);
        console.log('📥 E2E: Got response from KV:', result);
        return result;
      }
      await sleep(500);
    }
    
    // Check what's in KV for debugging
    const keys = await redis.keys(`*${requestId}*`);
    console.log('🔍 E2E: Keys in KV:', keys);
    
    for (const key of keys) {
      const value = await redis.get(key);
      console.log(`🔍 E2E: ${key} =`, value);
    }
    
    throw new Error('E2E timeout - no response received');
  });
}

async function main() {
  console.log('🚀 Starting Comprehensive Timeout Diagnostics');
  console.log('=' .repeat(60));
  
  const results = {};
  
  // Test each component
  results.kvConnection = await testKVConnection();
  results.sessionCreation = await testSessionCreation();
  results.browserWorkerConnection = await testBrowserWorkerConnection();
  results.directCODAPCall = await testDirectCODAPCall();
  results.endToEndFlow = await testEndToEndFlow();
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('=' .repeat(60));
  
  for (const [test, result] of Object.entries(results)) {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${test}: ${result.success ? 'PASS' : 'FAIL'} (${result.duration}ms)`);
    if (!result.success) {
      console.log(`   Error: ${result.error}`);
    }
  }
  
  // Recommendations
  console.log('\n🔧 RECOMMENDATIONS:');
  if (!results.kvConnection.success) {
    console.log('- Fix KV connection issues first');
  }
  if (!results.sessionCreation.success) {
    console.log('- Session creation is failing');
  }
  if (!results.browserWorkerConnection.success) {
    console.log('- Browser worker is not connected - make sure CODAP plugin is loaded');
  }
  if (!results.endToEndFlow.success) {
    console.log('- End-to-end flow is broken - check browser worker and CODAP API');
  }
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Ensure CODAP plugin is loaded and visible');
  console.log('2. Check browser console for JavaScript errors');
  console.log('3. Verify SSE connection is working');
  console.log('4. Test with a simple CREATE operation first');
}

main().catch(console.error); 