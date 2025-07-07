/**
 * Simple Browser Worker Connection Test
 * Verifies if the browser worker is connected and processing requests
 */

const Redis = require('ioredis');

// Configuration
const BASE_URL = 'https://codap-mcp-stable.vercel.app';

// Initialize Redis client
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
  console.log('🔄 Creating browser session...');
  const response = await fetch(`${BASE_URL}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  
  if (!response.ok) {
    throw new Error(`Session creation failed: ${response.status} ${await response.text()}`);
  }
  
  const data = await response.json();
  console.log('✅ Browser session created:', data.code);
  return data.code;
}

async function checkBrowserWorkerConnection(sessionId) {
  console.log(`\n🔍 Checking if browser worker is connected for session ${sessionId}...`);
  
  // Check for worker status in Redis
  const workerStatus = await redis.get(`worker:${sessionId}`);
  if (workerStatus) {
    console.log('✅ Worker status found in Redis:', workerStatus);
    return true;
  } else {
    console.log('❌ No worker status found in Redis');
  }
  
  // Check for any browser worker indicators
  const workerKeys = await redis.keys(`worker:*`);
  console.log('🔍 All worker keys in Redis:', workerKeys);
  
  // Check for SSE connection indicators
  const sseKeys = await redis.keys(`sse:*`);
  console.log('🔍 All SSE keys in Redis:', sseKeys);
  
  return false;
}

async function testDirectToolRequest(sessionId) {
  console.log(`\n🧪 Testing direct tool request queue for session ${sessionId}...`);
  
  const requestId = `test-direct-${Date.now()}`;
  const toolRequest = {
    requestId,
    sessionId,
    toolName: 'getListOfDataContexts',
    arguments: {}
  };
  
  console.log('📤 Storing direct tool request in Redis...');
  await redis.set(`request:${requestId}`, JSON.stringify(toolRequest));
  
  console.log('⏳ Waiting 3 seconds to see if browser worker processes it...');
  await sleep(3000);
  
  // Check if response was generated
  const response = await redis.get(`toolres:${requestId}`);
  if (response) {
    console.log('✅ Response found! Browser worker is processing requests:', JSON.parse(response));
    return true;
  } else {
    console.log('❌ No response found. Browser worker may not be connected or processing.');
    
    // Check if request is still in queue
    const stillInQueue = await redis.get(`request:${requestId}`);
    if (stillInQueue) {
      console.log('🔄 Request still in queue - browser worker not consuming');
    } else {
      console.log('⚠️  Request removed from queue but no response - possible processing error');
    }
    
    return false;
  }
}

async function testSSEConnection(sessionId) {
  console.log(`\n🌐 Testing SSE connection for session ${sessionId}...`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/stream?sessionCode=${sessionId}`, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });
    
    console.log('📡 SSE response status:', response.status);
    console.log('📡 SSE response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      console.log('✅ SSE endpoint is accessible');
      return true;
    } else {
      console.log('❌ SSE endpoint returned error:', await response.text());
      return false;
    }
  } catch (error) {
    console.log('❌ SSE connection failed:', error.message);
    return false;
  }
}

async function simulateBrowserWorkerConnection(sessionId) {
  console.log(`\n🔧 Simulating browser worker connection for session ${sessionId}...`);
  
  // Simulate what the browser worker should do when it connects
  const workerStatus = {
    connected: true,
    timestamp: Date.now(),
    sessionId: sessionId,
    status: 'active'
  };
  
  await redis.set(`worker:${sessionId}`, JSON.stringify(workerStatus));
  console.log('✅ Simulated worker status stored');
  
  // Test if this helps with tool processing
  return await testDirectToolRequest(sessionId);
}

async function checkRedisQueue() {
  console.log(`\n📊 Checking Redis queue status...`);
  
  const requestKeys = await redis.keys('request:*');
  console.log(`🔍 Pending requests in queue: ${requestKeys.length}`);
  
  if (requestKeys.length > 0) {
    console.log('📋 Recent requests:');
    for (const key of requestKeys.slice(0, 5)) { // Show first 5
      const request = await redis.get(key);
      if (request) {
        const parsed = JSON.parse(request);
        console.log(`  - ${key}: ${parsed.toolName} (session: ${parsed.sessionId})`);
      }
    }
  }
  
  const responseKeys = await redis.keys('toolres:*');
  console.log(`🔍 Stored responses: ${responseKeys.length}`);
  
  if (responseKeys.length > 0) {
    console.log('📋 Recent responses:');
    for (const key of responseKeys.slice(0, 3)) { // Show first 3
      const response = await redis.get(key);
      if (response) {
        const parsed = JSON.parse(response);
        console.log(`  - ${key}: ${parsed.success ? 'SUCCESS' : 'ERROR'}`);
      }
    }
  }
}

async function main() {
  console.log('🚀 Browser Worker Connection Test');
  console.log('=' .repeat(60));
  console.log('This test checks if the CODAP plugin browser worker is connected and processing requests');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Create session
    const sessionId = await createSession();
    
    // Step 2: Check current Redis state
    await checkRedisQueue();
    
    // Step 3: Check for browser worker connection
    const workerConnected = await checkBrowserWorkerConnection(sessionId);
    
    // Step 4: Test SSE connection
    const sseWorking = await testSSEConnection(sessionId);
    
    // Step 5: Test direct tool request processing
    const directRequestWorking = await testDirectToolRequest(sessionId);
    
    // Step 6: If browser worker not connected, simulate connection and test
    if (!workerConnected) {
      console.log('\n🔧 Browser worker not detected. Testing with simulated connection...');
      const simulatedWorking = await simulateBrowserWorkerConnection(sessionId);
      
      if (simulatedWorking) {
        console.log('✅ Tool processing works when worker status is present');
      } else {
        console.log('❌ Tool processing still fails even with simulated worker status');
      }
    }
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 DIAGNOSIS SUMMARY');
    console.log('=' .repeat(60));
    console.log(`✅ Session created: ${sessionId}`);
    console.log(`${workerConnected ? '✅' : '❌'} Browser worker connected: ${workerConnected}`);
    console.log(`${sseWorking ? '✅' : '❌'} SSE endpoint accessible: ${sseWorking}`);
    console.log(`${directRequestWorking ? '✅' : '❌'} Tool request processing: ${directRequestWorking}`);
    
    console.log('\n🎯 RECOMMENDATIONS:');
    if (!workerConnected) {
      console.log('❌ Browser worker is NOT connected');
      console.log('   → Make sure the CODAP plugin is loaded and visible in CODAP');
      console.log('   → Check browser console for JavaScript errors');
      console.log('   → Verify the plugin is connecting to the correct session ID');
    }
    
    if (!sseWorking) {
      console.log('❌ SSE connection is not working');
      console.log('   → This prevents the browser worker from receiving requests');
      console.log('   → Check network connectivity and CORS settings');
    }
    
    if (!directRequestWorking) {
      console.log('❌ Tool request processing is not working');
      console.log('   → This is why getListOfDataContexts times out');
      console.log('   → The browser worker is not consuming the request queue');
    }
    
    if (workerConnected && sseWorking && directRequestWorking) {
      console.log('✅ Everything looks good! The timeout issue may be intermittent.');
    }
    
    console.log(`\n📱 NEXT STEPS:`);
    console.log(`1. Load CODAP at: https://codap.concord.org/app/static/dg/en/cert/index.html`);
    console.log(`2. Make sure the CODAP-MCP plugin is visible and shows session: ${sessionId}`);
    console.log(`3. Check browser console for any errors`);
    console.log(`4. Try running this test again after confirming the plugin is loaded`);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    redis.disconnect();
  }
}

main(); 