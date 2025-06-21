/**
 * MCP Server Endpoint - JSON-RPC 2.0 Compatible
 * PBI 18 - Task 18-5: Simplified MCP implementation for Vercel
 * 
 * This endpoint provides MCP protocol compliance using manual JSON-RPC 2.0 handling
 * instead of the full @modelcontextprotocol/sdk for better Vercel compatibility.
 */

const { kv } = require("@vercel/kv");

// Import existing tool registry and utilities
const { CODAP_TOOLS } = require("./tool-registry.js");
const { queueToolRequest, getToolResponse, setToolResponse, getSession } = require("./kv-utils.js");
const { DirectToolExecutor } = require("./mcp-tool-executor.js");

// Session management utilities
const SESSION_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Generate legacy 8-character session code for backward compatibility
 */
function generateLegacySessionCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
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
      status: "created",
      // Merge any additional properties from clientInfo (like initialized: true)
      ...(clientInfo || {})
    };
    
    try {
      // Store bidirectional mapping with atomic operation and longer timeout
      const kvTimeout = 10000; // 10 second timeout
      console.log(`[SessionManager] Creating session ${mcpSessionId} with ${kvTimeout}ms timeout`);
      
      const kvPromises = [
        kv.set(`mcp:${mcpSessionId}`, sessionData, { ex: Math.floor(SESSION_TTL / 1000) }),
        kv.set(`legacy:${legacyCode}`, sessionData, { ex: Math.floor(SESSION_TTL / 1000) }),
        kv.set(`session:metrics:${mcpSessionId}`, { created: now }, { ex: Math.floor(SESSION_TTL / 1000) })
      ];
      
      // Execute with timeout
      await Promise.race([
        Promise.all(kvPromises),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`KV timeout after ${kvTimeout}ms`)), kvTimeout))
      ]);
      
      // CRITICAL: Verify session was actually stored
      console.log(`[SessionManager] Verifying session ${mcpSessionId} was stored...`);
      console.log(`[SessionManager] Original sessionData:`, JSON.stringify(sessionData, null, 2));
      
      // Small delay to ensure KV commit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const verification = await Promise.race([
        kv.get(`mcp:${mcpSessionId}`),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Verification timeout after 5000ms`)), 5000))
      ]);
      
      if (!verification) {
        throw new Error(`Session verification failed - session not found in KV store`);
      }
      
      console.log(`[SessionManager] Session ${mcpSessionId} verified successfully in KV store`);
      console.log(`[SessionManager] Stored sessionData:`, JSON.stringify(verification, null, 2));
      
      this.sessionMetrics.created++;
      console.log(`[SessionManager] Created new session: ${mcpSessionId} -> ${legacyCode}`);
      
      return sessionData;
    } catch (error) {
      this.sessionMetrics.errors++;
      console.error(`[SessionManager] Failed to create session ${mcpSessionId}:`, error);
      console.error(`[SessionManager] Error details:`, {
        message: error.message,
        stack: error.stack,
        sessionId: mcpSessionId,
        legacyCode,
        timestamp: new Date().toISOString()
      });
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
      status: "resumed"
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
    if (!sessionId || typeof sessionId !== "string") {
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
    if (!method || typeof method !== "string") {
      return this.createErrorResponse(id, -32600, "Invalid Request");
    }
    
    // Handle notifications (requests without id)
    const isNotification = id === undefined;
    
    try {
      let result;
      switch (method) {
        case "initialize":
          result = await this.handleInitialize(params, id, sessionId, headers);
          break;
        case "initialized":
          result = await this.handleInitialized(params, id, sessionId, headers);
          break;
        case "capabilities":
          result = await this.handleCapabilities(params, id, sessionId, headers);
          break;
        case "tools/list":
          result = await this.handleToolsList(params, id, sessionId, headers);
          break;
        case "tools/call":
          result = await this.handleToolCall(params, id, sessionId, headers);
          break;
        case "ping":
          result = await this.handlePing(params, id, sessionId, headers);
          break;
        case "logging/setLevel":
          result = await this.handleSetLogLevel(params, id, sessionId, headers);
          break;
        case "resources/list":
          result = await this.handleResourcesList(params, id, sessionId, headers);
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
    
    console.log(`[MCP] Initialize request: sessionId=${sessionId}, client=${clientInfo?.name || 'unknown'}`);
    
    // Enhanced client info with headers
    const enhancedClientInfo = {
      ...clientInfo,
      userAgent: headers['user-agent'],
      origin: headers['origin'],
      referer: headers['referer'],
      protocolVersion,
      initializeTime: Date.now()
    };
    
    try {
      let session;
      
      if (sessionId) {
        // For Claude Desktop sessions, auto-create and initialize
        if (sessionId === 'claude-desktop-session' || clientInfo?.name?.includes('Claude')) {
          // Auto-create Claude Desktop session
          session = await this.sessionManager.createSession(sessionId, enhancedClientInfo);
          
          // Immediately initialize it for full tool access
          await this.sessionManager.updateSession(sessionId, {
            initialized: true,
            protocolVersion,
            capabilities,
            initializationTime: Date.now(),
            autoInitialized: true,
            clientType: 'claude-desktop'
          });
          
          console.log(`[MCP] Auto-initialized Claude Desktop session: ${sessionId}`);
        } else {
          // Regular session handling
          session = await this.sessionManager.createSession(sessionId, enhancedClientInfo);
        }
      }
      
      return {
        jsonrpc: "2.0",
        result: {
          protocolVersion: protocolVersion || "2024-11-05",
          capabilities: {
            logging: {},
            tools: {},
            prompts: {},
            resources: {},
            sampling: {}
          },
          serverInfo: {
            name: "CODAP MCP Server",
            version: "1.0.0",
            description: "Model Context Protocol server for CODAP data analysis platform"
          },
          instructions: sessionId === 'claude-desktop-session' ? 
            "CODAP MCP Server ready! All 34 CODAP tools are now available. You can interact with CODAP workspaces directly." :
            "CODAP MCP Server initialized. Use 'connect_to_session' tool to connect to a specific CODAP session."
        },
        id
      };
    } catch (error) {
      console.error(`[MCP] Initialize failed: ${error.message}`);
      return this.createErrorResponse(id, -32603, `Initialization failed: ${error.message}`);
    }
  }
  
  async handleInitialized(params, id, sessionId, headers = {}) {
    // This is a notification sent after initialize - no response needed
    console.log(`[MCP] Client initialized notification for session ${sessionId}`);
    return null; // Notifications don't return responses
  }
  
  async handlePing(params, id, sessionId, headers = {}) {
    // Ping works with or without session
    if (sessionId) {
      const session = await this.sessionManager.getSessionByMCP(sessionId);
      if (!session) {
        return this.createErrorResponse(id, -32002, "Session not found");
      }
    }
    
    return {
      jsonrpc: "2.0",
      result: { 
        status: sessionId ? "session-connected" : "session-agnostic",
        timestamp: new Date().toISOString()
      },
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
    // Capabilities work with or without session
    return {
      jsonrpc: "2.0",
      result: {
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
          version: "1.0.0",
          sessionMode: sessionId ? "session-connected" : "session-agnostic"
        }
      },
      id
    };
  }

  async handleResourcesList(params, id, sessionId, headers = {}) {
    // Return empty resources list - we don't provide any resources currently
    return {
      jsonrpc: "2.0",
      result: {
        resources: []
      },
      id
    };
  }
  
  async handleToolsList(params, id, sessionId, headers = {}) {
    // ALWAYS provide all CODAP tools plus connect_to_session
    // This solves the Claude Desktop caching issue by showing all tools upfront
    
    // Get all CODAP tools
    const codapTools = CODAP_TOOLS.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.parameters
    }));
    
    // Always include the connect_to_session tool first
    const tools = [{
      name: "connect_to_session",
      description: "Connect to a CODAP session using a session ID from the CODAP plugin. Required before using other CODAP tools.",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "The session ID from your CODAP plugin (e.g., 'ABC12345')"
          }
        },
        required: ["sessionId"]
      }
    }, ...codapTools];
    
    console.log(`[MCP] Listed ${tools.length} tools for session ${sessionId || 'no-session'} (all tools always available)`);
    
    return {
      jsonrpc: "2.0",
      result: {
        tools
      },
      id
    };
  }
  
  async handleToolCall(params, id, sessionId, headers = {}) {
    const { name, arguments: args } = params;
    
    console.log(`[MCP] Tool call: ${name}, sessionId=${sessionId}`);
    
    try {
      // Handle connect_to_session tool
      if (name === 'connect_to_session') {
        return await this.handleConnectToSession(args, id, sessionId, headers);
      }
      
      // For all other tools, ensure we have a valid session
      if (!sessionId) {
        return {
          jsonrpc: "2.0",
          result: {
            content: [{
              type: "text", 
              text: `To use the '${name}' tool, you must first connect to a CODAP session.\n\nPlease use the 'connect_to_session' tool with a valid CODAP session ID (e.g., 'ABC12345').\n\nOnce connected, you'll be able to use all 34 CODAP tools for data analysis.`
            }]
          },
          id
        };
      }
      
      // Get session and check for active pairing session
      console.log(`[MCP] Looking up Claude session ${sessionId} for tool ${name}`);
      let claudeSession = await this.sessionManager.getSessionByMCP(sessionId);
      let session = claudeSession;
      let effectiveSessionId = sessionId;
      
      if (!claudeSession) {
        console.log(`[MCP] Claude session ${sessionId} not found`);
        return {
          jsonrpc: "2.0",
          result: {
            content: [{
              type: "text",
              text: `Claude session ${sessionId} not found. Please use the 'connect_to_session' tool to establish a connection.`
            }]
          },
          id
        };
      }
      
      console.log(`[MCP] Claude session found. activePairingSession: ${claudeSession.activePairingSession}, connectedCODAPSession: ${claudeSession.connectedCODAPSession}`);
      
      if (claudeSession && claudeSession.activePairingSession) {
        // Use the pairing session for tool execution
        effectiveSessionId = claudeSession.activePairingSession;
        console.log(`[MCP] Looking up pairing session ${effectiveSessionId} for tool ${name}`);
        session = await this.sessionManager.getSessionByMCP(effectiveSessionId);
        
        if (!session) {
          console.log(`[MCP] ERROR: Pairing session ${effectiveSessionId} not found in KV store!`);
          console.log(`[MCP] Claude session data:`, JSON.stringify(claudeSession, null, 2));
          
          // If pairing session doesn't exist, fall back to direct CODAP session
          if (claudeSession.connectedCODAPSession) {
            console.log(`[MCP] Attempting fallback to CODAP session ${claudeSession.connectedCODAPSession}`);
            effectiveSessionId = claudeSession.connectedCODAPSession;
            session = await this.sessionManager.getSessionByMCP(effectiveSessionId);
            if (session) {
              console.log(`[MCP] Fallback to CODAP session ${effectiveSessionId} successful for tool ${name}`);
            } else {
              console.log(`[MCP] Fallback failed - CODAP session ${effectiveSessionId} also not found`);
            }
          }
        } else {
          console.log(`[MCP] Using pairing session ${effectiveSessionId} for tool ${name} (initialized: ${session.initialized})`);
        }
      }
      
      if (!session) {
        const errorMsg = `Session ${effectiveSessionId} not found in KV store. Claude session exists but pairing/CODAP sessions are missing. This indicates a KV storage persistence issue.`;
        console.log(`[MCP] ERROR: ${errorMsg}`);
        return {
          jsonrpc: "2.0",
          result: {
            content: [{
              type: "text",
              text: errorMsg + ` Please try reconnecting with 'connect_to_session'.`
            }]
          },
          id
        };
      }
      
      if (!session.initialized) {
        const errorMsg = `Session ${effectiveSessionId} not initialized (type: ${session.type}, status: ${session.status}).`;
        console.log(`[MCP] ERROR: ${errorMsg}`);
        console.log(`[MCP] Session data:`, JSON.stringify(session, null, 2));
        return {
          jsonrpc: "2.0",
          result: {
            content: [{
              type: "text",
              text: errorMsg + ` Please use the 'connect_to_session' tool first.`
            }]
          },
          id
        };
      }
      
      // Update session metrics (use effective session ID)
      await this.sessionManager.updateSession(effectiveSessionId, {
        lastToolCall: Date.now(),
        toolCallCount: (session.toolCallCount || 0) + 1
      });
      
      // Handle CODAP tools
      const codapTools = this.getCODAPTools();
      const tool = codapTools.find(t => t.name === name);
      
      if (!tool) {
        return {
          jsonrpc: "2.0",
          result: {
            content: [{
              type: "text",
              text: `Unknown tool: ${name}. Available tools: ${codapTools.map(t => t.name).join(', ')}`
            }]
          },
          id
        };
      }
      
      // Check if session has active browser worker
      const hasBrowserWorker = await this.checkBrowserWorkerConnection(effectiveSessionId, session.legacyCode);
      
      if (hasBrowserWorker) {
        console.log(`[MCP] Using browser worker mode for session ${session.legacyCode}`);
        return await this.executeBrowserWorkerTool(params, id, effectiveSessionId, session);
      } else {
        console.log(`[MCP] Using direct execution mode for session ${effectiveSessionId}`);
        return await this.executeDirectTool(params, id, effectiveSessionId, session);
      }
      
    } catch (error) {
      console.error(`[MCP] Tool call error:`, error);
      
      // Update session error count
      if (sessionId) {
        try {
          const session = await this.sessionManager.getSessionByMCP(sessionId);
          if (session) {
            await this.sessionManager.updateSession(sessionId, {
              errorCount: (session.errorCount || 0) + 1
            });
          }
        } catch (updateError) {
          console.error(`[MCP] Failed to update session error count:`, updateError);
        }
      }
      
      return {
        jsonrpc: "2.0",
        result: {
          content: [{
            type: "text",
            text: `Tool execution failed: ${error.message}`
          }]
        },
        id
      };
    }
  }
  
  /**
   * Handle connect_to_session tool call
   */
  async handleConnectToSession(args, id, sessionId, headers = {}) {
    const targetSessionId = args.sessionId;
    if (!targetSessionId) {
      return {
        jsonrpc: "2.0",
        result: {
          content: [{
            type: "text",
            text: "Session ID is required. Please provide a valid CODAP session ID."
          }]
        },
        id
      };
    }

    try {
      // Check if target session exists in MCP system first
      let targetSession = await this.sessionManager.getSessionByMCP(targetSessionId);
      
      if (!targetSession) {
        // Check legacy session store
        const { getSession } = require("./kv-utils.js");
        const legacySession = await getSession(targetSessionId);
        
        if (!legacySession) {
          return {
            jsonrpc: "2.0",
            result: {
              content: [{
                type: "text",
                text: `CODAP session '${targetSessionId}' not found. Make sure the CODAP plugin is running with this session ID.`
              }]
            },
            id
          };
        }
        
        // Create MCP session from legacy session
        targetSession = await this.sessionManager.createSession(targetSessionId, {
          legacySession: true,
          originalCode: targetSessionId,
          createdAt: legacySession.createdAt
        });
        
        // Mark the session as initialized since it's coming from a valid legacy session
        await this.sessionManager.updateSession(targetSessionId, {
          initialized: true,
          protocolVersion: "2024-11-05",
          initializationTime: Date.now()
        });
        
        console.log(`[MCP] Created and initialized MCP session from legacy session: ${targetSessionId}`);
      }
      
      // CRITICAL FIX: Create a pairing session between Claude Desktop and CODAP
      if (sessionId && sessionId !== targetSessionId) {
        // Ensure the Claude Desktop session exists
        let claudeSession = await this.sessionManager.getSessionByMCP(sessionId);
        if (!claudeSession) {
          claudeSession = await this.sessionManager.createSession(sessionId, {
            type: 'claude-desktop',
            initialized: true,
            protocolVersion: "2024-11-05",
            createdAt: Date.now()
          });
          console.log(`[MCP] Created Claude Desktop session: ${sessionId}`);
        }
        
        // Create a unique pairing session
        const pairingSessionId = generatePairingSessionId(sessionId, targetSessionId);
        
        // Create the pairing session
        console.log(`[MCP] Creating pairing session ${pairingSessionId}...`);
        const pairingSession = await this.sessionManager.createSession(pairingSessionId, {
          type: 'pairing',
          claudeSession: sessionId,
          codapSession: targetSessionId,
          claudeSessionLegacyCode: null,
          codapSessionLegacyCode: targetSession.legacyCode,
          initialized: true,
          protocolVersion: "2024-11-05",
          createdAt: Date.now()
        });
        
        // CRITICAL: Verify pairing session exists before updating Claude session
        const pairingVerification = await this.sessionManager.getSessionByMCP(pairingSessionId);
        if (!pairingVerification) {
          throw new Error(`Pairing session creation failed - ${pairingSessionId} not found after creation`);
        }
        if (!pairingVerification.initialized) {
          throw new Error(`Pairing session ${pairingSessionId} not initialized after creation`);
        }
        console.log(`[MCP] Pairing session ${pairingSessionId} verified successfully`);
        
        // Update the Claude Desktop session to reference the pairing and mark as initialized
        console.log(`[MCP] Updating Claude session ${sessionId} with pairing reference...`);
        await this.sessionManager.updateSession(sessionId, {
          activePairingSession: pairingSessionId,
          connectedCODAPSession: targetSessionId,
          connectionTime: Date.now(),
          initialized: true,
          protocolVersion: "2024-11-05"
        });
        
        // FINAL VERIFICATION: Ensure Claude session has the pairing reference
        const claudeVerification = await this.sessionManager.getSessionByMCP(sessionId);
        if (!claudeVerification.activePairingSession) {
          throw new Error(`Claude session update failed - no activePairingSession found`);
        }
        
        console.log(`[MCP] Successfully created and verified pairing session ${pairingSessionId} between Claude ${sessionId} and CODAP ${targetSessionId}`);
      }
      
      return {
        jsonrpc: "2.0",
        result: {
          content: [{
            type: "text",
            text: `Connected successfully to CODAP session '${targetSessionId}'!\n\nNow you can use any of the 34 CODAP tools to interact with your CODAP workspace.\n\nSession Details:\n- Session ID: ${targetSessionId}\n- Legacy Code: ${targetSession.legacyCode}\n- Status: ${targetSession.status}\n- Created: ${new Date(targetSession.createdAt).toLocaleString()}\n\nYour Claude Desktop session is now connected to this CODAP session. All subsequent tool calls will automatically use this CODAP session.`
          }]
        },
        id
      };
    } catch (error) {
      return {
        jsonrpc: "2.0",
        result: {
          content: [{
            type: "text",
            text: `Connection failed: ${error.message}`
          }]
        },
        id
      };
    }
  }

  /**
   * Get CODAP tools list
   */
  getCODAPTools() {
    return CODAP_TOOLS;
  }

  /**
   * Check if session has an active browser worker connection
   * Simplified version to avoid timeouts - assume no browser worker for now
   */
  async checkBrowserWorkerConnection(sessionId, legacyCode) {
    try {
      console.log(`[MCP] Checking browser worker connection for session ${legacyCode}`);
      
      // TEMPORARY: Force browser-worker mode for all sessions to test the SSE pipeline
      // This will help us determine if the issue is in detection or in the SSE workflow
      console.log(`[MCP] FORCING browser-worker mode for testing - session ${legacyCode}`);
      return true;
      
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
    // Use the main session ID (not legacy code) to match browser worker SSE connection
    // The browser worker connects using session.id, so we need to queue using the same
    const sessionCode = sessionId.split('-').pop(); // Extract CODAP session ID from MCP session ID
    const internalRequest = {
      sessionCode: sessionCode, // Use the session code that browser worker listens to
      tool: toolName,
      arguments: toolArgs,
      requestId,
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
      
      // Return MCP-compliant response with proper content format
      return {
        jsonrpc: "2.0",
        result: {
          content: [
            {
              type: "text",
              text: `Tool execution completed successfully.\n\nTool: ${toolName}\nExecution Time: ${executionTime}ms\nMode: direct-server\nSession: ${sessionId}\n\nResult:\n${JSON.stringify(result, null, 2)}`
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
 * Enhanced MCP header parser
 */
function parseHeaders(req) {
  const headers = {};
  
  // Standard MCP headers
  headers.sessionId = req.headers.get("mcp-session-id") || req.headers.get("x-mcp-session-id");
  headers.clientInfo = req.headers.get("mcp-client-info") || req.headers.get("x-mcp-client-info");
  headers.protocolVersion = req.headers.get("mcp-protocol-version") || req.headers.get("x-mcp-protocol-version");
  
  // Legacy CODAP headers for backward compatibility
  headers.legacySessionCode = req.headers.get("x-session-code") || req.headers.get("session-code");
  
  // Security headers
  headers.userAgent = req.headers.get("user-agent");
  headers.origin = req.headers.get("origin");
  headers.referer = req.headers.get("referer");
  
  // For session-agnostic approach: allow null session ID
  // Session ID will only be set when explicitly provided via headers
  headers.isDynamicSession = !headers.sessionId;
  
  return headers;
}

/**
 * Validate request headers
 */
function validateHeaders(headers) {
  const errors = [];
  
  // Validate session ID format
  if (headers.sessionId && !/^[a-zA-Z0-9_-]+$/.test(headers.sessionId)) {
    errors.push("Invalid session ID format");
  }
  
  // Validate client info if provided
  if (headers.clientInfo) {
    try {
      JSON.parse(headers.clientInfo);
    } catch (e) {
      errors.push("Invalid client info JSON format");
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
      headers: { "Content-Type": "application/json" }
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
        "Access-Control-Allow-Origin": "*",
        "x-processing-time-ms": processingTime.toString()
      }
    });
  }
  
  // Return batch response
  return new Response(JSON.stringify(responses), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "mcp-session-id": sessionId,
      "x-processing-time-ms": processingTime.toString(),
      "x-batch-size": requests.length.toString()
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
    
    // CRITICAL FIX: Generate unique session for Claude Desktop when no session ID provided
    if (!sessionId) {
      // Create a unique Claude Desktop session identifier
      sessionId = generateClaudeDesktopSessionId(req, headers);
      console.log(`[MCP] Generated Claude Desktop session ID: ${sessionId}`);
    }
    
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
        headers: { "Content-Type": "application/json" }
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
    
    // Check rate limiting before processing (skip if no session ID)
    if (sessionId && !headers.isDynamicSession) {
      const rateLimitOk = await handler.sessionManager.checkRateLimit(sessionId);
      if (!rateLimitOk) {
        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32429,
            message: "Rate limit exceeded",
            data: { sessionId }
          },
          id: body.id || null
        }), {
          status: 429,
          headers: { 
            "Content-Type": "application/json",
            "Retry-After": "60"
          }
        });
      }
    }
    
    // Process the request
    const response = await handler.handleRequest(body, sessionId, headers);
    const processingTime = Date.now() - startTime;
    
    // Handle null response (notifications)
    if (response === null) {
      const notificationHeaders = {
        "Access-Control-Allow-Origin": "*",
        "x-processing-time-ms": processingTime.toString()
      };
      
      if (sessionId) {
        notificationHeaders["mcp-session-id"] = sessionId;
      }
      
      return new Response(null, {
        status: 204,
        headers: notificationHeaders
      });
    }
    
    // Check if this is a JSON-RPC format error that should return 400
    if (response.error && response.error.code === -32600) {
      const errorHeaders = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "x-processing-time-ms": processingTime.toString()
      };
      
      if (sessionId) {
        errorHeaders["mcp-session-id"] = sessionId;
      }
      
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: errorHeaders
      });
    }
    
    // Enhanced response headers
    const responseHeaders = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, mcp-session-id, mcp-client-info, x-mcp-session-id, x-mcp-client-info",
      "x-processing-time-ms": processingTime.toString(),
      "x-server-version": "1.0.0"
    };
    
    // Only include session ID header if we have one
    if (sessionId) {
      responseHeaders["mcp-session-id"] = sessionId;
    }
    
    // Include client info in response if provided
    if (headers.clientInfo) {
      responseHeaders["mcp-client-info"] = headers.clientInfo;
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
          sessionId,
          processingTimeMs: processingTime
        }
      },
      id: null
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "x-processing-time-ms": processingTime.toString()
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
  if (pathname.includes("/metrics")) {
    const sessionId = url.searchParams.get("session") || req.headers.get("mcp-session-id");
    
    if (sessionId) {
      try {
        const handler = new MCPProtocolHandler();
        const session = await handler.sessionManager.getSessionByMCP(sessionId);
        const metrics = handler.sessionManager.getMetrics();
        
        return new Response(JSON.stringify({
          sessionId,
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
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({
          error: "Failed to retrieve metrics",
          message: error.message
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
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
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "Failed to retrieve global metrics",
        message: error.message
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
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
    headers: { "Content-Type": "application/json" }
  });
}

/**
 * Handle OPTIONS requests - Enhanced CORS with comprehensive header support
 */
async function OPTIONS(req) {
  return new Response("", {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, mcp-session-id, mcp-client-info, mcp-protocol-version, x-mcp-session-id, x-mcp-client-info, x-session-code, session-code",
      "Access-Control-Expose-Headers": "mcp-session-id, x-processing-time-ms, x-server-version",
      "Access-Control-Max-Age": "86400"
    }
  });
}

/**
 * Extract session ID from natural language command or tool arguments
 */
function extractSessionIdFromCommand(toolName, arguments_obj) {
  // Check if this is a connection establishment command
  if (arguments_obj && typeof arguments_obj === 'object') {
    // Direct session ID in arguments
    if (arguments_obj.sessionId) {
      return arguments_obj.sessionId;
    }
    
    // Check for natural language patterns in various argument fields
    const textFields = ['instruction', 'command', 'message', 'text', 'description'];
    for (const field of textFields) {
      if (arguments_obj[field] && typeof arguments_obj[field] === 'string') {
        const sessionMatch = arguments_obj[field].match(/(?:connect to|session)\s+(?:codap\s+)?session\s+([A-Z0-9]{8})/i);
        if (sessionMatch) {
          return sessionMatch[1].toUpperCase();
        }
      }
    }
    
    // Check all string values for session patterns
    for (const [key, value] of Object.entries(arguments_obj)) {
      if (typeof value === 'string') {
        const sessionMatch = value.match(/(?:connect to|session)\s+(?:codap\s+)?session\s+([A-Z0-9]{8})/i);
        if (sessionMatch) {
          return sessionMatch[1].toUpperCase();
        }
      }
    }
  }
  
  return null;
}

/**
 * Generate a unique session ID for Claude Desktop instances
 * This creates a stable identifier for each Claude Desktop instance that connects
 */
function generateClaudeDesktopSessionId(req, headers) {
  // Collect identifying characteristics
  const factors = [
    headers.userAgent || 'unknown-agent',
    headers.origin || 'unknown-origin',
    req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown-ip',
    headers.clientInfo || 'unknown-client'
  ];
  
  // Create a hash of the factors for uniqueness
  const factorString = factors.join('|');
  let hash = 0;
  for (let i = 0; i < factorString.length; i++) {
    const char = factorString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use only the hash for stable session IDs across tool calls
  const hashStr = Math.abs(hash).toString(36);
  
  return `claude-${hashStr}`;
}

/**
 * Create a pairing session between Claude Desktop and CODAP
 */
function generatePairingSessionId(claudeSessionId, codapSessionId) {
  // Remove timestamp to ensure stable pairing session IDs
  return `pairing-${claudeSessionId}-${codapSessionId}`;
}

// Export functions for Vercel serverless
module.exports = {
  POST,
  GET,
  OPTIONS
};
