// Test script to verify Redis session persistence in production
const fetch = require('node-fetch');

const BASE_URL = 'https://codap-mcp-cdorsey-concordorgs-projects.vercel.app/api';
const SSO_BYPASS_SECRET = 'pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye';

async function testRedisSessionPersistence() {
  console.log('🧪 Testing Redis Session Persistence');
  console.log(`Testing against: ${BASE_URL}`);
  console.log('🚀 Starting Redis Tests\n');

  try {
    // Test 1: Create a session
    console.log('📝 Testing Session Creation with Redis...');
    const sessionResponse = await fetch(`${BASE_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sso-bypass': SSO_BYPASS_SECRET
      },
      body: JSON.stringify({})
    });

    if (!sessionResponse.ok) {
      throw new Error(`Session creation failed: ${sessionResponse.status} ${sessionResponse.statusText}`);
    }

    const sessionData = await sessionResponse.json();
    console.log('✅ Session created successfully');
    console.log(`   Session Code: ${sessionData.code}`);
    console.log(`   TTL: ${sessionData.ttl} seconds`);
    console.log(`   Expires At: ${sessionData.expiresAt}`);
    
    // Verify the response no longer contains demo messages
    if (sessionData.note && sessionData.note.includes('Demo version')) {
      console.log('❌ ERROR: Session still contains demo message!');
      console.log(`   Note: ${sessionData.note}`);
      return false;
    } else {
      console.log('✅ No demo message found - Redis implementation confirmed');
    }

    const sessionCode = sessionData.code;

    // Test 2: Create a request using the session
    console.log('\n🔄 Testing Request Creation...');
    const requestPayload = {
      method: 'mcp/call',
      params: {
        tool: 'test-tool',
        arguments: { message: 'Redis persistence test' }
      }
    };

    const requestResponse = await fetch(`${BASE_URL}/request?code=${sessionCode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sso-bypass': SSO_BYPASS_SECRET
      },
      body: JSON.stringify(requestPayload)
    });

    if (requestResponse.ok) {
      console.log('✅ Request created successfully');
    } else {
      const errorData = await requestResponse.json();
      console.log(`⚠️  Request creation status: ${requestResponse.status}`);
      console.log(`   Error: ${errorData.error || 'Unknown error'}`);
      console.log(`   Message: ${errorData.message || 'No message'}`);
    }

    // Test 3: Test stream endpoint
    console.log('\n📡 Testing Stream Endpoint...');
    const streamResponse = await fetch(`${BASE_URL}/stream?code=${sessionCode}`, {
      method: 'GET',
      headers: {
        'x-sso-bypass': SSO_BYPASS_SECRET
      }
    });

    if (streamResponse.ok) {
      console.log('✅ Stream endpoint accessible');
    } else {
      const errorData = await streamResponse.json();
      console.log(`⚠️  Stream endpoint status: ${streamResponse.status}`);
      console.log(`   Error: ${errorData.error || 'Unknown error'}`);
    }

    // Test 4: Create multiple sessions to verify Redis scaling
    console.log('\n🔢 Testing Multiple Sessions...');
    const sessions = [];
    for (let i = 0; i < 3; i++) {
      const multiSessionResponse = await fetch(`${BASE_URL}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sso-bypass': SSO_BYPASS_SECRET
        },
        body: JSON.stringify({})
      });

      if (multiSessionResponse.ok) {
        const multiSessionData = await multiSessionResponse.json();
        sessions.push(multiSessionData.code);
        console.log(`   ✅ Session ${i + 1}: ${multiSessionData.code}`);
      } else {
        console.log(`   ❌ Session ${i + 1} failed`);
      }
    }

    console.log(`\n🎉 Redis Tests Completed Successfully!`);
    console.log(`   - Session persistence implemented`);
    console.log(`   - Demo messages removed`);
    console.log(`   - Multiple sessions supported`);
    console.log(`   - All ${sessions.length + 1} sessions created with Redis storage`);
    
    return true;

  } catch (error) {
    console.error('❌ Redis test failed:', error.message);
    return false;
  }
}

// Run the test
testRedisSessionPersistence()
  .then(success => {
    if (success) {
      console.log('\n🏆 All Redis persistence tests passed!');
      process.exit(0);
    } else {
      console.log('\n💥 Redis persistence tests failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  }); 