// SSE stream endpoint using Node.js runtime
// Provides server-sent events for tool request polling

const { getSession, dequeueRequest, getQueueLength } = require("./kv-utils");

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
 * Get and consume the next tool request from the queue
 */
async function getNextToolRequest(code) {
  try {
    const request = await dequeueRequest(code);
    if (request) {
      console.log(`Dequeued tool request for session ${code}:`, request);
    }
    return request;
  } catch (error) {
    console.error("Error getting tool request:", error);
    return null;
  }
}

/**
 * Main handler function for SSE streaming
 */
async function handler(req, res) {
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
    // Use a timeout to ensure fast response
    const sessionValidationPromise = validateSession(sessionCode);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Session validation timeout")), 5000); // 5 second timeout
    });
    
    let sessionValid;
    try {
      sessionValid = await Promise.race([sessionValidationPromise, timeoutPromise]);
    } catch (error) {
      console.error("Session validation failed or timed out:", error);
      res.status(404).json({
        error: "session_validation_failed",
        message: "Session validation failed or timed out"
      });
      return;
    }
    
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
      "Access-Control-Allow-Headers": "Content-Type, x-sso-bypass"
    });
    
    // Helper function to send SSE events with proper format and error handling
    const sendSSEEvent = (eventType, data) => {
      try {
        if (res.destroyed || res.finished) {
          console.log(`SSE connection closed, cannot send ${eventType} event`);
          return false;
        }
        
        // Ensure data is valid before sending
        if (data === undefined || data === null) {
          console.warn(`Attempted to send SSE event ${eventType} with undefined/null data`);
          return false;
        }
        
        res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
        return true;
      } catch (error) {
        console.error(`Failed to send SSE event ${eventType}:`, error);
        return false;
      }
    };
    
    // Send initial connection confirmation
    sendSSEEvent("connected", {
      code: sessionCode,
      message: "SSE connection established",
      timestamp: new Date().toISOString()
    });
    
    console.log(`SSE stream connected for session: ${sessionCode}`);
    
    // Check for pending requests immediately on connection
    const queueLength = await getQueueLength(sessionCode);
    if (queueLength > 0) {
      console.log(`Found ${queueLength} pending requests for session ${sessionCode}`);
    }
    
    // Set up heartbeat to keep connection alive
    const heartbeatInterval = setInterval(() => {
      sendSSEEvent("heartbeat", {
        timestamp: new Date().toISOString()
      });
    }, 30000); // Send heartbeat every 30 seconds
    
    // Set up adaptive polling for requests
    let pollInterval;
    let pollCount = 0;
    const maxFastPolls = 60; // 30 seconds of fast polling (500ms * 60)
    
    const pollFunction = async () => {
      try {
        // Check if session is still valid
        const stillValid = await validateSession(sessionCode);
        if (!stillValid) {
          sendSSEEvent("error", {
            error: "session_expired",
            message: "Session has expired",
            timestamp: new Date().toISOString()
          });
          if (pollInterval) clearInterval(pollInterval);
          clearInterval(heartbeatInterval);
          res.end();
          return;
        }
        
        // Get next tool request from queue (this removes it from the queue)
        const request = await getNextToolRequest(sessionCode);
        
        if (request) {
          sendSSEEvent("tool-request", request);
          console.log(`Sent tool request via SSE for session ${sessionCode}:`, request);
        }
        
        pollCount++;
        
        // Switch to slower polling after fast phase
        if (pollCount === maxFastPolls) {
          console.log(`Switching to slower polling for session ${sessionCode}`);
          clearInterval(pollInterval);
          pollInterval = setInterval(pollFunction, 2000); // 2 second polling
        }
      } catch (error) {
        console.error("SSE polling error:", error);
        sendSSEEvent("error", {
          error: "polling_error",
          message: "Internal server error during polling",
          timestamp: new Date().toISOString()
        });
      }
    };
    
    // Start with fast polling
    pollInterval = setInterval(pollFunction, 500); // Fast polling initially
    
    // Handle client disconnect
    req.on("close", () => {
      console.log(`SSE stream closed for session: ${sessionCode}`);
      if (pollInterval) clearInterval(pollInterval);
      clearInterval(heartbeatInterval);
    });
    
  } catch (error) {
    console.error("SSE stream error:", error);
    res.status(500).json({
      error: "internal_server_error",
      message: "Failed to establish SSE stream"
    });
  }
}

module.exports = handler; 
