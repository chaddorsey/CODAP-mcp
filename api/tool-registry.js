/**
 * Multi-Application Tool Registry for MCP Server
 * Supports CODAP, SageModeler, and future toolsets with capability-based filtering
 */

// =============================================================================
// CODAP TOOLS
// =============================================================================

const CODAP_TOOLS = [
  {
    name: "initializePlugin",
    title: "Initialize CODAP Plugin",
    description: "Initialize the CODAP plugin with name, title, and version",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Plugin name" },
        title: { type: "string", description: "Plugin title" },
        version: { type: "string", description: "Plugin version" }
      },
      required: ["name", "title", "version"]
    }
  },
  {
    name: "createDataContext",
    title: "Create Data Context",
    description: "Create a new data context (dataset) in CODAP",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Data context name" },
        title: { type: "string", description: "Data context title" },
        description: { type: "string", description: "Description of the data context" },
        collections: {
          type: "array",
          description: "Array of collections to create",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Collection name" },
              title: { type: "string", description: "Collection title" },
              description: { type: "string", description: "Collection description" },
              attrs: {
                type: "array",
                description: "Array of attributes",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Attribute name" },
                    type: { type: "string", enum: ["categorical", "numeric", "date", "qualitative", "boundary"], description: "Attribute type" },
                    description: { type: "string", description: "Attribute description" },
                    unit: { type: "string", description: "Attribute unit" }
                  },
                  required: ["name"]
                }
              }
            },
            required: ["name"]
          }
        }
      },
      required: ["name", "collections"]
    }
  },
  {
    name: "createItems",
    title: "Create Items",
    description: "Create new items (cases) in a data context",
    parameters: {
      type: "object",
      properties: {
        dataContext: { type: "string", description: "Data context name" },
        collection: { type: "string", description: "Collection name" },
        items: {
          type: "array",
          description: "Array of items to create",
          items: {
            type: "object",
            description: "Item with attribute values",
            additionalProperties: true
          }
        }
      },
      required: ["dataContext", "items"]
    }
  },
  {
    name: "updateItems",
    title: "Update Items",
    description: "Update existing items in a data context",
    parameters: {
      type: "object",
      properties: {
        dataContext: { type: "string", description: "Data context name" },
        collection: { type: "string", description: "Collection name" },
        items: {
          type: "array",
          description: "Array of items to update with their IDs",
          items: {
            type: "object",
            properties: {
              id: { type: "number", description: "Item ID" }
            },
            required: ["id"],
            additionalProperties: true
          }
        }
      },
      required: ["dataContext", "items"]
    }
  },
  {
    name: "deleteItems",
    title: "Delete Items",
    description: "Delete items from a data context",
    parameters: {
      type: "object",
      properties: {
        dataContext: { type: "string", description: "Data context name" },
        collection: { type: "string", description: "Collection name" },
        items: {
          type: "array",
          description: "Array of item IDs to delete",
          items: { type: "number" }
        }
      },
      required: ["dataContext", "items"]
    }
  },
  {
    name: "getAllItems",
    title: "Get All Items",
    description: "Retrieve all items from a data context",
    parameters: {
      type: "object",
      properties: {
        dataContext: { type: "string", description: "Data context name" },
        collection: { type: "string", description: "Collection name (optional)" }
      },
      required: ["dataContext"]
    }
  },
  {
    name: "getItemCount",
    title: "Get Item Count",
    description: "Get the number of items in a data context",
    parameters: {
      type: "object",
      properties: {
        dataContext: { type: "string", description: "Data context name" },
        collection: { type: "string", description: "Collection name (optional)" }
      },
      required: ["dataContext"]
    }
  },
  {
    name: "getItemByID",
    title: "Get Item by ID",
    description: "Retrieve a specific item by its ID",
    parameters: {
      type: "object",
      properties: {
        dataContext: { type: "string", description: "Data context name" },
        collection: { type: "string", description: "Collection name" },
        itemID: { type: "number", description: "Item ID" }
      },
      required: ["dataContext", "itemID"]
    }
  },
  {
    name: "selectItems",
    title: "Select Items",
    description: "Select specific items in a data context",
    parameters: {
      type: "object",
      properties: {
        dataContext: { type: "string", description: "Data context name" },
        collection: { type: "string", description: "Collection name" },
        items: {
          type: "array",
          description: "Array of item IDs to select",
          items: { type: "number" }
        },
        extend: { type: "boolean", description: "Whether to extend current selection", default: false }
      },
      required: ["dataContext", "items"]
    }
  },
  {
    name: "createCollection",
    title: "Create Collection",
    description: "Create a new collection in an existing data context",
    parameters: {
      type: "object",
      properties: {
        dataContext: { type: "string", description: "Data context name" },
        collection: {
          type: "object",
          properties: {
            name: { type: "string", description: "Collection name" },
            title: { type: "string", description: "Collection title" },
            description: { type: "string", description: "Collection description" },
            parent: { type: "string", description: "Parent collection name" },
            attrs: {
              type: "array",
              description: "Array of attributes",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Attribute name" },
                  type: { type: "string", enum: ["categorical", "numeric", "date", "qualitative", "boundary"], description: "Attribute type" },
                  description: { type: "string", description: "Attribute description" },
                  unit: { type: "string", description: "Attribute unit" }
                },
                required: ["name"]
              }
            }
          },
          required: ["name"]
        }
      },
      required: ["dataContext", "collection"]
    }
  },
  {
    name: "createAttribute",
    title: "Create Attribute",
    description: "Create a new attribute in a collection",
    parameters: {
      type: "object",
      properties: {
        dataContext: { type: "string", description: "Data context name" },
        collection: { type: "string", description: "Collection name" },
        attribute: {
          type: "object",
          properties: {
            name: { type: "string", description: "Attribute name" },
            type: { type: "string", enum: ["categorical", "numeric", "date", "qualitative", "boundary"], description: "Attribute type" },
            description: { type: "string", description: "Attribute description" },
            unit: { type: "string", description: "Attribute unit" },
            formula: { type: "string", description: "Formula for computed attribute" }
          },
          required: ["name"]
        }
      },
      required: ["dataContext", "collection", "attribute"]
    }
  },
  {
    name: "updateAttribute",
    title: "Update Attribute",
    description: "Update an existing attribute",
    parameters: {
      type: "object",
      properties: {
        dataContext: { type: "string", description: "Data context name" },
        collection: { type: "string", description: "Collection name" },
        attribute: {
          type: "object",
          properties: {
            name: { type: "string", description: "Attribute name" },
            type: { type: "string", enum: ["categorical", "numeric", "date", "qualitative", "boundary"], description: "Attribute type" },
            description: { type: "string", description: "Attribute description" },
            unit: { type: "string", description: "Attribute unit" },
            formula: { type: "string", description: "Formula for computed attribute" }
          },
          required: ["name"]
        }
      },
      required: ["dataContext", "collection", "attribute"]
    }
  },
  {
    name: "deleteAttribute",
    title: "Delete Attribute",
    description: "Delete an attribute from a collection",
    parameters: {
      type: "object",
      properties: {
        dataContext: { type: "string", description: "Data context name" },
        collection: { type: "string", description: "Collection name" },
        attribute: { type: "string", description: "Attribute name" }
      },
      required: ["dataContext", "collection", "attribute"]
    }
  },
  {
    name: "createGraph",
    title: "Create Graph",
    description: "Create a new graph component",
    parameters: {
      type: "object",
      properties: {
        dataContext: { type: "string", description: "Data context name" },
        title: { type: "string", description: "Graph title" },
        xAttributeName: { type: "string", description: "X-axis attribute name" },
        yAttributeName: { type: "string", description: "Y-axis attribute name" },
        legendAttributeName: { type: "string", description: "Legend attribute name" },
        position: {
          type: "object",
          properties: {
            x: { type: "number", description: "X position" },
            y: { type: "number", description: "Y position" }
          }
        },
        dimensions: {
          type: "object",
          properties: {
            width: { type: "number", description: "Width" },
            height: { type: "number", description: "Height" }
          }
        }
      },
      required: ["dataContext"]
    }
  },
  {
    name: "createTable",
    title: "Create Table",
    description: "Create a new table component",
    parameters: {
      type: "object",
      properties: {
        dataContext: { type: "string", description: "Data context name" },
        title: { type: "string", description: "Table title" },
        position: {
          type: "object",
          properties: {
            x: { type: "number", description: "X position" },
            y: { type: "number", description: "Y position" }
          }
        },
        dimensions: {
          type: "object",
          properties: {
            width: { type: "number", description: "Width" },
            height: { type: "number", description: "Height" }
          }
        }
      },
      required: ["dataContext"]
    }
  },
  {
    name: "createSlider",
    title: "Create Slider",
    description: "Create a new slider component",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Slider title" },
        name: { type: "string", description: "Slider name" },
        globalValue: { type: "number", description: "Initial value" },
        lowerBound: { type: "number", description: "Lower bound" },
        upperBound: { type: "number", description: "Upper bound" },
        animationDirection: { type: "number", description: "Animation direction" },
        animationMode: { type: "string", description: "Animation mode" },
        position: {
          type: "object",
          properties: {
            x: { type: "number", description: "X position" },
            y: { type: "number", description: "Y position" }
          }
        },
        dimensions: {
          type: "object",
          properties: {
            width: { type: "number", description: "Width" },
            height: { type: "number", description: "Height" }
          }
        }
      },
      required: ["title", "name"]
    }
  },
  {
    name: "createCalculator",
    title: "Create Calculator",
    description: "Create a new calculator component",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Calculator title" },
        position: {
          type: "object",
          properties: {
            x: { type: "number", description: "X position" },
            y: { type: "number", description: "Y position" }
          }
        },
        dimensions: {
          type: "object",
          properties: {
            width: { type: "number", description: "Width" },
            height: { type: "number", description: "Height" }
          }
        }
      }
    }
  },
  {
    name: "createText",
    title: "Create Text",
    description: "Create a new text component",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text content" },
        position: {
          type: "object",
          properties: {
            x: { type: "number", description: "X position" },
            y: { type: "number", description: "Y position" }
          }
        },
        dimensions: {
          type: "object",
          properties: {
            width: { type: "number", description: "Width" },
            height: { type: "number", description: "Height" }
          }
        }
      },
      required: ["text"]
    }
  },
  {
    name: "createWebView",
    title: "Create Web View",
    description: "Create a new web view component",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Web view title" },
        URL: { type: "string", description: "URL to display" },
        position: {
          type: "object",
          properties: {
            x: { type: "number", description: "X position" },
            y: { type: "number", description: "Y position" }
          }
        },
        dimensions: {
          type: "object",
          properties: {
            width: { type: "number", description: "Width" },
            height: { type: "number", description: "Height" }
          }
        }
      },
      required: ["URL"]
    }
  },
  {
    name: "deleteComponent",
    title: "Delete Component",
    description: "Delete a component by ID",
    parameters: {
      type: "object",
      properties: {
        component: { type: "number", description: "Component ID to delete" }
      },
      required: ["component"]
    }
  },
  {
    name: "updateComponent",
    title: "Update Component",
    description: "Update component properties",
    parameters: {
      type: "object",
      properties: {
        component: { type: "number", description: "Component ID" },
        title: { type: "string", description: "New title" },
        position: {
          type: "object",
          properties: {
            x: { type: "number", description: "X position" },
            y: { type: "number", description: "Y position" }
          }
        },
        dimensions: {
          type: "object",
          properties: {
            width: { type: "number", description: "Width" },
            height: { type: "number", description: "Height" }
          }
        }
      },
      required: ["component"]
    }
  },
  {
    name: "getAllComponents",
    title: "Get All Components",
    description: "Retrieve information about all components",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "getComponent",
    title: "Get Component",
    description: "Get information about a specific component",
    parameters: {
      type: "object",
      properties: {
        component: { type: "number", description: "Component ID" }
      },
      required: ["component"]
    }
  },
  {
    name: "getListOfDataContexts",
    title: "Get List of Data Contexts",
    description: "Retrieve a list of all data contexts",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "getDataContext",
    title: "Get Data Context",
    description: "Get information about a specific data context",
    parameters: {
      type: "object",
      properties: {
        dataContext: { type: "string", description: "Data context name" }
      },
      required: ["dataContext"]
    }
  },
  {
    name: "deleteDataContext",
    title: "Delete Data Context",
    description: "Delete a data context",
    parameters: {
      type: "object",
      properties: {
        dataContext: { type: "string", description: "Data context name to delete" }
      },
      required: ["dataContext"]
    }
  },
  {
    name: "getSelectedItems",
    title: "Get Selected Items",
    description: "Retrieve currently selected items",
    parameters: {
      type: "object",
      properties: {
        dataContext: { type: "string", description: "Data context name" },
        collection: { type: "string", description: "Collection name (optional)" }
      },
      required: ["dataContext"]
    }
  },
  {
    name: "deselectAll",
    title: "Deselect All",
    description: "Deselect all items in a data context",
    parameters: {
      type: "object",
      properties: {
        dataContext: { type: "string", description: "Data context name" }
      },
      required: ["dataContext"]
    }
  },
  {
    name: "getCollectionList",
    title: "Get Collection List",
    description: "Get list of collections in a data context",
    parameters: {
      type: "object",
      properties: {
        dataContext: { type: "string", description: "Data context name" }
      },
      required: ["dataContext"]
    }
  },
  {
    name: "getCollection",
    title: "Get Collection",
    description: "Get information about a specific collection",
    parameters: {
      type: "object",
      properties: {
        dataContext: { type: "string", description: "Data context name" },
        collection: { type: "string", description: "Collection name" }
      },
      required: ["dataContext", "collection"]
    }
  },
  {
    name: "getAttributeList",
    title: "Get Attribute List",
    description: "Get list of attributes in a collection",
    parameters: {
      type: "object",
      properties: {
        dataContext: { type: "string", description: "Data context name" },
        collection: { type: "string", description: "Collection name" }
      },
      required: ["dataContext", "collection"]
    }
  },
  {
    name: "getAttribute",
    title: "Get Attribute",
    description: "Get information about a specific attribute",
    parameters: {
      type: "object",
      properties: {
        dataContext: { type: "string", description: "Data context name" },
        collection: { type: "string", description: "Collection name" },
        attribute: { type: "string", description: "Attribute name" }
      },
      required: ["dataContext", "collection", "attribute"]
    }
  },
  {
    name: "registerForNotifications",
    title: "Register for Notifications",
    description: "Register to receive notifications for specific events",
    parameters: {
      type: "object",
      properties: {
        request: { type: "string", description: "Notification type (e.g., 'dataContextChangeNotice')" },
        callback: { type: "string", description: "Callback function name" }
      },
      required: ["request"]
    }
  },
  {
    name: "unregisterForNotifications",
    title: "Unregister for Notifications",
    description: "Unregister from receiving notifications",
    parameters: {
      type: "object",
      properties: {
        request: { type: "string", description: "Notification type to unregister from" }
      },
      required: ["request"]
    }
  }
];

// =============================================================================
// SAGEMODELER TOOLS
// =============================================================================

const SAGEMODELER_TOOLS = [
  // Node Management
  {
    name: "sage_create_node",
    title: "Create SageModeler Node",
    description: "Create a new node in the SageModeler with specified properties",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Node title/name" },
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
  },
  {
    name: "sage_create_random_node",
    title: "Create Random SageModeler Node",
    description: "Create a node with random properties for testing",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "sage_update_node",
    title: "Update SageModeler Node",
    description: "Update properties of an existing node",
    parameters: {
      type: "object",
      properties: {
        nodeId: { type: "string", description: "ID of node to update" },
        title: { type: "string", description: "Node title/name" },
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
      required: ["nodeId"]
    }
  },
  {
    name: "sage_delete_node",
    title: "Delete SageModeler Node",
    description: "Delete a node from the model",
    parameters: {
      type: "object",
      properties: {
        nodeId: { type: "string", description: "ID of node to delete" }
      },
      required: ["nodeId"]
    }
  },
  {
    name: "sage_get_all_nodes",
    title: "Get All SageModeler Nodes",
    description: "Retrieve all nodes in the model",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "sage_get_node_by_id",
    title: "Get SageModeler Node by ID",
    description: "Retrieve a specific node by its ID",
    parameters: {
      type: "object",
      properties: {
        nodeId: { type: "string", description: "ID of node to retrieve" }
      },
      required: ["nodeId"]
    }
  },
  {
    name: "sage_select_node",
    title: "Select SageModeler Node",
    description: "Select a node in the UI",
    parameters: {
      type: "object",
      properties: {
        nodeId: { type: "string", description: "ID of node to select" }
      },
      required: ["nodeId"]
    }
  },
  
  // Link Management
  {
    name: "sage_create_link",
    title: "Create SageModeler Link",
    description: "Create a link between two nodes",
    parameters: {
      type: "object",
      properties: {
        source: { type: "string", description: "Source node ID" },
        target: { type: "string", description: "Target node ID" },
        relationVector: { 
          type: "string", 
          enum: ["increase", "decrease", "vary"],
          description: "Relationship type" 
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
  },
  {
    name: "sage_update_link",
    title: "Update SageModeler Link",
    description: "Update properties of an existing link",
    parameters: {
      type: "object",
      properties: {
        linkId: { type: "string", description: "ID of link to update" },
        source: { type: "string", description: "Source node ID" },
        target: { type: "string", description: "Target node ID" },
        relationVector: { 
          type: "string", 
          enum: ["increase", "decrease", "vary"],
          description: "Relationship type" 
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
      required: ["linkId"]
    }
  },
  {
    name: "sage_delete_link",
    title: "Delete SageModeler Link",
    description: "Delete a link from the model",
    parameters: {
      type: "object",
      properties: {
        linkId: { type: "string", description: "ID of link to delete" }
      },
      required: ["linkId"]
    }
  },
  {
    name: "sage_get_all_links",
    title: "Get All SageModeler Links",
    description: "Retrieve all links in the model",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "sage_get_link_by_id",
    title: "Get SageModeler Link by ID",
    description: "Retrieve a specific link by its ID",
    parameters: {
      type: "object",
      properties: {
        linkId: { type: "string", description: "ID of link to retrieve" }
      },
      required: ["linkId"]
    }
  },
  
  // Experiment Functions
  {
    name: "sage_reload_experiment_nodes",
    title: "Reload SageModeler Experiment Nodes",
    description: "Reload nodes available for experimentation",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "sage_run_experiment",
    title: "Run SageModeler Experiment",
    description: "Execute an experiment with specified parameters",
    parameters: {
      type: "object",
      properties: {
        mode: { 
          type: "string", 
          enum: ["static", "dynamic"],
          description: "Experiment mode" 
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
          additionalProperties: true
        }
      },
      required: ["mode", "parameters"]
    }
  },
  
  // Recording Functions
  {
    name: "sage_start_recording",
    title: "Start SageModeler Recording",
    description: "Start recording simulation data",
    parameters: {
      type: "object",
      properties: {
        duration: { type: "number", description: "Recording duration" },
        units: { type: "string", description: "Time units" }
      }
    }
  },
  {
    name: "sage_stop_recording",
    title: "Stop SageModeler Recording",
    description: "Stop active recording",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "sage_set_recording_options",
    title: "Set SageModeler Recording Options",
    description: "Configure recording settings",
    parameters: {
      type: "object",
      properties: {
        options: { 
          type: "object", 
          description: "Recording configuration options",
          additionalProperties: true
        }
      },
      required: ["options"]
    }
  },
  
  // Model Import/Export Functions
  {
    name: "sage_load_model",
    title: "Load SageModeler Model",
    description: "Load a model from JSON input",
    parameters: {
      type: "object",
      properties: {
        model: { 
          type: "object", 
          description: "Model data in SageModeler format",
          additionalProperties: true
        }
      },
      required: ["model"]
    }
  },
  {
    name: "sage_export_model",
    title: "Export SageModeler Model",
    description: "Export the current model as JSON",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "sage_import_sd_json",
    title: "Import SageModeler SD-JSON",
    description: "Import model from System Dynamics JSON format",
    parameters: {
      type: "object",
      properties: {
        sdJson: { 
          type: "object", 
          description: "System Dynamics JSON data",
          additionalProperties: true
        }
      },
      required: ["sdJson"]
    }
  },
  {
    name: "sage_export_sd_json",
    title: "Export SageModeler SD-JSON",
    description: "Export model to System Dynamics JSON format",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  
  // Settings Functions
  {
    name: "sage_set_model_complexity",
    title: "Set SageModeler Model Complexity",
    description: "Configure model complexity settings",
    parameters: {
      type: "object",
      properties: {
        complexity: { 
          type: "string", 
          enum: ["simple", "intermediate", "advanced"],
          description: "Model complexity level" 
        }
      },
      required: ["complexity"]
    }
  },
  {
    name: "sage_set_ui_settings",
    title: "Set SageModeler UI Settings",
    description: "Configure user interface settings",
    parameters: {
      type: "object",
      properties: {
        settings: { 
          type: "object", 
          description: "UI configuration settings",
          additionalProperties: true
        }
      },
      required: ["settings"]
    }
  },
  {
    name: "sage_restore_default_settings",
    title: "Restore SageModeler Default Settings",
    description: "Restore all settings to default values",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  
  // Simulation State
  {
    name: "sage_get_simulation_state",
    title: "Get SageModeler Simulation State",
    description: "Retrieve current simulation state and data",
    parameters: {
      type: "object",
      properties: {}
    }
  }
];

// =============================================================================
// CAPABILITY DEFINITIONS
// =============================================================================

/**
 * Capability definitions for different application contexts
 * Used for session-based tool filtering
 */
const CAPABILITY_DEFINITIONS = {
  // Base CODAP capability - available in all CODAP instances
  CODAP: {
    name: "CODAP",
    description: "Common Online Data Analysis Platform tools",
    tools: CODAP_TOOLS.map(tool => tool.name)
  },
  
  // SageModeler capability - available when SageModeler is integrated
  SAGEMODELER: {
    name: "SAGEMODELER", 
    description: "SageModeler system dynamics modeling tools",
    tools: SAGEMODELER_TOOLS.map(tool => tool.name)
  }
  
  // Future capabilities can be added here:
  // NETLOGO: { name: "NETLOGO", description: "NetLogo agent-based modeling tools", tools: [...] },
  // STELLA: { name: "STELLA", description: "STELLA system dynamics tools", tools: [...] }
};

// =============================================================================
// TOOL REGISTRY MANAGEMENT
// =============================================================================

/**
 * Get all available tools organized by capability
 */
function getAllToolsByCapability() {
  return {
    CODAP: CODAP_TOOLS,
    SAGEMODELER: SAGEMODELER_TOOLS
  };
}

/**
 * Get all tools as a flat array (for backward compatibility)
 */
function getAllTools() {
  return [...CODAP_TOOLS, ...SAGEMODELER_TOOLS];
}

/**
 * Get tools filtered by capabilities
 * @param {string[]} capabilities - Array of capability names (e.g., ['CODAP', 'SAGEMODELER'])
 * @returns {object[]} Array of tool definitions
 */
function getToolsByCapabilities(capabilities = ['CODAP']) {
  const tools = [];
  
  for (const capability of capabilities) {
    if (capability === 'CODAP') {
      tools.push(...CODAP_TOOLS);
    } else if (capability === 'SAGEMODELER') {
      tools.push(...SAGEMODELER_TOOLS);
    }
    // Future capabilities can be added here
  }
  
  return tools;
}

/**
 * Get capability information
 * @param {string} capabilityName - Name of the capability
 * @returns {object|null} Capability definition or null if not found
 */
function getCapabilityInfo(capabilityName) {
  return CAPABILITY_DEFINITIONS[capabilityName] || null;
}

/**
 * Get all available capabilities
 * @returns {object} All capability definitions
 */
function getAllCapabilities() {
  return CAPABILITY_DEFINITIONS;
}

/**
 * Validate if a set of capabilities is valid
 * @param {string[]} capabilities - Array of capability names
 * @returns {boolean} True if all capabilities are valid
 */
function validateCapabilities(capabilities) {
  if (!Array.isArray(capabilities)) return false;
  return capabilities.every(cap => CAPABILITY_DEFINITIONS.hasOwnProperty(cap));
}

// =============================================================================
// EXPORTS
// =============================================================================

// Export for CommonJS compatibility
module.exports = { 
  // Legacy exports (for backward compatibility)
  CODAP_TOOLS,
  
  // New organized exports
  SAGEMODELER_TOOLS,
  CAPABILITY_DEFINITIONS,
  
  // Utility functions
  getAllTools,
  getAllToolsByCapability,
  getToolsByCapabilities,
  getCapabilityInfo,
  getAllCapabilities,
  validateCapabilities
};
