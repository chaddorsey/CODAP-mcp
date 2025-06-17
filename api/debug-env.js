export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Check environment variables (without exposing sensitive data)
  const envCheck = {
    hasRedisUrl: !!process.env.KV_REST_API_URL,
    hasRedisToken: !!process.env.KV_REST_API_TOKEN,
    redisUrlPreview: process.env.KV_REST_API_URL ? 
      process.env.KV_REST_API_URL.substring(0, 20) + '...' : 'NOT_SET',
    nodeVersion: process.version,
    platform: process.platform,
    timestamp: new Date().toISOString(),
    vercelRegion: process.env.VERCEL_REGION || 'unknown'
  };

  res.status(200).json(envCheck);
} 