// server/mcp-server-codap-interactive.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";

// CODAP Plugin API endpoint
const CODAP_PLUGIN_URL = "http://localhost:8083";

async function main() {
  const server = new Server(
    { name: "CODAP_Interactive_Tools", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  // Helper function to send commands to CODAP plugin
  async function sendToCODAP(action: string, args: any = {}) {
    try {
      // Map actions to specific API endpoints
      const endpointMap: Record<string, string> = {
        "createDataset": "/api/codap/createDataset",
        "getDatasets": "/api/codap/getDatasets",
        "addCases": "/api/codap/addCases",
        "createGraph": "/api/codap/createGraph",
        "getStatus": "/api/codap/getStatus",
        "exportData": "/api/codap/exportData"
      };
      
      const endpoint = endpointMap[action];
      if (!endpoint) {
        throw new Error(`Unknown action: ${action}`);
      }
      
      const response = await fetch(`${CODAP_PLUGIN_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args)
      });
      
      if (!response.ok) {
        throw new Error(`CODAP API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error communicating with CODAP:", error);
      throw error;
    }
  }

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
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
              },
              customData: {
                type: "array",
                description: "Custom data array (only used when dataType is 'custom')",
                items: {
                  type: "object"
                }
              }
            },
            required: ["datasetName", "dataType", "recordCount"]
          }
        },
        {
          name: "get_codap_datasets",
          description: "Get list of all datasets currently in CODAP",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false
          }
        },
        {
          name: "add_codap_cases",
          description: "Add new cases (rows) to an existing CODAP dataset",
          inputSchema: {
            type: "object",
            properties: {
              datasetName: {
                type: "string",
                description: "Name of the existing dataset"
              },
              cases: {
                type: "array",
                description: "Array of case objects to add",
                items: {
                  type: "object"
                }
              }
            },
            required: ["datasetName", "cases"]
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
        },
        {
          name: "get_codap_status",
          description: "Get current status and information from CODAP",
          inputSchema: {
            type: "object",
            properties: {
              includeDatasets: {
                type: "boolean",
                description: "Whether to include dataset information",
                default: true
              },
              includeComponents: {
                type: "boolean", 
                description: "Whether to include component information",
                default: true
              }
            },
            additionalProperties: false
          }
        },
        {
          name: "export_codap_data",
          description: "Export data from CODAP in various formats",
          inputSchema: {
            type: "object",
            properties: {
              datasetName: {
                type: "string",
                description: "Name of the dataset to export"
              },
              format: {
                type: "string",
                enum: ["json", "csv", "tsv"],
                description: "Export format",
                default: "json"
              },
              includeMetadata: {
                type: "boolean",
                description: "Whether to include metadata in export",
                default: false
              }
            },
            required: ["datasetName"]
          }
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    if (!args) {
      throw new Error("No arguments provided");
    }
    
    try {
      switch (name) {
        case "create_codap_dataset": {
          const { datasetName, dataType, recordCount, customData } = args as any;
          
          // Generate data based on type
          let data: any[] = [];
          let attributes: any[] = [];
          
          if (dataType === "custom" && customData) {
            // Debug logging
            console.error(`DEBUG: customData type: ${typeof customData}`);
            console.error(`DEBUG: customData isArray: ${Array.isArray(customData)}`);
            console.error(`DEBUG: customData length: ${customData?.length}`);
            console.error(`DEBUG: customData first item: ${JSON.stringify(customData?.[0])}`);
            
            // Handle case where SuperAssistant sends customData as a JSON string
            let parsedCustomData = customData;
            if (typeof customData === 'string') {
              try {
                parsedCustomData = JSON.parse(customData);
                console.error('DEBUG: Successfully parsed customData string to array');
              } catch (error) {
                throw new Error(`customData is a string but not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
              }
            }
            
            // Ensure customData is an array
            if (Array.isArray(parsedCustomData)) {
              data = parsedCustomData;
            } else {
              throw new Error(`customData must be an array, received: ${typeof parsedCustomData}. Value: ${JSON.stringify(parsedCustomData)}`);
            }
            // Infer attributes from first data item
            if (data.length > 0) {
              const originalKeys = Object.keys(data[0]);
              attributes = originalKeys.map(key => {
                // Sanitize field names: replace spaces with underscores, remove special chars
                const sanitizedName = key.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
                return {
                  name: sanitizedName || key, // fallback to original if sanitization results in empty string
                  type: typeof data[0][key] === "number" ? "numeric" : "categorical"
                };
              });
              
              // Transform data to use sanitized field names
              data = data.map(item => {
                const newItem: any = {};
                originalKeys.forEach((originalKey, index) => {
                  const sanitizedKey = attributes[index].name;
                  newItem[sanitizedKey] = item[originalKey];
                });
                return newItem;
              });
            }
          } else {
            // Generate sample data
            switch (dataType) {
              case "random_numbers": {
                attributes = [
                  { name: "x", type: "numeric" },
                  { name: "y", type: "numeric" },
                  { name: "category", type: "categorical" }
                ];
                for (let i = 0; i < recordCount; i++) {
                  data.push({
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
                const names = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Henry"];
                const subjects = ["Math", "Science", "English", "History"];
                for (let i = 0; i < recordCount; i++) {
                  data.push({
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
                  data.push({
                    date: date.toISOString().split("T")[0],
                    value: Math.round(Math.random() * 50 + 25),
                    trend: Math.round((i * 0.5) + Math.random() * 10)
                  });
                }
                break;
              }
            }
          }
          
          // Send to CODAP
          const result = await sendToCODAP("createDataset", {
            name: datasetName,
            attributes,
            data
          });
          
          return {
            content: [
              {
                type: "text",
                text: `✅ Dataset "${datasetName}" created successfully in CODAP!

📊 Dataset Details:
• Name: ${datasetName}
• Type: ${dataType}
• Records: ${recordCount}
• Attributes: ${attributes.map(attr => `${attr.name} (${attr.type})`).join(", ")}

🎯 CODAP Response: ${JSON.stringify(result, null, 2)}

The dataset is now available in CODAP for analysis and visualization.`
              }
            ]
          };
        }
        
        case "get_codap_datasets": {
          const result = await sendToCODAP("getDatasets");
          
          return {
            content: [
              {
                type: "text",
                text: `📋 CODAP Datasets:

${JSON.stringify(result, null, 2)}

${(result as any).datasets ? `Found ${(result as any).datasets.length} dataset(s) in CODAP.` : "No datasets found or error occurred."}`
              }
            ]
          };
        }
        
        case "add_codap_cases": {
          const { datasetName, cases } = args as any;
          
          const result = await sendToCODAP("addCases", {
            datasetName,
            cases
          });
          
          return {
            content: [
              {
                type: "text",
                text: `✅ Added ${cases.length} cases to dataset "${datasetName}"

🎯 CODAP Response: ${JSON.stringify(result, null, 2)}

The new data has been added to the existing dataset in CODAP.`
              }
            ]
          };
        }
        
        case "create_codap_graph": {
          const { datasetName, graphType, xAttribute, yAttribute, title } = args as any;
          
          const result = await sendToCODAP("createGraph", {
            datasetName,
            graphType,
            xAttribute,
            yAttribute,
            title: title || `${graphType} of ${xAttribute}${yAttribute ? ` vs ${yAttribute}` : ""}`
          });
          
          return {
            content: [
              {
                type: "text",
                text: `📈 Created ${graphType} in CODAP!

📊 Graph Details:
• Dataset: ${datasetName}
• Type: ${graphType}
• X-Axis: ${xAttribute}
${yAttribute ? `• Y-Axis: ${yAttribute}` : ""}
• Title: ${title || `${graphType} of ${xAttribute}${yAttribute ? ` vs ${yAttribute}` : ""}`}

🎯 CODAP Response: ${JSON.stringify(result, null, 2)}

The visualization is now available in CODAP.`
              }
            ]
          };
        }
        
        case "get_codap_status": {
          const { includeDatasets, includeComponents } = args as any;
          
          const result = await sendToCODAP("getStatus", {
            includeDatasets: includeDatasets !== false,
            includeComponents: includeComponents !== false
          });
          
          return {
            content: [
              {
                type: "text",
                text: `🎯 CODAP Status Report:

${JSON.stringify(result, null, 2)}

Connection to CODAP plugin is active and responding.`
              }
            ]
          };
        }
        
        case "export_codap_data": {
          const { datasetName, format, includeMetadata } = args as any;
          
          const result = await sendToCODAP("exportData", {
            datasetName,
            format: format || "json",
            includeMetadata: includeMetadata || false
          });
          
          return {
            content: [
              {
                type: "text",
                text: `📤 Exported data from "${datasetName}" in ${format || "json"} format:

${JSON.stringify(result, null, 2)}

Data export completed successfully.`
              }
            ]
          };
        }
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error executing ${name}: ${(error as Error).message}

This might indicate:
• CODAP plugin is not running (check http://localhost:8081)
• Network connectivity issues
• Invalid parameters provided

Please ensure the CODAP plugin is running and accessible.`
          }
        ]
      };
    }
  });

  // Create stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("CODAP Interactive MCP Server started successfully");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
}); 
