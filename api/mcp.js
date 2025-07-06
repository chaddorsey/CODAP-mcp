/**
 * MCP API Endpoint - JSON-RPC 2.0 Compatible
 * Routes MCP requests to the server implementation with proper format conversion
 */

// Import the MCP server logic
const mcpServer = require("../server/utils/mcp.js");

/**
 * Convert Vercel request to Web API Request format
 */
function createWebAPIRequest(req) {
  // Build the full URL
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  const fullUrl = `${protocol}://${host}${req.url}`;
  
  // Create Web API Request object
  const webReq = {
    url: fullUrl,
    method: req.method,
    headers: {
      get: (name) => req.headers[name.toLowerCase()],
      has: (name) => req.headers.hasOwnProperty(name.toLowerCase())
    },
    json: async () => req.body || {},
    text: async () => JSON.stringify(req.body || {})
  };
  
  return webReq;
}

/**
 * Main handler function for MCP requests
 */
async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id, mcp-client-info, mcp-protocol-version, x-mcp-session-id, x-mcp-client-info, x-session-code, session-code");

  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }
    
    // Convert to Web API format
    const webRequest = createWebAPIRequest(req);
    
    // Route to appropriate handler based on method
    let webResponse;
    if (req.method === "POST") {
      webResponse = await mcpServer.POST(webRequest);
    } else if (req.method === "GET") {
      webResponse = await mcpServer.GET(webRequest);
    } else {
      webResponse = await mcpServer.OPTIONS(webRequest);
    }
    
    // Convert Web API Response back to Vercel format
    if (webResponse) {
      // Set status
      res.status(webResponse.status || 200);
      
      // Copy headers from Web API Response headers object
      if (webResponse.headers) {
        // Check if it's a Headers object with forEach method
        if (typeof webResponse.headers.forEach === 'function') {
          webResponse.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });
        } else if (typeof webResponse.headers === 'object') {
          // Plain object headers
          for (const [key, value] of Object.entries(webResponse.headers)) {
            res.setHeader(key, value);
          }
        }
      }
      
      // Send response body
      if (webResponse.status === 204) {
        res.end();
      } else {
        // Get the response text properly
        const responseText = await webResponse.text();
        
        // Parse as JSON if possible, otherwise send as text
        try {
          const jsonData = JSON.parse(responseText);
          res.json(jsonData);
        } catch {
          res.send(responseText);
        }
      }
    } else {
      res.status(204).end();
    }
    
  } catch (error) {
    console.error("[MCP API] Error:", error);
    res.status(500).json({
      error: "internal_server_error",
      message: "MCP server error", 
      details: error.message
    });
  }
}

module.exports = handler; 