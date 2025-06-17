// server/simple-mcp-server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

async function main() {
  // Create MCP server with completely generic name
  const server = new Server(
    { name: "SimpleTools", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  // Add simple tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "echo",
          description: "Echo back text",
          inputSchema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Message to echo"
              }
            },
            required: ["message"]
          }
        },
        {
          name: "add",
          description: "Add two numbers",
          inputSchema: {
            type: "object",
            properties: {
              a: { type: "number" },
              b: { type: "number" }
            },
            required: ["a", "b"]
          }
        }
      ]
    };
  });

  // Add tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    switch (name) {
      case "echo":
        return {
          content: [{ type: "text", text: `Echo: ${(args as any).message}` }]
        };
        
      case "add":
        const result = (args as any).a + (args as any).b;
        return {
          content: [{ type: "text", text: `${(args as any).a} + ${(args as any).b} = ${result}` }]
        };
        
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  // Create stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("Simple MCP Server started");
}

main().catch(console.error); 
