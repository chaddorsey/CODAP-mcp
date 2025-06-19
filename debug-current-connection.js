const fetch = require('node-fetch');

async function debugCurrentConnection() {
  console.log('🔍 DEBUGGING CURRENT BROWSER WORKER CONNECTION');
  console.log('===============================================');
  
  const OLD_URL = 'https://codap-mcp-cdorsey-concordorgs-projects.vercel.app';
  const NEW_URL = 'https://codap-h47znpzqe-cdorsey-concordorgs-projects.vercel.app';
  const BYPASS_HEADER = 'pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye';
  
  console.log('🔗 Testing which endpoint the browser worker should connect to:');
  console.log(`   OLD: ${OLD_URL}`);
  console.log(`   NEW: ${NEW_URL}\n`);
  
  try {
    // Test OLD deployment
    console.log('1. 🔍 Testing OLD deployment...');
    try {
      const oldResponse = await fetch(`${OLD_URL}/api/stream?sessionCode=TEST`, {
        headers: { 'x-vercel-protection-bypass': BYPASS_HEADER },
        timeout: 3000
      });
      const oldText = await oldResponse.text();
      const hasOldFormat = oldText.includes('data:') && !oldText.includes('event:');
      console.log(`   📊 OLD deployment: ${hasOldFormat ? '❌ BROKEN SSE format' : '✅ Fixed SSE format'}`);
    } catch (error) {
      console.log(`   📊 OLD deployment: ❌ Connection failed (${error.message})`);
    }
    
    // Test NEW deployment  
    console.log('\n2. ✅ Testing NEW deployment...');
    try {
      const newResponse = await fetch(`${NEW_URL}/api/stream?sessionCode=TEST`, {
        headers: { 'x-vercel-protection-bypass': BYPASS_HEADER },
        timeout: 3000
      });
      const newText = await newResponse.text();
      const hasNewFormat = newText.includes('event:') && newText.includes('data:');
      console.log(`   📊 NEW deployment: ${hasNewFormat ? '✅ FIXED SSE format' : '❌ Broken SSE format'}`);
    } catch (error) {
      console.log(`   📊 NEW deployment: ❌ Connection failed (${error.message})`);
    }
    
    console.log('\n3. 🎯 NEXT STEPS:');
    console.log('=================');
    console.log('🔄 HARD REFRESH your browser (Cmd+Shift+R) to force reload');
    console.log('📱 After refresh, start a new session');
    console.log('🔗 Browser worker should now connect to the NEW (fixed) endpoint');
    console.log('📊 Tool requests should then be processed and appear in CODAP');
    
    console.log('\n💡 The issue is that your browser is still using the old code');
    console.log('   due to Hot Module Replacement failing. A hard refresh will fix this.');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugCurrentConnection(); 