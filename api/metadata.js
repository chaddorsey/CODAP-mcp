// Metadata endpoint for retrieving tool manifest
// Returns JSON-Schema tool definitions for LLM agents
const { getSession } = require("./kv-utils");

/**
 * Tool registry - importing from browser worker schemas
 * In a real implementation, this would import from the actual tool registry
 * For now, we'll define the manifest structure based on the existing tools
 */
const TOOL_MANIFEST = {
  version: "1.0.0",
  tools: [
    {
      name: "create_dataset_with_table",
      description: "Create a new dataset in CODAP with automatic table display for immediate user feedback",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the dataset"
          },
          attributes: {
            type: "array",
            description: "Array of attribute definitions",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: { 
                  type: "string", 
                  enum: ["numeric", "categorical", "date", "boundary"]
                },
                description: { type: "string" },
                formula: { type: "string" },
                precision: { type: "string" },
                unit: { type: "string" },
                editable: { type: "boolean" },
                hidden: { type: "boolean" }
              },
              required: ["name", "type"]
            }
          },
          data: {
            type: "array",
            description: "Array of data records (optional)",
            items: {
              type: "object",
              description: "Data record with attribute values"
            }
          },
          title: {
            type: "string",
            description: "Display title for the dataset"
          },
          tableName: {
            type: "string",
            description: "Name for the automatically created table component"
          }
        },
        required: ["name", "attributes"]
      }
    },
    {
      name: "create_graph",
      description: "Create a graph visualization in CODAP with proper axis assignments",
      inputSchema: {
        type: "object",
        properties: {
          dataContext: {
            type: "string",
            description: "Name of the data context to visualize"
          },
          graphType: {
            type: "string",
            description: "Type of graph to create",
            enum: ["scatterplot", "scatter", "histogram", "bar_chart", "line_graph"]
          },
          xAttribute: {
            type: "string",
            description: "Attribute name for X-axis"
          },
          yAttribute: {
            type: "string",
            description: "Attribute name for Y-axis (optional for some graph types)"
          },
          title: {
            type: "string",
            description: "Title for the graph"
          },
          width: {
            type: "number",
            description: "Width of the graph component (default: 400)"
          },
          height: {
            type: "number",
            description: "Height of the graph component (default: 300)"
          },
          position: {
            type: "object",
            description: "Position of the graph",
            properties: {
              x: { type: "number" },
              y: { type: "number" }
            }
          }
        },
        required: ["dataContext", "graphType", "xAttribute"]
      }
    },
    {
      name: "create_data_context",
      description: "Create a new data context (dataset) in CODAP",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the data context"
          },
          title: {
            type: "string",
            description: "Display title for the data context"
          },
          collections: {
            type: "array",
            description: "Array of collection definitions",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                title: { type: "string" },
                parent: { type: "string" },
                attrs: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      type: { 
                        type: "string", 
                        enum: ["numeric", "categorical", "date", "boundary"] 
                      },
                      description: { type: "string" },
                      formula: { type: "string" },
                      precision: { type: "string" },
                      unit: { type: "string" },
                      editable: { type: "boolean" },
                      hidden: { type: "boolean" }
                    },
                    required: ["name"]
                  }
                }
              },
              required: ["name"]
            }
          }
        },
        required: ["name"]
      }
    },
    {
      name: "create_items",
      description: "Create items (cases) in an existing data context",
      inputSchema: {
        type: "object",
        properties: {
          dataContextName: {
            type: "string",
            description: "Name of the target data context"
          },
          items: {
            type: "array",
            description: "Array of item data objects",
            items: {
              type: "object",
              description: "Item data with attribute values"
            }
          }
        },
        required: ["dataContextName", "items"]
      }
    },
    {
      name: "create_table",
      description: "Create a table component to display data context",
      inputSchema: {
        type: "object",
        properties: {
          dataContext: {
            type: "string",
            description: "Name of data context to display"
          },
          name: {
            type: "string",
            description: "Name for the table component"
          },
          title: {
            type: "string",
            description: "Title for the table component"
          },
          position: {
            type: "object",
            description: "Position and size of the table",
            properties: {
              x: { type: "number" },
              y: { type: "number" },
              width: { type: "number" },
              height: { type: "number" }
            }
          }
        },
        required: ["dataContext"]
      }
    },
    {
      name: "create_component",
      description: "Create a new component (graph, table, etc.) in CODAP",
      inputSchema: {
        type: "object",
        properties: {
          type: {
            type: "string",
            description: "Type of component to create",
            enum: ["graph", "caseTable", "map", "slider", "calculator", "text"]
          },
          dataContext: {
            type: "string",
            description: "Name of data context to connect to"
          },
          name: {
            type: "string",
            description: "Name for the component"
          },
          title: {
            type: "string",
            description: "Title for the component"
          },
          position: {
            type: "object",
            description: "Position and size of the component",
            properties: {
              x: { type: "number" },
              y: { type: "number" },
              width: { type: "number" },
              height: { type: "number" }
            }
          },
          configuration: {
            type: "object",
            description: "Component-specific configuration",
            properties: {
              xAttributeName: { type: "string" },
              yAttributeName: { type: "string" }
            }
          }
        },
        required: ["type"]
      }
    },
    {
      name: "get_data_contexts",
      description: "Get list of all data contexts in CODAP",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false
      }
    },
    {
      name: "get_components",
      description: "Get list of all components in CODAP",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false
      }
    },
    {
      name: "get_data_context",
      description: "Get information about a specific data context",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the data context to retrieve"
          }
        },
        required: ["name"]
      }
    }
  ]
};

/**
 * Validates session code format
 */
function isValidSessionCode(code) {
  return typeof code === "string" && /^[A-Z2-7]{8}$/.test(code);
}

/**
 * Creates a standardized error response
 */
function createErrorResponse(res, status, error, message, code) {
  res.status(status).json({
    error,
    message,
    code
  });
}

/**
 * Creates a standardized success response
 */
function createSuccessResponse(res, data, status = 200) {
  res.status(status).json(data);
}

/**
 * Main handler function
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }
    
    // Only allow GET method
    if (req.method !== "GET") {
      createErrorResponse(res, 405, "method_not_allowed", "Only GET method is allowed");
      return;
    }
    
    // Extract session code from URL path
    const code = req.query.code;
    
    // Validate session code format
    if (!code || !isValidSessionCode(code)) {
      createErrorResponse(res, 400, "invalid_session_code", "Session code must be 8-character Base32 format");
      return;
    }
    
    // Validate session exists and is not expired
    const session = await getSession(code);
    if (!session) {
      createErrorResponse(res, 404, "session_not_found", "Session not found or expired");
      return;
    }
    
    // Check if session is expired
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    if (now > expiresAt) {
      createErrorResponse(res, 410, "session_expired", "Session has expired");
      return;
    }
    
    // Generate response with tool manifest
    const response = {
      ...TOOL_MANIFEST,
      sessionCode: code,
      generatedAt: now.toISOString(),
      expiresAt: session.expiresAt
    };
    
    createSuccessResponse(res, response);
    
  } catch (error) {
    console.error("Metadata endpoint error:", error);
    createErrorResponse(res, 500, "internal_server_error", "Failed to retrieve metadata");
  }
} 