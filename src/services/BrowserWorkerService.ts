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
  /** Supported capabilities for this session (e.g., ["CODAP", "SAGEMODELER"]) */
  capabilities?: string[];
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
  private claudeConnected = false; // Track Claude connection status
  private lastClaudeActivity = 0; // Track last Claude activity
  private claudeTimeoutTimer: NodeJS.Timeout | null = null; // Timeout timer
  private capabilities: string[]; // Supported capabilities

  private static readonly CLAUDE_TIMEOUT_MS = 120000; // 2 minutes of inactivity

  private connectionStatus: ConnectionStatus = {
    state: ConnectionState.DISCONNECTED,
    type: ConnectionType.SSE,
    retryCount: 0
  };

  constructor(config: BrowserWorkerServiceConfig) {
    this.config = config;
    this.capabilities = config.capabilities || ["CODAP"]; // Default to CODAP only
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
        "x-vercel-protection-bypass": "pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye"
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
      
      // Handle special Claude connection notification (if it exists)
      if (toolRequest.tool === "__claude_connected__") {
        console.log("🎉 Claude Desktop connected (early detection)! Firing claude-connected event");
        
        this.claudeConnected = true;
        this.lastClaudeActivity = Date.now();
        this.resetClaudeTimeout();
        
        // Access the correct field name (server uses 'arguments', browser expects 'args')
        const earlyServerRequest = toolRequest as any;
        const sessionInfo = earlyServerRequest.arguments || earlyServerRequest.args;
        
        // Fire custom event to notify UI
        const claudeConnectedEvent = new CustomEvent("claude-connected", {
          detail: { 
            connected: true, 
            timestamp: new Date().toISOString(),
            early: true, // Mark as early detection
            sessionInfo
          }
        });
        window.dispatchEvent(claudeConnectedEvent);
        
        // Don't process this as a regular tool request
        return;
      }
      
      // Detect Claude connection on ANY tool request (immediate detection)
      if (!this.claudeConnected) {
        this.claudeConnected = true;
        console.log("🎉 Claude Desktop connected! Firing claude-connected event");
        
        // Fire custom event to notify UI
        const claudeConnectedEvent = new CustomEvent("claude-connected", {
          detail: { 
            connected: true, 
            timestamp: new Date().toISOString(),
            early: false // Mark as tool-based detection
          }
        });
        window.dispatchEvent(claudeConnectedEvent);
      }
      
      // Update Claude activity timestamp
      this.lastClaudeActivity = Date.now();
      this.resetClaudeTimeout();
      
      if (this.config.debug) {
        console.log("Processing tool request:", toolRequest);
      }

      // Map server field names to browser worker field names
      // Cast to any to handle server vs browser field name differences
      const serverRequest = toolRequest as any;
      const mappedRequest = {
        tool: serverRequest.tool,
        id: serverRequest.requestId || serverRequest.id,           // Server uses "requestId", browser expects "id"
        args: serverRequest.arguments || serverRequest.args,       // Server uses "arguments", browser expects "args"
        timestamp: serverRequest.timestamp,
        sessionCode: serverRequest.sessionCode
      };

      // Log that we received the request
      console.log("🎉 TOOL REQUEST RECEIVED!", {
        tool: mappedRequest.tool,
        requestId: mappedRequest.id,
        arguments: mappedRequest.args
      });

      // Execute the tool using dynamic handler system
      const result = await this.executeToolRequest(mappedRequest.tool, mappedRequest.args, mappedRequest.id);
      
      // Create successful response
      const response: ToolResponse = {
        requestId: mappedRequest.id,
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
          tool: mappedRequest.tool,
          requestId: mappedRequest.id,
          result
        });
      }
      
    } catch (error) {
      const serverRequest = toolRequest as any;
      console.error("❌ Failed to process tool request:", {
        tool: serverRequest?.tool,
        requestId: serverRequest?.requestId || serverRequest?.id,
        error: error instanceof Error ? error.message : error
      });
      
      // Create error response
      if (toolRequest && this.responseHandler) {
        const errorResponse: ToolResponse = {
          requestId: serverRequest.requestId || serverRequest.id,
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
   * Reset Claude connection timeout
   */
  private resetClaudeTimeout(): void {
    if (this.claudeTimeoutTimer) {
      clearTimeout(this.claudeTimeoutTimer);
    }
    this.claudeTimeoutTimer = setTimeout(() => {
      if (Date.now() - this.lastClaudeActivity > BrowserWorkerService.CLAUDE_TIMEOUT_MS) {
        this.claudeConnected = false;
        console.log("🎉 Claude Desktop disconnected due to inactivity");
        
        // Fire custom event to notify UI
        const claudeDisconnectedEvent = new CustomEvent("claude-connected", {
          detail: { connected: false, timestamp: new Date().toISOString() }
        });
        window.dispatchEvent(claudeDisconnectedEvent);
      }
    }, BrowserWorkerService.CLAUDE_TIMEOUT_MS);
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
          "x-vercel-protection-bypass": "pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye"
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
   * Execute tool directly (for direct UI calls)
   */
  async executeTool(toolName: string, args: any): Promise<any> {
    if (!this.isStarted) {
      throw new Error("Browser worker service is not started");
    }
    
    const requestId = `direct-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return this.executeToolRequest(toolName, args, requestId);
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

      // Check if we have a comprehensive tool handler (using server naming conventions)
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
      
      // Tool not found - provide detailed error with available tools
      const availableTools = Object.keys(this.comprehensiveToolHandlers || {});
      throw new Error(`Unknown tool: ${toolName}. Available tools: ${availableTools.join(", ")}`);
      
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
   * Using server naming conventions that exactly match the MCP tool registry
   */
  private createComprehensiveToolHandlers(): Record<string, (args: any) => Promise<any>> {
    const handlers: Record<string, (args: any) => Promise<any>> = {
      // Plugin Initialization
      initializePlugin: async (args: any) => {
        const { name, title, version } = args;
        return await sendMessage("update", "interactiveFrame", {
          name,
          title,
          version
        });
      },

      // Data Context Tools
      createDataContext: async (args: any) => {
        const { name, title, description, collections } = args;
        const payload: any = {
          name,
          title: title || name,
          description: description || ""
        };
        
        // If collections are provided, include them in the data context creation
        if (collections && collections.length > 0) {
          payload.collections = collections;
        }
        
        return await sendMessage("create", "dataContext", payload);
      },

      getListOfDataContexts: async () => {
        return await sendMessage("get", "dataContextList");
      },

      getDataContext: async (args: any) => {
        const { dataContext } = args;
        return await sendMessage("get", `dataContext[${dataContext}]`);
      },

      deleteDataContext: async (args: any) => {
        const { dataContext } = args;
        return await sendMessage("delete", `dataContext[${dataContext}]`);
      },

      // Collection Tools
      createCollection: async (args: any) => {
        const { dataContext, collection } = args;
        const values: any = {
          name: collection.name,
          title: collection.title || collection.name
        };
        
        if (collection.parent) values.parent = collection.parent;
        if (collection.attrs) values.attrs = collection.attrs;
        
        return await sendMessage("create", `dataContext[${dataContext}].collection`, values);
      },

      getCollectionList: async (args: any) => {
        const { dataContext } = args;
        return await sendMessage("get", `dataContext[${dataContext}].collectionList`);
      },

      getCollection: async (args: any) => {
        const { dataContext, collection } = args;
        return await sendMessage("get", `dataContext[${dataContext}].collection[${collection}]`);
      },

      // Attribute Tools
      createAttribute: async (args: any) => {
        const { dataContext, collection, attribute } = args;
        const values: any = {
          name: attribute.name,
          title: attribute.name
        };
        
        if (attribute.type) values.type = attribute.type;
        if (attribute.description) values.description = attribute.description;
        if (attribute.unit) values.unit = attribute.unit;
        if (attribute.formula) values.formula = attribute.formula;
        
        return await sendMessage("create", `dataContext[${dataContext}].collection[${collection}].attribute`, values);
      },

      getAttributeList: async (args: any) => {
        const { dataContext, collection } = args;
        return await sendMessage("get", `dataContext[${dataContext}].collection[${collection}].attributeList`);
      },

      getAttribute: async (args: any) => {
        const { dataContext, collection, attribute } = args;
        return await sendMessage("get", `dataContext[${dataContext}].collection[${collection}].attribute[${attribute}]`);
      },

      updateAttribute: async (args: any) => {
        const { dataContext, collection, attribute } = args;
        const updateValues: any = {};
        
        if (attribute.type) updateValues.type = attribute.type;
        if (attribute.description) updateValues.description = attribute.description;
        if (attribute.unit) updateValues.unit = attribute.unit;
        if (attribute.formula) updateValues.formula = attribute.formula;
        
        return await sendMessage("update", `dataContext[${dataContext}].collection[${collection}].attribute[${attribute.name}]`, updateValues);
      },

      deleteAttribute: async (args: any) => {
        const { dataContext, collection, attribute } = args;
        return await sendMessage("delete", `dataContext[${dataContext}].collection[${collection}].attribute[${attribute}]`);
      },

      // Item/Case Tools
      createItems: async (args: any) => {
        const { dataContext, collection, items } = args;
        return await createItems(dataContext, items);
      },

      getAllItems: async (args: any) => {
        const { dataContext, collection } = args;
        const resource = collection ? 
          `dataContext[${dataContext}].collection[${collection}].allCases` : 
          `dataContext[${dataContext}].itemSearch[*]`;
        return await sendMessage("get", resource);
      },

      getItemCount: async (args: any) => {
        const { dataContext, collection } = args;
        const resource = collection ? 
          `dataContext[${dataContext}].collection[${collection}].caseCount` :
          `dataContext[${dataContext}].itemCount`;
        return await sendMessage("get", resource);
      },

      getItemByID: async (args: any) => {
        const { dataContext, collection, itemID } = args;
        return await sendMessage("get", `dataContext[${dataContext}].itemByID[${itemID}]`);
      },

      updateItems: async (args: any) => {
        const { dataContext, collection, items } = args;
        // Process each update individually
        const results = [];
        for (const item of items) {
          const { id, ...values } = item;
          const result = await sendMessage("update", `dataContext[${dataContext}].itemByID[${id}]`, values);
          results.push(result);
        }
        return { success: true, values: { results } };
      },

      deleteItems: async (args: any) => {
        const { dataContext, collection, items } = args;
        // Delete each item individually
        const results = [];
        for (const itemId of items) {
          const result = await sendMessage("delete", `dataContext[${dataContext}].itemByID[${itemId}]`);
          results.push(result);
        }
        return { success: true, values: { results } };
      },

      // Selection Tools
      selectItems: async (args: any) => {
        const { dataContext, collection, items, extend = false } = args;
        const action = extend ? "update" : "create";
        return await sendMessage(action, `dataContext[${dataContext}].selectionList`, items);
      },

      getSelectedItems: async (args: any) => {
        const { dataContext, collection } = args;
        return await sendMessage("get", `dataContext[${dataContext}].selectionList`);
      },

      deselectAll: async (args: any) => {
        const { dataContext } = args;
        return await sendMessage("create", `dataContext[${dataContext}].selectionList`, []);
      },

      // Component Tools
      createGraph: async (args: any) => {
        const { dataContext, xAttributeName, yAttributeName, legendAttributeName, title, width, height, position } = args;
        
        // Step 1: Create empty graph component
        const graphValues: any = {
          type: "graph",
          dataContext
        };
        
        if (title) graphValues.name = title;
        if (position) graphValues.position = position;
        if (width && height) graphValues.dimensions = { width, height };
        
        console.log("Browser worker service creating graph:", graphValues);
        const graphResult = await sendMessage("create", "component", graphValues);
        
        // Step 2: If axes are specified, update the graph with axis assignments
        if ((xAttributeName || yAttributeName) && graphResult.success && graphResult.values) {
          const componentId = graphResult.values.id;
          if (componentId) {
            const updateValues: any = {};
            if (xAttributeName) updateValues.xAttributeName = xAttributeName;
            if (yAttributeName) updateValues.yAttributeName = yAttributeName;
            if (legendAttributeName) updateValues.legendAttributeName = legendAttributeName;
            
            console.log("Browser worker service updating graph axes:", { componentId, updateValues });
            const updateResult = await sendMessage("update", `component[${componentId}]`, updateValues);
            
            // Return combined result
            return {
              success: graphResult.success && updateResult.success,
              values: {
                ...graphResult.values,
                axesAssigned: updateResult.success,
                xAttributeName,
                yAttributeName,
                legendAttributeName
              }
            };
          }
        }
        
        return graphResult;
      },

      createTable: async (args: any) => {
        const { dataContext, title, width, height, position } = args;
        const values: any = {
          type: "caseTable",
          dataContext
        };
        
        if (title) values.name = title;
        if (position) values.position = position;
        if (width && height) values.dimensions = { width, height };
        
        return await sendMessage("create", "component", values);
      },

      createSlider: async (args: any) => {
        const { title, name, min, max, step, value, position } = args;
        const values: any = {
          type: "slider",
          name,
          title: title || name,
          lowerBound: min,
          upperBound: max,
          animationDirection: 1,
          animationMode: 0
        };
        
        if (step) values.step = step;
        if (value !== undefined) values.value = value;
        if (position) values.position = position;
        
        return await sendMessage("create", "component", values);
      },

      createCalculator: async (args: any) => {
        const { title, position } = args;
        const values: any = {
          type: "calculator"
        };
        
        if (title) values.name = title;
        if (position) values.position = position;
        
        return await sendMessage("create", "component", values);
      },

      createText: async (args: any) => {
        const { title, text, position } = args;
        const values: any = {
          type: "text",
          text
        };
        
        if (title) values.name = title;
        if (position) values.position = position;
        
        return await sendMessage("create", "component", values);
      },

      createWebView: async (args: any) => {
        const { title, URL, position } = args;
        const values: any = {
          type: "webView",
          URL
        };
        
        if (title) values.name = title;
        if (position) values.position = position;
        
        return await sendMessage("create", "component", values);
      },

      getAllComponents: async () => {
        return await sendMessage("get", "componentList");
      },

      getComponent: async (args: any) => {
        const { component } = args;
        return await sendMessage("get", `component[${component}]`);
      },

      updateComponent: async (args: any) => {
        const { component, title, position, dimensions } = args;
        const updateValues: any = {};
        
        if (title) updateValues.name = title;
        if (position) updateValues.position = position;
        if (dimensions) updateValues.dimensions = dimensions;
        
        return await sendMessage("update", `component[${component}]`, updateValues);
      },

      deleteComponent: async (args: any) => {
        const { component } = args;
        return await sendMessage("delete", `component[${component}]`);
      },

      // Notification Tools
      registerForNotifications: async (args: any) => {
        const { request, callback } = args;
        // Use sendMessage to create a notification subscription
        // This is a simplified implementation that doesn't use the full CODAP notification system
        return await sendMessage("create", "notificationSubscription", {
          request,
          callback: callback || "defaultCallback"
        });
      },

      unregisterForNotifications: async (args: any) => {
        const { request } = args;
        // Use sendMessage to delete a notification subscription
        return await sendMessage("delete", "notificationSubscription", { request });
      }
    };

    // Add SageModeler tools if SAGEMODELER capability is present
    if (this.capabilities.includes("SAGEMODELER")) {
      if (this.config.debug) {
        console.log("🔧 Adding SageModeler tool handlers...");
      }

      // SageModeler Node Management Tools
      handlers.sage_create_node = async (args: any) => {
        return await this.sendSageModelerMessage("create", "nodes", args);
      };

      handlers.sage_create_random_node = async (args: any) => {
        return await this.sendSageModelerMessage("create", "nodes/random", args);
      };

      handlers.sage_update_node = async (args: any) => {
        const { nodeId, ...values } = args;
        return await this.sendSageModelerMessage("update", `nodes/${nodeId}`, values);
      };

      handlers.sage_delete_node = async (args: any) => {
        const { nodeId } = args;
        return await this.sendSageModelerMessage("delete", `nodes/${nodeId}`, {});
      };

      handlers.sage_get_all_nodes = async (args: any) => {
        return await this.sendSageModelerMessage("get", "nodes", {});
      };

      handlers.sage_get_node_by_id = async (args: any) => {
        const { nodeId } = args;
        return await this.sendSageModelerMessage("get", `nodes/${nodeId}`, {});
      };

      handlers.sage_select_node = async (args: any) => {
        const { nodeId } = args;
        return await this.sendSageModelerMessage("call", "nodes/select", { nodeId });
      };

      // SageModeler Link Management Tools
      handlers.sage_create_link = async (args: any) => {
        return await this.sendSageModelerMessage("create", "links", args);
      };

      handlers.sage_update_link = async (args: any) => {
        const { linkId, ...values } = args;
        return await this.sendSageModelerMessage("update", `links/${linkId}`, values);
      };

      handlers.sage_delete_link = async (args: any) => {
        const { linkId } = args;
        return await this.sendSageModelerMessage("delete", `links/${linkId}`, {});
      };

      handlers.sage_get_all_links = async (args: any) => {
        return await this.sendSageModelerMessage("get", "links", {});
      };

      handlers.sage_get_link_by_id = async (args: any) => {
        const { linkId } = args;
        return await this.sendSageModelerMessage("get", `links/${linkId}`, {});
      };

      // SageModeler Experiment Tools
      handlers.sage_reload_experiment_nodes = async (args: any) => {
        return await this.sendSageModelerMessage("call", "experiment/reloadNodes", args);
      };

      handlers.sage_run_experiment = async (args: any) => {
        return await this.sendSageModelerMessage("call", "simulation/experimentRun", args);
      };

      // SageModeler Recording Tools
      handlers.sage_start_recording = async (args: any) => {
        return await this.sendSageModelerMessage("call", "simulation/recordStream", args);
      };

      handlers.sage_stop_recording = async (args: any) => {
        return await this.sendSageModelerMessage("call", "simulation/stopRecording", args);
      };

      handlers.sage_set_recording_options = async (args: any) => {
        return await this.sendSageModelerMessage("call", "simulation/setRecordingOptions", args);
      };

      // SageModeler Model Import/Export Tools
      handlers.sage_load_model = async (args: any) => {
        return await this.sendSageModelerMessage("update", "model", args);
      };

      handlers.sage_export_model = async (args: any) => {
        return await this.sendSageModelerMessage("get", "model", {});
      };

      handlers.sage_import_sd_json = async (args: any) => {
        return await this.sendSageModelerMessage("call", "model/importSdJson", args);
      };

      handlers.sage_export_sd_json = async (args: any) => {
        return await this.sendSageModelerMessage("call", "model/exportSdJson", {});
      };

      // SageModeler Settings Tools
      handlers.sage_set_model_complexity = async (args: any) => {
        return await this.sendSageModelerMessage("update", "model/complexity", args);
      };

      handlers.sage_set_ui_settings = async (args: any) => {
        return await this.sendSageModelerMessage("update", "ui/settings", args);
      };

      handlers.sage_restore_default_settings = async (args: any) => {
        return await this.sendSageModelerMessage("call", "settings/restoreDefaults", {});
      };

      // SageModeler Simulation State Tools
      handlers.sage_get_simulation_state = async (args: any) => {
        return await this.sendSageModelerMessage("get", "simulation/state", {});
      };

      if (this.config.debug) {
        console.log(`✅ Added ${Object.keys(handlers).filter(key => key.startsWith("sage_")).length} SageModeler tool handlers`);
      }
    }

    return handlers;
  }

  /**
   * Send a message to SageModeler with proper API prefixing
   */
  private async sendSageModelerMessage(action: string, resource: string, values: any): Promise<any> {
    const message = {
      sageApi: true,
      action,
      resource,
      values
    };

    return new Promise((resolve, reject) => {
      // Generate request ID
      const requestId = `sage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Set up response listener
      const responseHandler = (event: MessageEvent) => {
        if (event.data && event.data.requestId === requestId) {
          window.removeEventListener("message", responseHandler);
          if (event.data.success) {
            resolve(event.data);
          } else {
            reject(new Error(event.data.error || "SageModeler API call failed"));
          }
        }
      };
      
      window.addEventListener("message", responseHandler);
      
      // Send message to SageModeler with proper prefix
      window.parent.postMessage({ ...message, requestId }, "*");
      
      // Timeout after 10 seconds
      setTimeout(() => {
        window.removeEventListener("message", responseHandler);
        reject(new Error("SageModeler API timeout"));
      }, 10000);
    });
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
    
    // Clean up Claude connection tracking
    this.claudeConnected = false;
    if (this.claudeTimeoutTimer) {
      clearTimeout(this.claudeTimeoutTimer);
      this.claudeTimeoutTimer = null;
    }
    
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
    
    // Update capabilities if provided
    if (newConfig.capabilities) {
      this.capabilities = newConfig.capabilities;
      // Reload tool handlers with new capabilities
      this.comprehensiveToolHandlers = this.createComprehensiveToolHandlers();
      if (this.config.debug) {
        console.log("✅ Tool handlers reloaded with new capabilities:", this.capabilities);
      }
    }
    
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
