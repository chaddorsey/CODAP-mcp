const { Redis } = require("@upstash/redis");

// Initialize Redis client using environment variables
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Session TTL in seconds (10 minutes)
const SESSION_TTL = 600;

/**
 * Helper function to safely parse data from Redis
 */
function safeParseRedisData(data) {
  if (!data) return null;
  if (typeof data === "object") {
    return data; // Already parsed
  }
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch (err) {
      console.error("[kv-utils] JSON.parse error:", err, "Raw data:", data);
      return null;
    }
  }
  console.error("[kv-utils] Unexpected Redis data type:", typeof data, data);
  return null;
}

/**
 * Store session data in Redis with TTL
 * @param {string} code - Session code
 * @param {Object} sessionData - Session data to store
 */
async function setSession(code, sessionData) {
  const key = `session:${code}`;
  await redis.setex(key, SESSION_TTL, JSON.stringify(sessionData));
}

/**
 * Retrieve session data from Redis
 * @param {string} code - Session code
 * @returns {Object|null} Session data or null if not found
 */
async function getSession(code) {
  const key = `session:${code}`;
  try {
    const data = await redis.get(key);
    return safeParseRedisData(data);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[kv-utils] Redis getSession error:", err);
    }
    throw err;
  }
}

/**
 * Add request to the job queue for a session
 * @param {string} code - Session code
 * @param {Object} requestData - Request data to queue
 */
async function enqueueRequest(code, requestData) {
  const queueKey = `queue:${code}`;
  const requestWithMetadata = {
    ...requestData,
    timestamp: new Date().toISOString(),
    status: "queued"
  };
  
  // Add to queue (list) and set TTL
  await redis.lpush(queueKey, JSON.stringify(requestWithMetadata));
  await redis.expire(queueKey, SESSION_TTL);
}

/**
 * Get and remove the next request from the queue
 * @param {string} code - Session code
 * @returns {Object|null} Request data or null if queue is empty
 */
async function dequeueRequest(code) {
  const queueKey = `queue:${code}`;
  const data = await redis.rpop(queueKey);
  return safeParseRedisData(data);
}

/**
 * Get all pending requests without removing them (for debugging)
 * @param {string} code - Session code
 * @returns {Array} Array of pending requests
 */
async function peekQueue(code) {
  const queueKey = `queue:${code}`;
  const data = await redis.lrange(queueKey, 0, -1);
  if (!Array.isArray(data)) return [];
  
  return data.map(item => safeParseRedisData(item)).filter(item => item !== null);
}

/**
 * Get queue length
 * @param {string} code - Session code
 * @returns {number} Number of pending requests
 */
async function getQueueLength(code) {
  const queueKey = `queue:${code}`;
  return await redis.llen(queueKey);
}

// Legacy functions for backward compatibility
/**
 * @deprecated Use enqueueRequest instead
 */
async function setRequest(code, requestData) {
  return enqueueRequest(code, requestData);
}

/**
 * @deprecated Use dequeueRequest instead
 */
async function getRequest(code) {
  return dequeueRequest(code);
}

/**
 * Store response data in Redis with TTL
 * @param {string} code - Session code
 * @param {Object} responseData - Response data to store
 */
async function setResponse(code, responseData) {
  const key = `res:${code}`;
  await redis.setex(key, SESSION_TTL, JSON.stringify(responseData));
}

/**
 * Retrieve response data from Redis
 * @param {string} code - Session code
 * @returns {Object|null} Response data or null if not found
 */
async function getResponse(code) {
  const key = `res:${code}`;
  const data = await redis.get(key);
  return safeParseRedisData(data);
}

/**
 * Queue a tool request for processing
 * @param {Object} toolRequest - Tool request with sessionCode, tool, arguments, requestId
 */
async function queueToolRequest(toolRequest) {
  const { sessionCode, requestId } = toolRequest;
  
  // Add to session queue
  await enqueueRequest(sessionCode, toolRequest);
  
  // Also store by requestId for response lookup
  const requestKey = `toolreq:${requestId}`;
  await redis.setex(requestKey, SESSION_TTL, JSON.stringify(toolRequest));
  
  console.log(`[kv-utils] Queued tool request: ${toolRequest.tool} (${requestId})`);
}

/**
 * Get tool response by request ID
 * @param {string} requestId - Request ID
 * @returns {Object|null} Tool response or null if not found
 */
async function getToolResponse(requestId) {
  const responseKey = `toolres:${requestId}`;
  const data = await redis.get(responseKey);
  return safeParseRedisData(data);
}

/**
 * Store tool response by request ID
 * @param {string} requestId - Request ID
 * @param {Object} response - Tool response data
 */
async function setToolResponse(requestId, response) {
  const responseKey = `toolres:${requestId}`;
  await redis.setex(responseKey, SESSION_TTL, JSON.stringify(response));
  console.log(`[kv-utils] Stored tool response for request: ${requestId}`);
}

/**
 * Delete all data for a session
 * @param {string} code - Session code
 */
async function deleteSession(code) {
  await Promise.all([
    redis.del(`session:${code}`),
    redis.del(`queue:${code}`),
    redis.del(`res:${code}`)
  ]);
}

module.exports = {
  setSession,
  getSession,
  enqueueRequest,
  dequeueRequest,
  peekQueue,
  getQueueLength,
  setRequest, // Legacy
  getRequest, // Legacy
  setResponse,
  getResponse,
  queueToolRequest,
  getToolResponse,
  setToolResponse,
  deleteSession,
  SESSION_TTL
}; 
