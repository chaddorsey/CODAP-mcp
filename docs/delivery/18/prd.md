# PBI-18: Convert Vercel Server to Full MCP Protocol Compliance

[View in Backlog](../backlog.md#user-content-18)

## Overview

Transform the current custom Vercel API server into a fully MCP-compliant server that presents as a canonical MCP server to LLMs, enabling direct integration with MCP-compatible clients like Claude Desktop, Cursor, and other AI applications without requiring custom client implementations.

## Problem Statement

The current Vercel server uses custom REST API endpoints (`/api/metadata`, `/api/request`, `/api/response`) that do not conform to the official MCP specification. This creates significant barriers to adoption and integration:

**Current Architecture Issues:**
- **Non-Standard Protocol**: Uses custom JSON schemas instead of JSON-RPC 2.0 message format
- **Missing MCP Lifecycle**: No initialization handshake, capability negotiation, or proper session management
- **Custom Tool Discovery**: `/metadata` endpoint doesn't follow MCP `list_tools` specification  
- **Incompatible Message Format**: Custom request/response format vs. standard MCP message types
- **No Transport Standards**: Missing StreamableHTTP or stdio transport compliance
- **Limited Client Support**: Requires custom API clients instead of leveraging MCP ecosystem

**Business Impact:**
- **High Integration Friction**: Developers must write custom clients instead of using standard MCP libraries
- **Ecosystem Isolation**: Cannot leverage existing MCP tooling, documentation, and community
- **Maintenance Burden**: Custom protocol requires ongoing maintenance vs. standard compliance
- **Limited Adoption**: Non-standard protocol prevents integration with popular MCP-enabled applications

## User Stories

**Primary Story**: As an LLM application developer, I want the CODAP-MCP server to be fully MCP protocol compliant so that I can integrate CODAP tools using standard MCP clients without custom API implementations.

**Supporting Stories**:
- **As a Claude Desktop user**, I want to add the CODAP-MCP server to my MCP configuration so that I can use CODAP tools directly in my conversations
- **As a Cursor user**, I want the CODAP-MCP server to appear as a standard MCP server so that I can use CODAP tools in my IDE workflows  
- **As an MCP SDK developer**, I want to connect to CODAP-MCP using standard TypeScript/Python MCP clients so that I can build applications without learning custom APIs
- **As a system administrator**, I want MCP-standard configuration and monitoring so that CODAP-MCP integrates with existing MCP infrastructure
- **As an API consumer**, I want standard MCP error handling and status codes so that my error handling logic works consistently across MCP servers

## Technical Approach

### **1. MCP Server Implementation Strategy**

Replace the current custom Vercel API with a fully compliant MCP server while maintaining backward compatibility:

```typescript
// New MCP-compliant endpoint: /api/mcp
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

export default async function handler(req, res) {
  const server = new Server({
    name: "codap-mcp-server",
    version: "1.0.0"
  }, {
    capabilities: { 
      tools: {},
      resources: {},
      prompts: {}
    }
  });
  
  // MCP-compliant tool registration
  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    const sessionId = getSessionFromHeaders(req);
    return {
      tools: await getSessionTools(sessionId)
    };
  });
  
  // MCP-compliant tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const sessionId = getSessionFromHeaders(req);
    return await executeToolViaBrowserWorker(sessionId, request.params);
  });
  
  // Use StreamableHTTP transport for Vercel compatibility
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => generateSessionId()
  });
  
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
```

### **2. Protocol Compliance Requirements**

**JSON-RPC 2.0 Compliance:**
- All communication via JSON-RPC 2.0 request/response/notification messages
- Proper error handling with standard JSON-RPC error codes (-32700 to -32099)
- Batch message support for multiple operations
- Correct message ID correlation and response matching

**MCP Lifecycle Implementation:**
- `initialize` request/response with capability negotiation
- Server info exchange with name, version, capabilities
- Proper connection termination and cleanup
- Session management with `Mcp-Session-Id` headers

**Tool Registration & Discovery:**
- Convert current tool schemas to MCP `ToolDefinition` format
- Dynamic tool discovery based on session state (integrates with PBI 17)
- Proper JSON Schema validation for tool inputs and outputs
- Tool metadata including descriptions, categories, and examples

**Transport Layer:**
- StreamableHTTP transport implementation optimized for Vercel Edge Functions
- SSE streaming for long-running operations and real-time updates
- Session resumability and connection recovery
- Proper HTTP status codes and headers

### **3. Implementation Architecture**

**Dual-Protocol Support (Migration Phase):**
```typescript
// Route configuration in vercel.json
{
  "functions": {
    "api/mcp.js": {
      "runtime": "nodejs18.x"
    }
  },
  "rewrites": [
    {
      "source": "/mcp/:path*",
      "destination": "/api/mcp"
    },
    {
      "source": "/api/sessions/:code/mcp",
      "destination": "/api/mcp"
    }
  ]
}
```

**Session-Aware Tool Management:**
```typescript
// Integration with existing session system
server.setRequestHandler(ListToolsRequestSchema, async (request) => {
  const sessionId = extractSessionId(request);
  
  // Get session-specific tools (supports PBI 17)
  const sessionTools = await getSessionTools(sessionId);
  
  return {
    tools: sessionTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.schema
    }))
  };
});

// MCP-compliant tool execution with existing browser worker
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const sessionId = extractSessionId(request);
  
  // Route to existing browser worker system
  const result = await executeTool(sessionId, name, args);
  
  // Return MCP-compliant response
  return {
    content: [{
      type: "text",
      text: formatToolResult(result)
    }]
  };
});
```

**Error Handling & Standards Compliance:**
```typescript
// JSON-RPC compliant error responses
function handleToolError(error: Error, requestId: string) {
  if (error instanceof ToolNotFoundError) {
    throw {
      code: -32601,
      message: "Method not found",
      data: { toolName: error.toolName }
    };
  }
  
  if (error instanceof ValidationError) {
    throw {
      code: -32602,
      message: "Invalid params",
      data: { validationErrors: error.errors }
    };
  }
  
  throw {
    code: -32603,
    message: "Internal error",
    data: { originalError: error.message }
  };
}
```

### **4. Migration Strategy**

**Phase 1: Parallel Implementation (Weeks 1-2)**
- Implement new `/api/mcp` endpoint alongside existing custom APIs
- MCP server with current static tool set
- Basic compatibility testing with MCP clients

**Phase 2: Integration & Testing (Weeks 3-4)**
- Integrate with existing browser worker system
- Session management compatibility
- Comprehensive testing with Claude Desktop, Cursor, MCP SDK

**Phase 3: Enhanced Features (Weeks 5-6)**
- Dynamic tool registration support (PBI 17 integration)
- Advanced MCP features (resources, prompts)
- Performance optimization and monitoring

**Phase 4: Migration & Deprecation (Weeks 7-8)**
- Update browser worker to use MCP protocol internally
- Deprecation notices for custom API endpoints
- Documentation and migration guides

## UX/UI Considerations

**For LLM Application Users:**
- **Seamless Integration**: Standard MCP configuration works out-of-the-box
- **Familiar Patterns**: Consistent with other MCP servers they use
- **Better Error Messages**: Standard MCP error format with clear descriptions
- **Configuration Simplicity**: Single URL configuration instead of multiple endpoints

**For Developers:**
- **Standard Libraries**: Use existing MCP client libraries without modification
- **Familiar Development Patterns**: Standard MCP development workflows
- **Better Documentation**: Leverage existing MCP documentation and examples
- **Debugging Tools**: Use standard MCP debugging and monitoring tools

**For System Administrators:**
- **Standard Configuration**: MCP server configuration patterns
- **Monitoring Integration**: Standard MCP metrics and health checks
- **Security Compliance**: Standard MCP security practices and audit trails

## Acceptance Criteria

### **Core MCP Compliance**
1. **JSON-RPC 2.0 Implementation**: All messages use proper JSON-RPC 2.0 format with correct error codes
2. **MCP Initialization**: Proper `initialize` request/response with capability negotiation
3. **Transport Implementation**: StreamableHTTP transport working on Vercel Edge Functions
4. **Session Management**: `Mcp-Session-Id` header support with session isolation
5. **Standard Request Handling**: `list_tools`, `call_tool`, and other MCP requests implemented

### **Tool Integration**
6. **Tool Discovery**: All current CODAP tools available via MCP `list_tools` request
7. **Dynamic Registration**: Integration with session-specific tools (PBI 17 compatibility)
8. **Schema Compliance**: All tool schemas valid JSON Schema draft-07 format
9. **Execution Pipeline**: Tool execution routed through existing browser worker system
10. **Result Formatting**: Tool results returned in MCP-compliant format

### **Client Compatibility**
11. **Claude Desktop Integration**: Successfully connects and executes tools via Claude Desktop
12. **Cursor Compatibility**: Works with Cursor's MCP integration
13. **MCP SDK Support**: Compatible with `@modelcontextprotocol/sdk` TypeScript client
14. **Python Client Support**: Works with Python MCP client libraries
15. **Configuration Standards**: Standard MCP server configuration format

### **Performance & Reliability**
16. **Response Times**: Tool execution latency equivalent to current custom API
17. **Session Resumability**: MCP sessions can resume after connection drops
18. **Error Recovery**: Graceful handling of network issues and timeouts
19. **Resource Management**: Proper cleanup of connections and sessions
20. **Monitoring Integration**: Standard MCP server metrics and health endpoints

### **Migration & Compatibility**
21. **Backward Compatibility**: Existing custom API endpoints continue working during migration
22. **Browser Worker Integration**: No changes required to existing browser worker code
23. **Session Compatibility**: Existing sessions work with both protocols
24. **Migration Documentation**: Clear migration path from custom API to MCP
25. **Deprecation Timeline**: 6-month deprecation notice for custom endpoints

## Dependencies

### **Technical Dependencies**
- **MCP SDK**: `@modelcontextprotocol/sdk` package compatibility with Vercel Edge Functions
- **Transport Layer**: StreamableHTTP transport implementation for serverless environments
- **Session System**: Integration with existing session management (PBI 1)
- **Browser Worker**: Compatibility with existing tool execution system (PBI 3)

### **Integration Dependencies**
- **Tool Registry**: Current tool schema system must be convertible to MCP format
- **Dynamic Tools**: Future integration with PBI 17 dynamic tool registration
- **Authentication**: Session-based authentication compatible with MCP headers

### **Testing Dependencies**
- **MCP Clients**: Access to Claude Desktop, Cursor, and MCP SDK for integration testing
- **Test Infrastructure**: MCP protocol testing tools and validation suites

## Open Questions

1. **Authentication Strategy**: How to handle API keys and authentication in MCP-compliant way?
2. **Resource Management**: Should we implement MCP resources in addition to tools?
3. **Prompt Templates**: Would MCP prompt templates be valuable for CODAP workflows?
4. **Batch Operations**: How to handle multiple tool calls efficiently in MCP format?
5. **Streaming Results**: How to handle long-running tool operations with MCP streaming?
6. **Error Recovery**: Best practices for MCP error recovery in serverless environment?
7. **Performance Monitoring**: How to instrument MCP protocol for observability?
8. **Version Management**: How to handle MCP protocol version evolution?

## Related Tasks

This PBI will be broken down into specific implementation tasks covering:

### **Core Implementation Tasks**
- MCP server endpoint implementation with StreamableHTTP transport
- JSON-RPC 2.0 message handling and error management
- Tool discovery and execution pipeline integration
- Session management with MCP headers

### **Integration Tasks**
- Browser worker compatibility and message routing
- Existing API backward compatibility maintenance
- Dynamic tool registration support (PBI 17 integration)
- Client library integration testing

### **Testing & Validation Tasks**
- MCP protocol compliance testing and validation
- Client compatibility testing (Claude Desktop, Cursor, SDK)
- Performance testing and optimization
- Migration testing and rollback procedures

### **Documentation & Migration Tasks**
- MCP configuration documentation and examples
- Migration guide from custom API to MCP protocol
- Client integration tutorials and best practices
- Deprecation timeline and communication plan

---

## Strategic Value

This PBI represents a critical architectural decision that transforms CODAP-MCP from a custom solution into a standards-compliant member of the MCP ecosystem. The investment in MCP compliance pays dividends through:

- **Reduced Integration Friction**: Developers can use familiar tools and patterns
- **Ecosystem Benefits**: Leverage existing MCP tooling, documentation, and community
- **Future-Proofing**: Standard compliance ensures compatibility with future MCP developments
- **Maintenance Reduction**: Less custom protocol maintenance, more focus on CODAP functionality

The timing is optimal: implementing this after PBI 16 (comprehensive tools) provides immediate value to a complete tool set, while positioning for PBI 17 (dynamic registration) creates the foundation for the ultimate plugin ecosystem vision.

---

## Extended Scope: Direct Tool Execution (Task 18-5 Extension)

### **Critical Implementation Gap Identified**

During task 18-5 implementation, a critical gap was identified in the MCP tool execution pipeline. The current implementation successfully handles:

✅ MCP protocol compliance (JSON-RPC 2.0)
✅ Tool discovery and registration 
✅ Session management with MCP headers
✅ Tool request queuing and response polling

❌ **Missing**: Actual tool execution without browser worker dependency

### **Problem Statement**

The current architecture assumes MCP clients will use the existing browser worker system (pairing banner → SSE stream → browser worker). However, MCP clients expect **direct API-based tool execution** without UI dependencies.

**Current Flow** (Incomplete for MCP):
```
MCP Client → /api/mcp → Queue Tool Request → ⏳ Wait for Browser Worker → Timeout (30s)
```

**Required Flow** (Complete for MCP):
```
MCP Client → /api/mcp → Direct Tool Execution → Return Results
```

### **Solution: Hybrid Execution System**

Extend task 18-5 to implement a **dual-mode tool execution system**:

1. **Browser Worker Mode** (Existing): For pairing banner users
2. **Direct Execution Mode** (New): For MCP clients

**Implementation Strategy:**

```typescript
// Extended MCPProtocolHandler in api/mcp.js
async handleToolCall(params, id, sessionId) {
  const { name: toolName, arguments: toolArgs } = params;
  
  // Check if session has active browser worker
  const hasBrowserWorker = await this.checkBrowserWorkerConnection(sessionId);
  
  if (hasBrowserWorker) {
    // Route to existing browser worker system
    return await this.executeBrowserWorkerTool(toolName, toolArgs, sessionId);
  } else {
    // Execute directly using server-side CODAP API simulation
    return await this.executeDirectTool(toolName, toolArgs, sessionId);
  }
}
```

### **Direct Tool Execution Implementation**

**Approach**: Create server-side implementations of the 33 CODAP tools using the existing `api/codap-tools.js` implementations, but modify them to work without browser dependency.

**Key Changes:**
1. **Mock CODAP API**: Implement server-side CODAP API simulation for MCP clients
2. **State Management**: Store CODAP state (data contexts, components) in KV storage
3. **Response Formatting**: Return MCP-compliant responses with simulated CODAP results

**Example Implementation:**
```typescript
// New: api/mcp-tool-executor.js
class DirectToolExecutor {
  async executeCreateDataContext(args, sessionId) {
    // Store data context in KV storage
    const dataContext = {
      name: args.name,
      collections: args.collections,
      created: Date.now(),
      sessionId
    };
    
    await kv.set(`session:${sessionId}:dataContext:${args.name}`, dataContext);
    
    return {
      success: true,
      values: {
        id: Math.floor(Math.random() * 1000),
        name: args.name,
        title: args.name,
        collections: args.collections.map(c => ({ id: Math.floor(Math.random() * 1000), name: c.name }))
      }
    };
  }
  
  async executeCreateItems(args, sessionId) {
    // Add items to stored data context
    const items = args.items.map(item => ({
      ...item,
      id: Math.floor(Math.random() * 1000)
    }));
    
    await kv.lpush(`session:${sessionId}:items:${args.dataContext}`, ...items.map(JSON.stringify));
    
    return {
      success: true,
      values: { itemIDs: items.map(i => i.id) }
    };
  }
}
```

### **Benefits of Extended Approach**

1. **Complete MCP Compatibility**: MCP clients get immediate tool execution
2. **Backward Compatibility**: Browser worker system unchanged
3. **Progressive Enhancement**: Sessions can upgrade from direct to browser worker mode
4. **Testing Capability**: Full end-to-end testing possible without browser dependency
5. **Demonstration Value**: MCP tools work immediately for evaluation

### **Implementation Notes**

- **Task 18-5 Extension**: Add direct tool execution mode alongside existing browser worker integration
- **KV Storage Schema**: Design session-based storage for CODAP state simulation
- **Error Handling**: Ensure both execution modes have consistent error responses
- **Performance**: Direct mode should be faster than browser worker for simple operations
- **Limitations**: Direct mode may not support all CODAP visualization features initially

### **Acceptance Criteria Updates**

Add to existing task 18-5 acceptance criteria:

26. **Direct Tool Execution**: MCP clients can execute tools without browser worker dependency
27. **Hybrid Mode Detection**: System automatically chooses execution mode based on session state
28. **State Persistence**: CODAP state maintained in KV storage for direct execution sessions
29. **Mode Transparency**: MCP clients receive consistent responses regardless of execution mode
30. **Performance Equivalence**: Direct execution mode performs at least as fast as browser worker mode for basic operations

This extension ensures PBI 18 delivers complete MCP compliance while maintaining all existing functionality. 