# CODAP Plugin API Guide - Task 3-4

**Created**: 2025-01-17  
**Last Updated**: 2025-01-17  
**Source**: CODAP Plugin API documentation and codebase analysis  
**Links**: 
- [CODAP Plugin API GitHub](https://github.com/concord-consortium/codap-plugin-api)
- [CODAP Data Interactive API Wiki](https://github.com/concord-consortium/codap/wiki/CODAP-Data-Interactive-API)

## Overview

This document provides a comprehensive guide to the CODAP Plugin API based on actual documentation and codebase analysis. It serves as the foundation for implementing correct tool schemas in the Browser Worker system.

## Core API Structure

### Message Format

All CODAP API calls follow this basic structure:

```javascript
const message = {
  action: "create" | "get" | "update" | "delete",
  resource: "resource_string",
  values: { /* resource-specific values */ }
};

// Send via codapInterface
const result = await codapInterface.sendRequest(message);
```

### Resource Strings

Resources follow hierarchical patterns:
- `dataContext[contextName]` - A data context (dataset)
- `dataContext[contextName].collection[collectionName]` - A collection within a context
- `dataContext[contextName].collection[collectionName].attribute[attrName]` - An attribute
- `dataContext[contextName].item` - Items (cases) in a context
- `component` - UI components (graphs, tables, etc.)

## Core Operations

### 1. Data Context (Dataset) Operations

#### Create Data Context
```javascript
{
  action: "create",
  resource: "dataContext",
  values: {
    name: "My Dataset",
    title: "Display Title",
    collections: [
      {
        name: "Cases",
        title: "Cases",
        attrs: [
          { name: "x", type: "numeric", description: "X coordinate" },
          { name: "y", type: "numeric", description: "Y coordinate" }
        ]
      }
    ]
  }
}
```

#### Get Data Context
```javascript
{
  action: "get",
  resource: "dataContext[My Dataset]"
}
```

### 2. Collection Operations

#### Create Collection
```javascript
{
  action: "create",
  resource: "dataContext[My Dataset].collection",
  values: {
    name: "NewCollection",
    title: "New Collection",
    parent: "_root_", // or parent collection name
    attrs: [
      { name: "attribute1", type: "numeric" },
      { name: "attribute2", type: "categorical" }
    ]
  }
}
```

### 3. Item/Case Operations

#### Create Items (Bulk Data)
```javascript
{
  action: "create",
  resource: "dataContext[My Dataset].item",
  values: [
    { x: 1, y: 2 },
    { x: 3, y: 4 },
    { x: 5, y: 6 }
  ]
}
```

#### Get Items
```javascript
{
  action: "get",
  resource: "dataContext[My Dataset].item"
}
```

### 4. Component Operations

#### Create Component (Graph/Table)
```javascript
{
  action: "create",
  resource: "component",
  values: {
    type: "graph" | "caseTable" | "map" | "slider" | "calculator" | "text",
    dataContext: "My Dataset",
    name: "My Graph",
    title: "Graph Title",
    position: {
      x: 100,
      y: 100,
      width: 400,
      height: 300
    }
  }
}
```

## Attribute Types

Valid attribute types in CODAP:
- `"numeric"` - Numbers
- `"categorical"` - Categories/strings  
- `"date"` - Date values
- `"boundary"` - Geographic boundaries

## Helper Functions (from codap-helper.ts)

The CODAP plugin API provides these helper functions:

### Initialization
- `initializePlugin(options)` - Initialize the plugin
- `sendMessage(action, resource, values)` - Send a message to CODAP

### Data Context Functions
- `createDataContext(name)` - Create a new data context
- `getDataContext(name)` - Get data context info
- `getListOfDataContexts()` - List all contexts

### Collection Functions  
- `createParentCollection(contextName, collectionName, attrs)` - Create parent collection
- `createChildCollection(contextName, collectionName, parentName, attrs)` - Create child collection
- `getCollectionList(contextName)` - Get collections in context

### Item Functions
- `createItems(contextName, items)` - Bulk create items
- `getAllItems(contextName)` - Get all items
- `updateItemByID(contextName, itemID, values)` - Update specific item

### Component Functions
- `createTable(dataContext, name)` - Create a table component
- `createGraph(dataContext, graphType, xAttribute, yAttribute, title)` - Create a graph with axis assignments

## Enhanced Tool Patterns

### Creating Dataset with Automatic Table Display
For immediate user feedback, combine dataset creation with automatic table display:
```javascript
// 1. Create data context
// 2. Add items (data)
// 3. Create table component automatically
// This provides immediate visual feedback to users
```

### Creating Graphs with Proper Axis Assignment
Based on reference implementations:
```javascript
{
  action: "create",
  resource: "component", 
  values: {
    type: "graph",
    dataContext: "My Dataset",
    title: "Scatter Plot",
    configuration: {
      xAttributeName: "attribute1",
      yAttributeName: "attribute2"
    },
    dimensions: { width: 400, height: 300 },
    position: { left: 50, top: 50 }
  }
}
```

## API Response Format

All API calls return a response with this structure:

```javascript
{
  success: boolean,
  values: any, // Response data if successful
  error?: string // Error message if not successful
}
```

## Important Notes

1. **Resource Naming**: Resource strings must exactly match existing names
2. **Data Types**: Attribute types must be one of the valid CODAP types
3. **Collections**: Data must be organized into collections with attributes
4. **Items vs Cases**: Use "item" API for bulk operations, "case" API for individual records
5. **Asynchronous**: All API calls are asynchronous and return Promises

## Common Patterns

### Creating a Complete Dataset
1. Create data context with collections and attributes
2. Create items to populate with data
3. Create components (table/graph) to visualize

### Adding Data to Existing Dataset
1. Get existing data context info
2. Create items with matching attribute structure

### Creating Visualizations
1. Ensure data context exists
2. Create component with proper type and configuration
3. Link component to data context

This guide reflects the actual CODAP API structure and should be used as the definitive reference for implementing tool schemas. 