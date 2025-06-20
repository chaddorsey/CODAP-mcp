/**
 * MCP Server Endpoint - JSON-RPC 2.0 + StreamableHTTP Transport
 * PBI 18 - Task 18-2: Core MCP server implementation
 * 
 * This endpoint provides full MCP protocol compliance using the @modelcontextprotocol/sdk
 * with StreamableHTTP transport, while maintaining backward compatibility with the
 * existing browser worker system.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { kv } from '@vercel/kv';
import { z } from 'zod';

// Import existing tool registry and utilities
import { CODAP_TOOLS } from './tool-registry.js';
import { queueToolRequest, getToolResponse } from './kv-utils.js';

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
      expiresAt
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
  
  async getSessionByLegacy(legacyCode) {
    return await kv.get(`legacy:${legacyCode}`);
  }
  
  async deleteSession(mcpSessionId) {
    const session = await this.getSessionByMCP(mcpSessionId);
    if (session) {
      await Promise.all([
        kv.del(`mcp:${mcpSessionId}`),
        kv.del(`legacy:${session.legacyCode}`)
      ]);
    }
  }
}

/**
 * MCP to Internal Tool Bridge
 * Transforms MCP tool calls to internal format and delegates to browser worker
 */
class MCPToolBridge {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
  }
  
  async executeTool(toolName, toolArgs, mcpSessionId, requestId) {
    try {
      // Get session mapping
      const session = await this.sessionManager.getSessionByMCP(mcpSessionId);
      if (!session) {
        throw new Error('Session expired or invalid');
      }
      
      // Transform MCP request to internal format
      const internalRequest = {
        sessionCode: session.legacyCode,
        tool: toolName,
        arguments: toolArgs,
        requestId: requestId,
        timestamp: Date.now()
      };
      
      // Queue request using existing system
      await queueToolRequest(internalRequest);
      
      // Wait for browser worker response
      const result = await this.waitForResponse(requestId);
      
      // Transform response to MCP format
      return {
        content: [
          {
            type: "text",
            text: typeof result === 'string' ? result : JSON.stringify(result)
          }
        ]
      };
      
    } catch (error) {
      throw new Error(`Tool execution failed: ${error.message}`);
    }
  }
  
  async waitForResponse(requestId, timeout = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const response = await getToolResponse(requestId);
      if (response) {
        return response;
      }
      
      // Wait 100ms before polling again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error('Tool execution timeout');
  }
}

/**
 * Create and configure MCP Server
 */
function createMCPServer(sessionManager, toolBridge) {
  const server = new McpServer({
    name: "codap-mcp-server",
    version: "1.0.0"
  });
  
  // Register all CODAP tools from existing registry
  CODAP_TOOLS.forEach(tool => {
    server.registerTool(
      tool.name,
      {
        title: tool.title || tool.name,
        description: tool.description,
        inputSchema: tool.parameters // Existing JSON Schema Draft-07 compatible
      },
      async (args, { sessionId }) => {
        return await toolBridge.executeTool(
          tool.name, 
          args, 
          sessionId, 
          `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        );
      }
    );
  });
  
  return server;
}

/**
 * Handle POST requests - MCP JSON-RPC messages
 */
export async function POST(req) {
  try {
    const sessionManager = new SessionManager();
    const toolBridge = new MCPToolBridge(sessionManager);
    
    // Create transport with session management
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      onsessioninitialized: async (sessionId) => {
        // Create session mapping when MCP session is initialized
        await sessionManager.createSession(sessionId);
      }
    });
    
    // Create and configure MCP server
    const server = createMCPServer(sessionManager, toolBridge);
    
    // Handle connection cleanup
    const cleanup = () => {
      server.close();
      transport.close();
    };
    
    // Connect server to transport
    await server.connect(transport);
    
    // Handle the request
    const body = await req.json();
    return await transport.handleRequest(req, new Response(), body);
    
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
 * Handle GET requests - SSE stream establishment
 */
export async function GET(req) {
  try {
    const sessionId = req.headers.get('mcp-session-id');
    
    if (!sessionId) {
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32002,
          message: "Missing session ID",
        },
        id: null
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Verify session exists
    const sessionManager = new SessionManager();
    const session = await sessionManager.getSessionByMCP(sessionId);
    
    if (!session) {
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32002,
          message: "Session expired or invalid",
        },
        id: null
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Return SSE stream headers
    return new Response('', {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error('MCP SSE Error:', error);
    
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal server error"
      },
      id: null
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle DELETE requests - Session termination
 */
export async function DELETE(req) {
  try {
    const sessionId = req.headers.get('mcp-session-id');
    
    if (!sessionId) {
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32002,
          message: "Missing session ID"
        },
        id: null
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Delete session
    const sessionManager = new SessionManager();
    await sessionManager.deleteSession(sessionId);
    
    return new Response('', { status: 204 });
    
  } catch (error) {
    console.error('MCP Session Delete Error:', error);
    
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal server error"
      },
      id: null
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 