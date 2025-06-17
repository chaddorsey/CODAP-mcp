// SSE stream endpoint using Node.js runtime
// Provides server-sent events for tool request polling

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
 * Main handler function for SSE stream
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    // Only allow GET method
    if (req.method !== 'GET') {
      createErrorResponse(res, 405, 'method_not_allowed', 'Only GET method is allowed');
      return;
    }
    
    // Extract session code from query parameters
    const { code } = req.query;
    
    if (!code) {
      createErrorResponse(res, 400, 'missing_session_code', 'Session code is required as query parameter');
      return;
    }
    
    if (!isValidSessionCode(code)) {
      createErrorResponse(res, 400, 'invalid_session_code', 'Session code must be 8 characters (A-Z, 2-7)');
      return;
    }
    
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    
    // Send initial connection event
    res.write('event: connected\\n');
    res.write(`data: {"message":"Connected to session ${code}","timestamp":"${new Date().toISOString()}"}\\n\\n`);
    
    // Send periodic heartbeat events
    const heartbeatInterval = setInterval(() => {
      res.write('event: heartbeat\\n');
      res.write(`data: {"timestamp":"${new Date().toISOString()}"}\\n\\n`);
    }, 30000); // 30 seconds
    
    // For demo purposes, send a sample tool request after 10 seconds
    const demoTimeout = setTimeout(() => {
      res.write('event: tool-request\\n');
      res.write(`data: {"id":"demo-req-${Date.now()}","tool":"sample_tool","args":{"message":"Demo request for session ${code}"}}\\n\\n`);
    }, 10000);
    
    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(heartbeatInterval);
      clearTimeout(demoTimeout);
      res.end();
    });
    
    // Keep connection alive for up to 10 minutes
    setTimeout(() => {
      clearInterval(heartbeatInterval);
      clearTimeout(demoTimeout);
      res.write('event: timeout\\n');
      res.write(`data: {"message":"Session timeout","timestamp":"${new Date().toISOString()}"}\\n\\n`);
      res.end();
    }, 600000); // 10 minutes
    
  } catch (error) {
    console.error('SSE stream error:', error);
    if (!res.headersSent) {
      createErrorResponse(res, 500, 'internal_server_error', 'Failed to establish SSE stream');
    }
  }
} 