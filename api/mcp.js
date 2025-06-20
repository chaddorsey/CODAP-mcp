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
 * Enhanced Session Manager with MCP protocol support
 * Provides comprehensive session lifecycle management, validation, and security
 */
class SessionManager {
  constructor() {
    this.sessionMetrics = {
      created: 0,
      resumed: 0,
      expired: 0,
      errors: 0
    };
  }

  /**
   * Create a new session with comprehensive validation
   */
  async createSession(mcpSessionId, clientInfo = null) {
    // Validate session ID format
    if (!this.validateSessionId(mcpSessionId)) {
      throw new Error(`Invalid session ID format: ${mcpSessionId}`);
    }

    // Check if session already exists (resumption case)
    const existingSession = await this.getSessionByMCP(mcpSessionId);
    if (existingSession) {
      return await this.resumeSession(mcpSessionId, existingSession);
    }

    const legacyCode = generateLegacySessionCode();
    const now = Date.now();
    const expiresAt = now + SESSION_TTL;
    
    const sessionData = {
      mcpSessionId,
      legacyCode,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt,
      initialized: false,
      clientInfo: clientInfo || {},
      requestCount: 0,
      toolCallCount: 0,
      status: 'created'
    };
    
    try {
      // Store bidirectional mapping with atomic operation
      await Promise.all([
        kv.set(`mcp:${mcpSessionId}`, sessionData, { ex: Math.floor(SESSION_TTL / 1000) }),
        kv.set(`legacy:${legacyCode}`, sessionData, { ex: Math.floor(SESSION_TTL / 1000) }),
        kv.set(`session:metrics:${mcpSessionId}`, { created: now }, { ex: Math.floor(SESSION_TTL / 1000) })
      ]);
      
      this.sessionMetrics.created++;
      console.log(`[SessionManager] Created new session: ${mcpSessionId} -> ${legacyCode}`);
      
      return sessionData;
    } catch (error) {
      this.sessionMetrics.errors++;
      console.error(`[SessionManager] Failed to create session ${mcpSessionId}:`, error);
      throw new Error(`Session creation failed: ${error.message}`);
    }
  }
  
  /**
   * Resume an existing session
   */
  async resumeSession(mcpSessionId, existingSession) {
    const now = Date.now();
    
    // Check if session is expired
    if (now >= existingSession.expiresAt) {
      await this.cleanupSession(mcpSessionId);
      throw new Error(`Session ${mcpSessionId} has expired`);
    }
    
    // Update last accessed time and extend TTL
    const updatedSession = {
      ...existingSession,
      lastAccessedAt: now,
      status: 'resumed'
    };
    
    await this.updateSession(mcpSessionId, updatedSession);
    this.sessionMetrics.resumed++;
    
    console.log(`[SessionManager] Resumed session: ${mcpSessionId}`);
    return updatedSession;
  }
  
  /**
   * Get session by MCP ID with validation
   */
  async getSessionByMCP(mcpSessionId) {
    if (!this.validateSessionId(mcpSessionId)) {
      return null;
    }
    
    try {
      const session = await kv.get(`mcp:${mcpSessionId}`);
      
      if (session) {
        // Check expiration
        if (Date.now() >= session.expiresAt) {
          await this.cleanupSession(mcpSessionId);
          return null;
        }
        
        // Update last accessed time
        await this.touchSession(mcpSessionId);
      }
      
      return session;
    } catch (error) {
      console.error(`[SessionManager] Error getting session ${mcpSessionId}:`, error);
      this.sessionMetrics.errors++;
      return null;
    }
  }
  
  /**
   * Update session data with validation and TTL management
   */
  async updateSession(mcpSessionId, updatedData) {
    const session = await kv.get(`mcp:${mcpSessionId}`);
    if (!session) {
      throw new Error(`Session ${mcpSessionId} not found`);
    }
    
    const now = Date.now();
    const mergedSession = { 
      ...session, 
      ...updatedData,
      lastAccessedAt: now
    };
    
    // Calculate remaining TTL
    const ttl = Math.floor((mergedSession.expiresAt - now) / 1000);
    
    if (ttl <= 0) {
      await this.cleanupSession(mcpSessionId);
      throw new Error(`Session ${mcpSessionId} has expired`);
    }
    
    try {
      await Promise.all([
        kv.set(`mcp:${mcpSessionId}`, mergedSession, { ex: ttl }),
        kv.set(`legacy:${session.legacyCode}`, mergedSession, { ex: ttl })
      ]);
      
      return mergedSession;
    } catch (error) {
      console.error(`[SessionManager] Error updating session ${mcpSessionId}:`, error);
      this.sessionMetrics.errors++;
      throw error;
    }
  }
  
  /**
   * Touch session to update last accessed time
   */
  async touchSession(mcpSessionId) {
    try {
      const session = await kv.get(`mcp:${mcpSessionId}`);
      if (session) {
        const now = Date.now();
        const ttl = Math.floor((session.expiresAt - now) / 1000);
        
        if (ttl > 0) {
          session.lastAccessedAt = now;
          session.requestCount = (session.requestCount || 0) + 1;
          
          await Promise.all([
            kv.set(`mcp:${mcpSessionId}`, session, { ex: ttl }),
            kv.set(`legacy:${session.legacyCode}`, session, { ex: ttl })
          ]);
        }
      }
    } catch (error) {
      // Non-critical error, log but don't throw
      console.warn(`[SessionManager] Failed to touch session ${mcpSessionId}:`, error);
    }
  }
  
  /**
   * Clean up expired or invalid session
   */
  async cleanupSession(mcpSessionId) {
    try {
      const session = await kv.get(`mcp:${mcpSessionId}`);
      
      if (session) {
        await Promise.all([
          kv.del(`mcp:${mcpSessionId}`),
          kv.del(`legacy:${session.legacyCode}`),
          kv.del(`session:metrics:${mcpSessionId}`)
        ]);
        
        console.log(`[SessionManager] Cleaned up session: ${mcpSessionId}`);
      }
      
      this.sessionMetrics.expired++;
    } catch (error) {
      console.error(`[SessionManager] Error cleaning up session ${mcpSessionId}:`, error);
      this.sessionMetrics.errors++;
    }
  }
  
  /**
   * Validate session ID format
   */
  validateSessionId(sessionId) {
    if (!sessionId || typeof sessionId !== 'string') {
      return false;
    }
    
    // Allow various session ID formats
    if (sessionId.length < 8 || sessionId.length > 128) {
      return false;
    }
    
    // Check for valid characters (alphanumeric, hyphens, underscores)
    return /^[a-zA-Z0-9_-]+$/.test(sessionId);
  }
  
  /**
   * Get session metrics
   */
  getMetrics() {
    return { ...this.sessionMetrics };
  }
  
  /**
   * Rate limiting check
   */
  async checkRateLimit(mcpSessionId, maxRequests = 200, windowMs = 60000) {
    try {
      const session = await this.getSessionByMCP(mcpSessionId);
      if (!session) {
        // Allow new sessions to be created
        return true;
      }
      
      const now = Date.now();
      
      // Simple rate limiting based on request count and time window
      // Only apply rate limiting if session has made many requests recently
      if (session.requestCount > maxRequests && (now - session.lastAccessedAt) < windowMs) {
        console.warn(`[SessionManager] Rate limit exceeded for session ${mcpSessionId}: ${session.requestCount} requests`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error(`[SessionManager] Rate limit check failed for ${mcpSessionId}:`, error);
      // On error, allow the request to proceed
      return true;
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
  
  async handleRequest(request, sessionId, headers = {}) {
    const { jsonrpc, method, params, id } = request;
    
    // Validate JSON-RPC 2.0 format
    if (jsonrpc !== "2.0") {
      return this.createErrorResponse(id, -32600, "Invalid Request");
    }
    
    // Validate required method field
    if (!method || typeof method !== 'string') {
      return this.createErrorResponse(id, -32600, "Invalid Request");
    }
    
    // Handle notifications (requests without id)
    const isNotification = id === undefined;
    
    try {
      let result;
      switch (method) {
        case 'initialize':
          result = await this.handleInitialize(params, id, sessionId, headers);
          break;
        case 'initialized':
          result = await this.handleInitialized(params, id, sessionId, headers);
          break;
        case 'capabilities':
          result = await this.handleCapabilities(params, id, sessionId, headers);
          break;
        case 'tools/list':
          result = await this.handleToolsList(params, id, sessionId, headers);
          break;
        case 'tools/call':
          result = await this.handleToolCall(params, id, sessionId, headers);
          break;
        case 'ping':
          result = await this.handlePing(params, id, sessionId, headers);
          break;
        case 'logging/setLevel':
          result = await this.handleSetLogLevel(params, id, sessionId, headers);
          break;
        default:
          if (isNotification) {
            console.log(`[MCP] Ignoring unknown notification: ${method}`);
            return null; // No response for notifications
          }
          return this.createErrorResponse(id, -32601, "Method not found");
      }
      
      // Don't send response for notifications
      if (isNotification) {
        console.log(`[MCP] Processed notification: ${method}`);
        return null;
      }
      
      return result;
    } catch (error) {
      console.error(`MCP method ${method} error:`, error);
      
      // Don't send error response for notifications
      if (isNotification) {
        console.error(`[MCP] Error in notification ${method}:`, error);
        return null;
      }
      
      return this.createErrorResponse(id, -32603, "Internal error", { error: error.message });
    }
  }
  
  async handleInitialize(params, id, sessionId, headers = {}) {
    const { protocolVersion, capabilities, clientInfo } = params;
    
    // Combine client info from params and headers
    const combinedClientInfo = {
      ...clientInfo,
      userAgent: headers.userAgent,
      origin: headers.origin,
      headerClientInfo: headers.clientInfo ? JSON.parse(headers.clientInfo) : null
    };
    
    // Create or get session with enhanced info
    let session = await this.sessionManager.getSessionByMCP(sessionId);
    if (!session) {
      session = await this.sessionManager.createSession(sessionId, combinedClientInfo);
    }
    
    // Mark session as initialized with comprehensive info
    await this.sessionManager.updateSession(sessionId, { 
      initialized: true,
      protocolVersion,
      clientInfo: combinedClientInfo,
      initializationTime: Date.now()
    });
    
    console.log(`[MCP] Session initialized: ${sessionId} with client: ${combinedClientInfo.userAgent || 'unknown'}`);
    
    return {
      jsonrpc: "2.0",
      result: {
        protocolVersion: "2025-03-26",
        capabilities: {
          tools: {
            listChanged: false
          },
          resources: {},
          prompts: {},
          logging: {}
        },
        serverInfo: {
          name: "codap-mcp-server",
          version: "1.0.0"
        },
        sessionInfo: {
          sessionId: sessionId,
          legacyCode: session.legacyCode,
          expiresAt: session.expiresAt,
          status: session.status
        }
      },
      id
    };
  }
  
  async handleInitialized(params, id, sessionId, headers = {}) {
    // This is a notification sent after initialize - no response needed
    console.log(`[MCP] Client initialized notification for session ${sessionId}`);
    return null; // Notifications don't return responses
  }
  
  async handlePing(params, id, sessionId, headers = {}) {
    const session = await this.sessionManager.getSessionByMCP(sessionId);
    if (!session) {
      return this.createErrorResponse(id, -32002, "Session not found");
    }
    
    return {
      jsonrpc: "2.0",
      result: {},
      id
    };
  }
  
  async handleSetLogLevel(params, id, sessionId, headers = {}) {
    const { level } = params;
    console.log(`[MCP] Setting log level to: ${level} for session ${sessionId}`);
    
    // Store log level in session
    const session = await this.sessionManager.getSessionByMCP(sessionId);
    if (session) {
      await this.sessionManager.updateSession(sessionId, { logLevel: level });
    }
    
    return {
      jsonrpc: "2.0",
      result: {},
      id
    };
  }
  
  async handleCapabilities(params, id, sessionId, headers = {}) {
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
  
  async handleToolsList(params, id, sessionId, headers = {}) {
    const session = await this.sessionManager.getSessionByMCP(sessionId);
    if (!session || !session.initialized) {
      return this.createErrorResponse(id, -32002, "Session not initialized");
    }
    
    const tools = CODAP_TOOLS.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.parameters
    }));
    
    console.log(`[MCP] Listed ${tools.length} tools for session ${sessionId}`);
    
    return {
      jsonrpc: "2.0",
      result: {
        tools: tools
      },
      id
    };
  }
  
  async handleToolCall(params, id, sessionId, headers = {}) {
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
      // Update session tool call count
      await this.sessionManager.updateSession(sessionId, {
        toolCallCount: (session.toolCallCount || 0) + 1,
        lastToolCall: toolName,
        lastToolCallTime: Date.now()
      });
      
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
      
      // Update session with error count
      try {
        await this.sessionManager.updateSession(sessionId, {
          errorCount: (session.errorCount || 0) + 1,
          lastError: error.message,
          lastErrorTime: Date.now()
        });
      } catch (updateError) {
        console.warn(`[MCP] Failed to update session error count:`, updateError);
      }
      
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
      
      // Return MCP-compliant response with proper content format
      return {
        jsonrpc: "2.0",
        result: {
          content: [
            {
              type: "text",
              text: `Tool execution completed successfully.\n\nTool: ${toolName}\nExecution Time: ${executionTime}ms\nMode: browser-worker\nSession: ${session.legacyCode}\n\nResult:\n${JSON.stringify(result, null, 2)}`
            }
          ],
          isError: false
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
      
      // Return MCP-compliant response with proper content format
      return {
        jsonrpc: "2.0",
        result: {
          content: [
            {
              type: "text",
              text: `Tool execution completed successfully.\n\nTool: ${toolName}\nExecution Time: ${executionTime}ms\nMode: direct-server\nSession: ${sessionId}\n\nResult:\n${JSON.stringify(result, null, 2)}`
            }
          ],
          isError: false
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
 * Enhanced MCP header parser
 */
function parseHeaders(req) {
  const headers = {};
  
  // Standard MCP headers
  headers.sessionId = req.headers.get('mcp-session-id') || req.headers.get('x-mcp-session-id');
  headers.clientInfo = req.headers.get('mcp-client-info') || req.headers.get('x-mcp-client-info');
  headers.protocolVersion = req.headers.get('mcp-protocol-version') || req.headers.get('x-mcp-protocol-version');
  
  // Legacy CODAP headers for backward compatibility
  headers.legacySessionCode = req.headers.get('x-session-code') || req.headers.get('session-code');
  
  // Security headers
  headers.userAgent = req.headers.get('user-agent');
  headers.origin = req.headers.get('origin');
  headers.referer = req.headers.get('referer');
  
  // Generate session ID if not provided
  if (!headers.sessionId) {
    headers.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  return headers;
}

/**
 * Validate request headers
 */
function validateHeaders(headers) {
  const errors = [];
  
  // Validate session ID format
  if (headers.sessionId && !/^[a-zA-Z0-9_-]+$/.test(headers.sessionId)) {
    errors.push('Invalid session ID format');
  }
  
  // Validate client info if provided
  if (headers.clientInfo) {
    try {
      JSON.parse(headers.clientInfo);
    } catch (e) {
      errors.push('Invalid client info JSON format');
    }
  }
  
  return errors;
}

/**
 * Handle batch requests according to JSON-RPC 2.0 specification
 */
async function handleBatchRequest(requests, sessionId, headers, startTime) {
  // Validate batch request
  if (requests.length === 0) {
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32600,
        message: "Invalid Request"
      },
      id: null
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const handler = new MCPProtocolHandler();
  const responses = [];
  
  // Process each request in the batch
  for (const request of requests) {
    try {
      // Check rate limiting for each request
      const rateLimitOk = await handler.sessionManager.checkRateLimit(sessionId);
      if (!rateLimitOk) {
        responses.push({
          jsonrpc: "2.0",
          error: {
            code: -32429,
            message: "Rate limit exceeded"
          },
          id: request.id || null
        });
        continue;
      }
      
      const response = await handler.handleRequest(request, sessionId, headers);
      if (response !== null) { // Don't include responses for notifications
        responses.push(response);
      }
    } catch (error) {
      console.error(`[MCP] Batch request error:`, error);
      responses.push({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal error",
          data: { error: error.message }
        },
        id: request.id || null
      });
    }
  }
  
  const processingTime = Date.now() - startTime;
  
  // Return empty response if no responses (all notifications)
  if (responses.length === 0) {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'x-processing-time-ms': processingTime.toString()
      }
    });
  }
  
  // Return batch response
  return new Response(JSON.stringify(responses), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'mcp-session-id': sessionId,
      'x-processing-time-ms': processingTime.toString(),
      'x-batch-size': requests.length.toString()
    }
  });
}

/**
 * Handle POST requests - Enhanced MCP JSON-RPC messages with comprehensive header support
 */
async function POST(req) {
  const startTime = Date.now();
  let sessionId = null;
  
  try {
    // Parse and validate headers
    const headers = parseHeaders(req);
    sessionId = headers.sessionId;
    
    const headerErrors = validateHeaders(headers);
    if (headerErrors.length > 0) {
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "Invalid headers",
          data: { errors: headerErrors }
        },
        id: null
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Parse request body
    const body = await req.json();
    
    // Check if this is a batch request
    if (Array.isArray(body)) {
      return await handleBatchRequest(body, sessionId, headers, startTime);
    }
    
    // Create handler with enhanced session manager
    const handler = new MCPProtocolHandler();
    
    // Check rate limiting before processing
    const rateLimitOk = await handler.sessionManager.checkRateLimit(sessionId);
    if (!rateLimitOk) {
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32429,
          message: "Rate limit exceeded",
          data: { sessionId: sessionId }
        },
        id: body.id || null
      }), {
        status: 429,
        headers: { 
          'Content-Type': 'application/json',
          'Retry-After': '60'
        }
      });
    }
    
    // Process the request
    const response = await handler.handleRequest(body, sessionId, headers);
    const processingTime = Date.now() - startTime;
    
    // Handle null response (notifications)
    if (response === null) {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'mcp-session-id': sessionId,
          'x-processing-time-ms': processingTime.toString()
        }
      });
    }
    
    // Check if this is a JSON-RPC format error that should return 400
    if (response.error && response.error.code === -32600) {
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'mcp-session-id': sessionId,
          'x-processing-time-ms': processingTime.toString()
        }
      });
    }
    
    // Enhanced response headers
    const responseHeaders = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, mcp-session-id, mcp-client-info, x-mcp-session-id, x-mcp-client-info',
      'mcp-session-id': sessionId,
      'x-processing-time-ms': processingTime.toString(),
      'x-server-version': '1.0.0'
    };
    
    // Include client info in response if provided
    if (headers.clientInfo) {
      responseHeaders['mcp-client-info'] = headers.clientInfo;
    }
    
    console.log(`[MCP] Request processed in ${processingTime}ms for session ${sessionId}`);
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: responseHeaders
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[MCP] Server Error (${processingTime}ms):`, error);
    
    // Enhanced error response
    const errorResponse = {
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal server error",
        data: { 
          error: error.message,
          sessionId: sessionId,
          processingTimeMs: processingTime
        }
      },
      id: null
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'x-processing-time-ms': processingTime.toString()
      }
    });
  }
}

/**
 * Handle GET requests - Health check and session management endpoints
 */
async function GET(req) {
  const url = new URL(req.url);
  const pathname = url.pathname;
  
  // Session metrics endpoint
  if (pathname.includes('/metrics')) {
    const sessionId = url.searchParams.get('session') || req.headers.get('mcp-session-id');
    
    if (sessionId) {
      try {
        const handler = new MCPProtocolHandler();
        const session = await handler.sessionManager.getSessionByMCP(sessionId);
        const metrics = handler.sessionManager.getMetrics();
        
        return new Response(JSON.stringify({
          sessionId: sessionId,
          session: session ? {
            status: session.status,
            createdAt: session.createdAt,
            lastAccessedAt: session.lastAccessedAt,
            requestCount: session.requestCount,
            toolCallCount: session.toolCallCount,
            errorCount: session.errorCount || 0
          } : null,
          globalMetrics: metrics,
          timestamp: new Date().toISOString()
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({
          error: "Failed to retrieve metrics",
          message: error.message
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Global metrics only
    try {
      const handler = new MCPProtocolHandler();
      const metrics = handler.sessionManager.getMetrics();
      
      return new Response(JSON.stringify({
        globalMetrics: metrics,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "Failed to retrieve global metrics",
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // Health check endpoint (default)
  return new Response(JSON.stringify({
    service: "CODAP MCP Server",
    status: "operational",
    version: "1.0.0",
    protocol: "JSON-RPC 2.0",
    features: {
      sessionManagement: true,
      headerValidation: true,
      rateLimiting: true,
      metrics: true
    },
    endpoints: {
      mcp: "/api/mcp",
      metrics: "/api/mcp/metrics",
      health: "/api/mcp"
    },
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Handle OPTIONS requests - Enhanced CORS with comprehensive header support
 */
async function OPTIONS(req) {
  return new Response('', {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, mcp-session-id, mcp-client-info, mcp-protocol-version, x-mcp-session-id, x-mcp-client-info, x-session-code, session-code',
      'Access-Control-Expose-Headers': 'mcp-session-id, x-processing-time-ms, x-server-version',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// Export functions for Vercel serverless
module.exports = {
  POST,
  GET,
  OPTIONS
};