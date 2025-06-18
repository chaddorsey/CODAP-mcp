const { Redis } = require("@upstash/redis");

// Log Redis environment variable status
console.log("[kv-utils] KV_REST_API_URL:", process.env.KV_REST_API_URL ? "set" : "NOT SET");
console.log("[kv-utils] KV_REST_API_TOKEN:", process.env.KV_REST_API_TOKEN ? "set" : "NOT SET");

// Initialize Redis client using environment variables
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Session TTL in seconds (10 minutes)
const SESSION_TTL = 600;

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
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error("[kv-utils] Redis getSession error:", err);
    throw err;
  }
}

/**
 * Store request data in Redis with TTL
 * @param {string} code - Session code
 * @param {Object} requestData - Request data to store
 */
async function setRequest(code, requestData) {
  const key = `req:${code}`;
  await redis.setex(key, SESSION_TTL, JSON.stringify(requestData));
}

/**
 * Retrieve request data from Redis
 * @param {string} code - Session code
 * @returns {Object|null} Request data or null if not found
 */
async function getRequest(code) {
  const key = `req:${code}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
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
  return data ? JSON.parse(data) : null;
}

/**
 * Delete all data for a session
 * @param {string} code - Session code
 */
async function deleteSession(code) {
  await Promise.all([
    redis.del(`session:${code}`),
    redis.del(`req:${code}`),
    redis.del(`res:${code}`)
  ]);
}

module.exports = {
  setSession,
  getSession,
  setRequest,
  getRequest,
  setResponse,
  getResponse,
  deleteSession,
  SESSION_TTL
}; 
