// Tool response endpoint using Node.js runtime
// Accepts tool responses from MCP server

const { getSession, setResponse } = require("./kv-utils");

/**
 * Validates session code format
 */
function isValidSessionCode(code) {
  return /^[A-Z2-7]{8}$/.test(code);
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
 * Check if session exists and is valid
 */
async function validateSession(code) {
  try {
    const sessionData = await getSession(code);
    if (!sessionData) {
      return false;
    }
    
    // Check if session is expired
    const now = new Date();
    const expiresAt = new Date(sessionData.expiresAt);
    return now <= expiresAt;
  } catch (error) {
    console.error("Session validation error:", error);
    return false;
  }
}

/**
 * Store tool response using kv-utils
 */
async function storeToolResponse(code, responseData) {
  const response = {
    ...responseData,
    timestamp: new Date().toISOString()
  };
  
  await setResponse(code, response);
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
    
    // Validate request body
    if (!req.body) {
      createErrorResponse(res, 400, "missing_body", "Request body is required");
      return;
    }
    
    const { sessionCode, requestId, result, error } = req.body;
    
    // Validate required fields
    if (!sessionCode) {
      createErrorResponse(res, 400, "missing_session_code", "Session code is required");
      return;
    }
    
    if (!isValidSessionCode(sessionCode)) {
      createErrorResponse(res, 400, "invalid_session_code", "Session code must be 8 characters (A-Z, 2-7)");
      return;
    }
    
    if (!requestId || typeof requestId !== "string") {
      createErrorResponse(res, 400, "missing_request_id", "Request ID is required");
      return;
    }
    
    // Must have either result or error, but not both
    if ((!result && !error) || (result && error)) {
      createErrorResponse(res, 400, "invalid_response", "Response must contain either 'result' or 'error', but not both");
      return;
    }
    
    // Validate session exists and is not expired
    const sessionValid = await validateSession(sessionCode);
    if (!sessionValid) {
      createErrorResponse(res, 404, "session_not_found", "Session not found or expired");
      return;
    }
    
    // Store the tool response in KV storage
    const responseData = {
      id: requestId,
      result: result || null,
      error: error || null,
      timestamp: new Date().toISOString()
    };
    
    await storeToolResponse(sessionCode, responseData);
    
    console.log(`Tool response stored for session ${sessionCode}:`, responseData);
    
    createSuccessResponse(res, {
      id: requestId,
      status: "stored",
      message: "Tool response stored successfully"
    });
    
  } catch (error) {
    console.error("Tool response error:", error);
    createErrorResponse(res, 500, "internal_server_error", "Failed to store tool response");
  }
} 
