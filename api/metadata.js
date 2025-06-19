// Metadata endpoint for retrieving tool manifest
// Returns JSON-Schema tool definitions for LLM agents
const { withSessionValidation, createErrorResponse } = require("./_middleware/sessionValidation");

/**
 * Version management constants
 */
const API_VERSION = "1.0.0";
const TOOL_MANIFEST_VERSION = "1.0.0";
const SUPPORTED_API_VERSIONS = ["1.0.0"];
const SUPPORTED_MANIFEST_VERSIONS = ["1.0.0"];

/**
 * Tool registry - importing from browser worker schemas
 * In a real implementation, this would import from the actual tool registry
 * For now, we'll define the manifest structure based on the existing tools
 */
const TOOL_MANIFEST = {
  version: TOOL_MANIFEST_VERSION,
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
 * Creates a standardized success response
 */
function createSuccessResponse(res, data, status = 200) {
  res.status(status).json(data);
}

/**
 * Main handler function - wrapped with session validation
 */
async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept-Version");

  // Set version headers
  res.setHeader("API-Version", API_VERSION);
  res.setHeader("Tool-Manifest-Version", TOOL_MANIFEST_VERSION);
  res.setHeader("Supported-Versions", SUPPORTED_API_VERSIONS.join(", "));

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

    // Optional: Check version negotiation
    const acceptVersion = req.headers['accept-version'];
    if (acceptVersion && !SUPPORTED_API_VERSIONS.includes(acceptVersion)) {
      createErrorResponse(res, 406, "version_not_acceptable", 
        `Requested version ${acceptVersion} not supported. Supported versions: ${SUPPORTED_API_VERSIONS.join(", ")}`);
      return;
    }
    
    // Session validation is handled by middleware
    // req.session and req.sessionCode are available here
    
    // Generate response with tool manifest and version information
    const now = new Date();
    const response = {
      ...TOOL_MANIFEST,
      apiVersion: API_VERSION,
      toolManifestVersion: TOOL_MANIFEST_VERSION,
      supportedVersions: {
        api: SUPPORTED_API_VERSIONS,
        toolManifest: SUPPORTED_MANIFEST_VERSIONS
      },
      sessionCode: req.sessionCode,
      generatedAt: now.toISOString(),
      expiresAt: req.session.expiresAt
    };
    
    createSuccessResponse(res, response);
    
  } catch (error) {
    console.error("Metadata endpoint error:", error);
    createErrorResponse(res, 500, "internal_server_error", "Failed to retrieve metadata");
  }
}

// Export the handler wrapped with session validation middleware
module.exports = withSessionValidation(handler); 