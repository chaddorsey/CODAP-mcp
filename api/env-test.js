/**
 * Simple endpoint to check environment variables
 */
module.exports = function handler(req, res) {
  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;
  
  res.status(200).json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    variables: {
      hasRedisUrl: !!redisUrl,
      hasRedisToken: !!redisToken,
      redisUrlFormat: redisUrl ? redisUrl.substring(0, 30) + '...' : 'not set',
      redisUrlProtocol: redisUrl ? (redisUrl.startsWith('redis://') ? 'redis://' : redisUrl.startsWith('rediss://') ? 'rediss://' : 'unknown') : 'none',
    }
  });
}; 