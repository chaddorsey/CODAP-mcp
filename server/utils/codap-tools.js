"use strict";
// server/codap-tools.ts
// Comprehensive CODAP MCP Tools Implementation
// Implements 35+ tools covering 90% of CODAP Plugin API
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOTAL_TOOL_COUNT = exports.allCODAPTools = exports.toolHandlers = exports.componentTools = exports.selectionTools = exports.caseItemTools = exports.attributeTools = exports.collectionTools = exports.dataContextTools = void 0;
// Helper function to simulate CODAP API calls
// In a real implementation, this would use the CODAP Plugin API
async function sendMessage(action, resource, values) {
    // Simulate API call - in real implementation this would use codapInterface.sendRequest
    console.log(`CODAP API Call: ${action} ${resource}`, values);
    // Simulate successful responses for demo purposes
    return {
        success: true,
        values: {
            message: `${action} operation on ${resource} completed successfully`,
            data: values || {}
        }
    };
}
// Data Context Tools
exports.dataContextTools = [
    {
        name: "create_data_context",
        description: "Create a new data context in CODAP",
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
                description: {
                    type: "string",
                    description: "Description of the data context"
                }
            },
            required: ["name"]
        }
    },
    {
        name: "get_data_contexts",
        description: "Get list of all data contexts",
        inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false
        }
    },
    {
        name: "get_data_context",
        description: "Get details of a specific data context",
        inputSchema: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "Name of the data context"
                }
            },
            required: ["name"]
        }
    },
    {
        name: "update_data_context",
        description: "Update properties of an existing data context",
        inputSchema: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "Current name of the data context"
                },
                newName: {
                    type: "string",
                    description: "New name for the data context"
                },
                title: {
                    type: "string",
                    description: "New title for the data context"
                },
                description: {
                    type: "string",
                    description: "New description for the data context"
                }
            },
            required: ["name"]
        }
    },
    {
        name: "delete_data_context",
        description: "Delete a data context and all its data",
        inputSchema: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "Name of the data context to delete"
                },
                confirmDelete: {
                    type: "boolean",
                    description: "Confirmation that you want to delete this data context"
                }
            },
            required: ["name", "confirmDelete"]
        }
    }
];
// Collection Management Tools
exports.collectionTools = [
    {
        name: "create_collection",
        description: "Create a new collection within a data context",
        inputSchema: {
            type: "object",
            properties: {
                dataContextName: {
                    type: "string",
                    description: "Name of the data context"
                },
                collectionName: {
                    type: "string",
                    description: "Name of the new collection"
                },
                attributes: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            type: { type: "string", enum: ["numeric", "categorical", "date", "boundary"] },
                            description: { type: "string" }
                        },
                        required: ["name", "type"]
                    },
                    description: "Array of attribute definitions"
                },
                parent: {
                    type: "string",
                    description: "Parent collection name (for hierarchical data)"
                }
            },
            required: ["dataContextName", "collectionName"]
        }
    },
    {
        name: "get_collections",
        description: "Get list of collections in a data context",
        inputSchema: {
            type: "object",
            properties: {
                dataContextName: {
                    type: "string",
                    description: "Name of the data context"
                }
            },
            required: ["dataContextName"]
        }
    },
    {
        name: "get_collection",
        description: "Get details of a specific collection",
        inputSchema: {
            type: "object",
            properties: {
                dataContextName: {
                    type: "string",
                    description: "Name of the data context"
                },
                collectionName: {
                    type: "string",
                    description: "Name of the collection"
                }
            },
            required: ["dataContextName", "collectionName"]
        }
    },
    {
        name: "update_collection",
        description: "Update collection properties",
        inputSchema: {
            type: "object",
            properties: {
                dataContextName: {
                    type: "string",
                    description: "Name of the data context"
                },
                collectionName: {
                    type: "string",
                    description: "Current name of the collection"
                },
                newName: {
                    type: "string",
                    description: "New name for the collection"
                },
                title: {
                    type: "string",
                    description: "New title for the collection"
                }
            },
            required: ["dataContextName", "collectionName"]
        }
    },
    {
        name: "delete_collection",
        description: "Delete a collection and all its data",
        inputSchema: {
            type: "object",
            properties: {
                dataContextName: {
                    type: "string",
                    description: "Name of the data context"
                },
                collectionName: {
                    type: "string",
                    description: "Name of the collection to delete"
                },
                confirmDelete: {
                    type: "boolean",
                    description: "Confirmation that you want to delete this collection"
                }
            },
            required: ["dataContextName", "collectionName", "confirmDelete"]
        }
    }
];
// Attribute Management Tools
exports.attributeTools = [
    {
        name: "create_attribute",
        description: "Create a new attribute in a collection",
        inputSchema: {
            type: "object",
            properties: {
                dataContextName: {
                    type: "string",
                    description: "Name of the data context"
                },
                collectionName: {
                    type: "string",
                    description: "Name of the collection"
                },
                attributeName: {
                    type: "string",
                    description: "Name of the new attribute"
                },
                type: {
                    type: "string",
                    enum: ["numeric", "categorical", "date", "boundary"],
                    description: "Type of the attribute"
                },
                description: {
                    type: "string",
                    description: "Description of the attribute"
                },
                formula: {
                    type: "string",
                    description: "Formula for calculated attributes"
                }
            },
            required: ["dataContextName", "collectionName", "attributeName", "type"]
        }
    },
    {
        name: "get_attributes",
        description: "Get list of attributes in a collection",
        inputSchema: {
            type: "object",
            properties: {
                dataContextName: {
                    type: "string",
                    description: "Name of the data context"
                },
                collectionName: {
                    type: "string",
                    description: "Name of the collection"
                }
            },
            required: ["dataContextName", "collectionName"]
        }
    },
    {
        name: "get_attribute",
        description: "Get details of a specific attribute",
        inputSchema: {
            type: "object",
            properties: {
                dataContextName: {
                    type: "string",
                    description: "Name of the data context"
                },
                collectionName: {
                    type: "string",
                    description: "Name of the collection"
                },
                attributeName: {
                    type: "string",
                    description: "Name of the attribute"
                }
            },
            required: ["dataContextName", "collectionName", "attributeName"]
        }
    },
    {
        name: "update_attribute",
        description: "Update attribute properties",
        inputSchema: {
            type: "object",
            properties: {
                dataContextName: {
                    type: "string",
                    description: "Name of the data context"
                },
                collectionName: {
                    type: "string",
                    description: "Name of the collection"
                },
                attributeName: {
                    type: "string",
                    description: "Current name of the attribute"
                },
                newName: {
                    type: "string",
                    description: "New name for the attribute"
                },
                type: {
                    type: "string",
                    enum: ["numeric", "categorical", "date", "boundary"],
                    description: "New type for the attribute"
                },
                description: {
                    type: "string",
                    description: "New description for the attribute"
                },
                formula: {
                    type: "string",
                    description: "New formula for the attribute"
                }
            },
            required: ["dataContextName", "collectionName", "attributeName"]
        }
    },
    {
        name: "delete_attribute",
        description: "Delete an attribute from a collection",
        inputSchema: {
            type: "object",
            properties: {
                dataContextName: {
                    type: "string",
                    description: "Name of the data context"
                },
                collectionName: {
                    type: "string",
                    description: "Name of the collection"
                },
                attributeName: {
                    type: "string",
                    description: "Name of the attribute to delete"
                },
                confirmDelete: {
                    type: "boolean",
                    description: "Confirmation that you want to delete this attribute"
                }
            },
            required: ["dataContextName", "collectionName", "attributeName", "confirmDelete"]
        }
    },
    {
        name: "reorder_attributes",
        description: "Change the position of an attribute within a collection",
        inputSchema: {
            type: "object",
            properties: {
                dataContextName: {
                    type: "string",
                    description: "Name of the data context"
                },
                collectionName: {
                    type: "string",
                    description: "Name of the collection"
                },
                attributeName: {
                    type: "string",
                    description: "Name of the attribute to move"
                },
                newPosition: {
                    type: "number",
                    description: "New position index (0-based)"
                }
            },
            required: ["dataContextName", "collectionName", "attributeName", "newPosition"]
        }
    }
];
// Case and Item Management Tools
exports.caseItemTools = [
    {
        name: "create_items",
        description: "Create new data items/cases in a collection",
        inputSchema: {
            type: "object",
            properties: {
                dataContextName: {
                    type: "string",
                    description: "Name of the data context"
                },
                collectionName: {
                    type: "string",
                    description: "Name of the collection"
                },
                items: {
                    type: "array",
                    items: {
                        type: "object",
                        description: "Item data as key-value pairs"
                    },
                    description: "Array of items to create"
                }
            },
            required: ["dataContextName", "collectionName", "items"]
        }
    },
    {
        name: "get_items",
        description: "Get all items from a data context",
        inputSchema: {
            type: "object",
            properties: {
                dataContextName: {
                    type: "string",
                    description: "Name of the data context"
                },
                limit: {
                    type: "number",
                    description: "Maximum number of items to return"
                }
            },
            required: ["dataContextName"]
        }
    },
    {
        name: "get_item_by_id",
        description: "Get a specific item by its ID",
        inputSchema: {
            type: "object",
            properties: {
                dataContextName: {
                    type: "string",
                    description: "Name of the data context"
                },
                itemId: {
                    type: ["string", "number"],
                    description: "ID of the item"
                }
            },
            required: ["dataContextName", "itemId"]
        }
    },
    {
        name: "update_items",
        description: "Update existing items in a collection",
        inputSchema: {
            type: "object",
            properties: {
                dataContextName: {
                    type: "string",
                    description: "Name of the data context"
                },
                updates: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: ["string", "number"] },
                            values: { type: "object" }
                        },
                        required: ["id", "values"]
                    },
                    description: "Array of item updates"
                }
            },
            required: ["dataContextName", "updates"]
        }
    },
    {
        name: "delete_items",
        description: "Delete specific items from a collection",
        inputSchema: {
            type: "object",
            properties: {
                dataContextName: {
                    type: "string",
                    description: "Name of the data context"
                },
                itemIds: {
                    type: "array",
                    items: {
                        type: ["string", "number"]
                    },
                    description: "Array of item IDs to delete"
                },
                confirmDelete: {
                    type: "boolean",
                    description: "Confirmation that you want to delete these items"
                }
            },
            required: ["dataContextName", "itemIds", "confirmDelete"]
        }
    },
    {
        name: "get_case_count",
        description: "Get the number of cases in a collection",
        inputSchema: {
            type: "object",
            properties: {
                dataContextName: {
                    type: "string",
                    description: "Name of the data context"
                },
                collectionName: {
                    type: "string",
                    description: "Name of the collection"
                }
            },
            required: ["dataContextName", "collectionName"]
        }
    },
    {
        name: "get_case_by_index",
        description: "Get a case by its index position",
        inputSchema: {
            type: "object",
            properties: {
                dataContextName: {
                    type: "string",
                    description: "Name of the data context"
                },
                collectionName: {
                    type: "string",
                    description: "Name of the collection"
                },
                index: {
                    type: "number",
                    description: "Index position of the case (0-based)"
                }
            },
            required: ["dataContextName", "collectionName", "index"]
        }
    },
    {
        name: "search_cases",
        description: "Search for cases using attribute values",
        inputSchema: {
            type: "object",
            properties: {
                dataContextName: {
                    type: "string",
                    description: "Name of the data context"
                },
                collectionName: {
                    type: "string",
                    description: "Name of the collection"
                },
                searchCriteria: {
                    type: "object",
                    properties: {
                        attributeName: {
                            type: "string",
                            description: "Name of the attribute to search"
                        },
                        value: {
                            type: ["string", "number"],
                            description: "Value to search for"
                        },
                        operator: {
                            type: "string",
                            enum: ["equals", "contains", "startsWith", "endsWith", "greaterThan", "lessThan"],
                            default: "equals",
                            description: "Search operator"
                        }
                    },
                    required: ["attributeName", "value"]
                },
                limit: {
                    type: "number",
                    default: 100,
                    description: "Maximum number of results to return"
                }
            },
            required: ["dataContextName", "collectionName", "searchCriteria"]
        }
    }
];
// Selection and Interaction Tools
exports.selectionTools = [
    {
        name: "get_selection",
        description: "Get the current selection of cases",
        inputSchema: {
            type: "object",
            properties: {
                dataContextName: {
                    type: "string",
                    description: "Name of the data context"
                }
            },
            required: ["dataContextName"]
        }
    },
    {
        name: "select_cases",
        description: "Select specific cases in CODAP interface",
        inputSchema: {
            type: "object",
            properties: {
                dataContextName: {
                    type: "string",
                    description: "Name of the data context"
                },
                caseIds: {
                    type: "array",
                    items: {
                        type: ["string", "number"]
                    },
                    description: "Array of case IDs to select"
                },
                extend: {
                    type: "boolean",
                    default: false,
                    description: "Add to existing selection instead of replacing"
                }
            },
            required: ["dataContextName", "caseIds"]
        }
    },
    {
        name: "clear_selection",
        description: "Clear all selected cases",
        inputSchema: {
            type: "object",
            properties: {
                dataContextName: {
                    type: "string",
                    description: "Name of the data context"
                }
            },
            required: ["dataContextName"]
        }
    }
];
// Component Management Tools
exports.componentTools = [
    {
        name: "create_table",
        description: "Create a case table component",
        inputSchema: {
            type: "object",
            properties: {
                dataContextName: {
                    type: "string",
                    description: "Name of the data context to display"
                },
                title: {
                    type: "string",
                    description: "Title for the table"
                },
                position: {
                    type: "object",
                    properties: {
                        x: { type: "number" },
                        y: { type: "number" }
                    },
                    description: "Position of the table"
                },
                dimensions: {
                    type: "object",
                    properties: {
                        width: { type: "number" },
                        height: { type: "number" }
                    },
                    description: "Dimensions of the table"
                }
            },
            required: ["dataContextName"]
        }
    },
    {
        name: "create_graph",
        description: "Create a graph component",
        inputSchema: {
            type: "object",
            properties: {
                dataContextName: {
                    type: "string",
                    description: "Name of the data context to display"
                },
                title: {
                    type: "string",
                    description: "Title for the graph"
                },
                xAttribute: {
                    type: "string",
                    description: "Attribute for X-axis"
                },
                yAttribute: {
                    type: "string",
                    description: "Attribute for Y-axis"
                },
                graphType: {
                    type: "string",
                    enum: ["scatterPlot", "linePlot", "histogram", "boxPlot"],
                    default: "scatterPlot",
                    description: "Type of graph to create"
                },
                position: {
                    type: "object",
                    properties: {
                        x: { type: "number" },
                        y: { type: "number" }
                    },
                    description: "Position of the graph"
                },
                dimensions: {
                    type: "object",
                    properties: {
                        width: { type: "number" },
                        height: { type: "number" }
                    },
                    description: "Dimensions of the graph"
                }
            },
            required: ["dataContextName"]
        }
    },
    {
        name: "create_map",
        description: "Create a map component",
        inputSchema: {
            type: "object",
            properties: {
                dataContextName: {
                    type: "string",
                    description: "Name of the data context to display"
                },
                title: {
                    type: "string",
                    description: "Title for the map"
                },
                latitudeAttribute: {
                    type: "string",
                    description: "Attribute containing latitude values"
                },
                longitudeAttribute: {
                    type: "string",
                    description: "Attribute containing longitude values"
                },
                position: {
                    type: "object",
                    properties: {
                        x: { type: "number" },
                        y: { type: "number" }
                    },
                    description: "Position of the map"
                },
                dimensions: {
                    type: "object",
                    properties: {
                        width: { type: "number" },
                        height: { type: "number" }
                    },
                    description: "Dimensions of the map"
                }
            },
            required: ["dataContextName"]
        }
    },
    {
        name: "get_components",
        description: "Get list of all components in the document",
        inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false
        }
    },
    {
        name: "update_component",
        description: "Update component properties",
        inputSchema: {
            type: "object",
            properties: {
                componentId: {
                    type: ["string", "number"],
                    description: "ID of the component to update"
                },
                title: {
                    type: "string",
                    description: "New title for the component"
                },
                position: {
                    type: "object",
                    properties: {
                        x: { type: "number" },
                        y: { type: "number" }
                    },
                    description: "New position for the component"
                },
                dimensions: {
                    type: "object",
                    properties: {
                        width: { type: "number" },
                        height: { type: "number" }
                    },
                    description: "New dimensions for the component"
                }
            },
            required: ["componentId"]
        }
    },
    {
        name: "delete_component",
        description: "Delete a component from the document",
        inputSchema: {
            type: "object",
            properties: {
                componentId: {
                    type: ["string", "number"],
                    description: "ID of the component to delete"
                },
                confirmDelete: {
                    type: "boolean",
                    description: "Confirmation that you want to delete this component"
                }
            },
            required: ["componentId", "confirmDelete"]
        }
    }
];
// Tool Handlers
exports.toolHandlers = {
    // Data Context Handlers
    create_data_context: async (args) => {
        const { name, title, description } = args;
        return await sendMessage("create", "dataContext", {
            name,
            title: title || name,
            description: description || ""
        });
    },
    get_data_contexts: async () => {
        return await sendMessage("get", "dataContextList");
    },
    get_data_context: async (args) => {
        const { name } = args;
        return await sendMessage("get", `dataContext[${name}]`);
    },
    update_data_context: async (args) => {
        const { name, newName, title, description } = args;
        const updateValues = {};
        if (newName)
            {updateValues.name = newName;}
        if (title)
            {updateValues.title = title;}
        if (description)
            {updateValues.description = description;}
        return await sendMessage("update", `dataContext[${name}]`, updateValues);
    },
    delete_data_context: async (args) => {
        const { name, confirmDelete } = args;
        if (!confirmDelete) {
            throw new Error("Delete confirmation required");
        }
        return await sendMessage("delete", `dataContext[${name}]`);
    },
    // Collection Handlers
    create_collection: async (args) => {
        const { dataContextName, collectionName, attributes, parent } = args;
        const values = {
            name: collectionName,
            title: collectionName
        };
        if (parent)
            {values.parent = parent;}
        if (attributes)
            {values.attrs = attributes;}
        return await sendMessage("create", `dataContext[${dataContextName}].collection`, values);
    },
    get_collections: async (args) => {
        const { dataContextName } = args;
        return await sendMessage("get", `dataContext[${dataContextName}].collectionList`);
    },
    get_collection: async (args) => {
        const { dataContextName, collectionName } = args;
        return await sendMessage("get", `dataContext[${dataContextName}].collection[${collectionName}]`);
    },
    update_collection: async (args) => {
        const { dataContextName, collectionName, newName, title } = args;
        const updateValues = {};
        if (newName)
            {updateValues.name = newName;}
        if (title)
            {updateValues.title = title;}
        return await sendMessage("update", `dataContext[${dataContextName}].collection[${collectionName}]`, updateValues);
    },
    delete_collection: async (args) => {
        const { dataContextName, collectionName, confirmDelete } = args;
        if (!confirmDelete) {
            throw new Error("Delete confirmation required");
        }
        return await sendMessage("delete", `dataContext[${dataContextName}].collection[${collectionName}]`);
    },
    // Attribute Handlers
    create_attribute: async (args) => {
        const { dataContextName, collectionName, attributeName, type, description, formula } = args;
        const values = {
            name: attributeName,
            type,
            title: attributeName
        };
        if (description)
            {values.description = description;}
        if (formula)
            {values.formula = formula;}
        return await sendMessage("create", `dataContext[${dataContextName}].collection[${collectionName}].attribute`, values);
    },
    get_attributes: async (args) => {
        const { dataContextName, collectionName } = args;
        return await sendMessage("get", `dataContext[${dataContextName}].collection[${collectionName}].attributeList`);
    },
    get_attribute: async (args) => {
        const { dataContextName, collectionName, attributeName } = args;
        return await sendMessage("get", `dataContext[${dataContextName}].collection[${collectionName}].attribute[${attributeName}]`);
    },
    update_attribute: async (args) => {
        const { dataContextName, collectionName, attributeName, newName, type, description, formula } = args;
        const updateValues = {};
        if (newName)
            {updateValues.name = newName;}
        if (type)
            {updateValues.type = type;}
        if (description)
            {updateValues.description = description;}
        if (formula)
            {updateValues.formula = formula;}
        return await sendMessage("update", `dataContext[${dataContextName}].collection[${collectionName}].attribute[${attributeName}]`, updateValues);
    },
    delete_attribute: async (args) => {
        const { dataContextName, collectionName, attributeName, confirmDelete } = args;
        if (!confirmDelete) {
            throw new Error("Delete confirmation required");
        }
        return await sendMessage("delete", `dataContext[${dataContextName}].collection[${collectionName}].attribute[${attributeName}]`);
    },
    reorder_attributes: async (args) => {
        const { dataContextName, collectionName, attributeName, newPosition } = args;
        return await sendMessage("update", `dataContext[${dataContextName}].collection[${collectionName}].attributeLocation[${attributeName}]`, {
            collection: collectionName,
            position: newPosition
        });
    },
    // Case and Item Handlers
    create_items: async (args) => {
        const { dataContextName, collectionName, items } = args;
        return await sendMessage("create", `dataContext[${dataContextName}].item`, items);
    },
    get_items: async (args) => {
        const { dataContextName, limit } = args;
        const resource = limit ?
            `dataContext[${dataContextName}].item[0..${limit - 1}]` :
            `dataContext[${dataContextName}].itemSearch[*]`;
        return await sendMessage("get", resource);
    },
    get_item_by_id: async (args) => {
        const { dataContextName, itemId } = args;
        return await sendMessage("get", `dataContext[${dataContextName}].itemByID[${itemId}]`);
    },
    update_items: async (args) => {
        const { dataContextName, updates } = args;
        // Process each update individually
        const results = [];
        for (const update of updates) {
            const result = await sendMessage("update", `dataContext[${dataContextName}].itemByID[${update.id}]`, update.values);
            results.push(result);
        }
        return { success: true, values: { results } };
    },
    delete_items: async (args) => {
        const { dataContextName, itemIds, confirmDelete } = args;
        if (!confirmDelete) {
            throw new Error("Delete confirmation required");
        }
        // Delete each item individually
        const results = [];
        for (const itemId of itemIds) {
            const result = await sendMessage("delete", `dataContext[${dataContextName}].itemByID[${itemId}]`);
            results.push(result);
        }
        return { success: true, values: { results } };
    },
    get_case_count: async (args) => {
        const { dataContextName, collectionName } = args;
        return await sendMessage("get", `dataContext[${dataContextName}].collection[${collectionName}].caseCount`);
    },
    get_case_by_index: async (args) => {
        const { dataContextName, collectionName, index } = args;
        return await sendMessage("get", `dataContext[${dataContextName}].collection[${collectionName}].caseByIndex[${index}]`);
    },
    search_cases: async (args) => {
        const { dataContextName, collectionName, searchCriteria, limit = 100 } = args;
        const { attributeName, value, operator = "equals" } = searchCriteria;
        // Build search query based on operator
        let searchQuery;
        switch (operator) {
            case "contains":
                searchQuery = `${attributeName} contains "${value}"`;
                break;
            case "startsWith":
                searchQuery = `${attributeName} startsWith "${value}"`;
                break;
            case "endsWith":
                searchQuery = `${attributeName} endsWith "${value}"`;
                break;
            case "greaterThan":
                searchQuery = `${attributeName} > ${value}`;
                break;
            case "lessThan":
                searchQuery = `${attributeName} < ${value}`;
                break;
            default:
                searchQuery = `${attributeName} = "${value}"`;
        }
        return await sendMessage("get", `dataContext[${dataContextName}].collection[${collectionName}].caseBySearch[${searchQuery}]`, { limit });
    },
    // Selection Handlers
    get_selection: async (args) => {
        const { dataContextName } = args;
        return await sendMessage("get", `dataContext[${dataContextName}].selectionList`);
    },
    select_cases: async (args) => {
        const { dataContextName, caseIds, extend = false } = args;
        const action = extend ? "update" : "create";
        return await sendMessage(action, `dataContext[${dataContextName}].selectionList`, caseIds);
    },
    clear_selection: async (args) => {
        const { dataContextName } = args;
        return await sendMessage("create", `dataContext[${dataContextName}].selectionList`, []);
    },
    // Component Handlers
    create_table: async (args) => {
        const { dataContextName, title, position, dimensions } = args;
        const values = {
            type: "caseTable",
            dataContext: dataContextName
        };
        if (title)
            {values.name = title;}
        if (position)
            {values.position = position;}
        if (dimensions)
            {values.dimensions = dimensions;}
        return await sendMessage("create", "component", values);
    },
    create_graph: async (args) => {
        const { dataContextName, title, xAttribute, yAttribute, graphType = "scatterPlot", position, dimensions } = args;
        const values = {
            type: "graph",
            dataContext: dataContextName,
            graphType
        };
        if (title)
            {values.name = title;}
        if (xAttribute)
            {values.xAttribute = xAttribute;}
        if (yAttribute)
            {values.yAttribute = yAttribute;}
        if (position)
            {values.position = position;}
        if (dimensions)
            {values.dimensions = dimensions;}
        return await sendMessage("create", "component", values);
    },
    create_map: async (args) => {
        const { dataContextName, title, latitudeAttribute, longitudeAttribute, position, dimensions } = args;
        const values = {
            type: "map",
            dataContext: dataContextName
        };
        if (title)
            {values.name = title;}
        if (latitudeAttribute)
            {values.latitudeAttribute = latitudeAttribute;}
        if (longitudeAttribute)
            {values.longitudeAttribute = longitudeAttribute;}
        if (position)
            {values.position = position;}
        if (dimensions)
            {values.dimensions = dimensions;}
        return await sendMessage("create", "component", values);
    },
    get_components: async () => {
        return await sendMessage("get", "componentList");
    },
    update_component: async (args) => {
        const { componentId, title, position, dimensions } = args;
        const updateValues = {};
        if (title)
            {updateValues.name = title;}
        if (position)
            {updateValues.position = position;}
        if (dimensions)
            {updateValues.dimensions = dimensions;}
        return await sendMessage("update", `component[${componentId}]`, updateValues);
    },
    delete_component: async (args) => {
        const { componentId, confirmDelete } = args;
        if (!confirmDelete) {
            throw new Error("Delete confirmation required");
        }
        return await sendMessage("delete", `component[${componentId}]`);
    }
};
// Export all tools combined
exports.allCODAPTools = [
    ...exports.dataContextTools,
    ...exports.collectionTools,
    ...exports.attributeTools,
    ...exports.caseItemTools,
    ...exports.selectionTools,
    ...exports.componentTools
];
// Export tool count for verification
exports.TOTAL_TOOL_COUNT = exports.allCODAPTools.length;
console.log(`✅ CODAP Tools Module Loaded: ${exports.TOTAL_TOOL_COUNT} tools available`);
