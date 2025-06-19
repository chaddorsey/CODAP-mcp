// Simple deployment verification endpoint
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  res.status(200).json({
    message: "🚀 DEPLOYMENT VERIFICATION SUCCESSFUL! 🚀",
    timestamp: new Date().toISOString(),
    deployment: "ACTIVE",
    endpoint: "/api/debug-deployment",
    method: req.method,
    note: "This endpoint confirms our deployments are working"
  });
} 