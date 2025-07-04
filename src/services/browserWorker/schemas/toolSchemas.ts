/**
 * Tool schema definitions for CODAP and SageModeler tools
 * Defines parameter validation and structure for supported Plugin API tools
 * Based on official CODAP Plugin API documentation and SageModeler API specifications
 */

import { ToolRegistry, ToolSchema } from "../types";

/**
 * Schema for creating a CODAP dataset with automatic table display
 * This combines data context creation, item insertion, and table display for immediate feedback
 * Based on reference implementations in api-server.ts and test files
 */
const createDatasetWithTableSchema: ToolSchema = {
  name: "create_dataset_with_table",
  description: "Create a new dataset in CODAP with automatic table display for immediate user feedback",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Name of the dataset",
        required: true
      },
      attributes: {
        type: "array",
        description: "Array of attribute definitions",
        required: true,
        items: {
          type: "object",
          properties: {
            name: { type: "string", required: true },
            type: { 
              type: "string", 
              enum: ["numeric", "categorical", "date", "boundary"],
              required: true
            },
            description: { type: "string" },
            formula: { type: "string" },
            precision: { type: "string" },
            unit: { type: "string" },
            editable: { type: "boolean" },
            hidden: { type: "boolean" }
          }
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
};

/**
 * Schema for creating a CODAP graph with axis assignments
 * Based on reference implementations in api-server.ts and CODAPCommandProcessor.tsx
 */
const createGraphSchema: ToolSchema = {
  name: "create_graph",
  description: "Create a graph visualization in CODAP with proper axis assignments",
  parameters: {
    type: "object",
    properties: {
      dataContext: {
        type: "string",
        description: "Name of the data context to visualize",
        required: true
      },
      graphType: {
        type: "string",
        description: "Type of graph to create",
        required: true,
        enum: ["scatterplot", "scatter", "histogram", "bar_chart", "line_graph"]
      },
      xAttribute: {
        type: "string",
        description: "Attribute name for X-axis",
        required: true
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
};

/**
 * Schema for creating a CODAP data context (dataset)
 * Maps to: action: "create", resource: "dataContext"
 */
const createDataContextSchema: ToolSchema = {
  name: "create_data_context",
  description: "Create a new data context (dataset) in CODAP",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Name of the data context",
        required: true
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
            name: { type: "string", required: true },
            title: { type: "string" },
            parent: { type: "string" },
            attrs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", required: true },
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
                }
              }
            }
          }
        }
      }
    },
    required: ["name"]
  }
};

/**
 * Schema for creating items (cases) in a data context
 * Maps to: action: "create", resource: "dataContext[name].item"
 */
const createItemsSchema: ToolSchema = {
  name: "create_items",
  description: "Create items (cases) in an existing data context",
  parameters: {
    type: "object",
    properties: {
      dataContextName: {
        type: "string",
        description: "Name of the target data context",
        required: true
      },
      items: {
        type: "array",
        description: "Array of item data objects",
        required: true,
        items: {
          type: "object",
          description: "Item data with attribute values"
        }
      }
    },
    required: ["dataContextName", "items"]
  }
};

/**
 * Schema for creating a CODAP table component
 * Based on createTable helper function in codap-helper.ts
 */
const createTableSchema: ToolSchema = {
  name: "create_table",
  description: "Create a table component to display data context",
  parameters: {
    type: "object",
    properties: {
      dataContext: {
        type: "string",
        description: "Name of data context to display",
        required: true
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
};

// Removed createComponentSchema - not a valid CODAP API call
// Use specific tools like create_graph, create_table, create_map instead

/**
 * Schema for getting CODAP data contexts
 * Maps to: action: "get", resource: "dataContextList"
 */
const getDataContextsSchema: ToolSchema = {
  name: "get_data_contexts",
  description: "Get list of all data contexts in CODAP",
  parameters: {
    type: "object",
    properties: {},
    required: []
  }
};

/**
 * Schema for getting CODAP components
 * Maps to: action: "get", resource: "componentList"
 */
const getComponentsSchema: ToolSchema = {
  name: "get_components",
  description: "Get list of all components in CODAP",
  parameters: {
    type: "object",
    properties: {},
    required: []
  }
};

/**
 * Schema for getting data context information
 * Maps to: action: "get", resource: "dataContext"
 */
const getDataContextSchema: ToolSchema = {
  name: "get_data_context",
  description: "Get information about a specific data context",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Name of the data context to retrieve",
        required: true
      }
    },
    required: ["name"]
  }
};

// ==================== SageModeler Tool Schemas ====================

/**
 * Schema for creating a SageModeler node
 */
const sageCreateNodeSchema: ToolSchema = {
  name: "sage_create_node",
  description: "Create a new node in SageModeler with specified properties",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "Node title/name", required: true },
      initialValue: { type: "number", description: "Initial numeric value" },
      x: { type: "number", description: "X position coordinate" },
      y: { type: "number", description: "Y position coordinate" },
      min: { type: "number", description: "Minimum value" },
      max: { type: "number", description: "Maximum value" },
      isAccumulator: { type: "boolean", description: "Whether node is an accumulator" },
      isFlowVariable: { type: "boolean", description: "Whether node is a flow variable" },
      allowNegativeValues: { type: "boolean", description: "Allow negative values" },
      valueDefinedSemiQuantitatively: { type: "boolean", description: "Semi-quantitative definition" },
      color: { type: "string", description: "Node color (hex code)" },
      combineMethod: { type: "string", description: "Combine method for inputs" },
      image: { type: "string", description: "Image URL" },
      usesDefaultImage: { type: "boolean", description: "Use default image" },
      paletteItem: { type: "string", description: "Palette item reference" },
      sourceApp: { type: "string", description: "Source application identifier" }
    },
    required: ["title"]
  }
};

/**
 * Schema for creating a link in SageModeler
 */
const sageCreateLinkSchema: ToolSchema = {
  name: "sage_create_link",
  description: "Create a link between two nodes in SageModeler",
  parameters: {
    type: "object",
    properties: {
      source: { type: "string", description: "Source node ID", required: true },
      target: { type: "string", description: "Target node ID", required: true },
      relationVector: { 
        type: "string", 
        enum: ["increase", "decrease", "vary"],
        description: "Relationship type",
        required: true
      },
      relationScalar: { 
        type: "string", 
        enum: ["aboutTheSame", "aLittle", "aLot", "moreAndMore", "lessAndLess"],
        description: "Relationship strength" 
      },
      customData: { 
        type: "array", 
        description: "Custom relationship data for 'vary' type",
        items: { type: "number" }
      },
      label: { type: "string", description: "Link label" },
      color: { type: "string", description: "Link color" },
      sourceApp: { type: "string", description: "Source application identifier" }
    },
    required: ["source", "target", "relationVector"]
  }
};

/**
 * Schema for running SageModeler experiments
 */
const sageRunExperimentSchema: ToolSchema = {
  name: "sage_run_experiment",
  description: "Execute an experiment with specified parameters in SageModeler",
  parameters: {
    type: "object",
    properties: {
      mode: { 
        type: "string", 
        enum: ["static", "dynamic"],
        description: "Experiment mode",
        required: true
      },
      duration: { type: "number", description: "Duration for dynamic experiments" },
      stepUnit: { type: "string", description: "Step unit for dynamic experiments" },
      delivery: { 
        type: "string", 
        enum: ["batch", "stream"],
        description: "Delivery method" 
      },
      parameters: { 
        type: "object", 
        description: "Experiment parameters per node",
        required: true
      }
    },
    required: ["mode", "parameters"]
  }
};

/**
 * Check if a tool is supported by the registry
 */
export function isToolSupported(toolName: string): boolean {
  return toolName in DEFAULT_TOOL_REGISTRY;
}

/**
 * Get schema for a specific tool
 */
export function getToolSchema(toolName: string): ToolSchema | undefined {
  return DEFAULT_TOOL_REGISTRY[toolName];
}

/**
 * Get list of all supported tools
 */
export function getSupportedTools(): string[] {
  return Object.keys(DEFAULT_TOOL_REGISTRY);
}

/**
 * Default tool registry with all supported CODAP and SageModeler tools
 */
export const DEFAULT_TOOL_REGISTRY: ToolRegistry = {
  // CODAP Tools
  create_dataset_with_table: createDatasetWithTableSchema,
  create_graph: createGraphSchema,
  create_data_context: createDataContextSchema,
  create_items: createItemsSchema,
  create_table: createTableSchema,
  get_data_contexts: getDataContextsSchema,
  get_components: getComponentsSchema,
  get_data_context: getDataContextSchema,
  
  // SageModeler Tools - Node Management
  sage_create_node: sageCreateNodeSchema,
  sage_create_random_node: { name: "sage_create_random_node", description: "Create a random node for testing", parameters: { type: "object", properties: {}, required: [] } },
  sage_update_node: { name: "sage_update_node", description: "Update node properties", parameters: { type: "object", properties: { nodeId: { type: "string", required: true } }, required: ["nodeId"] } },
  sage_delete_node: { name: "sage_delete_node", description: "Delete a node", parameters: { type: "object", properties: { nodeId: { type: "string", required: true } }, required: ["nodeId"] } },
  sage_get_all_nodes: { name: "sage_get_all_nodes", description: "Get all nodes", parameters: { type: "object", properties: {}, required: [] } },
  sage_get_node_by_id: { name: "sage_get_node_by_id", description: "Get node by ID", parameters: { type: "object", properties: { nodeId: { type: "string", required: true } }, required: ["nodeId"] } },
  sage_select_node: { name: "sage_select_node", description: "Select a node", parameters: { type: "object", properties: { nodeId: { type: "string", required: true } }, required: ["nodeId"] } },
  
  // SageModeler Tools - Link Management
  sage_create_link: sageCreateLinkSchema,
  sage_update_link: { name: "sage_update_link", description: "Update link properties", parameters: { type: "object", properties: { linkId: { type: "string", required: true } }, required: ["linkId"] } },
  sage_delete_link: { name: "sage_delete_link", description: "Delete a link", parameters: { type: "object", properties: { linkId: { type: "string", required: true } }, required: ["linkId"] } },
  sage_get_all_links: { name: "sage_get_all_links", description: "Get all links", parameters: { type: "object", properties: {}, required: [] } },
  sage_get_link_by_id: { name: "sage_get_link_by_id", description: "Get link by ID", parameters: { type: "object", properties: { linkId: { type: "string", required: true } }, required: ["linkId"] } },
  
  // SageModeler Tools - Experiments
  sage_reload_experiment_nodes: { name: "sage_reload_experiment_nodes", description: "Reload experiment nodes", parameters: { type: "object", properties: {}, required: [] } },
  sage_run_experiment: sageRunExperimentSchema,
  
  // SageModeler Tools - Recording
  sage_start_recording: { name: "sage_start_recording", description: "Start recording", parameters: { type: "object", properties: {}, required: [] } },
  sage_stop_recording: { name: "sage_stop_recording", description: "Stop recording", parameters: { type: "object", properties: {}, required: [] } },
  sage_set_recording_options: { name: "sage_set_recording_options", description: "Set recording options", parameters: { type: "object", properties: { options: { type: "object", required: true } }, required: ["options"] } },
  
  // SageModeler Tools - Model Import/Export
  sage_load_model: { name: "sage_load_model", description: "Load a model", parameters: { type: "object", properties: { model: { type: "object", required: true } }, required: ["model"] } },
  sage_export_model: { name: "sage_export_model", description: "Export current model", parameters: { type: "object", properties: {}, required: [] } },
  sage_import_sd_json: { name: "sage_import_sd_json", description: "Import SD-JSON", parameters: { type: "object", properties: { sdJson: { type: "object", required: true } }, required: ["sdJson"] } },
  sage_export_sd_json: { name: "sage_export_sd_json", description: "Export to SD-JSON", parameters: { type: "object", properties: {}, required: [] } },
  
  // SageModeler Tools - Settings
  sage_set_model_complexity: { name: "sage_set_model_complexity", description: "Set model complexity", parameters: { type: "object", properties: { complexity: { type: "string", enum: ["simple", "intermediate", "advanced"], required: true } }, required: ["complexity"] } },
  sage_set_ui_settings: { name: "sage_set_ui_settings", description: "Set UI settings", parameters: { type: "object", properties: { settings: { type: "object", required: true } }, required: ["settings"] } },
  sage_restore_default_settings: { name: "sage_restore_default_settings", description: "Restore default settings", parameters: { type: "object", properties: {}, required: [] } },
  
  // SageModeler Tools - Simulation State
  sage_get_simulation_state: { name: "sage_get_simulation_state", description: "Get simulation state", parameters: { type: "object", properties: {}, required: [] } }
};

/**
 * Validate tool parameters against schema
 */
export function validateToolParameters(
  toolName: string, 
  parameters: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const schema = getToolSchema(toolName);
  if (!schema) {
    return { valid: false, errors: [`Unknown tool: ${toolName}`] };
  }

  const errors: string[] = [];
  
  // Check required parameters
  if (schema.parameters.required) {
    for (const required of schema.parameters.required) {
      if (!(required in parameters)) {
        errors.push(`Missing required parameter: ${required}`);
      }
    }
  }

  // Check parameter types and constraints
  if (schema.parameters.properties) {
    for (const [paramName, paramValue] of Object.entries(parameters)) {
      const paramSchema = schema.parameters.properties[paramName];
      if (!paramSchema) {
        errors.push(`Unknown parameter: ${paramName}`);
        continue;
      }

      // Type checking
      if (paramSchema.type === "string" && typeof paramValue !== "string") {
        errors.push(`Parameter ${paramName} must be a string`);
      } else if (paramSchema.type === "number" && typeof paramValue !== "number") {
        errors.push(`Parameter ${paramName} must be a number`);
      } else if (paramSchema.type === "boolean" && typeof paramValue !== "boolean") {
        errors.push(`Parameter ${paramName} must be a boolean`);
      } else if (paramSchema.type === "array" && !Array.isArray(paramValue)) {
        errors.push(`Parameter ${paramName} must be an array`);
      } else if (paramSchema.type === "object" && (typeof paramValue !== "object" || paramValue === null)) {
        errors.push(`Parameter ${paramName} must be an object`);
      }

      // Enum checking
      if (paramSchema.enum && typeof paramValue === "string" && !paramSchema.enum.includes(paramValue)) {
        errors.push(`Parameter ${paramName} must be one of: ${paramSchema.enum.join(", ")}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
} 
 
