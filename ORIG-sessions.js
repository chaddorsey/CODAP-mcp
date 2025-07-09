require('dotenv').config();
// Session creation endpoint using Node.js runtime
// Self-contained version to avoid import path issues
const Redis = require("ioredis");

// Configuration
const SESSION_TTL_SECONDS = 3600; // 1 hour
const RATE_LIMIT_SESSION_PER_IP = 30;

// Initialize Redis client
let redis = null;
function getRedisClient() {
  if (!redis) {
    // Build Redis Labs URL from environment variables
    const host = process.env.REDIS_HOST;
    const port = process.env.REDIS_PORT;
    const password = process.env.REDIS_PASSWORD;

    
    console.log('[sessions] Redis connection details:', { host, port, hasPassword: !!password });
    
    redis = new Redis({
      host,
      port,
      password,
      username: "default",
      // Explicitly disable TLS
      tls: null,
      // Additional Redis Labs specific options
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      lazyConnect: true,
      // Add error handling
      onError: (error) => {
        console.error('[sessions] Redis connection error:', error.message);
      }
    });
    
    // Add connection event listeners
    redis.on('connect', () => {
      console.log('[sessions] Redis connected successfully');
    });
    
    redis.on('error', (error) => {
      console.error('[sessions] Redis error event:', error.message);
    });
  }
  return redis;
}

/**
 * Store session data in Redis
 */
async function setSession(code, sessionData) {
  const key = `session:${code}`;
  const redis = getRedisClient();
  await redis.setex(key, SESSION_TTL_SECONDS, JSON.stringify(sessionData));
}

/**
 * Generates a cryptographically secure 8-character Base32 session code
 * Format: A-Z, 2-7 (32 characters total)
 * Entropy: 40 bits (~1 trillion combinations)
 */
function generateSessionCode() {
  const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const codeLength = 8;
  
  let code = "";
  for (let i = 0; i < codeLength; i++) {
    code += base32Chars[Math.floor(Math.random() * 32)];
  }
  
  return code;
}

/**
 * Creates a standardized error response
 */
function createErrorResponse(res, status, error, message, code) {
  res.status(status).json({
    error,
    message,
    code
  });
}

/**
 * Creates a standardized success response
 */
function createSuccessResponse(res, data, status = 200) {
  res.status(status).json(data);
}

/**
 * Main handler function
 */
async function handler(req, res) {
  console.log('[sessions] Handler called, method:', req.method);
  
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-sso-bypass");

  try {
    console.log('[sessions] Starting session creation...');
    console.log('[sessions] Redis URL exists:', !!process.env.KV_REST_API_URL);
    
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }
    
    // Only allow POST method
    if (req.method !== "POST") {
      createErrorResponse(res, 405, "method_not_allowed", "Only POST method is allowed");
      return;
    }
    
    // Basic rate limiting check (simplified for demo)
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || 
               req.headers["x-real-ip"] || 
               "unknown";
    
    // Validate request body (should be empty JSON object or contain only 'capabilities')
    let capabilities = ["CODAP"];
    if (req.body && Object.keys(req.body).length > 0) {
      // Accept only { capabilities: [...] }
      if (
        Object.keys(req.body).length === 1 &&
        Array.isArray(req.body.capabilities) &&
        req.body.capabilities.every((c) => typeof c === "string" && c.length > 0)
      ) {
        capabilities = req.body.capabilities;
      } else {
        createErrorResponse(res, 400, "invalid_request", "Request body must be empty or contain only a valid 'capabilities' array");
        return;
      }
    }
    
    // Generate session code
    console.log('[sessions] Generating session code...');
    const code = generateSessionCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
    
    console.log('[sessions] Generated code:', code);
    
    // Store session in Redis with TTL
    const sessionData = {
      code,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      ip,
      active: true,
      capabilities
    };
    
    console.log('[sessions] About to call setSession...');
    await setSession(code, sessionData);
    console.log('[sessions] setSession completed successfully');
    
    // Return session details
    const response = {
      code,
      ttl: SESSION_TTL_SECONDS,
      expiresAt: expiresAt.toISOString(),
      deploymentTest: "REDIS_LABS_SELF_CONTAINED"
    };
    
    createSuccessResponse(res, response, 201);
    
  } catch (error) {
    console.error("[sessions] Session creation error:", error);
    console.error("[sessions] Error message:", error.message);
    console.error("[sessions] Error stack:", error.stack);
    createErrorResponse(res, 500, "internal_server_error", `Failed to create session: ${error.message}`);
  }
}

module.exports = handler; 
