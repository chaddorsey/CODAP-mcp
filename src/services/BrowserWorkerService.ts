/**
 * Browser Worker Service for React Integration
 */

import { 
  ConnectionState, 
  ConnectionType, 
  ConnectionStatus, 
  BrowserWorkerError, 
  ErrorCategory, 
  ErrorSeverity,
  ToolRequest,
  ToolResponse,
  BrowserWorkerErrorSystem
} from "./browserWorker";
import { ConnectionManager } from "./browserWorker/ConnectionManager";
import { ResponseHandler } from "./browserWorker/ResponseHandler";
import { BrowserWorkerConfig, SSEEvent } from "./browserWorker/types";
import { 
  createItems,
  createTable,
  sendMessage
} from "@concord-consortium/codap-plugin-api";

// Import comprehensive tool handlers for dynamic execution
// Using dynamic import for compiled JavaScript module

/**
 * Browser worker service configuration
 */
export interface BrowserWorkerServiceConfig {
  relayBaseUrl: string;
  sessionCode: string;
  debug?: boolean;
  autoStart?: boolean;
}

/**
 * Browser worker service for React integration
 */
export class BrowserWorkerService {
  private config: BrowserWorkerServiceConfig;
  private errorSystem: BrowserWorkerErrorSystem;
  private connectionManager: ConnectionManager | null = null;
  private responseHandler: ResponseHandler | null = null;
  private isStarted = false;
  private comprehensiveToolHandlers: Record<string, (args: any) => Promise<any>> | null = null;

  private connectionStatus: ConnectionStatus = {
    state: ConnectionState.DISCONNECTED,
    type: ConnectionType.SSE,
    retryCount: 0
  };

  constructor(config: BrowserWorkerServiceConfig) {
    this.config = config;
    this.errorSystem = new BrowserWorkerErrorSystem({ debug: config.debug });
    
    // Initialize ConnectionManager with proper configuration
    const connectionConfig: BrowserWorkerConfig = {
      relayBaseUrl: config.relayBaseUrl,
      sessionCode: config.sessionCode,
      debug: config.debug || false
    };
    
    this.connectionManager = new ConnectionManager(connectionConfig);
    
    // Initialize ResponseHandler
    this.responseHandler = new ResponseHandler({
      relayBaseUrl: config.relayBaseUrl,
      responseEndpoint: "/api/response",
      headers: {
        "Content-Type": "application/json",
        "x-sso-bypass": "pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye"
      },
      debug: config.debug || false
    });
    
    // Listen to status changes from ConnectionManager
    this.connectionManager.addEventListener("status-change", (status: ConnectionStatus) => {
      this.connectionStatus = status;
      if (config.debug) {
        console.log("Browser worker status changed:", status);
      }
    });
    
    // Listen to connection errors
    this.connectionManager.addEventListener("error", (error: any) => {
      if (config.debug) {
        console.error("Browser worker connection error:", error);
      }
    });

    // Listen to SSE messages (tool-request events)
    this.connectionManager.addEventListener("message", (event: SSEEvent) => {
      if (config.debug) {
        console.log("Browser worker received SSE message:", event);
      }
      
      // Handle tool-request events
      if (event.type === "tool-request") {
        this.handleToolRequest(event);
      }
    });

    // Load comprehensive tool handlers
    this.loadComprehensiveToolHandlers();
  }

  /**
   * Handle incoming tool request from SSE stream
   */
  private async handleToolRequest(event: SSEEvent): Promise<void> {
    const startTime = Date.now();
    let toolRequest: ToolRequest | null = null;
    
    try {
      toolRequest = event.data as ToolRequest;
      
      if (this.config.debug) {
        console.log("Processing tool request:", toolRequest);
      }

      // Log that we received the request
      console.log("🎉 TOOL REQUEST RECEIVED!", {
        tool: toolRequest.tool,
        requestId: toolRequest.id,
        arguments: toolRequest.args
      });

      // Execute the tool using dynamic handler system
      const result = await this.executeToolRequest(toolRequest.tool, toolRequest.args, toolRequest.id);
      
      // Create successful response
      const response: ToolResponse = {
        requestId: toolRequest.id,
        success: true,
        result,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };
      
      // Post response back to server
      if (this.responseHandler) {
        await this.postToolResponse(response);
      }
      
      if (this.config.debug) {
        console.log("🎉 Tool execution completed:", {
          tool: toolRequest.tool,
          requestId: toolRequest.id,
          result
        });
      }
      
    } catch (error) {
      console.error("❌ Failed to process tool request:", {
        tool: toolRequest?.tool,
        requestId: toolRequest?.id,
        error: error instanceof Error ? error.message : error
      });
      
      // Create error response
      if (toolRequest && this.responseHandler) {
        const errorResponse: ToolResponse = {
          requestId: toolRequest.id,
          success: false,
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
          error: {
            type: "execution_error",
            message: error instanceof Error ? error.message : "Unknown execution error",
            details: error
          }
        };
        
        try {
          await this.postToolResponse(errorResponse);
        } catch (postError) {
          console.error("❌ Failed to post error response:", postError);
        }
      }
      
      if (this.config.debug) {
        console.error("Full error details:", error);
      }
    }
  }

  /**
   * Post tool response back to server
   */
  private async postToolResponse(response: ToolResponse): Promise<void> {
    try {
      if (!this.responseHandler) {
        throw new Error("Response handler not initialized");
      }

      // Transform response to match API format
      const apiPayload = {
        sessionCode: this.config.sessionCode,
        requestId: response.requestId,
        ...(response.success ? { result: response.result } : { error: response.error })
      };

      console.log("📤 Posting tool response:", {
        requestId: response.requestId,
        success: response.success,
        duration: response.duration
      });

      // Use fetch directly since ResponseHandler expects batching
      const response_result = await fetch(`${this.config.relayBaseUrl}/api/response`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-sso-bypass": "pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye"
        },
        body: JSON.stringify(apiPayload)
      });

      if (!response_result.ok) {
        const errorText = await response_result.text();
        throw new Error(`HTTP ${response_result.status}: ${errorText}`);
      }

      console.log("✅ Tool response posted successfully:", response.requestId);
      
    } catch (error) {
      console.error("❌ Failed to post tool response:", {
        requestId: response.requestId,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Execute tool request using dynamic handler system
   */
  private async executeToolRequest(toolName: string, args: any, requestId: string): Promise<any> {
    try {
      console.log(`🔧 Executing tool: ${toolName}`, {
        requestId,
        args,
        availableHandlers: this.comprehensiveToolHandlers ? Object.keys(this.comprehensiveToolHandlers).length : 0
      });

      // Check if we have a comprehensive tool handler
      if (this.comprehensiveToolHandlers && this.comprehensiveToolHandlers[toolName]) {
        console.log(`✅ Found comprehensive handler for: ${toolName}`);
        
        // Execute the comprehensive tool handler
        const result = await this.comprehensiveToolHandlers[toolName](args);
        
        console.log(`🎉 Comprehensive tool execution completed: ${toolName}`, {
          requestId,
          success: result?.success,
          result
        });
        
        return result;
      }
      
      // Fallback to legacy tool handling for backwards compatibility
      if (toolName === "create_dataset_with_table") {
        console.log(`🔄 Using legacy handler for: ${toolName}`);
        const legacyRequest: ToolRequest = {
          id: requestId,
          tool: toolName,
          args,
          timestamp: new Date().toISOString(),
          sessionCode: this.config.sessionCode
        };
        return await this.executeCreateDatasetWithTable(legacyRequest);
      }
      
      // Tool not found
      throw new Error(`Unknown tool: ${toolName}. Available tools: ${Object.keys(this.comprehensiveToolHandlers || {}).join(", ")}`);
      
    } catch (error) {
      console.error(`❌ Tool execution failed: ${toolName}`, {
        requestId,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Legacy implementation for create_dataset_with_table (backwards compatibility)
   */
  private async executeCreateDatasetWithTable(toolRequest: ToolRequest): Promise<void> {
    try {
      const args = toolRequest.args;
      
      console.log("🚀 Creating CODAP dataset and table...", {
        receivedArgs: args,
        toolId: toolRequest.id,
        toolName: toolRequest.tool
      });

      // Extract data from the request structure - handle both formats
      let dataContextName: string;
      let attributes: any[];
      let data: any[];

      if (args.collections && args.collections.length > 0) {
        // Format from test files: { collections: [{ name, attributes, cases }] }
        const collection = args.collections[0];
        dataContextName = args.datasetName || args.name || "MCP Dataset";
        attributes = collection.attributes || [];
        data = collection.cases || [];
        
        console.log("📊 Using collections format:", {
          dataContext: dataContextName,
          attributes: attributes.length,
          dataRows: data.length
        });
      } else {
        // Direct format: { name, attributes, data }
        dataContextName = args.name || args.datasetName || "MCP Dataset";
        attributes = args.attributes || [];
        data = args.data || args.cases || [];
        
        console.log("📊 Using direct format:", {
          dataContext: dataContextName,
          attributes: attributes.length,
          dataRows: data.length
        });
      }

      // Step 1: Create data context with collections structure (like legacy pattern)
      const dataContextPayload = {
        name: dataContextName,
        title: args.description || dataContextName,
        collections: [{
          name: "Cases",
          attrs: attributes
        }]
      };

      console.log("🔧 Creating data context with:", dataContextPayload);
      const contextResult = await sendMessage("create", "dataContext", dataContextPayload);
      console.log("✅ Data context created:", contextResult);

      // Step 2: Add data items if we have data
      if (data.length > 0) {
        console.log(`🔧 Adding ${data.length} data items...`);
        const itemsResult = await createItems(dataContextName, data);
        console.log("✅ Data items created:", itemsResult);
      } else {
        console.log("⚠️ No data items to add");
      }

      // Step 3: Create table component
      const tableName = args.tableName || `${dataContextName} Table`;
      console.log(`🔧 Creating table: ${tableName}`);
      const tableResult = await createTable(dataContextName, tableName);
      console.log("✅ Table component created:", tableResult);

      console.log("🎉 Dataset and table creation completed successfully!");

    } catch (error) {
      console.error("❌ Failed to create dataset and table:", error);
      throw error;
    }
  }

  /**
   * Load comprehensive tool handlers dynamically
   */
  private async loadComprehensiveToolHandlers(): Promise<void> {
    try {
      // For now, since we can't easily import the compiled CommonJS module in the browser,
      // we'll create a minimal set of handlers that use the CODAP Plugin API directly
      // In the future, this could load from a server endpoint or be packaged differently
      
      if (this.config.debug) {
        console.log("🔧 Loading comprehensive tool handlers...");
      }

      // Create comprehensive tool handlers using CODAP Plugin API
      this.comprehensiveToolHandlers = this.createComprehensiveToolHandlers();
      
              if (this.config.debug) {
          console.log("✅ Comprehensive tool handlers loaded:", {
            count: this.comprehensiveToolHandlers ? Object.keys(this.comprehensiveToolHandlers).length : 0
          });
        }
      
    } catch (error) {
      if (this.config.debug) {
        console.error("❌ Failed to load comprehensive tool handlers:", error);
      }
      // Set to empty object as fallback
      this.comprehensiveToolHandlers = {};
    }
  }

  /**
   * Create comprehensive tool handlers using CODAP Plugin API
   */
  private createComprehensiveToolHandlers(): Record<string, (args: any) => Promise<any>> {
    return {
      // Data Context Tools
      create_data_context: async (args: any) => {
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

      get_data_context: async (args: any) => {
        const { name } = args;
        return await sendMessage("get", `dataContext[${name}]`);
      },

      update_data_context: async (args: any) => {
        const { name, newName, title, description } = args;
        const updateValues: any = {};
        if (newName) updateValues.name = newName;
        if (title) updateValues.title = title;
        if (description) updateValues.description = description;
        
        return await sendMessage("update", `dataContext[${name}]`, updateValues);
      },

      delete_data_context: async (args: any) => {
        const { name, confirmDelete } = args;
        if (!confirmDelete) {
          throw new Error("Delete confirmation required");
        }
        return await sendMessage("delete", `dataContext[${name}]`);
      },

      // Collection Tools
      create_collection: async (args: any) => {
        const { dataContextName, collectionName, attributes, parent } = args;
        const values: any = {
          name: collectionName,
          title: collectionName
        };
        
        if (parent) values.parent = parent;
        if (attributes) values.attrs = attributes;
        
        return await sendMessage("create", `dataContext[${dataContextName}].collection`, values);
      },

      get_collections: async (args: any) => {
        const { dataContextName } = args;
        return await sendMessage("get", `dataContext[${dataContextName}].collectionList`);
      },

      get_collection: async (args: any) => {
        const { dataContextName, collectionName } = args;
        return await sendMessage("get", `dataContext[${dataContextName}].collection[${collectionName}]`);
      },

      update_collection: async (args: any) => {
        const { dataContextName, collectionName, newName, title } = args;
        const updateValues: any = {};
        if (newName) updateValues.name = newName;
        if (title) updateValues.title = title;
        
        return await sendMessage("update", `dataContext[${dataContextName}].collection[${collectionName}]`, updateValues);
      },

      delete_collection: async (args: any) => {
        const { dataContextName, collectionName, confirmDelete } = args;
        if (!confirmDelete) {
          throw new Error("Delete confirmation required");
        }
        return await sendMessage("delete", `dataContext[${dataContextName}].collection[${collectionName}]`);
      },

      // Attribute Tools
      create_attribute: async (args: any) => {
        const { dataContextName, collectionName, attributeName, type, description, formula } = args;
        const values: any = {
          name: attributeName,
          type,
          title: attributeName
        };
        
        if (description) values.description = description;
        if (formula) values.formula = formula;
        
        return await sendMessage("create", `dataContext[${dataContextName}].collection[${collectionName}].attribute`, values);
      },

      get_attributes: async (args: any) => {
        const { dataContextName, collectionName } = args;
        return await sendMessage("get", `dataContext[${dataContextName}].collection[${collectionName}].attributeList`);
      },

      get_attribute: async (args: any) => {
        const { dataContextName, collectionName, attributeName } = args;
        return await sendMessage("get", `dataContext[${dataContextName}].collection[${collectionName}].attribute[${attributeName}]`);
      },

      update_attribute: async (args: any) => {
        const { dataContextName, collectionName, attributeName, newName, type, description, formula } = args;
        const updateValues: any = {};
        if (newName) updateValues.name = newName;
        if (type) updateValues.type = type;
        if (description) updateValues.description = description;
        if (formula) updateValues.formula = formula;
        
        return await sendMessage("update", `dataContext[${dataContextName}].collection[${collectionName}].attribute[${attributeName}]`, updateValues);
      },

      delete_attribute: async (args: any) => {
        const { dataContextName, collectionName, attributeName, confirmDelete } = args;
        if (!confirmDelete) {
          throw new Error("Delete confirmation required");
        }
        return await sendMessage("delete", `dataContext[${dataContextName}].collection[${collectionName}].attribute[${attributeName}]`);
      },

      reorder_attributes: async (args: any) => {
        const { dataContextName, collectionName, attributeName, newPosition } = args;
        return await sendMessage("update", `dataContext[${dataContextName}].collection[${collectionName}].attributeLocation[${attributeName}]`, {
          collection: collectionName,
          position: newPosition
        });
      },

      // Case and Item Tools
      create_items: async (args: any) => {
        const { dataContextName, items } = args;
        return await createItems(dataContextName, items);
      },

      get_items: async (args: any) => {
        const { dataContextName, limit } = args;
        const resource = limit ? 
          `dataContext[${dataContextName}].item[0..${limit-1}]` : 
          `dataContext[${dataContextName}].itemSearch[*]`;
        return await sendMessage("get", resource);
      },

      get_item_by_id: async (args: any) => {
        const { dataContextName, itemId } = args;
        return await sendMessage("get", `dataContext[${dataContextName}].itemByID[${itemId}]`);
      },

      update_items: async (args: any) => {
        const { dataContextName, updates } = args;
        // Process each update individually
        const results = [];
        for (const update of updates) {
          const result = await sendMessage("update", `dataContext[${dataContextName}].itemByID[${update.id}]`, update.values);
          results.push(result);
        }
        return { success: true, values: { results } };
      },

      delete_items: async (args: any) => {
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

      get_case_count: async (args: any) => {
        const { dataContextName, collectionName } = args;
        return await sendMessage("get", `dataContext[${dataContextName}].collection[${collectionName}].caseCount`);
      },

      get_case_by_index: async (args: any) => {
        const { dataContextName, collectionName, index } = args;
        return await sendMessage("get", `dataContext[${dataContextName}].collection[${collectionName}].caseByIndex[${index}]`);
      },

      search_cases: async (args: any) => {
        const { dataContextName, collectionName, searchCriteria, limit = 100 } = args;
        const { attributeName, value, operator = "equals" } = searchCriteria;
        
        // Build search query based on operator
        let searchQuery: string;
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

      // Selection Tools
      get_selection: async (args: any) => {
        const { dataContextName } = args;
        return await sendMessage("get", `dataContext[${dataContextName}].selectionList`);
      },

      select_cases: async (args: any) => {
        const { dataContextName, caseIds, extend = false } = args;
        const action = extend ? "update" : "create";
        return await sendMessage(action, `dataContext[${dataContextName}].selectionList`, caseIds);
      },

      clear_selection: async (args: any) => {
        const { dataContextName } = args;
        return await sendMessage("create", `dataContext[${dataContextName}].selectionList`, []);
      },

      // Component Tools
      create_table: async (args: any) => {
        const { dataContextName, title } = args;
        return await createTable(dataContextName, title || `${dataContextName} Table`);
      },

      create_graph: async (args: any) => {
        const { dataContextName, title, xAttribute, yAttribute, graphType = "scatterPlot", position, dimensions } = args;
        
        // Step 1: Create empty graph component (proven optimal approach)
        const graphValues: any = {
          type: "graph",
          dataContext: dataContextName,
          graphType
        };
        
        if (title) graphValues.name = title;
        if (position) graphValues.position = position;
        if (dimensions) graphValues.dimensions = dimensions;
        
        console.log("Browser worker service creating empty graph:", graphValues);
        const graphResult = await sendMessage("create", "component", graphValues);
        
        // Step 2: If axes are specified, update the graph with axis assignments (proven fastest method)
        if ((xAttribute || yAttribute) && graphResult.success && graphResult.values) {
          const componentId = graphResult.values.id;
          if (componentId) {
            const updateValues: any = {};
            if (xAttribute) updateValues.xAttributeName = xAttribute;
            if (yAttribute) updateValues.yAttributeName = yAttribute;
            
            console.log("Browser worker service updating graph axes:", { componentId, updateValues });
            const updateResult = await sendMessage("update", `component[${componentId}]`, updateValues);
            
            // Return combined result
            return {
              success: graphResult.success && updateResult.success,
              values: {
                ...graphResult.values,
                axesAssigned: updateResult.success,
                xAttributeName: xAttribute,
                yAttributeName: yAttribute
              }
            };
          }
        }
        
        return graphResult;
      },

      create_map: async (args: any) => {
        const { dataContextName, title, latitudeAttribute, longitudeAttribute, position, dimensions } = args;
        const values: any = {
          type: "map",
          dataContext: dataContextName
        };
        
        if (title) values.name = title;
        if (latitudeAttribute) values.latitudeAttribute = latitudeAttribute;
        if (longitudeAttribute) values.longitudeAttribute = longitudeAttribute;
        if (position) values.position = position;
        if (dimensions) values.dimensions = dimensions;
        
        return await sendMessage("create", "component", values);
      },

      get_components: async () => {
        return await sendMessage("get", "componentList");
      },

      update_component: async (args: any) => {
        const { componentId, title, position, dimensions, xAttributeName, yAttributeName, values } = args;
        
        // If values object is provided, use it; otherwise build from individual properties
        const updateValues: any = values || {};
        
        if (title) updateValues.name = title;
        if (position) updateValues.position = position;
        if (dimensions) updateValues.dimensions = dimensions;
        if (xAttributeName) updateValues.xAttributeName = xAttributeName;
        if (yAttributeName) updateValues.yAttributeName = yAttributeName;
        
        return await sendMessage("update", `component[${componentId}]`, updateValues);
      },

      delete_component: async (args: any) => {
        const { componentId, confirmDelete } = args;
        if (!confirmDelete) {
          throw new Error("Delete confirmation required");
        }
        return await sendMessage("delete", `component[${componentId}]`);
      }
    };
  }

  async start(): Promise<void> {
    if (this.isStarted || !this.connectionManager) return;
    
    this.isStarted = true;
    
    try {
      await this.connectionManager.connect();
    } catch (error) {
      this.isStarted = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isStarted || !this.connectionManager) return;
    
    this.isStarted = false;
    this.connectionManager.disconnect();
    
    this.connectionStatus = {
      state: ConnectionState.DISCONNECTED,
      type: ConnectionType.SSE,
      retryCount: 0
    };
  }

  isRunning(): boolean {
    return this.isStarted;
  }

  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Create a new error with proper classification
   */
  createError(
    category: ErrorCategory,
    severity: ErrorSeverity,
    message: string,
    details?: Record<string, unknown>
  ): BrowserWorkerError {
    return this.errorSystem.createError(
      category,
      severity,
      message,
      "BrowserWorkerService",
      details
    );
  }

  /**
   * Update service configuration
   */
  updateConfig(newConfig: Partial<BrowserWorkerServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Recreate ConnectionManager with new configuration if needed
    if (this.connectionManager && (newConfig.relayBaseUrl || newConfig.sessionCode)) {
      const wasRunning = this.isStarted;
      
      // Stop current connection
      if (wasRunning) {
        this.stop();
      }
      
      // Create new ConnectionManager with updated config
      const connectionConfig: BrowserWorkerConfig = {
        relayBaseUrl: this.config.relayBaseUrl,
        sessionCode: this.config.sessionCode,
        debug: this.config.debug || false
      };
      
      this.connectionManager = new ConnectionManager(connectionConfig);
      
      // Restart if it was running
      if (wasRunning) {
        this.start();
      }
    }
  }
}

export function createBrowserWorkerService(config: BrowserWorkerServiceConfig): BrowserWorkerService {
  return new BrowserWorkerService(config);
} 
