/**
 * Debug endpoint to test Redis connection and session creation
 */
const Redis = require("ioredis");

module.exports = async function handler(req, res) {
  const testResults = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasRedisUrl: !!process.env.KV_REST_API_URL,
      hasRedisToken: !!process.env.KV_REST_API_TOKEN,
      redisUrlFormat: process.env.KV_REST_API_URL?.substring(0, 20) + '...'
    },
    tests: []
  };

  try {
    // Initialize Redis client
    const redisUrl = process.env.KV_REST_API_URL?.replace('redis://', 'rediss://');
    const redis = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      lazyConnect: true,
    });

    // Test 1: Redis Client Instantiation
    testResults.tests.push({
      name: "Redis Client Instantiation",
      status: "success",
      message: "Redis client created successfully"
    });

    // Test 2: Redis Connection
    await redis.ping();
    testResults.tests.push({
      name: "Redis Connection",
      status: "success",
      message: "Successfully connected to Redis"
    });

    // Test 3: Simple Redis Operation
    const testKey = `session:debug:${Date.now()}`;
    const testValue = JSON.stringify({ test: "value", timestamp: Date.now() });
    
    await redis.setex(testKey, 3600, testValue);
    testResults.tests.push({
      name: "Redis Write Operation",
      status: "success",
      message: `Successfully wrote to key: ${testKey}`
    });

    // Test 4: Redis Read Operation
    const retrievedValue = await redis.get(testKey);
    
    if (retrievedValue) {
      const parsed = JSON.parse(retrievedValue);
      if (parsed && parsed.test === "value") {
        testResults.tests.push({
          name: "Redis Read Operation",
          status: "success",
          message: "Successfully read and verified data",
          data: parsed
        });
      } else {
        testResults.tests.push({
          name: "Redis Read Operation",
          status: "error",
          message: "Data mismatch",
          expected: { test: "value" },
          actual: parsed
        });
      }
    } else {
      testResults.tests.push({
        name: "Redis Read Operation",
        status: "error",
        message: "No data retrieved",
        actual: retrievedValue
      });
    }

    // Clean up
    await redis.del(testKey);
    await redis.quit();

    const successCount = testResults.tests.filter(t => t.status === 'success').length;
    const totalTests = testResults.tests.length;

    res.status(200).json({
      success: successCount === totalTests,
      summary: `${successCount}/${totalTests} tests passed`,
      ...testResults
    });

  } catch (error) {
    testResults.tests.push({
      name: "Redis Connection",
      status: "error",
      message: error.message,
      stack: error.stack,
      errorType: error.constructor.name
    });

    res.status(500).json({
      success: false,
      error: "Redis connection failed",
      ...testResults
    });
  }
}; 