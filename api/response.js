/**
 * Response endpoint for browser workers to post tool execution results
 * This endpoint stores tool responses in KV storage for the MCP server to retrieve
 * Self-contained Redis Labs connection
 */

const Redis = require("ioredis");

// Initialize Redis client
let redis = null;
function getRedisClient() {
  if (!redis) {
    // Build Redis Labs URL
    const host = "redis-19603.c57.us-east-1-4.ec2.redns.redis-cloud.com";
    const port = 19603;
    const password = "4mi2PHNUqQkeMxSbLFY0qY5ruQEdNxmo";
    
    redis = new Redis({
      host,
      port,
      password,
      username: "default",
      // Explicitly disable TLS
      tls: null,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      lazyConnect: true,
    });
  }
  return redis;
}

/**
 * Store tool response in Redis
 */
async function setToolResponse(requestId, responseData) {
  const key = `response:${requestId}`;
  const redis = getRedisClient();
  // Store with 1 hour TTL
  await redis.setex(key, 3600, JSON.stringify(responseData));
}

/**
 * Validates session code format
 */
function isValidSessionCode(code) {
  return /^[A-Z2-7]{8}$/.test(code);
}

/**
 * Main handler function for tool responses
 */
async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-session-code, x-vercel-protection-bypass");

  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }
    
    // Only allow POST method
    if (req.method !== "POST") {
      res.status(405).json({
        error: "method_not_allowed",
        message: "Only POST method is allowed"
      });
      return;
    }
    
    // Parse request body
    const { sessionCode, requestId, result, error } = req.body;
    
    // Validate required fields
    if (!sessionCode) {
      res.status(400).json({
        error: "missing_session_code",
        message: "Session code is required"
      });
      return;
    }
    
    if (!requestId) {
      res.status(400).json({
        error: "missing_request_id", 
        message: "Request ID is required"
      });
      return;
    }
    
    if (!result && !error) {
      res.status(400).json({
        error: "missing_result_or_error",
        message: "Either result or error must be provided"
      });
      return;
    }
    
    // Validate session code format
    if (!isValidSessionCode(sessionCode)) {
      res.status(400).json({
        error: "invalid_session_code",
        message: "Session code must be 8 characters (A-Z, 2-7)"
      });
      return;
    }
    
    // Store the tool response
    const responseData = {
      sessionCode,
      requestId,
      timestamp: new Date().toISOString()
    };
    
    if (result) {
      responseData.result = result;
    }
    
    if (error) {
      responseData.error = error;
    }
    
    await setToolResponse(requestId, responseData);
    
    console.log(`[response] Stored tool response for request ${requestId} from session ${sessionCode}`);
    
    // Return success response
    res.status(200).json({
      success: true,
      message: "Tool response stored successfully",
      requestId,
      timestamp: responseData.timestamp
    });
    
  } catch (error) {
    console.error("[response] Error storing tool response:", error);
    res.status(500).json({
      error: "internal_server_error",
      message: "Failed to store tool response",
      details: error.message
    });
  }
}

module.exports = handler;
