export default function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    // Generate a simple session code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    res.status(201).json({
      code: code,
      ttl: 600,
      expiresAt: new Date(Date.now() + 600000).toISOString(),
      message: 'Node.js endpoint working!'
    });
    return;
  }

  res.status(200).json({
    method: req.method,
    url: req.url,
    message: 'Node.js API endpoint working!'
  });
} 