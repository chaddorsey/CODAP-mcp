const { getSession } = require("server/utils/kv-utils");

/**
 * Validates session code format
 * @param {string} code - Session code to validate
 * @returns {boolean} True if valid format
 */
function isValidSessionCode(code) {
  return typeof code === "string" && /^[A-Z2-7]{8}$/.test(code);
}

/**
 * Creates a standardized error response
 * @param {Object} res - Response object
 * @param {number} status - HTTP status code
 * @param {string} error - Error type
 * @param {string} message - Error message
 * @param {string} code - Error code (optional)
 */
function createErrorResponse(res, status, error, message, code) {
  res.status(status).json({
    error,
    message,
    ...(code && { code })
  });
}

/**
 * Session validation middleware
 * Validates session code from request and attaches session data to request
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function (optional for direct use)
 * @returns {Promise<Object|void>} Session data if valid, or sends error response
 */
async function validateSession(req, res, next = null) {
  try {
    // Extract session code from URL path or query params
    const code = req.query.code || req.query.sessionCode || req.params.code;
    
    // Validate session code format
    if (!code || !isValidSessionCode(code)) {
      createErrorResponse(res, 400, "invalid_session_code", "Session code must be 8-character Base32 format");
      return null;
    }
    
    // Validate session exists and is not expired
    const session = await getSession(code);
    if (!session) {
      createErrorResponse(res, 404, "session_not_found", "Session not found or expired");
      return null;
    }
    
    // Check if session is expired
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    if (now > expiresAt) {
      createErrorResponse(res, 410, "session_expired", "Session has expired");
      return null;
    }
    
    // Attach session data to request for use by handlers
    req.session = session;
    req.sessionCode = code;
    
    // Call next middleware if provided (Express-style)
    if (next && typeof next === "function") {
      next();
    }
    
    return session;
    
  } catch (error) {
    console.error("Session validation error:", error);
    createErrorResponse(res, 500, "internal_server_error", "Failed to validate session");
    return null;
  }
}

/**
 * Higher-order function to wrap API handlers with session validation
 * @param {Function} handler - The API handler function to wrap
 * @returns {Function} Wrapped handler with session validation
 */
function withSessionValidation(handler) {
  return async function(req, res) {
    const session = await validateSession(req, res);
    if (!session) {
      // Error response already sent by validateSession
      return;
    }
    
    // Call the original handler with validated session
    return handler(req, res);
  };
}

module.exports = {
  validateSession,
  withSessionValidation,
  isValidSessionCode,
  createErrorResponse
}; 
