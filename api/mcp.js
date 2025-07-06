/**
 * MCP API Endpoint - JSON-RPC 2.0 Compatible
 * Routes MCP requests to the server implementation
 */

// Import the MCP server logic
const mcpServer = require("../server/utils/mcp.js");

/**
 * Main handler function for MCP requests
 */
async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-session-id, authorization");

  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }
    
    // Route to appropriate handler based on method
    if (req.method === "POST") {
      return await mcpServer.POST(req, res);
    } else if (req.method === "GET") {
      return await mcpServer.GET(req, res);
    } else {
      res.status(405).json({
        error: "method_not_allowed",
        message: "Only POST, GET, and OPTIONS methods are allowed"
      });
      return;
    }
    
  } catch (error) {
    console.error("[mcp] API endpoint error:", error);
    res.status(500).json({
      error: "internal_server_error",
      message: "MCP server error",
      details: error.message
    });
  }
}

module.exports = handler; 