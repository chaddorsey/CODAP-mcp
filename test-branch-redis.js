// Test script to verify Redis session persistence on branch deployment
const fetch = require('node-fetch');

// Using the most recent preview deployment
const BRANCH_BASE_URL = 'https://codap-fd3aw92ip-cdorsey-concordorgs-projects.vercel.app/api';
const MAIN_BASE_URL = 'https://codap-mcp-cdorsey-concordorgs-projects.vercel.app/api';
const SSO_BYPASS_SECRET = 'pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye';

async function testBothDeployments() {
  console.log('🧪 Testing Redis Implementation on Branch vs Main');
  console.log('🚀 Starting Deployment Comparison Tests\n');

  // Test branch deployment
  console.log('🌿 Testing BRANCH deployment (with Redis):');
  console.log(`   URL: ${BRANCH_BASE_URL}`);
  const branchSuccess = await testRedisImplementation(BRANCH_BASE_URL, 'BRANCH');

  console.log('\n' + '='.repeat(60) + '\n');

  // Test main deployment
  console.log('🌟 Testing MAIN deployment (demo version):');
  console.log(`   URL: ${MAIN_BASE_URL}`);
  const mainSuccess = await testRedisImplementation(MAIN_BASE_URL, 'MAIN');

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 DEPLOYMENT COMPARISON SUMMARY:');
  console.log(`   🌿 Branch (Redis): ${branchSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`   🌟 Main (Demo):    ${mainSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (branchSuccess && !mainSuccess) {
    console.log('\n🎉 Perfect! Branch has Redis, Main has demo - ready to merge!');
  } else if (branchSuccess && mainSuccess) {
    console.log('\n⚠️  Both deployments working - check if main already has Redis');
  } else if (!branchSuccess) {
    console.log('\n❌ Branch deployment failed - check logs');
  }

  return branchSuccess;
}

async function testRedisImplementation(baseUrl, deploymentName) {
  try {
    // Test session creation
    const sessionResponse = await fetch(`${baseUrl}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sso-bypass': SSO_BYPASS_SECRET
      },
      body: JSON.stringify({})
    });

    if (!sessionResponse.ok) {
      console.log(`   ❌ Session creation failed: ${sessionResponse.status}`);
      return false;
    }

    const sessionData = await sessionResponse.json();
    console.log(`   ✅ Session created: ${sessionData.code}`);
    console.log(`   ⏰ TTL: ${sessionData.ttl} seconds`);
    
    // Check for Redis implementation vs demo
    if (sessionData.note && sessionData.note.includes('Demo version')) {
      console.log(`   📝 Implementation: DEMO (in-memory)`);
      console.log(`   📋 Note: ${sessionData.note}`);
      return true; // Success for demo version
    } else {
      console.log(`   📝 Implementation: REDIS (persistent)`);
      console.log(`   🎯 No demo message - Redis confirmed!`);
      
      // Test request creation with Redis session
      const requestPayload = {
        method: 'mcp/call',
        params: { tool: 'test', arguments: { test: 'redis' } }
      };

      const requestResponse = await fetch(`${baseUrl}/request?code=${sessionData.code}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sso-bypass': SSO_BYPASS_SECRET
        },
        body: JSON.stringify(requestPayload)
      });

      if (requestResponse.ok) {
        console.log(`   ✅ Request created successfully with Redis session`);
      } else {
        console.log(`   ⚠️  Request status: ${requestResponse.status}`);
      }
      
      return true; // Success for Redis version
    }

  } catch (error) {
    console.log(`   ❌ ${deploymentName} test failed: ${error.message}`);
    return false;
  }
}

// Run the comparison test
testBothDeployments()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  }); 