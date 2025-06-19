// Debug endpoint to inspect queue status
const { getSession, peekQueue, getQueueLength } = require("./kv-utils");

/**
 * Validates session code format
 */
function isValidSessionCode(code) {
  return /^[A-Z2-7]{8}$/.test(code);
}

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
    
    try {
      // Get session info
      const sessionData = await getSession(sessionCode);
      
      // Get queue info
      const queueLength = await getQueueLength(sessionCode);
      const queueContents = await peekQueue(sessionCode);
      
      res.status(200).json({
        sessionCode,
        timestamp: new Date().toISOString(),
        session: {
          exists: !!sessionData,
          data: sessionData
        },
        queue: {
          length: queueLength,
          contents: queueContents
        },
        redis: {
          connected: true, // If we get here, Redis is working
          kvUrl: process.env.KV_REST_API_URL ? 'configured' : 'missing',
          kvToken: process.env.KV_REST_API_TOKEN ? 'configured' : 'missing'
        }
      });
      
    } catch (error) {
      console.error("Debug queue error:", error);
      res.status(500).json({
        error: "debug_error",
        message: error.message,
        stack: error.stack
      });
    }
    
  } catch (error) {
    console.error("Debug queue outer error:", error);
    res.status(500).json({
      error: "internal_server_error",
      message: "Failed to debug queue"
    });
  }
} 