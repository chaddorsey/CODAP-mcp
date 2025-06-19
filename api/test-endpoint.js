// Simple test endpoint to verify deployment
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  res.status(200).json({
    message: "TEST ENDPOINT WORKING",
    timestamp: new Date().toISOString(),
    method: req.method,
    deployment: "LATEST",
    note: "This endpoint was created to test deployment issues"
  });
} 