# MCP-Compliant Architecture Design
**PBI 18 - Task 18-1**  
**Created**: 2025-01-20  
**Version**: 1.0  

## Executive Summary

This document defines the comprehensive architecture for converting the existing Vercel-based CODAP tool server to full MCP (Model Context Protocol) compliance using the `@modelcontextprotocol/sdk` v1.12.3 and StreamableHTTP transport. The design maintains backward compatibility while enabling standard MCP client integration.

## Current System Analysis

### **Existing Architecture Overview**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CODAP Plugin  │───▶│  Vercel Server  │───▶│ Browser Worker  │
│   (Frontend)    │    │  (Custom API)   │    │   (Tool Exec)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Current API Endpoints**
- `POST /api/sessions` - Session creation with 8-character codes
- `GET /api/metadata` - Tool discovery and schema manifest  
- `POST /api/request` - Tool execution requests
- `GET /api/response` - Tool execution results retrieval
- `GET /api/stream` - Server-Sent Events for real-time updates
- Vercel KV storage for session/queue management

### **Current Tool Integration**
- **33 CODAP tools** implemented in comprehensive registry
- JSON Schema Draft-07 validation for all tool parameters
- Browser worker delegation for CODAP API interactions
- Session-aware tool execution with TTL management

## MCP Protocol Compliance Requirements

### **MCP v1.0 Specification Adherence**
1. **JSON-RPC 2.0 Protocol**: All messages must use standard JSON-RPC 2.0 format
2. **StreamableHTTP Transport**: Replace custom SSE with MCP-compliant StreamableHTTP
3. **Standard Lifecycle**: Implement initialize → capabilities → tools → execute flow
4. **Tool Discovery**: MCP-compliant `list_tools` and `call_tool` operations
5. **Session Management**: Use `Mcp-Session-Id` header standard

### **SDK Integration Requirements**
```typescript
// Target MCP SDK Integration
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
```

## Proposed MCP Architecture

### **High-Level Architecture**
```
┌─────────────────┐    ┌─────────────────────────────────┐    ┌─────────────────┐
│   MCP Client    │───▶│      Vercel MCP Server          │───▶│ Browser Worker  │
│ (Claude/Cursor) │    │  • StreamableHTTP Transport     │    │   (Tool Exec)   │
│                 │    │  • JSON-RPC 2.0 Protocol       │    │                 │
│                 │    │  • Session Management          │    │                 │
│                 │    │  • Dual Protocol Support       │    │                 │
└─────────────────┘    └─────────────────────────────────┘    └─────────────────┘
```

### **Core MCP Server Implementation**
```typescript
interface MCPServerArchitecture {
  transport: {
    type: 'StreamableHTTP';
    endpoint: '/api/mcp';
    deployment: 'vercel-functions';
    sessionManagement: 'mcp-session-id-header';
    streaming: 'server-sent-events';
  };
  
  messageHandling: {
    protocol: 'JSON-RPC-2.0';
    initialization: 'standard-mcp-lifecycle';
    capabilities: ['tools', 'session-management'];
    errorHandling: 'json-rpc-error-codes';
  };
  
  toolIntegration: {
    registry: 'existing-codap-tools';
    execution: 'browser-worker-delegation';
    discovery: 'session-aware-dynamic';
    validation: 'json-schema-draft-07';
  };
  
  compatibility: {
    backward: 'dual-protocol-support';
    migration: 'gradual-deprecation';
    clients: ['claude-desktop', 'cursor', 'mcp-sdk'];
  };
}
```

## MCP Protocol Message Flow

### **1. Initialization Sequence**
```json
// Client → Server: Initialize Request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {},
      "session": {}
    },
    "clientInfo": {
      "name": "cursor",
      "version": "0.44.9"
    }
  }
}

// Server → Client: Initialize Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {
        "listChanged": true
      }
    },
    "serverInfo": {
      "name": "codap-mcp-server",
      "version": "1.0.0"
    }
  }
  // MCP Session ID returned via HTTP header
  // "Mcp-Session-Id": "uuid-session-identifier"
}
```

### **2. Tool Discovery Flow**
```json
// Client → Server: List Tools Request
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}

// Server → Client: List Tools Response
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
            "title": {"type": "string"},
            "collections": {"type": "array"}
          },
          "required": ["name"]
        }
      }
      // ... 32 more CODAP tools
    ]
  }
}
```

### **3. Tool Execution Flow**
```json
// Client → Server: Call Tool Request
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "createDataContext",
    "arguments": {
      "name": "StudentData",
      "title": "Student Performance Data",
      "collections": [...]
    }
  }
}

// Server → Client: Call Tool Response (via StreamableHTTP)
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Successfully created data context 'StudentData' with 1 collection"
      }
    ]
  }
}
```

## Session Management Integration

### **MCP Session Strategy**
```typescript
interface MCPSessionManagement {
  headers: {
    'Mcp-Session-Id': string; // Generated UUID maps to existing sessionCode
    'Content-Type': 'application/json';
  };
  
  lifecycle: {
    initialize: {
      trigger: 'mcp-initialize-request';
      action: 'create-session-if-needed';
      mapping: 'uuid → 8-char-code';
      storage: 'existing-vercel-kv';
    };
    
    tools: {
      discovery: 'session-aware-tool-list';
      execution: 'session-context-delegation';
      state: 'maintain-existing-browser-worker-connection';
    };
    
    cleanup: {
      ttl: 'existing-10-minute-expiration';
      deletion: 'http-delete-mcp-endpoint';
      fallback: 'automatic-expiration';
    };
  };
  
  compatibility: {
    existing: 'bidirectional-session-mapping';
    migration: 'transparent-upgrade-path';
  };
}
```

### **Session Mapping Strategy**
```typescript
// Session ID Mapping
interface SessionMapping {
  mcpSessionId: string;      // MCP Session ID (UUID)
  legacySessionCode: string; // Existing 8-character code
  browserWorkerConnection: string;
  createdAt: Date;
  expiresAt: Date;
}

// Example Implementation
const sessionMapping = {
  mcpSessionId: "550e8400-e29b-41d4-a716-446655440000",
  legacySessionCode: "ABC123XY",
  browserWorkerConnection: "ws://browser-worker-connection",
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
};
```

## Conclusion

This architecture provides a comprehensive path to MCP compliance while maintaining full backward compatibility and system performance. 