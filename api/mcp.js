/**
 * MCP Server Endpoint - JSON-RPC 2.0 Compatible
 * PBI 18 - Task 18-5: Simplified MCP implementation for Vercel
 * 
 * This endpoint provides MCP protocol compliance using manual JSON-RPC 2.0 handling
 * instead of the full @modelcontextprotocol/sdk for better Vercel compatibility.
 */

const { kv } = require('@vercel/kv');

// Import existing tool registry and utilities
const { CODAP_TOOLS } = require('./tool-registry.js');
const { queueToolRequest, getToolResponse, setToolResponse } = require('./kv-utils.js');
const { DirectToolExecutor } = require('./mcp-tool-executor.js');

// Session management utilities
const SESSION_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Generate legacy 8-character session code for backward compatibility
 */
function generateLegacySessionCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Session mapping between MCP Session IDs and legacy codes
 */
class SessionManager {
  async createSession(mcpSessionId) {
    const legacyCode = generateLegacySessionCode();
    const expiresAt = Date.now() + SESSION_TTL;
    
    const sessionData = {
      mcpSessionId,
      legacyCode,
      createdAt: Date.now(),
      expiresAt,
      initialized: false
    };
    
    // Store bidirectional mapping
    await Promise.all([
      kv.set(`mcp:${mcpSessionId}`, sessionData, { ex: Math.floor(SESSION_TTL / 1000) }),
      kv.set(`legacy:${legacyCode}`, sessionData, { ex: Math.floor(SESSION_TTL / 1000) })
    ]);
    
    return sessionData;
  }
  
  async getSessionByMCP(mcpSessionId) {
    return await kv.get(`mcp:${mcpSessionId}`);
  }
  
  async updateSession(mcpSessionId, updatedData) {
    const session = await this.getSessionByMCP(mcpSessionId);
    if (session) {
      const mergedSession = { ...session, ...updatedData };
      const ttl = Math.floor((mergedSession.expiresAt - Date.now()) / 1000);
      
      if (ttl > 0) {
        await Promise.all([
          kv.set(`mcp:${mcpSessionId}`, mergedSession, { ex: ttl }),
          kv.set(`legacy:${session.legacyCode}`, mergedSession, { ex: ttl })
        ]);
      }
    }
  }
}

/**
 * MCP JSON-RPC 2.0 Protocol Handler
 */
class MCPProtocolHandler {
  constructor() {
    this.sessionManager = new SessionManager();
  }
  
  async handleRequest(request, sessionId) {
    const { jsonrpc, method, params, id } = request;
    
    // Validate JSON-RPC 2.0 format
    if (jsonrpc !== "2.0") {
      return this.createErrorResponse(id, -32600, "Invalid Request");
    }
    
    try {
      switch (method) {
        case 'initialize':
          return await this.handleInitialize(params, id, sessionId);
        case 'capabilities':
          return await this.handleCapabilities(params, id, sessionId);
        case 'tools/list':
          return await this.handleToolsList(params, id, sessionId);
        case 'tools/call':
          return await this.handleToolCall(params, id, sessionId);
        default:
          return this.createErrorResponse(id, -32601, "Method not found");
      }
    } catch (error) {
      console.error(`MCP method ${method} error:`, error);
      return this.createErrorResponse(id, -32603, "Internal error", { error: error.message });
    }
  }
  
  async handleInitialize(params, id, sessionId) {
    const { protocolVersion, capabilities, clientInfo } = params;
    
    // Create or get session
    let session = await this.sessionManager.getSessionByMCP(sessionId);
    if (!session) {
      session = await this.sessionManager.createSession(sessionId);
    }
    
    // Mark session as initialized
    await this.sessionManager.updateSession(sessionId, { 
      initialized: true,
      protocolVersion,
      clientInfo 
    });
    
    return {
      jsonrpc: "2.0",
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {
            listChanged: false
          },
          resources: {},
          prompts: {}
        },
        serverInfo: {
          name: "codap-mcp-server",
          version: "1.0.0"
        },
        sessionInfo: {
          sessionId: sessionId,
          legacyCode: session.legacyCode,
          expiresAt: session.expiresAt
        }
      },
      id
    };
  }
  
  async handleCapabilities(params, id, sessionId) {
    const session = await this.sessionManager.getSessionByMCP(sessionId);
    if (!session || !session.initialized) {
      return this.createErrorResponse(id, -32002, "Session not initialized");
    }
    
    return {
      jsonrpc: "2.0",
      result: {
        capabilities: {
          tools: {
            listChanged: false
          },
          resources: {},
          prompts: {}
        }
      },
      id
    };
  }
  
  async handleToolsList(params, id, sessionId) {
    const session = await this.sessionManager.getSessionByMCP(sessionId);
    if (!session || !session.initialized) {
      return this.createErrorResponse(id, -32002, "Session not initialized");
    }
    
    const tools = CODAP_TOOLS.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.parameters
    }));
    
    return {
      jsonrpc: "2.0",
      result: {
        tools: tools
      },
      id
    };
  }
  
  async handleToolCall(params, id, sessionId) {
    const session = await this.sessionManager.getSessionByMCP(sessionId);
    if (!session || !session.initialized) {
      return this.createErrorResponse(id, -32002, "Session not initialized");
    }
    
    const { name: toolName, arguments: toolArgs } = params;
    
    // Validate tool exists
    const tool = CODAP_TOOLS.find(t => t.name === toolName);
    if (!tool) {
      return this.createErrorResponse(id, -32602, `Tool '${toolName}' not found`);
    }
    
    try {
      // Check if session has active browser worker
      const hasBrowserWorker = await this.checkBrowserWorkerConnection(sessionId, session.legacyCode);
      
      if (hasBrowserWorker) {
        console.log(`[MCP] Using browser worker mode for session ${session.legacyCode}`);
        return await this.executeBrowserWorkerTool(params, id, sessionId, session);
      } else {
        console.log(`[MCP] Using direct execution mode for session ${sessionId}`);
        return await this.executeDirectTool(params, id, sessionId, session);
      }
      
    } catch (error) {
      console.error(`[MCP] Tool execution failed: ${toolName} - ${error.message}`);
      return this.createErrorResponse(id, -32603, `Tool execution failed: ${error.message}`);
    }
  }
  
  /**
   * Check if session has an active browser worker connection
   * Simplified version to avoid timeouts - assume no browser worker for now
   */
  async checkBrowserWorkerConnection(sessionId, legacyCode) {
    try {
      // For now, always return false to force direct execution mode
      // This eliminates potential KV timeout issues during debugging
      console.log(`[MCP] Checking browser worker for session ${legacyCode} - forcing direct mode`);
      return false;
      
    } catch (error) {
      console.error(`[MCP] Error checking browser worker connection: ${error.message}`);
      return false;
    }
  }

  /**
   * Execute tool via browser worker (existing method)
   */
  async executeBrowserWorkerTool(params, id, sessionId, session) {
    const { name: toolName, arguments: toolArgs } = params;
    
    // Generate request ID for tracking
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Transform MCP request to internal format
    const internalRequest = {
      sessionCode: session.legacyCode,
      tool: toolName,
      arguments: toolArgs,
      requestId: requestId,
      timestamp: Date.now(),
      mcpSessionId: sessionId
    };
    
    try {
      // Queue request using existing system
      console.log(`[MCP] Queueing tool execution: ${toolName} for session ${session.legacyCode}`);
      await queueToolRequest(internalRequest);
      
      // Wait for browser worker response
      const startTime = Date.now();
      const result = await this.waitForResponse(requestId, internalRequest);
      const executionTime = Date.now() - startTime;
      
      // Return MCP-compliant response
      return {
        jsonrpc: "2.0",
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                result: result,
                toolName: toolName,
                executionTime: `${executionTime}ms`,
                sessionCode: session.legacyCode,
                executionMode: "browser-worker"
              }, null, 2)
            }
          ]
        },
        id
      };
      
    } catch (error) {
      console.error(`[MCP] Browser worker tool execution failed: ${toolName} - ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute tool directly (server-side)
   */
  async executeDirectTool(params, id, sessionId, session) {
    const { name: toolName, arguments: toolArgs } = params;
    
    try {
      const startTime = Date.now();
      const executor = new DirectToolExecutor(sessionId);
      const result = await executor.executeTool(toolName, toolArgs);
      const executionTime = Date.now() - startTime;
      
      console.log(`[MCP] Direct tool execution completed: ${toolName} in ${executionTime}ms`);
      
      // Return MCP-compliant response
      return {
        jsonrpc: "2.0",
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                result: result,
                toolName: toolName,
                executionTime: `${executionTime}ms`,
                sessionId: sessionId,
                executionMode: "direct-server"
              }, null, 2)
            }
          ]
        },
        id
      };
      
    } catch (error) {
      console.error(`[MCP] Direct tool execution failed: ${toolName} - ${error.message}`);
      throw error;
    }
  }

  async waitForResponse(requestId, internalRequest, timeout = 30000) {
    const startTime = Date.now();
    const pollInterval = 500; // Poll every 500ms
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await getToolResponse(requestId);
        if (response) {
          console.log(`[MCP] Response received for ${requestId}`);
          return response;
        }
      } catch (error) {
        console.error(`[MCP] Error checking response for ${requestId}:`, error);
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error(`Tool execution timeout after ${timeout}ms`);
  }
  
  createErrorResponse(id, code, message, data = null) {
    const response = {
      jsonrpc: "2.0",
      error: {
        code,
        message
      },
      id
    };
    
    if (data) {
      response.error.data = data;
    }
    
    return response;
  }
}

/**
 * Handle POST requests - MCP JSON-RPC messages
 */
async function POST(req) {
  try {
    const body = await req.json();
    
    // Generate session ID from headers or create new one
    const sessionId = req.headers.get('mcp-session-id') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const handler = new MCPProtocolHandler();
    const response = await handler.handleRequest(body, sessionId);
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'mcp-session-id': sessionId
      }
    });
    
  } catch (error) {
    console.error('MCP Server Error:', error);
    
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal server error",
        data: { error: error.message }
      },
      id: null
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle GET requests - Health check
 */
async function GET(req) {
  return new Response(JSON.stringify({
    service: "CODAP MCP Server",
    status: "operational",
    version: "1.0.0",
    protocol: "JSON-RPC 2.0",
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Handle OPTIONS requests - CORS
 */
async function OPTIONS(req) {
  return new Response('', {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, mcp-session-id'
    }
  });
}

// Export functions for Vercel serverless
module.exports = {
  POST,
  GET,
  OPTIONS
};