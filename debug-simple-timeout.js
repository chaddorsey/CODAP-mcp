/**
 * Simple Timeout Diagnostic
 * Focus on the specific getListOfDataContexts timeout issue
 */

const Redis = require('ioredis');

// Configuration
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

async function createSession() {
  console.log('🔄 Creating session...');
  const response = await fetch(`${BASE_URL}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}) // Empty body as required
  });
  
  if (!response.ok) {
    throw new Error(`Session creation failed: ${response.status} ${await response.text()}`);
  }
  
  const data = await response.json();
  console.log('✅ Session created:', data.code);
  return data.code;
}

async function testToolExecution(sessionId) {
  console.log(`\n🔧 Testing getListOfDataContexts with session: ${sessionId}`);
  
  const requestId = `test-${Date.now()}`;
  const toolRequest = {
    jsonrpc: "2.0",
    id: requestId,
    method: "tools/call",
    params: {
      name: "getListOfDataContexts",
      arguments: {}
    }
  };
  
  console.log('📤 Sending MCP request:', JSON.stringify(toolRequest, null, 2));
  
  // Add session header
  const response = await fetch(`${BASE_URL}/api/mcp`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-mcp-session-id': sessionId
    },
    body: JSON.stringify(toolRequest)
  });
  
  console.log('📥 MCP response status:', response.status);
  const responseText = await response.text();
  console.log('📥 MCP response body:', responseText);
  
  if (!response.ok) {
    throw new Error(`MCP request failed: ${response.status} ${responseText}`);
  }
  
  const result = JSON.parse(responseText);
  return result;
}

async function checkSessionInRedis(sessionId) {
  console.log(`\n🔍 Checking session ${sessionId} in Redis...`);
  
  const sessionData = await redis.get(`session:${sessionId}`);
  if (sessionData) {
    console.log('✅ Session found in Redis:', JSON.parse(sessionData));
  } else {
    console.log('❌ Session not found in Redis');
  }
  
  // Check for any worker status
  const workerStatus = await redis.get(`worker:${sessionId}`);
  if (workerStatus) {
    console.log('✅ Worker status found:', workerStatus);
  } else {
    console.log('⚠️  No worker status found (normal if browser worker not connected)');
  }
  
  return { sessionData, workerStatus };
}

async function monitorToolResponse(sessionId, requestId, maxWaitMs = 10000) {
  console.log(`\n⏱️  Monitoring for response to ${requestId}...`);
  
  const startTime = Date.now();
  let iteration = 0;
  
  while (Date.now() - startTime < maxWaitMs) {
    iteration++;
    const elapsed = Date.now() - startTime;
    
    // Check for response
    const response = await redis.get(`toolres:${requestId}`);
    if (response) {
      console.log(`✅ Response found after ${elapsed}ms (iteration ${iteration})`);
      const result = JSON.parse(response);
      console.log('📥 Response data:', result);
      return result;
    }
    
    // Check for request in queue
    const request = await redis.get(`request:${requestId}`);
    if (request) {
      console.log(`🔄 Request still in queue (${elapsed}ms, iteration ${iteration})`);
    } else {
      console.log(`⚠️  Request not found in queue (${elapsed}ms, iteration ${iteration})`);
    }
    
    await sleep(1000);
  }
  
  console.log(`❌ Timeout after ${maxWaitMs}ms`);
  
  // Debug: Check all keys related to this request
  const allKeys = await redis.keys(`*${requestId}*`);
  console.log('🔍 All keys containing requestId:', allKeys);
  
  for (const key of allKeys) {
    const value = await redis.get(key);
    console.log(`🔍 ${key}:`, value);
  }
  
  return null;
}

async function main() {
  console.log('🚀 Simple Timeout Diagnostic');
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Create session
    const sessionId = await createSession();
    
    // Step 2: Check session in Redis
    await checkSessionInRedis(sessionId);
    
    // Step 3: Test tool execution
    console.log('\n⚠️  IMPORTANT: Make sure the CODAP plugin is loaded in your browser!');
    console.log('The plugin should be visible at: https://codap.concord.org/app/static/dg/en/cert/index.html');
    console.log('And connected to session:', sessionId);
    
    await sleep(2000); // Give user time to read
    
    const mcpResult = await testToolExecution(sessionId);
    
    // Step 4: Monitor for response
    const requestId = mcpResult.id;
    const toolResponse = await monitorToolResponse(sessionId, requestId);
    
    if (toolResponse) {
      console.log('\n✅ SUCCESS: Tool executed successfully!');
      console.log('Response:', toolResponse);
    } else {
      console.log('\n❌ TIMEOUT: Tool execution timed out');
      console.log('This suggests the browser worker is not processing the request');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    redis.disconnect();
  }
}

main(); 