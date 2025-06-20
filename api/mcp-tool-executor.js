/**
 * Direct Tool Executor for MCP Client Compatibility
 * PBI 18 - Task 18-5 Extension: Direct Tool Execution
 * 
 * This module provides server-side implementations of CODAP tools for MCP clients
 * that don't require browser worker dependencies. It simulates CODAP API behavior
 * using KV storage for state management.
 */

const { CODAPStateManager } = require('./codap-state-manager.js');

/**
 * Direct Tool Executor for Server-Side CODAP Tool Execution
 */
class DirectToolExecutor {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.stateManager = new CODAPStateManager(sessionId);
  }

  // === Core Tool Implementations ===

  async executeCreateDataContext(args) {
    const { name, title, collections = [] } = args;
    
    if (!name) {
      throw new Error('Data context name is required');
    }

    // Check if data context already exists
    const existing = await this.stateManager.getDataContext(name);
    if (existing) {
      throw new Error(`Data context '${name}' already exists`);
    }

    const dataContext = await this.stateManager.createDataContext(name, title, collections);
    
    return {
      success: true,
      values: {
        id: dataContext.id,
        name: dataContext.name,
        title: dataContext.title,
        collections: dataContext.collections.map(coll => ({
          id: coll.id,
          name: coll.name,
          title: coll.title,
          attrs: coll.attrs.map(attr => ({
            id: attr.id,
            name: attr.name,
            type: attr.type,
            title: attr.title
          }))
        }))
      }
    };
  }

  async executeCreateItems(args) {
    const { dataContext, items } = args;
    
    if (!dataContext) {
      throw new Error('dataContext is required');
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('items array is required and must not be empty');
    }

    // Verify data context exists
    const context = await this.stateManager.getDataContext(dataContext);
    if (!context) {
      throw new Error(`Data context '${dataContext}' not found`);
    }

    const createdItems = await this.stateManager.createItems(dataContext, items);
    
    return {
      success: true,
      values: {
        itemIDs: createdItems.map(item => item.id),
        items: createdItems
      }
    };
  }

  async executeCreateTable(args) {
    const { dataContext, title, position, dimensions } = args;
    
    if (!dataContext) {
      throw new Error('dataContext is required');
    }

    // Verify data context exists
    const context = await this.stateManager.getDataContext(dataContext);
    if (!context) {
      throw new Error(`Data context '${dataContext}' not found`);
    }

    const component = await this.stateManager.createComponent('caseTable', title, dataContext, {
      position,
      dimensions
    });
    
    return {
      success: true,
      values: {
        id: component.id,
        name: component.name,
        type: component.type,
        dataContext: component.dataContext
      }
    };
  }

  async executeCreateGraph(args) {
    const { dataContext, title, xAttribute, yAttribute, graphType = 'scatterPlot', position, dimensions } = args;
    
    if (!dataContext) {
      throw new Error('dataContext is required');
    }

    // Verify data context exists
    const context = await this.stateManager.getDataContext(dataContext);
    if (!context) {
      throw new Error(`Data context '${dataContext}' not found`);
    }

    const component = await this.stateManager.createComponent('graph', title, dataContext, {
      xAttribute,
      yAttribute,
      graphType,
      position,
      dimensions
    });
    
    return {
      success: true,
      values: {
        id: component.id,
        name: component.name,
        type: component.type,
        dataContext: component.dataContext,
        xAttribute,
        yAttribute,
        graphType
      }
    };
  }

  async executeGetListOfDataContexts() {
    try {
      const contexts = await this.stateManager.listDataContexts();
      
      return {
        success: true,
        values: contexts.map(ctx => ({
          id: ctx.id,
          name: ctx.name,
          title: ctx.title
        }))
      };
    } catch (error) {
      console.error(`[DirectExecutor] Error in getListOfDataContexts: ${error.message}`);
      // Return empty list if there's an error
      return {
        success: true,
        values: []
      };
    }
  }

  async executeGetDataContext(args) {
    const { dataContext } = args;
    
    if (!dataContext) {
      throw new Error('dataContext is required');
    }

    const context = await this.stateManager.getDataContext(dataContext);
    if (!context) {
      throw new Error(`Data context '${dataContext}' not found`);
    }
    
    return {
      success: true,
      values: {
        id: context.id,
        name: context.name,
        title: context.title,
        collections: context.collections
      }
    };
  }

  async executeGetItems(args) {
    const { dataContext, limit } = args;
    
    if (!dataContext) {
      throw new Error('dataContext is required');
    }

    // Verify data context exists
    const context = await this.stateManager.getDataContext(dataContext);
    if (!context) {
      throw new Error(`Data context '${dataContext}' not found`);
    }

    const items = await this.stateManager.getItems(dataContext, limit);
    
    return {
      success: true,
      values: {
        items: items
      }
    };
  }

  async executeSelectCases(args) {
    const { dataContext, caseIds, extend = false } = args;
    
    if (!dataContext) {
      throw new Error('dataContext is required');
    }

    if (!caseIds || !Array.isArray(caseIds)) {
      throw new Error('caseIds array is required');
    }

    // Verify data context exists
    const context = await this.stateManager.getDataContext(dataContext);
    if (!context) {
      throw new Error(`Data context '${dataContext}' not found`);
    }

    let selectedIds;
    if (extend) {
      // Add to existing selection
      const currentSelection = await this.stateManager.getSelection(dataContext);
      selectedIds = [...new Set([...currentSelection, ...caseIds])];
    } else {
      // Replace selection
      selectedIds = caseIds;
    }

    await this.stateManager.setSelection(dataContext, selectedIds);
    
    return {
      success: true,
      values: {
        selectedCases: selectedIds
      }
    };
  }

  async executeGetSelection(args) {
    const { dataContext } = args;
    
    if (!dataContext) {
      throw new Error('dataContext is required');
    }

    // Verify data context exists
    const context = await this.stateManager.getDataContext(dataContext);
    if (!context) {
      throw new Error(`Data context '${dataContext}' not found`);
    }

    const selectedIds = await this.stateManager.getSelection(dataContext);
    
    return {
      success: true,
      values: {
        selectedCases: selectedIds
      }
    };
  }

  async executeClearSelection(args) {
    const { dataContext } = args;
    
    if (!dataContext) {
      throw new Error('dataContext is required');
    }

    await this.stateManager.clearSelection(dataContext);
    
    return {
      success: true,
      values: {
        selectedCases: []
      }
    };
  }

  async executeGetComponents() {
    const components = await this.stateManager.listComponents();
    
    return {
      success: true,
      values: components.map(comp => ({
        id: comp.id,
        type: comp.type,
        name: comp.name,
        dataContext: comp.dataContext
      }))
    };
  }

  async executeDeleteDataContext(args) {
    const { dataContext, confirmDelete } = args;
    
    if (!dataContext) {
      throw new Error('dataContext is required');
    }

    if (!confirmDelete) {
      throw new Error('Delete confirmation required');
    }

    // Verify data context exists
    const context = await this.stateManager.getDataContext(dataContext);
    if (!context) {
      throw new Error(`Data context '${dataContext}' not found`);
    }

    await this.stateManager.deleteDataContext(dataContext);
    
    return {
      success: true,
      values: {
        deletedDataContext: dataContext
      }
    };
  }

  async executeUpdateComponent(args) {
    const { componentId, title, position, dimensions } = args;
    
    if (!componentId) {
      throw new Error('componentId is required');
    }

    const updates = {};
    if (title !== undefined) updates.name = title;
    if (position !== undefined) updates.properties = { ...updates.properties, position };
    if (dimensions !== undefined) updates.properties = { ...updates.properties, dimensions };

    const updatedComponent = await this.stateManager.updateComponent(componentId, updates);
    
    return {
      success: true,
      values: {
        id: updatedComponent.id,
        name: updatedComponent.name,
        type: updatedComponent.type
      }
    };
  }

  async executeDeleteComponent(args) {
    const { componentId, confirmDelete } = args;
    
    if (!componentId) {
      throw new Error('componentId is required');
    }

    if (!confirmDelete) {
      throw new Error('Delete confirmation required');
    }

    // Verify component exists
    const component = await this.stateManager.getComponent(componentId);
    if (!component) {
      throw new Error(`Component with ID ${componentId} not found`);
    }

    await this.stateManager.deleteComponent(componentId);
    
    return {
      success: true,
      values: {
        deletedComponentId: componentId
      }
    };
  }

  // === Tool Routing Method ===

  async executeTool(toolName, toolArgs) {
    console.log(`[DirectExecutor] Executing tool: ${toolName}`);
    
    try {
      let result;
      
      switch (toolName) {
        case 'createDataContext':
          result = await this.executeCreateDataContext(toolArgs);
          break;
        case 'createItems':
          result = await this.executeCreateItems(toolArgs);
          break;
        case 'createTable':
          result = await this.executeCreateTable(toolArgs);
          break;
        case 'createGraph':
          result = await this.executeCreateGraph(toolArgs);
          break;
        case 'getListOfDataContexts':
          result = await this.executeGetListOfDataContexts(toolArgs);
          break;
        case 'getDataContext':
          result = await this.executeGetDataContext(toolArgs);
          break;
        case 'getItems':
          result = await this.executeGetItems(toolArgs);
          break;
        case 'selectCases':
          result = await this.executeSelectCases(toolArgs);
          break;
        case 'getSelection':
          result = await this.executeGetSelection(toolArgs);
          break;
        case 'clearSelection':
          result = await this.executeClearSelection(toolArgs);
          break;
        case 'getComponents':
          result = await this.executeGetComponents(toolArgs);
          break;
        case 'deleteDataContext':
          result = await this.executeDeleteDataContext(toolArgs);
          break;
        case 'updateComponent':
          result = await this.executeUpdateComponent(toolArgs);
          break;
        case 'deleteComponent':
          result = await this.executeDeleteComponent(toolArgs);
          break;
        default:
          throw new Error(`Tool '${toolName}' not implemented in direct execution mode. Available tools: createDataContext, createItems, createTable, createGraph, getListOfDataContexts, getDataContext, getItems, selectCases, getSelection, clearSelection, getComponents, deleteDataContext, updateComponent, deleteComponent`);
      }

      console.log(`[DirectExecutor] Tool execution successful: ${toolName}`);
      return result;

    } catch (error) {
      console.error(`[DirectExecutor] Tool execution failed: ${toolName} - ${error.message}`);
      throw error;
    }
  }

  // === Session Utilities ===

  async getSessionState() {
    return await this.stateManager.getSessionSummary();
  }

  async clearSession() {
    return await this.stateManager.clearSession();
  }
}

module.exports = { DirectToolExecutor }; 