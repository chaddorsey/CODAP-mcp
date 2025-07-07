/**
 * Test script to properly connect to a session and then test tool execution
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

async function connectToSession(claudeSessionId, browserSessionId) {
  console.log(`\n🔗 Connecting Claude session to browser session ${browserSessionId}...`);
  
  const connectRequest = {
    jsonrpc: "2.0",
    id: `connect-${Date.now()}`,
    method: "tools/call",
    params: {
      name: "connect_to_session",
      arguments: {
        sessionId: browserSessionId
      }
    }
  };
  
  console.log('📤 Sending connect_to_session request...');
  
  const response = await fetch(`${BASE_URL}/api/mcp`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-mcp-session-id': claudeSessionId
    },
    body: JSON.stringify(connectRequest)
  });
  
  console.log('📥 Connect response status:', response.status);
  const responseText = await response.text();
  console.log('📥 Connect response:', responseText);
  
  if (!response.ok) {
    throw new Error(`Connect failed: ${response.status} ${responseText}`);
  }
  
  const result = JSON.parse(responseText);
  return result;
}

async function testToolAfterConnection(claudeSessionId) {
  console.log(`\n🔧 Testing getListOfDataContexts after connection...`);
  
  const toolRequest = {
    jsonrpc: "2.0",
    id: `test-${Date.now()}`,
    method: "tools/call",
    params: {
      name: "getListOfDataContexts",
      arguments: {}
    }
  };
  
  console.log('📤 Sending tool request...');
  
  const response = await fetch(`${BASE_URL}/api/mcp`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-mcp-session-id': claudeSessionId
    },
    body: JSON.stringify(toolRequest)
  });
  
  console.log('📥 Tool response status:', response.status);
  const responseText = await response.text();
  console.log('📥 Tool response:', responseText);
  
  if (!response.ok) {
    throw new Error(`Tool request failed: ${response.status} ${responseText}`);
  }
  
  const result = JSON.parse(responseText);
  return result;
}

async function main() {
  console.log('🚀 Connect Session Test');
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Create browser session
    const browserSessionId = await createSession();
    
    // Step 2: Generate a Claude session ID
    const claudeSessionId = `claude-${Date.now()}`;
    console.log('🎯 Using Claude session ID:', claudeSessionId);
    
    // Step 3: Connect to the browser session
    const connectResult = await connectToSession(claudeSessionId, browserSessionId);
    console.log('✅ Connection result:', connectResult);
    
    // Step 4: Test tool execution
    const toolResult = await testToolAfterConnection(claudeSessionId);
    console.log('✅ Tool execution result:', toolResult);
    
    console.log('\n🎉 SUCCESS: Connection and tool execution working!');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    redis.disconnect();
  }
}

main(); 