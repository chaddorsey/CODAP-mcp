# PBI-18: MCP Protocol Compliance Architecture Design

## Overview

This document specifies the architecture for transforming the current custom Vercel API server into a fully MCP-compliant server that integrates seamlessly with the Model Context Protocol ecosystem while maintaining backward compatibility and leveraging existing infrastructure.

## Current vs Target Architecture

### Current Custom API Architecture
```
┌─────────────┐     HTTP POST      ┌──────────────┐     SSE/HTTP     ┌─────────────┐
│    LLM      │ ────────────────►  │    Vercel    │ ◄──────────────► │   Browser   │
│   Client    │  Custom JSON API   │    Server    │   Custom API     │   Worker    │
│             │                    │              │                  │             │
└─────────────┘                    └──────────────┘                  └─────────────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │  Custom API  │
                                   │  Endpoints   │
                                   │ /metadata    │
                                   │ /request     │
                                   │ /response    │
                                   └──────────────┘
```

### Target MCP-Compliant Architecture
```
┌─────────────┐     JSON-RPC 2.0   ┌──────────────┐     SSE/HTTP     ┌─────────────┐
│    MCP      │ ────────────────►  │    Vercel    │ ◄──────────────► │   Browser   │
│   Client    │  StreamableHTTP    │ MCP Server   │   Existing API   │   Worker    │
│             │                    │              │                  │             │
└─────────────┘                    └──────────────┘                  └─────────────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │ MCP Protocol │
                                   │  Handlers    │
                                   │ initialize   │
                                   │ list_tools   │
                                   │ call_tool    │
                                   └──────────────┘
```

## Core MCP Implementation Components

### 1. MCP Server Foundation

```typescript
// api/mcp.js - Main MCP endpoint
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema,
  InitializeRequestSchema 
} from "@modelcontextprotocol/sdk/types.js";

export class CODAPMCPServer {
  private server: Server;
  private transport: StreamableHTTPServerTransport;
  private sessionManager: SessionManager;
  private toolRegistry: ToolRegistry;

  constructor() {
    this.server = new Server({
      name: "codap-mcp-server",
      version: "1.0.0",
      description: "CODAP Data Analysis and Visualization Tools",
      author: "Concord Consortium",
      license: "MIT"
    }, {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
        logging: {}
      }
    });

    this.setupRequestHandlers();
  }

  private setupRequestHandlers(): void {
    // MCP initialization handshake
    this.server.setRequestHandler(InitializeRequestSchema, async (request) => {
      return {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {
            listChanged: true
          },
          resources: {},
          prompts: {},
          logging: {}
        },
        serverInfo: {
          name: "codap-mcp-server",
          version: "1.0.0"
        }
      };
    });

    // Tool discovery
    this.server.setRequestHandler(ListToolsRequestSchema, async (request) => {
      const sessionId = this.extractSessionId(request);
      return await this.handleListTools(sessionId);
    });

    // Tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const sessionId = this.extractSessionId(request);
      return await this.handleCallTool(sessionId, request.params);
    });
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    this.transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => this.generateSessionId()
    });

    await this.server.connect(this.transport);
    await this.transport.handleRequest(req, res, req.body);
  }
}
```

### 2. Session-Aware Tool Management

```typescript
export class SessionAwareToolManager {
  private sessionTools = new Map<string, ToolSet>();
  private globalTools: ToolDefinition[];

  async getSessionTools(sessionId: string): Promise<ToolDefinition[]> {
    // Check for session-specific tools (PBI 17 integration)
    const sessionToolSet = this.sessionTools.get(sessionId);
    
    if (sessionToolSet) {
      return sessionToolSet.getTools();
    }

    // Fallback to global tool set for backward compatibility
    return this.getGlobalTools();
  }

  private async getGlobalTools(): Promise<ToolDefinition[]> {
    // Convert existing tool schemas to MCP format
    return [
      {
        name: "create_codap_dataset",
        description: "Create a new dataset in CODAP with specified data",
        inputSchema: {
          type: "object",
          properties: {
            datasetName: {
              type: "string",
              description: "Name for the dataset in CODAP"
            },
            dataType: {
              type: "string",
              enum: ["random_numbers", "sample_students", "time_series", "custom"],
              description: "Type of data to generate"
            },
            recordCount: {
              type: "number",
              minimum: 1,
              maximum: 1000,
              description: "Number of records to generate"
            }
          },
          required: ["datasetName", "dataType", "recordCount"]
        }
      },
      {
        name: "create_codap_graph",
        description: "Create a graph/visualization in CODAP",
        inputSchema: {
          type: "object",
          properties: {
            datasetName: {
              type: "string",
              description: "Name of the dataset to visualize"
            },
            graphType: {
              type: "string",
              enum: ["scatterplot", "histogram", "bar_chart", "line_graph"],
              description: "Type of graph to create"
            },
            xAttribute: {
              type: "string",
              description: "Attribute for X-axis"
            },
            yAttribute: {
              type: "string",
              description: "Attribute for Y-axis (optional for some graph types)"
            },
            title: {
              type: "string",
              description: "Title for the graph"
            }
          },
          required: ["datasetName", "graphType", "xAttribute"]
        }
      }
      // ... additional tools converted to MCP format
    ];
  }
}
```

### 3. Tool Execution Pipeline

```typescript
export class MCPToolExecutor {
  private browserWorkerClient: BrowserWorkerClient;
  private sessionManager: SessionManager;

  async executeTool(
    sessionId: string, 
    toolName: string, 
    args: Record<string, any>
  ): Promise<MCPToolResult> {
    try {
      // Validate session
      const session = await this.sessionManager.getSession(sessionId);
      if (!session || session.expired) {
        throw new MCPError(-32602, "Invalid session", { sessionId });
      }

      // Validate tool availability
      const tools = await this.toolManager.getSessionTools(sessionId);
      const tool = tools.find(t => t.name === toolName);
      if (!tool) {
        throw new MCPError(-32601, "Tool not found", { toolName });
      }

      // Validate arguments against schema
      const validationResult = this.validateArguments(tool.inputSchema, args);
      if (!validationResult.valid) {
        throw new MCPError(-32602, "Invalid arguments", { 
          errors: validationResult.errors 
        });
      }

      // Execute via existing browser worker system
      const executionResult = await this.browserWorkerClient.executeTool(
        sessionId,
        toolName,
        args
      );

      // Convert to MCP format
      return this.formatMCPResult(executionResult);

    } catch (error) {
      return this.handleExecutionError(error);
    }
  }

  private formatMCPResult(result: any): MCPToolResult {
    return {
      content: [
        {
          type: "text",
          text: this.formatResultText(result)
        }
      ],
      isError: false
    };
  }

  private formatResultText(result: any): string {
    if (result.success) {
      return `✅ Tool executed successfully\n\n${JSON.stringify(result.data, null, 2)}`;
    } else {
      return `❌ Tool execution failed: ${result.error}`;
    }
  }
}
```

## Protocol Compliance Implementation

### 1. JSON-RPC 2.0 Message Handling

```typescript
export class MCPMessageHandler {
  async handleMessage(message: any): Promise<any> {
    // Validate JSON-RPC 2.0 format
    if (!this.isValidJSONRPC(message)) {
      return this.createErrorResponse(null, -32700, "Parse error");
    }

    try {
      // Route to appropriate handler
      switch (message.method) {
        case "initialize":
          return await this.handleInitialize(message);
        case "tools/list":
          return await this.handleListTools(message);
        case "tools/call":
          return await this.handleCallTool(message);
        default:
          return this.createErrorResponse(
            message.id, 
            -32601, 
            "Method not found"
          );
      }
    } catch (error) {
      return this.createErrorResponse(
        message.id,
        -32603,
        "Internal error",
        { error: error.message }
      );
    }
  }

  private isValidJSONRPC(message: any): boolean {
    return (
      message &&
      message.jsonrpc === "2.0" &&
      typeof message.method === "string" &&
      (message.id === null || typeof message.id === "string" || typeof message.id === "number")
    );
  }

  private createErrorResponse(id: any, code: number, message: string, data?: any) {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code,
        message,
        ...(data && { data })
      }
    };
  }
}
```

### 2. Migration Strategy

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

## Deployment Configuration

### Vercel Configuration

```json
{
  "functions": {
    "api/mcp.js": {
      "runtime": "nodejs18.x",
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/mcp",
      "destination": "/api/mcp"
    },
    {
      "source": "/api/sessions/:code/mcp",
      "destination": "/api/mcp"
    }
  ],
  "headers": [
    {
      "source": "/api/mcp",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Mcp-Session-Id"
        }
      ]
    }
  ]
}
```

## Strategic Value

This architecture provides a comprehensive foundation for MCP protocol compliance while maintaining compatibility with existing systems and positioning for future enhancements through PBI 17's dynamic tool registration capabilities.

The investment in MCP compliance transforms CODAP-MCP from a custom solution into a standards-compliant member of the MCP ecosystem, reducing integration friction and enabling ecosystem benefits. 