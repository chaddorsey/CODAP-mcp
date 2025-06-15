// server/mcp-server.ts
import express from "express";
import { randomUUID } from "crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest, ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

async function main() {
  const app = express();
  app.use(express.json());

  // Add CORS headers for development
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:8081");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Map to store transports by session ID
  const transports: Record<string, StreamableHTTPServerTransport> = {};

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Handle POST requests for client-to-server communication
  app.post("/mcp", async (req, res) => {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`[${requestId}] POST /mcp handler started`);
    
    // Monkey-patch response methods immediately to catch any early responses
    const originalEnd = res.end.bind(res);
    const originalSend = res.send.bind(res);
    const originalJson = res.json.bind(res);
    const originalWrite = res.write.bind(res);
    
    res.end = function(chunk?: any, encoding?: any, cb?: any) {
      if (res.headersSent) {
        console.log(`[${requestId}] Blocking duplicate res.end call - headers already sent`);
        return res;
      }
      console.log(`[${requestId}] res.end called with:`, arguments);
      return originalEnd(chunk, encoding, cb);
    };
    
    res.send = function(body?: any) {
      if (res.headersSent) {
        console.log(`[${requestId}] Blocking duplicate res.send call - headers already sent`);
        return res;
      }
      console.log(`[${requestId}] res.send called with:`, arguments);
      return originalSend(body);
    };
    
    res.json = function(body?: any) {
      if (res.headersSent) {
        console.log(`[${requestId}] Blocking duplicate res.json call - headers already sent`);
        return res;
      }
      console.log(`[${requestId}] res.json called with:`, arguments);
      return originalJson(body);
    };
    
    res.write = function(chunk: any, encoding?: any, cb?: any) {
      console.log(`[${requestId}] res.write called with:`, arguments);
      return originalWrite(chunk, encoding, cb);
    };

    console.log(`[${requestId}] Received /mcp POST:`, JSON.stringify(req.body, null, 2));
    const sessionId = (req.body as any)?.headers?.[`mcp-session-id`] || req.headers["mcp-session-id"] as string | undefined;
    console.log(`[${requestId}] Session ID from header:`, sessionId);
    console.log(`[${requestId}] Available transports:`, Object.keys(transports));
    console.log(`[${requestId}] Transport exists for session:`, sessionId && transports[sessionId] ? "YES" : "NO");
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId] && !isInitializeRequest(req.body)) {
      // Reuse existing transport for non-initialization requests
      console.log(`[${requestId}] Reusing existing transport for session: ${sessionId}`);
      transport = transports[sessionId];
      await transport.handleRequest(req, res, req.body);
    } else if (isInitializeRequest(req.body)) {
      // Handle initialization requests (with or without session ID)
      let newSessionId = sessionId;
      if (!newSessionId) {
        newSessionId = randomUUID();
        console.log(`[${requestId}] New initialization request, generated session ID: ${newSessionId}`);
      } else {
        console.log(`[${requestId}] Initialization request with existing session ID: ${newSessionId}`);
        // Remove the old transport if it exists
        if (transports[newSessionId]) {
          console.log(`[${requestId}] Removing old transport for session: ${newSessionId}`);
          delete transports[newSessionId];
        }
      }
      
      // Monkey-patch writeHead to add session ID header
      const originalWriteHead = res.writeHead.bind(res);
      res.writeHead = function(statusCode: number, statusMessage?: string | any, headers?: any) {
        console.log(`[${requestId}] res.writeHead called with:`, statusCode, statusMessage, headers);
        
        // If it's a 400 error, let's see what's happening
        if (statusCode === 400) {
          console.log(`[${requestId}] 400 Error - Request body:`, JSON.stringify(req.body, null, 2));
          console.log(`[${requestId}] 400 Error - Session ID:`, newSessionId);
        }
        
        // Handle different overloads of writeHead
        let finalHeaders = headers;
        if (typeof statusMessage === "object") {
          finalHeaders = statusMessage;
          statusMessage = undefined;
        }
        if (!finalHeaders) finalHeaders = {};
        
        // Add session ID header
        finalHeaders["mcp-session-id"] = newSessionId;
        
        if (statusMessage) {
          return originalWriteHead(statusCode, statusMessage, finalHeaders);
        } else {
          return originalWriteHead(statusCode, finalHeaders);
        }
      };
      
      console.log(`[${requestId}] Creating new transport with session ID: ${newSessionId}`);
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => newSessionId,
        onsessioninitialized: (id: string) => {
          transports[id] = transport;
          console.log(`[${requestId}] Session initialized with ID: ${id}`);
        }
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          delete transports[transport.sessionId];
        }
      };

      console.log(`[${requestId}] Creating new MCP server`);
      const mcpServer = new Server(
        { name: "MCP_plugin", version: "1.0.0" },
        { capabilities: { tools: {} } }
      );
      
      // Add sample MCP tools
      mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
          tools: [
            {
              name: "echo",
              description: "Echo back the input text",
              inputSchema: {
                type: "object",
                properties: {
                  text: {
                    type: "string",
                    description: "Text to echo back"
                  }
                },
                required: ["text"]
              }
            },
            {
              name: "add_numbers",
              description: "Add two numbers together",
              inputSchema: {
                type: "object",
                properties: {
                  a: {
                    type: "number",
                    description: "First number"
                  },
                  b: {
                    type: "number", 
                    description: "Second number"
                  }
                },
                required: ["a", "b"]
              }
            },
            {
              name: "get_current_time",
              description: "Get the current server time",
              inputSchema: {
                type: "object",
                properties: {},
                additionalProperties: false
              }
            }
          ]
        };
      });

      mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        
        if (!args) {
          throw new Error("No arguments provided");
        }
        
        switch (name) {
          case "echo":
            return {
              content: [
                {
                  type: "text",
                  text: `Echo: ${(args as any).text}`
                }
              ]
            };
            
          case "add_numbers":
            const a = (args as any).a as number;
            const b = (args as any).b as number;
            const result = a + b;
            return {
              content: [
                {
                  type: "text",
                  text: `${a} + ${b} = ${result}`
                }
              ]
            };
            
          case "get_current_time":
            return {
              content: [
                {
                  type: "text",
                  text: `Current server time: ${new Date().toISOString()}`
                }
              ]
            };
            
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      });
      
      console.log(`[${requestId}] Connecting MCP server to transport`);
      await mcpServer.connect(transport);
      console.log(`[${requestId}] MCP server connected successfully`);

      console.log(`[${requestId}] About to call transport.handleRequest`);
      // Clean the request body - remove the headers field that the client added
      const cleanedRequestBody = { ...req.body };
      delete (cleanedRequestBody as any).headers;
      console.log(`[${requestId}] Cleaned request body:`, JSON.stringify(cleanedRequestBody, null, 2));
      
      // Let the SDK handle the request and response
      await transport.handleRequest(req, res, cleanedRequestBody);
      console.log(`[${requestId}] transport.handleRequest completed`);
    } else {
      // Invalid request
      console.log(`[${requestId}] Invalid request - no session ID and not initialize request`);
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided",
        },
        id: null,
      });
    }
    
    console.log(`[${requestId}] POST /mcp handler completed`);
  });

  // Add a simple GET handler for /mcp
  app.get("/mcp", (req, res) => {
    res.status(200).send("MCP GET endpoint is alive.");
  });

  // Add a session ID endpoint
  app.post("/mcp/session", async (req, res) => {
    const sessionId = randomUUID();
    console.log(`Generated new session ID: ${sessionId}`);
    
    // Pre-create the transport for this session
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => sessionId,
      onsessioninitialized: (id: string) => {
        console.log(`Session pre-initialized with ID: ${id}`);
      }
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports[transport.sessionId];
      }
    };

    const mcpServer = new Server(
      { name: "MCP_plugin", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );
    
    // Add sample MCP tools
    mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "echo",
            description: "Echo back the input text",
            inputSchema: {
              type: "object",
              properties: {
                text: {
                  type: "string",
                  description: "Text to echo back"
                }
              },
              required: ["text"]
            }
          },
          {
            name: "add_numbers",
            description: "Add two numbers together",
            inputSchema: {
              type: "object",
              properties: {
                a: {
                  type: "number",
                  description: "First number"
                },
                b: {
                  type: "number", 
                  description: "Second number"
                }
              },
              required: ["a", "b"]
            }
          },
          {
            name: "get_current_time",
            description: "Get the current server time",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false
            }
          }
        ]
      };
    });

    mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      if (!args) {
        throw new Error("No arguments provided");
      }
      
      switch (name) {
        case "echo":
          return {
            content: [
              {
                type: "text",
                text: `Echo: ${(args as any).text}`
              }
            ]
          };
          
        case "add_numbers":
          const a = (args as any).a as number;
          const b = (args as any).b as number;
          const result = a + b;
          return {
            content: [
              {
                type: "text",
                text: `${a} + ${b} = ${result}`
              }
            ]
          };
          
        case "get_current_time":
          return {
            content: [
              {
                type: "text",
                text: `Current server time: ${new Date().toISOString()}`
              }
            ]
          };
          
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
    
    await mcpServer.connect(transport);
    
    // Store the transport for future requests
    transports[sessionId] = transport;
    
    res.status(200).json({ sessionId });
  });

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8083;
  app.listen(port, () => {
    console.log(`✅ MCP server listening on http://localhost:${port}/mcp`);
  });
}

main().catch(console.error);
