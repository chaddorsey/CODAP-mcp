// SSE stream endpoint using Node.js runtime
// Provides server-sent events for tool request polling

const { getSession, getRequest } = require("./kv-utils");

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
 * Get pending tool requests for a session using kv-utils
 */
async function getToolRequests(code) {
  try {
    const request = await getRequest(code);
    return request ? [request] : [];
  } catch (error) {
    console.error("Error getting tool requests:", error);
    return [];
  }
}

/**
 * Main handler function for SSE streaming
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }
    
    // Only allow GET method
    if (req.method !== "GET") {
      res.status(405).json({
        error: "method_not_allowed",
        message: "Only GET method is allowed"
      });
      return;
    }
    
    const { sessionCode } = req.query;
    
    // Validate session code
    if (!sessionCode) {
      res.status(400).json({
        error: "missing_session_code",
        message: "Session code is required"
      });
      return;
    }
    
    if (!isValidSessionCode(sessionCode)) {
      res.status(400).json({
        error: "invalid_session_code",
        message: "Session code must be 8 characters (A-Z, 2-7)"
      });
      return;
    }
    
    // Validate session exists and is not expired
    const sessionValid = await validateSession(sessionCode);
    if (!sessionValid) {
      res.status(404).json({
        error: "session_not_found",
        message: "Session not found or expired"
      });
      return;
    }
    
    // Set SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    
    // Send initial connection confirmation
    res.write(`data: ${JSON.stringify({
      type: "connection",
      message: "Connected to tool request stream",
      sessionCode,
      timestamp: new Date().toISOString()
    })}\n\n`);
    
    console.log(`SSE stream connected for session: ${sessionCode}`);
    
    // Set up interval to poll for requests
    const pollInterval = setInterval(async () => {
      try {
        // Check if session is still valid
        const stillValid = await validateSession(sessionCode);
        if (!stillValid) {
          res.write(`data: ${JSON.stringify({
            type: "session_expired",
            message: "Session has expired",
            timestamp: new Date().toISOString()
          })}\n\n`);
          clearInterval(pollInterval);
          res.end();
          return;
        }
        
        // Poll for tool requests from KV storage
        const requests = await getToolRequests(sessionCode);
        
        if (requests.length > 0) {
          for (const request of requests) {
            res.write(`data: ${JSON.stringify({
              type: "tool_request",
              data: request,
              timestamp: new Date().toISOString()
            })}\n\n`);
            
            console.log(`Sent tool request via SSE for session ${sessionCode}:`, request);
          }
        }
      } catch (error) {
        console.error("SSE polling error:", error);
        res.write(`data: ${JSON.stringify({
          type: "error",
          message: "Internal server error during polling",
          timestamp: new Date().toISOString()
        })}\n\n`);
      }
    }, 1000); // Poll every 1 second
    
    // Handle client disconnect
    req.on("close", () => {
      console.log(`SSE stream closed for session: ${sessionCode}`);
      clearInterval(pollInterval);
    });
    
  } catch (error) {
    console.error("SSE stream error:", error);
    res.status(500).json({
      error: "internal_server_error",
      message: "Failed to establish SSE stream"
    });
  }
} 
