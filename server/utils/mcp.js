/**
 * MCP Server Endpoint - JSON-RPC 2.0 Compatible
 * PBI 18 - Task 18-5: Simplified MCP implementation for Vercel
 * 
 * This endpoint provides MCP protocol compliance using manual JSON-RPC 2.0 handling
 * instead of the full @modelcontextprotocol/sdk for better Vercel compatibility.
 */

// Redis Labs connection (replacing @vercel/kv)
const Redis = require("ioredis");

// Initialize Redis client for Redis Labs
const redis = new Redis({
  host: "redis-19603.c57.us-east-1-4.ec2.redns.redis-cloud.com",
  port: 19603,
  password: "4mi2PHNUqQkeMxSbLFY0qY5ruQEdNxmo",
  username: "default",
  // Explicitly disable TLS
  tls: null,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  lazyConnect: true,
});

// Create KV-compatible interface for Redis Labs
const kv = {
  async get(key) {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },
  async set(key, value, options = {}) {
    const serialized = JSON.stringify(value);
    if (options.ex) {
      await redis.setex(key, options.ex, serialized);
    } else {
      await redis.set(key, serialized);
    }
  },
  async del(key) {
    return await redis.del(key);
  }
};

// Import existing tool registry and utilities
const { CODAP_TOOLS, SAGEMODELER_TOOLS, getToolsByCapabilities } = require("./tool-registry.js");
const { queueToolRequest, getToolResponse, setToolResponse, getSession } = require("./kv-utils.js");
const { DirectToolExecutor } = require("./mcp-tool-executor.js");

/**
 * Unified session lookup function - always uses legacy session storage
 * This replaces the dual MCP/legacy session system with a single approach
 */
async function getUnifiedSession(sessionId) {
  if (!sessionId) return null;
  
  try {
    return await getSession(sessionId);
  } catch (error) {
    console.log(`[MCP] Unified session lookup failed for ${sessionId}:`, error.message);
    return null;
  }
}

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

    // Use provided legacy code or generate a new one
    const legacyCode = (clientInfo && clientInfo.legacyCode) || generateLegacySessionCode();
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
        case "prompts/list":
          result = await this.handlePromptsList(params, id, sessionId, headers);
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
    
    console.log(`[MCP] Initialize request: sessionId=${sessionId}, client=${clientInfo?.name || "unknown"}`);
    
    try {
      // Check if session exists (but don't create new ones)
      let session = null;
      if (sessionId) {
        session = await getUnifiedSession(sessionId);
        if (session) {
          console.log(`[MCP] Found existing session: ${sessionId}`);
        } else {
          console.log(`[MCP] No existing session found for: ${sessionId}`);
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
            name: "",
            version: "1.0.0", 
            description: "Model Context Protocol server for CODAP data analysis platform"
          },
          instructions: await this.generateContextualInstructions(sessionId)
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
      const session = await getUnifiedSession(sessionId);
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
    
    // Store log level in session (simplified - just log for now)
    const session = await getUnifiedSession(sessionId);
    if (session) {
      console.log(`[MCP] Log level ${level} set for session ${sessionId}`);
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
          name: "",
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

  async handlePromptsList(params, id, sessionId, headers = {}) {
    // Return empty prompts list - we don't provide any prompts currently
    return {
      jsonrpc: "2.0",
      result: {
        prompts: []
      },
      id
    };
  }
  
  async handleToolsList(params, id, sessionId, headers = {}) {
    try {
      console.log(`[MCP] *** CLAUDE DESKTOP TOOLS REQUEST ***`);
      console.log(`[MCP] SessionId: ${sessionId}`);
      
      // Get session to determine capabilities
      let capabilities = ["CODAP"]; // Default to CODAP tools only
      let sessionInfo = "no-session";
      
      if (sessionId) {
        // CRITICAL FIX: Check for active pairing session first
        let effectiveSessionId = sessionId;
        let claudeSession = null;
        
        // Check if this is a Claude session with an active pairing session
        try {
          claudeSession = await this.sessionManager.getSessionByMCP(sessionId);
          if (claudeSession && claudeSession.activePairingSession) {
            effectiveSessionId = claudeSession.activePairingSession;
            console.log(`[MCP] Found active pairing session ${effectiveSessionId} for Claude session ${sessionId}`);
          }
        } catch (error) {
          console.log(`[MCP] Could not check for pairing session: ${error.message}`);
        }
        
        // Use unified session lookup for the effective session (pairing session if available, otherwise Claude session)
        const session = await getUnifiedSession(effectiveSessionId);
        
        console.log(`[MCP] Session lookup for ${effectiveSessionId}: ${session ? "found" : "not found"}, capabilities: ${session?.capabilities || "none"}`);
        if (session) {
          console.log(`[MCP] Full session data:`, JSON.stringify(session, null, 2));
        }
        
        if (session) {
          if (Array.isArray(session.capabilities) && session.capabilities.length > 0) {
            capabilities = session.capabilities;
            sessionInfo = `session ${effectiveSessionId} with capabilities: ${capabilities.join(", ")}`;
          } else {
            sessionInfo = `session ${effectiveSessionId} (no capabilities, defaulting to CODAP)`;
          }
        } else {
          sessionInfo = `session ${effectiveSessionId} (not found, defaulting to CODAP)`;
        }
      }
      
      // Import getToolsByCapabilities function
      let getToolsByCapabilities;
      try {
        const toolRegistry = require("./tool-registry.js");
        getToolsByCapabilities = toolRegistry.getToolsByCapabilities;
      } catch (error) {
        console.error("[MCP] Failed to import tool registry:", error);
        // Fallback to CODAP_TOOLS only
        getToolsByCapabilities = null;
      }
      
      // Get filtered tools based on capabilities
      let availableTools;
      if (getToolsByCapabilities) {
        availableTools = getToolsByCapabilities(capabilities);
      } else {
        // Fallback to CODAP_TOOLS only
        availableTools = CODAP_TOOLS;
      }
      
      // Convert tools to MCP format
      const mcpTools = availableTools.map(tool => ({
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
      }, ...mcpTools];
      
      console.log(`[MCP] Listed ${tools.length} tools for ${sessionInfo} (${availableTools.length} capability-filtered tools + connect_to_session)`);
      
      return {
        jsonrpc: "2.0",
        result: {
          tools
        },
        id
      };
    } catch (error) {
      console.error("[MCP] Error in handleToolsList:", error);
      
      // Fallback to CODAP tools only
      const codapTools = CODAP_TOOLS.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.parameters
      }));
      
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
      
      console.log(`[MCP] Fallback: Listed ${tools.length} tools (CODAP only due to error)`);
      
      return {
        jsonrpc: "2.0",
        result: {
          tools
        },
        id
      };
    }
  }
  
  async handleToolCall(params, id, sessionId, headers = {}) {
    const { name, arguments: args } = params;
    
    console.log(`[MCP] Tool call: ${name}, sessionId=${sessionId}`);
    
    try {
      // Handle connect_to_session tool
      if (name === "connect_to_session") {
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
      const claudeSession = await this.sessionManager.getSessionByMCP(sessionId);
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
      
      // Handle capability-filtered tools
      let availableTools;
      let capabilities = ["CODAP"]; // Default to CODAP tools only
      
      // Get session capabilities to determine available tools (use target session, not Claude session)
      if (effectiveSessionId) {
        const targetSession = await getUnifiedSession(effectiveSessionId);
        if (targetSession && Array.isArray(targetSession.capabilities) && targetSession.capabilities.length > 0) {
          capabilities = targetSession.capabilities;
        }
      }
      
      // Get capability-filtered tools
      let getToolsByCapabilities;
      try {
        const toolRegistry = require("./tool-registry.js");
        getToolsByCapabilities = toolRegistry.getToolsByCapabilities;
      } catch (error) {
        console.error("[MCP] Failed to import tool registry:", error);
        getToolsByCapabilities = null;
      }
      
      if (getToolsByCapabilities) {
        availableTools = getToolsByCapabilities(capabilities);
      } else {
        availableTools = CODAP_TOOLS; // Fallback to CODAP only
      }
      
      const tool = availableTools.find(t => t.name === name);
      
      if (!tool) {
        // Provide comprehensive error with full tool list to keep LLM "in the zone"
        const codapTools = availableTools.filter(t => !t.name.startsWith("sage_"));
        const sageTools = availableTools.filter(t => t.name.startsWith("sage_"));
        
        let helpText = `❌ **Tool "${name}" is not available in this session.**\n\n`;
        helpText += `**Session Capabilities**: ${capabilities.join(" + ")}\n\n`;
        
        // Provide complete tool list by category for ongoing context
        helpText += `**🔧 Currently Available Tools** (${availableTools.length + 1} total):\n\n`;
        
        if (codapTools.length > 0) {
          helpText += `**[CODAP] Data Analysis Tools** (${codapTools.length} tools):\n`;
          helpText += codapTools.map(t => `• ${t.name}`).join("\n") + "\n\n";
        }
        
        if (sageTools.length > 0) {
          helpText += `**[SAGEMODELER] Systems Modeling Tools** (${sageTools.length} tools):\n`;
          helpText += sageTools.map(t => `• ${t.name}`).join("\n") + "\n\n";
        }
        
        helpText += `**[CONNECTION] Session Management** (1 tool):\n`;
        helpText += `• connect_to_session\n\n`;
        
        helpText += `**💡 Suggestion**: Choose from the tools listed above that match your current task. `;
        helpText += `All tools are marked with capability prefixes (**[CODAP]**, **[SAGEMODELER]**, **[CONNECTION]**) in their descriptions.`;
        
        return {
          jsonrpc: "2.0",
          result: {
            content: [{
              type: "text",
              text: helpText
            }]
          },
          id
        };
      }
      
      // Remove environment checking to avoid execution delays
      // Rely on clear tool descriptions and guidance to prevent inappropriate calls
      
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
          
          // FIXED: Create MCP session from legacy session but preserve the original legacy code
        targetSession = await this.sessionManager.createSession(targetSessionId, {
          legacySession: true,
          legacyCode: targetSessionId, // Preserve the existing legacy code
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
            type: "claude-desktop",
            initialized: true,
            protocolVersion: "2024-11-05",
            createdAt: Date.now()
          });
          console.log(`[MCP] Created Claude Desktop session: ${sessionId}`);
        }
        
        // Create a unique pairing session
        const pairingSessionId = generatePairingSessionId(sessionId, targetSessionId);
        
        // CRITICAL FIX: Get target session capabilities BEFORE creating pairing session
        let targetCapabilities = ["CODAP"]; // Default
        try {
          const targetUnifiedSession = await getUnifiedSession(targetSessionId);
          if (targetUnifiedSession && Array.isArray(targetUnifiedSession.capabilities)) {
            targetCapabilities = targetUnifiedSession.capabilities;
            console.log(`[MCP] Target session ${targetSessionId} has capabilities for pairing:`, targetCapabilities);
          } else {
            console.log(`[MCP] Target session ${targetSessionId} has no explicit capabilities, defaulting to CODAP for pairing`);
          }
        } catch (error) {
          console.log(`[MCP] Could not get target session capabilities for pairing:`, error.message);
        }

        // Create the pairing session WITH INHERITED CAPABILITIES
        console.log(`[MCP] Creating pairing session ${pairingSessionId} with capabilities:`, targetCapabilities);
        const pairingSession = await this.sessionManager.createSession(pairingSessionId, {
          type: "pairing",
          claudeSession: sessionId,
          codapSession: targetSessionId,
          claudeSessionLegacyCode: null,
          codapSessionLegacyCode: targetSession.legacyCode,
          capabilities: targetCapabilities, // ✅ INHERIT TARGET SESSION CAPABILITIES
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
        
        // CRITICAL FIX: Create unified session entry for pairing session with capabilities
        try {
          const { setSession } = require("./kv-utils.js");
          const pairingUnifiedSession = {
            sessionId: pairingSessionId,
            capabilities: targetCapabilities,
            type: "pairing-unified",
            claudeSession: sessionId,
            codapSession: targetSessionId,
            createdAt: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
            connectionTime: Date.now()
          };
          
          await setSession(pairingSessionId, pairingUnifiedSession);
          console.log(`[MCP] Created unified session entry for pairing session ${pairingSessionId} with capabilities:`, targetCapabilities);
        } catch (error) {
          console.error(`[MCP] CRITICAL: Failed to create unified session for pairing session:`, error);
        }

        // CAPABILITY TRANSFER: Inherit target session's capabilities
        try {
          const { setSession } = require("./kv-utils.js");
          const targetUnifiedSession = await getUnifiedSession(targetSessionId);
          
          let capabilitiesToTransfer = ["CODAP"]; // Default to CODAP-only for legacy sessions
          
          if (targetUnifiedSession && targetUnifiedSession.capabilities && Array.isArray(targetUnifiedSession.capabilities)) {
            capabilitiesToTransfer = targetUnifiedSession.capabilities;
            console.log(`[MCP] Found target session capabilities:`, capabilitiesToTransfer);
          } else {
            console.log(`[MCP] Target session ${targetSessionId} has no explicit capabilities, defaulting to CODAP-only for legacy compatibility`);
            
            // For legacy sessions without explicit capabilities, create a unified session entry with CODAP-only
            try {
              const legacyUnifiedSession = {
                sessionId: targetSessionId,
                capabilities: capabilitiesToTransfer,
                type: "legacy-session-unified",
                createdAt: Date.now(),
                expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
                legacyUpgrade: true
              };
              await setSession(targetSessionId, legacyUnifiedSession);
              console.log(`[MCP] Created unified session entry for legacy session ${targetSessionId} with CODAP-only capabilities`);
            } catch (error) {
              console.log(`[MCP] Failed to create unified session for legacy session ${targetSessionId}:`, error.message);
            }
          }
          
          console.log(`[MCP] Transferring capabilities from ${targetSessionId} to Claude session ${sessionId}:`, capabilitiesToTransfer);
          
          // Create unified session entry for Claude with inherited capabilities
          const claudeUnifiedSession = {
            sessionId,
            capabilities: capabilitiesToTransfer,
            connectedTo: targetSessionId,
            connectionTime: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
            createdAt: Date.now(),
            type: "claude-desktop-unified"
          };
          
          await setSession(sessionId, claudeUnifiedSession);
          console.log(`[MCP] Successfully created unified session entry for Claude ${sessionId} with capabilities:`, claudeUnifiedSession.capabilities);
          
        } catch (error) {
          console.error(`[MCP] CRITICAL: Failed to transfer capabilities:`, error);
          // This is critical for tool availability, so we should still try to continue
          // but log it as a critical error
        }
        
        // EARLY CLAUDE CONNECTION DETECTION: Send SSE notification
        try {
          // Queue a special "claude-connected" event for the browser worker
          const { queueToolRequest } = require("./kv-utils.js");
          const claudeConnectedNotification = {
            sessionCode: targetSession.legacyCode,
            tool: "__claude_connected__", // Special internal event
            arguments: {
              claudeSessionId: sessionId,
              codapSessionId: targetSessionId,
              pairingSessionId,
              timestamp: new Date().toISOString()
            },
            requestId: `claude_connected_${Date.now()}`,
            timestamp: Date.now(),
            mcpSessionId: sessionId,
            isNotification: true // Mark as notification, not tool request
          };
          
          await queueToolRequest(claudeConnectedNotification);
          console.log(`[MCP] Queued claude-connected notification for session ${targetSession.legacyCode}`);
        } catch (error) {
          console.error(`[MCP] Failed to queue claude-connected notification:`, error);
          // Don't fail the connection if notification fails
        }
      }
      
      // CRITICAL FIX: Get the actual capabilities that are now available
      // First, get the target session's capabilities to determine what should be transferred
      let targetCapabilities = ["CODAP"]; // Default
      let transferSuccess = false;
      
      try {
        const targetUnifiedSession = await getUnifiedSession(targetSessionId);
        if (targetUnifiedSession && Array.isArray(targetUnifiedSession.capabilities)) {
          targetCapabilities = targetUnifiedSession.capabilities;
          console.log(`[MCP] Target session ${targetSessionId} has capabilities:`, targetCapabilities);
        } else {
          console.log(`[MCP] Target session ${targetSessionId} has no capabilities, defaulting to CODAP`);
        }
      } catch (error) {
        console.log(`[MCP] Could not get target session capabilities:`, error.message);
      }
      
      // Verify the capability transfer worked
      let availableCapabilities = targetCapabilities; // Use target capabilities as the source of truth
      try {
        const claudeUnifiedSession = await getUnifiedSession(sessionId);
        if (claudeUnifiedSession && Array.isArray(claudeUnifiedSession.capabilities)) {
          availableCapabilities = claudeUnifiedSession.capabilities;
          transferSuccess = true;
          console.log(`[MCP] Claude session ${sessionId} successfully inherited capabilities:`, availableCapabilities);
        } else {
          console.log(`[MCP] Claude session ${sessionId} capability transfer failed, using target capabilities directly`);
          // Force the transfer by creating the unified session entry
          const { setSession } = require("./kv-utils.js");
          const claudeUnifiedSession = {
            sessionId,
            capabilities: targetCapabilities,
            connectedTo: targetSessionId,
            connectionTime: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
            createdAt: Date.now(),
            type: "claude-desktop-unified"
          };
          await setSession(sessionId, claudeUnifiedSession);
          availableCapabilities = targetCapabilities;
          transferSuccess = true;
          console.log(`[MCP] Forced capability transfer for Claude session ${sessionId}:`, availableCapabilities);
        }
      } catch (error) {
        console.log(`[MCP] Error verifying capability transfer:`, error.message);
        availableCapabilities = targetCapabilities; // Fall back to target capabilities
      }
      
      // Get the actual tools that will be available
      let getToolsByCapabilities;
      try {
        const toolRegistry = require("./tool-registry.js");
        getToolsByCapabilities = toolRegistry.getToolsByCapabilities;
      } catch (error) {
        console.error("[MCP] Failed to import tool registry:", error);
        getToolsByCapabilities = null;
      }
      
      let availableTools = [];
      if (getToolsByCapabilities) {
        availableTools = getToolsByCapabilities(availableCapabilities);
      } else {
        availableTools = CODAP_TOOLS; // Fallback to CODAP only
      }
      
      const codapTools = availableTools.filter(t => !t.name.startsWith("sage_"));
      const sageTools = availableTools.filter(t => t.name.startsWith("sage_"));
      
      // Generate capability-specific response with EXACT tool counts and names
      const hasCodeap = availableCapabilities.includes("CODAP");
      const hasSageModeler = availableCapabilities.includes("SAGEMODELER");
      
      let capabilityText = "";
      if (hasCodeap && hasSageModeler) {
        capabilityText = `\n\n🎯 **This is a CODAP- and SageModeler-equipped session**\n\n`;
        capabilityText += `✅ **DUAL CAPABILITIES**: Both CODAP and SageModeler tools are available in this session.\n\n`;
        capabilityText += `⚠️ **IMPORTANT**: Only tools marked **[CODAP]** or **[SAGEMODELER]** are valid for use during this session. Use of any non-valid tools will return errors and waste time.\n\n`;
        capabilityText += `**✅ Valid Tools for This Session** (${availableTools.length + 1} total):\n\n`;
        capabilityText += `**[CODAP] Tools** (${codapTools.length} tools) - Data analysis & visualization:\n`;
        capabilityText += codapTools.map(t => `• ${t.name}`).join("\n") + "\n\n";
        capabilityText += `**[SAGEMODELER] Tools** (${sageTools.length} tools) - Systems modeling:\n`;
        capabilityText += sageTools.map(t => `• ${t.name}`).join("\n") + "\n\n";
        capabilityText += `**[CONNECTION] Tool** (1 tool):\n• connect_to_session`;
      } else if (hasCodeap) {
        capabilityText = `\n\n🎯 **This is a CODAP-only session**\n\n`;
        capabilityText += `🚫 **CRITICAL**: SageModeler tools (sage_*) are NOT available in this session and will return "Tool not found" errors.\n\n`;
        capabilityText += `⚠️ **IMPORTANT**: Only tools marked **[CODAP]** are valid for use during this session. Use of any non-valid tools will return errors and waste time.\n\n`;
        capabilityText += `**✅ Valid Tools for This Session** (${availableTools.length + 1} total):\n\n`;
        capabilityText += `**[CODAP] Tools** (${codapTools.length} tools):\n`;
        capabilityText += codapTools.map(t => `• ${t.name}`).join("\n") + "\n\n";
        capabilityText += `**[CONNECTION] Tool** (1 tool):\n• connect_to_session\n\n`;
        capabilityText += `🚫 **Unavailable in this session**: All SageModeler tools (sage_create_node, sage_update_node, etc.) - these will fail with "Tool not found" errors.`;
      } else if (hasSageModeler) {
        capabilityText = `\n\n🎯 **This is a SageModeler-only session**\n\n`;
        capabilityText += `🚫 **CRITICAL**: CODAP tools are NOT available in this session and will return "Tool not found" errors.\n\n`;
        capabilityText += `⚠️ **IMPORTANT**: Only tools marked **[SAGEMODELER]** are valid for use during this session. Use of any non-valid tools will return errors and waste time.\n\n`;
        capabilityText += `**✅ Valid Tools for This Session** (${availableTools.length + 1} total):\n\n`;
        capabilityText += `**[SAGEMODELER] Tools** (${sageTools.length} tools) - Systems modeling:\n`;
        capabilityText += sageTools.map(t => `• ${t.name}`).join("\n") + "\n\n";
        capabilityText += `**[CONNECTION] Tool** (1 tool):\n• connect_to_session\n\n`;
        capabilityText += `🚫 **Unavailable in this session**: All CODAP tools (createDataContext, createGraph, etc.) - these will fail with "Tool not found" errors.`;
      }
      
      return {
        jsonrpc: "2.0",
        result: {
          content: [{
            type: "text",
            text: `✅ **Connected successfully to CODAP session '${targetSessionId}'!**\n\n**Session Details:**\n- Session ID: ${targetSessionId}\n- Legacy Code: ${targetSession.legacyCode}\n- Status: ${targetSession.status}\n- Created: ${new Date(targetSession.createdAt).toLocaleString()}${capabilityText}\n\n💡 **Session Active**: Your tool list has been updated to match this session's capabilities. Only the tools listed above are available for use in this session.`
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
   * Generate contextual instructions based on session capabilities
   */
  async generateContextualInstructions(sessionId) {
    let capabilities = ["CODAP"]; // Default
    let environmentStatus = "CODAP workspace connection required";
    
    if (sessionId) {
      const session = await getUnifiedSession(sessionId);
      if (session && Array.isArray(session.capabilities) && session.capabilities.length > 0) {
        capabilities = session.capabilities;
        environmentStatus = `Connected with ${capabilities.join(" + ")} capabilities`;
      }
    }
    
    const hasCodeap = capabilities.includes("CODAP");
    const hasSageModeler = capabilities.includes("SAGEMODELER");
    
    let instructions = "🔧 **CODAP MCP Server Ready**\n\n";
    
    // Environment status
    instructions += `**Environment Status**: ${environmentStatus}\n\n`;
    
    // Available tool categories
    instructions += "**Available Tool Categories**:\n";
    if (hasCodeap) {
      instructions += "✅ **CODAP Tools** (34 tools) - Data analysis, visualization, workspace management\n";
    }
    if (hasSageModeler) {
      instructions += "✅ **SageModeler Tools** (25 tools) - Systems modeling, node/link management, simulation\n";
    }
    instructions += "✅ **Connection Tools** (1 tool) - Session management\n\n";
    
    // Usage guidelines
    instructions += "**🎯 Tool Usage Guidelines**:\n";
    if (hasCodeap && hasSageModeler) {
      instructions += "• Use **CODAP tools** (createDataContext, createGraph, etc.) for data analysis tasks\n";
      instructions += "• Use **SageModeler tools** (sage_create_node, sage_run_experiment, etc.) for systems modeling\n";
      instructions += "• Check tool descriptions for specific environment requirements\n";
      instructions += "• Both environments are available in this session\n\n";
    } else if (hasCodeap) {
      instructions += "• Use **CODAP tools** for data analysis and visualization\n";
      instructions += "• SageModeler tools are not available in this session\n";
      instructions += "• Connect to a dual-capability session for SageModeler access\n\n";
    } else {
      instructions += "• Use 'connect_to_session' to establish workspace connection\n";
      instructions += "• Available tools depend on the target session's capabilities\n\n";
    }
    
    // Connection guidance
    if (!sessionId || sessionId.startsWith("claude-desktop-")) {
      instructions += "**🔗 Connection Options**:\n";
      instructions += "• Current session has default capabilities\n";
      instructions += "• Use 'connect_to_session' with a CODAP session ID for workspace-specific tools\n";
      instructions += "• Session capabilities will determine available tool sets\n";
    }
    
    return instructions;
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
    const sessionCode = sessionId.split("-").pop(); // Extract CODAP session ID from MCP session ID
    const internalRequest = {
      sessionCode, // Use the session code that browser worker listens to
      tool: toolName,
      arguments: toolArgs,
      requestId,
      timestamp: Date.now(),
      mcpSessionId: sessionId
    };
    
    try {
      // Queue request using existing system
      console.log(`[MCP] DEBUG: sessionId=${sessionId}, session.legacyCode=${session.legacyCode}, sessionCode=${sessionCode}`);
      console.log(`[MCP] Queueing tool execution: ${toolName} for session ${session.legacyCode} (queue: queue:${sessionCode})`);
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

  async waitForResponse(requestId, internalRequest, timeout = 8000) {
    const startTime = Date.now();
    const pollInterval = 200; // Poll every 200ms for faster response
    
    console.log(`[MCP] Waiting for response ${requestId} with ${timeout}ms timeout`);
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await getToolResponse(requestId);
        if (response) {
          console.log(`[MCP] Response received for ${requestId} after ${Date.now() - startTime}ms`);
          return response;
        }
      } catch (error) {
        console.error(`[MCP] Error checking response for ${requestId}:`, error);
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error(`MCP error -32099: Relay error: Request timed out after ${timeout}ms. This may indicate browser worker connection issues or slow CODAP operations. Try refreshing the CODAP plugin or reconnecting.`);
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
  
  // UNIFIED SESSION FIX: Also check URL query parameters for sessionId
  if (!headers.sessionId) {
    const url = new URL(req.url);
    headers.sessionId = url.searchParams.get("sessionId");
  }
  
  headers.clientInfo = req.headers.get("mcp-client-info") || req.headers.get("x-mcp-client-info");
  headers.protocolVersion = req.headers.get("mcp-protocol-version") || req.headers.get("x-mcp-protocol-version");
  
  // Legacy CODAP headers for backward compatibility
  headers.legacySessionCode = req.headers.get("x-session-code") || req.headers.get("session-code");
  
  // Security headers
  headers.userAgent = req.headers.get("user-agent");
  headers.origin = req.headers.get("origin");
  headers.referer = req.headers.get("referer");
  
  // For session-agnostic approach: allow null session ID
  // Session ID will only be set when explicitly provided via headers or URL
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
      
      // CAPABILITY FIX: Pre-populate Claude sessions with dual capabilities
      try {
        const { setSession } = require("./kv-utils.js");
        const claudeSessionData = {
          sessionId,
          capabilities: ["CODAP"], // Start with CODAP-only by default
          type: "claude-desktop-auto",
          createdAt: Date.now(),
          expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
          autoCreated: true
        };
        
        await setSession(sessionId, claudeSessionData);
        console.log(`[MCP] Pre-populated Claude session ${sessionId} with dual capabilities`);
      } catch (error) {
        console.error(`[MCP] Failed to pre-populate Claude session:`, error);
        // Continue anyway with default behavior
      }
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
    service: "",
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
  if (arguments_obj && typeof arguments_obj === "object") {
    // Direct session ID in arguments
    if (arguments_obj.sessionId) {
      return arguments_obj.sessionId;
    }
    
    // Check for natural language patterns in various argument fields
    const textFields = ["instruction", "command", "message", "text", "description"];
    for (const field of textFields) {
      if (arguments_obj[field] && typeof arguments_obj[field] === "string") {
        const sessionMatch = arguments_obj[field].match(/(?:connect to|session)\s+(?:codap\s+)?session\s+([A-Z0-9]{8})/i);
        if (sessionMatch) {
          return sessionMatch[1].toUpperCase();
        }
      }
    }
    
    // Check all string values for session patterns
    for (const [key, value] of Object.entries(arguments_obj)) {
      if (typeof value === "string") {
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
    headers.userAgent || "unknown-agent",
    headers.origin || "unknown-origin",
    req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown-ip",
    headers.clientInfo || "unknown-client"
  ];
  
  // Create a hash of the factors for uniqueness
  const factorString = factors.join("|");
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
