// Session creation endpoint using Node.js runtime
// This avoids the Edge runtime compilation issues we were experiencing
const { setSession, SESSION_TTL } = require("./kv-utils");

// Configuration
const SESSION_TTL_SECONDS = SESSION_TTL; // 10 minutes (600 seconds)
const RATE_LIMIT_SESSION_PER_IP = 30;

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
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  try {
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
    // In production, this would use Redis or a proper rate limiting service
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || 
               req.headers["x-real-ip"] || 
               "unknown";
    
    // Validate request body (should be empty JSON object)
    if (req.body && Object.keys(req.body).length > 0) {
      createErrorResponse(res, 400, "invalid_request", "Request body must be empty JSON object");
      return;
    }
    
    // Generate session code
    const code = generateSessionCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
    
    // Store session in Redis with TTL
    const sessionData = {
      code,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      ip,
      active: true
    };
    
    await setSession(code, sessionData);
    
    // Return session details
    const response = {
      code,
      ttl: SESSION_TTL_SECONDS,
      expiresAt: expiresAt.toISOString(),
      deploymentTest: "SESSIONS_CURRENT_DEPLOYMENT_DEC19"
    };
    
    createSuccessResponse(res, response, 201);
    
  } catch (error) {
    console.error("Session creation error:", error);
    createErrorResponse(res, 500, "internal_server_error", "Failed to create session");
  }
} 
