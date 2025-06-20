/**
 * CODAP State Management for Direct Execution Mode
 * PBI 18 - Task 18-5 Extension: Direct Tool Execution
 * 
 * This module manages CODAP state (data contexts, collections, items, components)
 * in KV storage for MCP clients that don't use the browser worker interface.
 */

const { kv } = require("@vercel/kv");

/**
 * Generate unique IDs for CODAP entities
 */
function generateId() {
  return Math.floor(Math.random() * 1000000) + 1;
}

/**
 * CODAP State Manager for KV Storage
 */
class CODAPStateManager {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.keyPrefix = `session:${sessionId}:codap`;
  }

  // === Data Context Management ===

  async createDataContext(name, title, collections = []) {
    const dataContext = {
      id: generateId(),
      name,
      title: title || name,
      collections: collections.map(collection => ({
        id: generateId(),
        name: collection.name,
        title: collection.title || collection.name,
        attrs: (collection.attrs || []).map(attr => ({
          id: generateId(),
          name: attr.name,
          type: attr.type || "categorical",
          title: attr.title || attr.name,
          description: attr.description || ""
        }))
      })),
      created: Date.now(),
      sessionId: this.sessionId
    };

    await kv.set(`${this.keyPrefix}:dataContext:${name}`, dataContext);
    
    // Track all data contexts for this session
    await kv.sadd(`${this.keyPrefix}:dataContexts`, name);

    return dataContext;
  }

  async getDataContext(name) {
    return await kv.get(`${this.keyPrefix}:dataContext:${name}`);
  }

  async listDataContexts() {
    try {
      console.log(`[StateManager] Listing data contexts for session: ${this.sessionId}`);
      const contextNames = await kv.smembers(`${this.keyPrefix}:dataContexts`) || [];
      console.log(`[StateManager] Found ${contextNames.length} context names:`, contextNames);
      
      const contexts = [];
      
      for (const name of contextNames) {
        try {
          const context = await this.getDataContext(name);
          if (context) {
            contexts.push(context);
          }
        } catch (error) {
          console.error(`[StateManager] Error getting context ${name}: ${error.message}`);
        }
      }
      
      console.log(`[StateManager] Returning ${contexts.length} contexts`);
      return contexts;
    } catch (error) {
      console.error(`[StateManager] Error in listDataContexts: ${error.message}`);
      return [];
    }
  }

  async deleteDataContext(name) {
    await kv.del(`${this.keyPrefix}:dataContext:${name}`);
    await kv.srem(`${this.keyPrefix}:dataContexts`, name);
    
    // Clean up related data
    await kv.del(`${this.keyPrefix}:items:${name}`);
    await kv.del(`${this.keyPrefix}:selection:${name}`);
  }

  // === Collection Management ===

  async addCollection(dataContextName, collection) {
    const dataContext = await this.getDataContext(dataContextName);
    if (!dataContext) {
      throw new Error(`Data context '${dataContextName}' not found`);
    }

    const newCollection = {
      id: generateId(),
      name: collection.name,
      title: collection.title || collection.name,
      attrs: (collection.attrs || []).map(attr => ({
        id: generateId(),
        name: attr.name,
        type: attr.type || "categorical",
        title: attr.title || attr.name,
        description: attr.description || ""
      }))
    };

    dataContext.collections.push(newCollection);
    await kv.set(`${this.keyPrefix}:dataContext:${dataContextName}`, dataContext);

    return newCollection;
  }

  async getCollection(dataContextName, collectionName) {
    const dataContext = await this.getDataContext(dataContextName);
    if (!dataContext) {
      return null;
    }

    return dataContext.collections.find(c => c.name === collectionName);
  }

  // === Attribute Management ===

  async addAttribute(dataContextName, collectionName, attribute) {
    const dataContext = await this.getDataContext(dataContextName);
    if (!dataContext) {
      throw new Error(`Data context '${dataContextName}' not found`);
    }

    const collection = dataContext.collections.find(c => c.name === collectionName);
    if (!collection) {
      throw new Error(`Collection '${collectionName}' not found`);
    }

    const newAttribute = {
      id: generateId(),
      name: attribute.name,
      type: attribute.type || "categorical",
      title: attribute.title || attribute.name,
      description: attribute.description || ""
    };

    collection.attrs.push(newAttribute);
    await kv.set(`${this.keyPrefix}:dataContext:${dataContextName}`, dataContext);

    return newAttribute;
  }

  // === Item Management ===

  async createItems(dataContextName, items) {
    const dataContext = await this.getDataContext(dataContextName);
    if (!dataContext) {
      throw new Error(`Data context '${dataContextName}' not found`);
    }

    const itemsWithIds = items.map(item => ({
      ...item,
      id: generateId(),
      created: Date.now()
    }));

    // Store items in a list for the data context
    const itemsKey = `${this.keyPrefix}:items:${dataContextName}`;
    await kv.lpush(itemsKey, ...itemsWithIds.map(item => JSON.stringify(item)));

    return itemsWithIds;
  }

  async getItems(dataContextName, limit = null) {
    const itemsKey = `${this.keyPrefix}:items:${dataContextName}`;
    
    if (limit) {
      const itemStrings = await kv.lrange(itemsKey, 0, limit - 1);
      return itemStrings.map(str => JSON.parse(str));
    } else {
      const itemStrings = await kv.lrange(itemsKey, 0, -1);
      return itemStrings.map(str => JSON.parse(str));
    }
  }

  async getItemById(dataContextName, itemId) {
    const items = await this.getItems(dataContextName);
    return items.find(item => item.id === itemId);
  }

  async updateItem(dataContextName, itemId, updates) {
    const items = await this.getItems(dataContextName);
    const itemIndex = items.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      throw new Error(`Item with ID ${itemId} not found`);
    }

    items[itemIndex] = { ...items[itemIndex], ...updates };

    // Replace the entire list (simple approach for now)
    const itemsKey = `${this.keyPrefix}:items:${dataContextName}`;
    await kv.del(itemsKey);
    await kv.lpush(itemsKey, ...items.map(item => JSON.stringify(item)));

    return items[itemIndex];
  }

  async deleteItems(dataContextName, itemIds) {
    const items = await this.getItems(dataContextName);
    const remainingItems = items.filter(item => !itemIds.includes(item.id));

    // Replace the entire list
    const itemsKey = `${this.keyPrefix}:items:${dataContextName}`;
    await kv.del(itemsKey);
    
    if (remainingItems.length > 0) {
      await kv.lpush(itemsKey, ...remainingItems.map(item => JSON.stringify(item)));
    }

    return itemIds;
  }

  // === Selection Management ===

  async setSelection(dataContextName, itemIds) {
    const selectionKey = `${this.keyPrefix}:selection:${dataContextName}`;
    await kv.del(selectionKey);
    
    if (itemIds.length > 0) {
      await kv.sadd(selectionKey, ...itemIds.map(id => String(id)));
    }

    return itemIds;
  }

  async getSelection(dataContextName) {
    const selectionKey = `${this.keyPrefix}:selection:${dataContextName}`;
    const selectedIds = await kv.smembers(selectionKey) || [];
    return selectedIds.map(id => parseInt(id));
  }

  async clearSelection(dataContextName) {
    const selectionKey = `${this.keyPrefix}:selection:${dataContextName}`;
    await kv.del(selectionKey);
    return [];
  }

  // === Component Management ===

  async createComponent(type, name, dataContext, properties = {}) {
    const component = {
      id: generateId(),
      type,
      name: name || `${type}_${Date.now()}`,
      dataContext,
      properties,
      created: Date.now(),
      sessionId: this.sessionId
    };

    await kv.set(`${this.keyPrefix}:component:${component.id}`, component);
    await kv.sadd(`${this.keyPrefix}:components`, String(component.id));

    return component;
  }

  async getComponent(componentId) {
    return await kv.get(`${this.keyPrefix}:component:${componentId}`);
  }

  async listComponents() {
    const componentIds = await kv.smembers(`${this.keyPrefix}:components`) || [];
    const components = [];
    
    for (const id of componentIds) {
      const component = await this.getComponent(parseInt(id));
      if (component) {
        components.push(component);
      }
    }
    
    return components;
  }

  async updateComponent(componentId, updates) {
    const component = await this.getComponent(componentId);
    if (!component) {
      throw new Error(`Component with ID ${componentId} not found`);
    }

    const updatedComponent = { ...component, ...updates };
    await kv.set(`${this.keyPrefix}:component:${componentId}`, updatedComponent);

    return updatedComponent;
  }

  async deleteComponent(componentId) {
    await kv.del(`${this.keyPrefix}:component:${componentId}`);
    await kv.srem(`${this.keyPrefix}:components`, String(componentId));
  }

  // === Session Cleanup ===

  async clearSession() {
    // Get all data contexts and clean them up
    const contextNames = await kv.smembers(`${this.keyPrefix}:dataContexts`) || [];
    
    for (const name of contextNames) {
      await this.deleteDataContext(name);
    }

    // Clean up components
    const componentIds = await kv.smembers(`${this.keyPrefix}:components`) || [];
    for (const id of componentIds) {
      await this.deleteComponent(parseInt(id));
    }

    // Remove session tracking keys
    await kv.del(`${this.keyPrefix}:dataContexts`);
    await kv.del(`${this.keyPrefix}:components`);
  }

  // === Utility Methods ===

  async getSessionSummary() {
    const contexts = await this.listDataContexts();
    const components = await this.listComponents();
    
    const summary = {
      sessionId: this.sessionId,
      dataContexts: contexts.length,
      components: components.length,
      details: {
        contexts: contexts.map(ctx => ({
          name: ctx.name,
          collections: ctx.collections.length,
          totalAttributes: ctx.collections.reduce((sum, coll) => sum + coll.attrs.length, 0)
        })),
        components: components.map(comp => ({
          id: comp.id,
          type: comp.type,
          name: comp.name
        }))
      }
    };

    return summary;
  }
}

module.exports = { CODAPStateManager }; 
