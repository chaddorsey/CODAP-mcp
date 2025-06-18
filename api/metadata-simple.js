// Simplified metadata endpoint for debugging
const { getSession } = require("./kv-utils");

// Minimal tool manifest for testing
const TOOL_MANIFEST = {
  version: "1.0.0",
  tools: [
    {
      name: "create_dataset_with_table",
      description: "Create a new dataset in CODAP",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" },
          attributes: { type: "array" }
        },
        required: ["name", "attributes"]
      }
    }
  ]
};

/**
 * Validate session code format (8-character Base32)
 */
function isValidSessionCode(code) {
  return typeof code === 'string' && /^[A-Z2-7]{8}$/.test(code);
}

/**
 * Create error response
 */
function createErrorResponse(res, status, error, message) {
  res.status(status).json({ error, message });
}

/**
 * Create success response  
 */
function createSuccessResponse(res, data) {
  res.status(200).json(data);
}

/**
 * Main handler function
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-sso-bypass");

  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }
    
    // Only allow GET method
    if (req.method !== "GET") {
      createErrorResponse(res, 405, "method_not_allowed", "Only GET method is allowed");
      return;
    }
    
    // Extract session code from URL path
    const code = req.query.code;
    
    // Validate session code format
    if (!code || !isValidSessionCode(code)) {
      createErrorResponse(res, 400, "invalid_session_code", "Session code must be 8-character Base32 format");
      return;
    }
    
    // For debugging, let's try to get the session
    console.log("Attempting to get session:", code);
    
    let session;
    try {
      session = await getSession(code);
      console.log("Session retrieved:", session ? "found" : "not found");
    } catch (error) {
      console.error("Session retrieval error:", error);
      createErrorResponse(res, 500, "session_retrieval_error", "Failed to retrieve session data");
      return;
    }
    
    if (!session) {
      createErrorResponse(res, 404, "session_not_found", "Session not found or expired");
      return;
    }
    
    // Check if session is expired
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    if (now > expiresAt) {
      createErrorResponse(res, 410, "session_expired", "Session has expired");
      return;
    }
    
    // Generate response with tool manifest
    const response = {
      ...TOOL_MANIFEST,
      sessionCode: code,
      generatedAt: now.toISOString(),
      expiresAt: session.expiresAt
    };
    
    createSuccessResponse(res, response);
    
  } catch (error) {
    console.error("Metadata endpoint error:", error);
    createErrorResponse(res, 500, "internal_server_error", "Failed to retrieve metadata");
  }
} 