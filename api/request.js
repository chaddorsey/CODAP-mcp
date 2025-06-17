// Tool request endpoint using Node.js runtime
// Accepts tool requests from CODAP interactive

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
 * Main handler function
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    // Only allow POST method
    if (req.method !== 'POST') {
      createErrorResponse(res, 405, 'method_not_allowed', 'Only POST method is allowed');
      return;
    }
    
    // Validate request body
    if (!req.body) {
      createErrorResponse(res, 400, 'missing_body', 'Request body is required');
      return;
    }
    
    const { sessionCode, requestId, toolName, params = {} } = req.body;
    
    // Validate required fields
    if (!sessionCode) {
      createErrorResponse(res, 400, 'missing_session_code', 'Session code is required');
      return;
    }
    
    if (!isValidSessionCode(sessionCode)) {
      createErrorResponse(res, 400, 'invalid_session_code', 'Session code must be 8 characters (A-Z, 2-7)');
      return;
    }
    
    if (!requestId || typeof requestId !== 'string') {
      createErrorResponse(res, 400, 'missing_request_id', 'Request ID is required');
      return;
    }
    
    if (!toolName || typeof toolName !== 'string') {
      createErrorResponse(res, 400, 'missing_tool_name', 'Tool name is required');
      return;
    }
    
    // For demo purposes, we'll accept the request and queue it
    // In production, this would store in KV or message queue
    const requestData = {
      id: requestId,
      tool: toolName,
      params,
      timestamp: new Date().toISOString(),
      status: 'queued'
    };
    
    console.log(`Tool request queued for session ${sessionCode}:`, requestData);
    
    createSuccessResponse(res, {
      message: 'Tool request queued successfully',
      requestId,
      note: 'Demo version - request not persisted to queue'
    }, 202);
    
  } catch (error) {
    console.error('Tool request error:', error);
    createErrorResponse(res, 500, 'internal_server_error', 'Failed to process tool request');
  }
} 