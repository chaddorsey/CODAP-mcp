/**
 * CODAP Tool Registry for MCP Server
 * Exports the complete set of CODAP tools for registration with the MCP server
 */

export const CODAP_TOOLS = [
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
            formula: { type: "string", description: "Attribute formula" }
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
    description: "Update an existing attribute's properties",
    parameters: {
      type: "object",
      properties: {
        dataContext: { type: "string", description: "Data context name" },
        collection: { type: "string", description: "Collection name" },
        attribute: {
          type: "object",
          properties: {
            name: { type: "string", description: "Attribute name" },
            type: { type: "string", enum: ["categorical", "numeric", "date", "qualitative", "boundary"], description: "New attribute type" },
            description: { type: "string", description: "New attribute description" },
            unit: { type: "string", description: "New attribute unit" },
            formula: { type: "string", description: "New attribute formula" }
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
        attribute: { type: "string", description: "Attribute name to delete" }
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
        xAttributeName: { type: "string", description: "X-axis attribute name" },
        yAttributeName: { type: "string", description: "Y-axis attribute name" },
        legendAttributeName: { type: "string", description: "Legend attribute name (optional)" },
        title: { type: "string", description: "Graph title" },
        width: { type: "number", description: "Graph width in pixels" },
        height: { type: "number", description: "Graph height in pixels" },
        position: {
          type: "object",
          properties: {
            x: { type: "number", description: "X position" },
            y: { type: "number", description: "Y position" }
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
        width: { type: "number", description: "Table width in pixels" },
        height: { type: "number", description: "Table height in pixels" },
        position: {
          type: "object",
          properties: {
            x: { type: "number", description: "X position" },
            y: { type: "number", description: "Y position" }
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
        min: { type: "number", description: "Minimum value" },
        max: { type: "number", description: "Maximum value" },
        step: { type: "number", description: "Step size" },
        value: { type: "number", description: "Initial value" },
        position: {
          type: "object",
          properties: {
            x: { type: "number", description: "X position" },
            y: { type: "number", description: "Y position" }
          }
        }
      },
      required: ["title", "name", "min", "max"]
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
        title: { type: "string", description: "Text title" },
        text: { type: "string", description: "Text content" },
        position: {
          type: "object",
          properties: {
            x: { type: "number", description: "X position" },
            y: { type: "number", description: "Y position" }
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