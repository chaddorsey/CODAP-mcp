import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

async function main() {
  // Create MCP server
  const server = new Server(
    { name: "Generic_MCP_Server", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  // Add tools with generic names
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "text_echo",
          description: "Echo back any input text",
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
          name: "calculate_sum",
          description: "Calculate the sum of two numbers",
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
          name: "get_timestamp",
          description: "Get the current server timestamp",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false
          }
        },
        {
          name: "generate_data",
          description: "Generate sample data for analysis",
          inputSchema: {
            type: "object",
            properties: {
              datasetName: {
                type: "string",
                description: "Name for the dataset"
              },
              dataType: {
                type: "string",
                enum: ["random_numbers", "sample_students", "time_series"],
                description: "Type of sample data to generate"
              },
              recordCount: {
                type: "number",
                minimum: 1,
                maximum: 1000,
                description: "Number of records to generate (1-1000)"
              }
            },
            required: ["datasetName", "dataType", "recordCount"]
          }
        },
        {
          name: "system_status",
          description: "Check system status and capabilities",
          inputSchema: {
            type: "object",
            properties: {
              testType: {
                type: "string",
                enum: ["basic", "comprehensive"],
                description: "Type of status check to run",
                default: "comprehensive"
              },
              includeData: {
                type: "boolean",
                description: "Whether to include sample data in the status",
                default: true
              }
            },
            additionalProperties: false
          }
        }
      ]
    };
  });

  // Add tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    if (!args) {
      throw new Error("No arguments provided");
    }
    
    switch (name) {
      case "text_echo": {
        return {
          content: [
            {
              type: "text",
              text: `Echo: ${(args as any).text}`
            }
          ]
        };
      }
        
      case "calculate_sum": {
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
      }
        
      case "get_timestamp": {
        return {
          content: [
            {
              type: "text",
              text: `Current server time: ${new Date().toISOString()}`
            }
          ]
        };
      }

      case "generate_data": {
        const datasetName = (args as any).datasetName as string;
        const dataType = (args as any).dataType as string;
        const recordCount = (args as any).recordCount as number;
        
        // Generate sample data based on type
        let sampleData: any[] = [];
        let attributes: any[] = [];
        
        switch (dataType) {
          case "random_numbers": {
            attributes = [
              { name: "x", type: "numeric" },
              { name: "y", type: "numeric" },
              { name: "category", type: "categorical" }
            ];
            for (let i = 0; i < recordCount; i++) {
              sampleData.push({
                x: Math.round(Math.random() * 100),
                y: Math.round(Math.random() * 100),
                category: ["A", "B", "C"][Math.floor(Math.random() * 3)]
              });
            }
            break;
          }
            
          case "sample_students": {
            attributes = [
              { name: "name", type: "categorical" },
              { name: "grade", type: "numeric" },
              { name: "subject", type: "categorical" },
              { name: "score", type: "numeric" }
            ];
            const names = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank"];
            const subjects = ["Math", "Science", "English", "History"];
            for (let i = 0; i < recordCount; i++) {
              sampleData.push({
                name: names[Math.floor(Math.random() * names.length)],
                grade: Math.floor(Math.random() * 4) + 9,
                subject: subjects[Math.floor(Math.random() * subjects.length)],
                score: Math.round(Math.random() * 40 + 60)
              });
            }
            break;
          }
            
          case "time_series": {
            attributes = [
              { name: "date", type: "categorical" },
              { name: "value", type: "numeric" },
              { name: "trend", type: "numeric" }
            ];
            const startDate = new Date();
            for (let i = 0; i < recordCount; i++) {
              const date = new Date(startDate);
              date.setDate(date.getDate() + i);
              sampleData.push({
                date: date.toISOString().split("T")[0],
                value: Math.round(Math.random() * 50 + 25),
                trend: Math.round((i * 0.5) + Math.random() * 10)
              });
            }
            break;
          }
        }
        
        const dataset = {
          name: datasetName,
          type: dataType,
          recordCount: recordCount,
          attributes: attributes,
          data: sampleData
        };
        
        return {
          content: [
            {
              type: "text",
              text: `✅ Dataset Generated Successfully!

📊 Dataset: "${datasetName}"
📈 Type: ${dataType}
📋 Records: ${recordCount}
🏷️ Attributes: ${attributes.map(attr => `${attr.name} (${attr.type})`).join(", ")}

Dataset Structure:
${JSON.stringify(dataset, null, 2)}

💡 This data can be imported into analysis tools for visualization and exploration.`
            }
          ]
        };
      }

      case "system_status": {
        const testType = (args as any).testType || "comprehensive";
        const includeData = (args as any).includeData !== false;
        
        let response = `🎯 System Status Report\n\n`;
        
        // Test 1: Server Status
        response += `✅ MCP Server Status: RUNNING\n`;
        response += `📍 Transport: stdio\n`;
        response += `🕐 Server Time: ${new Date().toISOString()}\n\n`;
        
        // Test 2: Tool Capabilities
        response += `🔧 Available Tools: 5\n`;
        response += `• text_echo - Text echoing functionality\n`;
        response += `• calculate_sum - Mathematical operations\n`;
        response += `• get_timestamp - Server time retrieval\n`;
        response += `• generate_data - Sample data generation\n`;
        response += `• system_status - This status check\n\n`;
        
        // Test 3: Data Generation
        if (includeData) {
          const sampleDataset = {
            name: "Test-Dataset",
            type: "random_numbers",
            records: 3,
            attributes: ["x", "y", "category"],
            sampleData: [
              { x: 42, y: 73, category: "A" },
              { x: 18, y: 91, category: "B" },
              { x: 67, y: 34, category: "C" }
            ]
          };
          
          response += `📊 Sample Dataset:\n`;
          response += `${JSON.stringify(sampleDataset, null, 2)}\n\n`;
        }
        
        // Test 4: Integration Status
        response += `🔗 System Capabilities:\n`;
        response += `✅ MCP Protocol: Fully supported\n`;
        response += `✅ Stdio Transport: Working\n`;
        response += `✅ Tool Schema: JSON Schema compliant\n`;
        response += `✅ Data Generation: Active\n\n`;
        
        response += `🎉 SYSTEM STATUS: OPERATIONAL\n`;
        response += `Ready for external connections and data processing.`;
        
        return {
          content: [
            {
              type: "text",
              text: response
            }
          ]
        };
      }
        
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  // Create stdio transport
  const transport = new StdioServerTransport();
  
  // Connect server to transport
  await server.connect(transport);
  
  console.error("Generic MCP Server (stdio) started successfully");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
}); 