/**
 * Local Redis Labs connection test
 * Run with: node debug-redis-local.js
 */
const Redis = require("ioredis");

async function testRedisConnection() {
  console.log("🔍 Testing Redis Labs connection...");
  
  // Log environment info
  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;
  
  console.log("Environment check:");
  console.log("- KV_REST_API_URL exists:", !!redisUrl);
  console.log("- KV_REST_API_TOKEN exists:", !!redisToken);
  
  if (redisUrl) {
    console.log("- URL format:", redisUrl.substring(0, 30) + "...");
    console.log("- Starts with redis://:", redisUrl.startsWith('redis://'));
    console.log("- Starts with rediss://:", redisUrl.startsWith('rediss://'));
  }
  
  if (!redisUrl) {
    console.log("❌ KV_REST_API_URL environment variable not set");
    return;
  }

  try {
    // Test different URL formats
    const urlFormats = [
      redisUrl, // Original
      redisUrl.replace('redis://', 'rediss://'), // TLS version
    ];
    
    for (const url of urlFormats) {
      console.log(`\n🧪 Testing URL format: ${url.substring(0, 30)}...`);
      
      try {
        const redis = new Redis(url, {
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          connectTimeout: 10000,
          lazyConnect: true,
        });
        
        // Test connection
        console.log("- Creating Redis client...");
        
        console.log("- Testing ping...");
        await redis.ping();
        console.log("✅ PING successful");
        
        // Test basic operations
        const testKey = `test:${Date.now()}`;
        const testValue = "hello-redis-labs";
        
        console.log("- Testing SET operation...");
        await redis.setex(testKey, 60, testValue);
        console.log("✅ SET successful");
        
        console.log("- Testing GET operation...");
        const result = await redis.get(testKey);
        
        if (result === testValue) {
          console.log("✅ GET successful - data matches");
          
          // Clean up
          await redis.del(testKey);
          console.log("✅ Cleanup successful");
          
          console.log(`\n🎉 SUCCESS! Redis Labs connection working with URL format: ${url.substring(0, 30)}...`);
          
          await redis.quit();
          return true;
        } else {
          console.log("❌ GET failed - data mismatch");
          console.log(`Expected: ${testValue}`);
          console.log(`Got: ${result}`);
        }
        
        await redis.quit();
        
      } catch (error) {
        console.log(`❌ Failed with this URL format: ${error.message}`);
        console.log(`Error type: ${error.constructor.name}`);
      }
    }
    
    console.log("\n❌ All URL formats failed");
    
  } catch (error) {
    console.log(`❌ Unexpected error: ${error.message}`);
    console.log(`Error type: ${error.constructor.name}`);
    console.log(`Stack: ${error.stack}`);
  }
}

testRedisConnection().then(() => {
  console.log("\n🏁 Test completed");
  process.exit(0);
}).catch(error => {
  console.log(`💥 Fatal error: ${error.message}`);
  process.exit(1);
}); 