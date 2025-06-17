export default function handler(req, res) {
  res.status(404).json({ 
    error: "Not Found",
    message: "This deployment only serves API endpoints. Available endpoints: /api/sessions, /api/request, /api/response, /api/stream",
    timestamp: new Date().toISOString()
  });
} 
