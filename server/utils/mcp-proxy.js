#!/usr/bin/env node

/**
 * Simple MCP Proxy for Claude Desktop
 * This replaces mcp-remote with a simpler, more reliable implementation
 * that doesn't have TransformStream compatibility issues.
 */

import { createServer } from "http";
import { spawn } from "child_process";
import { readFileSync } from "fs";

const SERVER_URL = process.argv[2] || "https://codap-mcp-stable.vercel.app/api/mcp";
const DEBUG = process.env.DEBUG === "1";

function log(message) {
  if (DEBUG) {
    console.error(`[mcp-proxy] ${message}`);
  }
}

/**
 * Make HTTP request to MCP server
 */
async function makeRequest(method, params, headers = {}) {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: Math.floor(Math.random() * 1000000),
    method,
    params
  });

  const response = await fetch(SERVER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "mcp-session-id": process.env.MCP_SESSION_ID || "claude-desktop-session",
      ...headers
    },
    body
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Handle STDIO communication with Claude Desktop
 */
function handleStdio() {
  log("Starting MCP proxy for Claude Desktop");
  log(`Target server: ${SERVER_URL}`);

  // Read from stdin line by line
  let buffer = "";
  
  process.stdin.on("data", async (chunk) => {
    buffer += chunk.toString();
    
    // Process complete JSON-RPC messages
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // Keep incomplete line in buffer
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line.trim());
          log(`Received: ${message.method || "response"}`);
          
          // Forward to HTTP MCP server
          const response = await makeRequest(message.method, message.params);
          
          // Send response back to Claude Desktop
          process.stdout.write(JSON.stringify(response) + "\n");
          log(`Sent response for: ${message.method || "unknown"}`);
          
        } catch (error) {
          log(`Error processing message: ${error.message}`);
          
          // Send error response
          const errorResponse = {
            jsonrpc: "2.0",
            id: null,
            error: {
              code: -32603,
              message: "Internal error",
              data: error.message
            }
          };
          
          process.stdout.write(JSON.stringify(errorResponse) + "\n");
        }
      }
    }
  });

  process.stdin.on("end", () => {
    log("stdin ended, shutting down");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    log("Received SIGTERM, shutting down");
    process.exit(0);
  });

  process.on("SIGINT", () => {
    log("Received SIGINT, shutting down");
    process.exit(0);
  });
}

// Start the proxy
handleStdio(); 
