#!/usr/bin/env node

// Claude Desktop MCP Extension Relay
// Forwards all JSON-RPC requests to the remote CODAP MCP server

const https = require("https");
const { URL } = require("url");

const REMOTE_MCP_URL = "https://codap-mcp-stable.vercel.app/api/mcp";
const REQUEST_TIMEOUT_MS = 10000;

process.stdin.setEncoding("utf8");
let inputBuffer = "";

console.error("[CODAP MCP Extension] Starting relay to remote MCP server:", REMOTE_MCP_URL);

process.stdin.on("data", (data) => {
  inputBuffer += data;
  const lines = inputBuffer.split("\n");
  inputBuffer = lines.pop() || "";
  lines.forEach(async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let request;
    try {
      request = JSON.parse(trimmed);
    } catch (err) {
      console.error("[CODAP MCP Extension] JSON parse error:", err.message, "Raw:", trimmed);
      process.stdout.write(JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error: " + err.message }
      }) + "\n");
      return;
    }
    // Extract session code from params or headers (Claude convention)
    let sessionCode = null;
    if (request && request.params && typeof request.params === "object") {
      sessionCode = request.params.code || request.params.sessionCode || null;
    }
    // Fallback: check for sessionCode in root (rare)
    if (!sessionCode && request && request.sessionCode) sessionCode = request.sessionCode;
    // Build remote URL
    const url = new URL(REMOTE_MCP_URL);
    if (sessionCode) url.searchParams.set("code", sessionCode);
    // Forward request
    forwardToRemote(url, request)
      .then((response) => {
        process.stdout.write(JSON.stringify(response) + "\n");
      })
      .catch((err) => {
        console.error("[CODAP MCP Extension] Forwarding error:", err.message);
        process.stdout.write(JSON.stringify({
          jsonrpc: "2.0",
          id: request && request.id || null,
          error: { code: -32099, message: "Relay error: " + err.message }
        }) + "\n");
      });
  });
});

async function forwardToRemote(url, request) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(request);
    const options = {
      method: "POST",
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data)
      },
      timeout: REQUEST_TIMEOUT_MS
    };
    const req = https.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => { responseData += chunk; });
      res.on("end", () => {
        if (!responseData.trim()) {
          return reject(new Error("Empty response from remote MCP server"));
        }
        try {
          const json = JSON.parse(responseData);
          resolve(json);
        } catch (err) {
          reject(new Error("Invalid JSON from remote MCP server: " + err.message));
        }
      });
    });
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out after " + REQUEST_TIMEOUT_MS + "ms"));
    });
    req.on("error", (err) => {
      reject(err);
    });
    req.write(data);
    req.end();
  });
}

process.on("SIGINT", () => {
  console.error("[CODAP MCP Extension] Shutting down...");
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.error("[CODAP MCP Extension] Shutting down...");
  process.exit(0);
});
