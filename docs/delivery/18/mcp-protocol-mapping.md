# MCP Protocol Mapping Analysis
**PBI 18 - Task 18-1**  
**Created**: 2025-01-20  
**Version**: 1.0  

## Current API to MCP Mapping

### **Session Management Mapping**
```typescript
// Current → MCP Protocol Mapping
POST /api/sessions → MCP initialize request/response with session creation

// Current Request
POST /api/sessions
Content-Type: application/json
{}

// Current Response  
{
  "sessionCode": "ABC123XY",
  "ttl": 600000,
  "relayBaseUrl": "https://codap-mcp.vercel.app"
}

// MCP Equivalent
POST /api/mcp
Content-Type: application/json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {"tools": {}},
    "clientInfo": {"name": "cursor", "version": "0.44.9"}
  }
}

// MCP Response (with session header)
HTTP Headers: Mcp-Session-Id: uuid-session-id
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {"tools": {"listChanged": true}},
    "serverInfo": {"name": "codap-mcp-server", "version": "1.0.0"}
  }
}
```

### **Tool Discovery Mapping**
```typescript
// Current → MCP Protocol Mapping  
GET /api/metadata → MCP tools/list request/response

// Current Request
GET /api/metadata?sessionCode=ABC123XY
Accept: application/json

// Current Response
{
  "version": "1.0.0",
  "tools": [
    {
      "name": "createDataContext",
      "description": "Create a new data context in CODAP",
      "parameters": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "title": {"type": "string"}
        },
        "required": ["name"]
      }
    }
    // ... more tools
  ]
}

// MCP Equivalent
POST /api/mcp
Mcp-Session-Id: uuid-session-id
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}

// MCP Response
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "createDataContext",
        "description": "Create a new data context in CODAP",
        "inputSchema": {
          "type": "object",
          "properties": {
            "name": {"type": "string"},
            "title": {"type": "string"}
          },
          "required": ["name"]
        }
      }
      // ... more tools
    ]
  }
}
```

### **Tool Execution Mapping**
```typescript
// Current → MCP Protocol Mapping
POST /api/request + GET /api/stream → MCP tools/call with StreamableHTTP

// Current Tool Execution Flow
// 1. Submit request
POST /api/request
{
  "sessionCode": "ABC123XY",
  "tool": "createDataContext",
  "arguments": {
    "name": "StudentData",
    "title": "Student Performance Data"
  }
}

// 2. Listen for results
GET /api/stream?sessionCode=ABC123XY
Accept: text/event-stream

// 3. Receive SSE response
data: {"tool": "createDataContext", "result": {"success": true, "dataContextId": "dc123"}}

// MCP Equivalent (Single Request/Response)
POST /api/mcp
Mcp-Session-Id: uuid-session-id
Content-Type: application/json
Accept: text/event-stream

{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "createDataContext",
    "arguments": {
      "name": "StudentData",
      "title": "Student Performance Data"
    }
  }
}

// MCP Response (via StreamableHTTP SSE)
Content-Type: text/event-stream

data: {"jsonrpc": "2.0", "id": 3, "result": {"content": [{"type": "text", "text": "Successfully created data context 'StudentData'"}]}}
```

## Message Format Transformation

### **Tool Parameter Schema Mapping**
```typescript
// Current format (JSON Schema Draft-07)
const currentSchema = {
  "type": "object",
  "properties": {
    "name": {"type": "string"},
    "collections": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "attrs": {"type": "array"}
        }
      }
    }
  },
  "required": ["name"]
};

// MCP format (same schema, different container)
const mcpTool = {
  "name": "createDataContext",
  "description": "Create a new data context in CODAP",
  "inputSchema": currentSchema // Direct reuse - no transformation needed!
};
```

### **Error Handling Mapping**
```typescript
// Current Error Format
{
  "error": "Session expired",
  "code": "SESSION_EXPIRED",
  "sessionCode": "ABC123XY"
}

// MCP Error Format (JSON-RPC 2.0)
{
  "jsonrpc": "2.0",
  "id": 3,
  "error": {
    "code": -32002,
    "message": "Session expired",
    "data": {
      "sessionId": "uuid-session-id",
      "originalCode": "SESSION_EXPIRED"
    }
  }
}
```

## Integration Bridge Implementation

### **Session ID Mapping Strategy**
```typescript
// Bidirectional Session Mapping
interface SessionBridge {
  // MCP → Legacy mapping
  fromMCPSession(mcpSessionId: string): string {
    const mapping = await kv.get(`mcp:${mcpSessionId}`);
    return mapping?.legacyCode || generateLegacyCode();
  }
  
  // Legacy → MCP mapping  
  toMCPSession(legacyCode: string): string {
    const mapping = await kv.get(`legacy:${legacyCode}`);
    return mapping?.mcpSessionId || crypto.randomUUID();
  }
  
  // Store bidirectional mapping
  async createMapping(mcpId: string, legacyCode: string) {
    await Promise.all([
      kv.set(`mcp:${mcpId}`, {legacyCode, createdAt: Date.now()}),
      kv.set(`legacy:${legacyCode}`, {mcpSessionId: mcpId, createdAt: Date.now()})
    ]);
  }
}
```

### **Tool Request Transformation**
```typescript
// MCP to Internal Format Bridge
class MCPToolBridge {
  async transformMCPRequest(mcpRequest: MCPToolCall): Promise<InternalToolRequest> {
    return {
      sessionCode: await this.sessionBridge.fromMCPSession(mcpRequest.sessionId),
      tool: mcpRequest.params.name,
      arguments: mcpRequest.params.arguments,
      requestId: mcpRequest.id,
      timestamp: Date.now()
    };
  }
  
  async transformInternalResponse(internalResponse: InternalToolResponse): Promise<MCPToolResponse> {
    return {
      jsonrpc: "2.0",
      id: internalResponse.requestId,
      result: {
        content: [
          {
            type: "text",
            text: typeof internalResponse.result === 'string' 
              ? internalResponse.result 
              : JSON.stringify(internalResponse.result)
          }
        ]
      }
    };
  }
}
```

### **Browser Worker Integration Bridge**
```typescript
// Bridge MCP requests to existing browser worker system
class BrowserWorkerBridge {
  async executeMCPTool(toolCall: MCPToolCall, sessionId: string): Promise<MCPToolResponse> {
    // 1. Transform MCP request to internal format
    const internalRequest = await this.mcpBridge.transformMCPRequest(toolCall);
    
    // 2. Use existing queue system
    await queueToolRequest(internalRequest);
    
    // 3. Delegate to existing browser worker via SSE
    const result = await this.waitForBrowserWorkerResponse(internalRequest.requestId);
    
    // 4. Transform response back to MCP format
    return await this.mcpBridge.transformInternalResponse(result);
  }
  
  private async waitForBrowserWorkerResponse(requestId: string): Promise<InternalToolResponse> {
    // Reuse existing SSE polling mechanism
    return new Promise((resolve, reject) => {
      const pollForResult = async () => {
        const result = await checkForToolResponse(requestId);
        if (result) {
          resolve(result);
        } else {
          setTimeout(pollForResult, 100); // Continue polling
        }
      };
      pollForResult();
    });
  }
}
```

## Compatibility Strategy

### **Dual Protocol Support**
```typescript
// Request Router for Dual Protocol Support
export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const contentType = req.headers.get('content-type');
  const mcpSessionId = req.headers.get('mcp-session-id');
  
  // MCP Protocol Detection
  if (url.pathname === '/api/mcp' && contentType?.includes('application/json')) {
    return handleMCPRequest(req);
  }
  
  // Legacy Protocol Routes
  if (url.pathname === '/api/sessions') return handleLegacySessions(req);
  if (url.pathname === '/api/metadata') return handleLegacyMetadata(req);
  if (url.pathname === '/api/request') return handleLegacyRequest(req);
  if (url.pathname === '/api/response') return handleLegacyResponse(req);
  if (url.pathname === '/api/stream') return handleLegacyStream(req);
  
  return new Response('Not Found', { status: 404 });
}
```

### **Migration Timeline**
```typescript
// Phase 1: Deploy MCP alongside existing API (Week 1-2)
const phase1Config = {
  endpoints: {
    mcp: '/api/mcp',           // New MCP endpoint
    legacy: '/api/*'           // All existing endpoints maintained
  },
  features: ['dual-protocol', 'session-mapping', 'tool-bridge']
};

// Phase 2: Client migration period (Month 1-2)  
const phase2Config = {
  endpoints: {
    mcp: '/api/mcp',           // Primary endpoint
    legacy: '/api/*'           // Deprecated but functional
  },
  features: ['deprecation-warnings', 'usage-metrics', 'migration-guides']
};

// Phase 3: Legacy endpoint retirement (Month 3+)
const phase3Config = {
  endpoints: {
    mcp: '/api/mcp',           // Only MCP endpoint
    legacy: undefined          // Removed
  },
  features: ['mcp-only', 'performance-optimized']
};
```

## Success Metrics

### **Compatibility Verification**
- [ ] All 33 CODAP tools accessible via MCP protocol
- [ ] Session management maintains existing TTL behavior  
- [ ] Browser worker integration preserves all functionality
- [ ] Existing clients continue working during migration
- [ ] MCP clients can discover and execute all tools

### **Performance Benchmarks**
- [ ] MCP initialization < 500ms
- [ ] Tool discovery (list_tools) < 200ms  
- [ ] Tool execution latency within 10% of current performance
- [ ] Session creation overhead < 100ms additional
- [ ] Memory usage increase < 20%

### **Protocol Compliance**
- [ ] JSON-RPC 2.0 specification fully implemented
- [ ] StreamableHTTP transport specification compliant
- [ ] MCP lifecycle (initialize → capabilities → tools) working
- [ ] Error handling uses standard JSON-RPC error codes
- [ ] Session management via Mcp-Session-Id headers 