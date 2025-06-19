// SSE stream endpoint using Node.js runtime
// Provides server-sent events for tool request polling

import { kv } from "@vercel/kv";

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
    const sessionData = await kv.get(`session:${code}`);
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
 * Retrieve and clear tool requests from the queue
 */
async function getToolRequests(code) {
  try {
    const queueKey = `req:${code}`;
    
    // Get all requests in the queue
    const requests = await kv.lrange(queueKey, 0, -1);
    
    if (requests.length > 0) {
      // Clear the queue after retrieving requests
      await kv.del(queueKey);
      
      // Parse JSON strings back to objects
      return requests.map(req => {
        try {
          return typeof req === "string" ? JSON.parse(req) : req;
        } catch (error) {
          console.error("Failed to parse request:", req, error);
          return null;
        }
      }).filter(req => req !== null);
    }
    
    return [];
  } catch (error) {
    console.error("Error retrieving tool requests:", error);
    return [];
  }
}

/**
 * Main handler function for SSE stream
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
      createErrorResponse(res, 405, "method_not_allowed", "Only GET method is allowed");
      return;
    }
    
    // Extract session code from query parameters
    const { code } = req.query;
    
    if (!code) {
      createErrorResponse(res, 400, "missing_session_code", "Session code is required as query parameter");
      return;
    }
    
    if (!isValidSessionCode(code)) {
      createErrorResponse(res, 400, "invalid_session_code", "Session code must be 8 characters (A-Z, 2-7)");
      return;
    }
    
    // Validate session exists and is not expired
    const sessionValid = await validateSession(code);
    if (!sessionValid) {
      createErrorResponse(res, 404, "session_not_found", "Session not found or expired");
      return;
    }
    
    // Set SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    
    // Send initial connection event
    res.write("event: connected\n");
    res.write(`data: {"message":"Connected to session ${code}","timestamp":"${new Date().toISOString()}"}\n\n`);
    
    // Send periodic heartbeat events
    const heartbeatInterval = setInterval(() => {
      res.write("event: heartbeat\n");
      res.write(`data: {"timestamp":"${new Date().toISOString()}"}\n\n`);
    }, 30000); // 30 seconds
    
    // Poll for tool requests every second
    const pollingInterval = setInterval(async () => {
      try {
        const requests = await getToolRequests(code);
        
        for (const toolRequest of requests) {
          res.write("event: tool-request\n");
          res.write(`data: ${JSON.stringify(toolRequest)}\n\n`);
        }
      } catch (error) {
        console.error("Error polling for requests:", error);
        res.write("event: error\n");
        res.write(`data: {"error":"polling_error","message":"Error retrieving tool requests"}\n\n`);
      }
    }, 1000); // 1 second polling
    
    // Clean up on client disconnect
    req.on("close", () => {
      clearInterval(heartbeatInterval);
      clearInterval(pollingInterval);
      res.end();
    });
    
    // Keep connection alive for up to 10 minutes
    setTimeout(() => {
      clearInterval(heartbeatInterval);
      clearInterval(pollingInterval);
      res.write("event: timeout\n");
      res.write(`data: {"message":"Session timeout","timestamp":"${new Date().toISOString()}"}\n\n`);
      res.end();
    }, 600000); // 10 minutes
    
  } catch (error) {
    console.error("SSE stream error:", error);
    if (!res.headersSent) {
      createErrorResponse(res, 500, "internal_server_error", "Failed to establish SSE stream");
    }
  }
} 
