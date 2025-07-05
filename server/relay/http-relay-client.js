#!/usr/bin/env node

const https = require("https");

// Get configuration from environment variables
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "https://codap-mcp-stable.vercel.app/api/mcp";
const MCP_SESSION_ID = process.env.MCP_SESSION_ID || "claude-desktop-session";

console.error(`CODAP MCP HTTP Relay Client starting...`);
console.error(`Target URL: ${MCP_SERVER_URL}`);
console.error(`Session ID: ${MCP_SESSION_ID}`);

// Set up stdin to read JSON-RPC messages
process.stdin.setEncoding("utf8");

// Buffer for incoming data
let inputBuffer = "";

process.stdin.on("data", (data) => {
  inputBuffer += data;
  
  // Process complete lines
  const lines = inputBuffer.split("\n");
  inputBuffer = lines.pop() || ""; // Keep incomplete line in buffer
  
  // Process each complete line
  lines.forEach(async (line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;
    
    try {
      // Parse the JSON-RPC message
      const message = JSON.parse(trimmedLine);
      
      // Forward to the HTTP MCP server
      const response = await forwardToHTTPServer(message);
      
      // Send response back to Claude
      if (response) {
        process.stdout.write(JSON.stringify(response) + "\n");
      }
    } catch (error) {
      console.error(`Error processing message: ${error.message}`);
      
      // Send error response back to Claude
      const errorResponse = {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32603,
          message: `HTTP Relay Error: ${error.message}`
        }
      };
      
      process.stdout.write(JSON.stringify(errorResponse) + "\n");
    }
  });
});

// Function to forward messages to the HTTP MCP server
async function forwardToHTTPServer(message) {
  return new Promise((resolve, reject) => {
    const url = new URL(MCP_SERVER_URL);
    
    // Add session code as query parameter for session validation
    url.searchParams.set("code", MCP_SESSION_ID);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = "";
      
      res.on("data", (chunk) => {
        responseData += chunk;
      });
      
      res.on("end", () => {
        if (res.statusCode !== 200) {
          console.error(`HTTP Error ${res.statusCode}: ${responseData}`);
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          return;
        }
        
        if (!responseData.trim()) {
          console.error(`Empty response from server`);
          reject(new Error("Empty response from server"));
          return;
        }
        
        try {
          const jsonResponse = JSON.parse(responseData);
          resolve(jsonResponse);
        } catch (parseError) {
          console.error(`JSON Parse Error: ${parseError.message}`);
          console.error(`Raw response: ${responseData}`);
          reject(new Error(`Invalid JSON response from server: ${parseError.message}`));
        }
      });
      
      res.on("error", (error) => {
        reject(new Error(`Response error: ${error.message}`));
      });
    });
    
    req.on("error", (error) => {
      reject(new Error(`Request error: ${error.message}`));
    });
    
    // Send the message
    req.write(JSON.stringify(message));
    req.end();
  });
}

// Handle process termination
process.on("SIGINT", () => {
  console.error("CODAP MCP HTTP Relay Client shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.error("CODAP MCP HTTP Relay Client shutting down...");
  process.exit(0);
});

console.error("CODAP MCP HTTP Relay Client ready for connections"); 
