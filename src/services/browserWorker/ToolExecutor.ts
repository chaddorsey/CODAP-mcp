/**
 * Tool Executor for Browser Worker
 * Executes tool requests against CODAP plugin API with sequential processing and response formatting
 */

import { 
  ToolExecutorInterface, 
  ToolRequest, 
  ToolResponse, 
  ExecutionStatus
} from "./types";

import { ExecutionQueue, ExecutionQueueConfig } from "./ExecutionQueue";
import { 
  getToolRouting, 
  requiresSagePrefix, 
  getToolsByCapability,
  isToolSupportedForCapabilities 
} from "./schemas/toolSchemas";

// Import CODAP plugin API functions
import { 
  sendMessage
} from "@concord-consortium/codap-plugin-api";

/**
 * Configuration for tool executor
 */
export interface ToolExecutorConfig {
  /** Queue configuration */
  queueConfig?: Partial<ExecutionQueueConfig>;
  /** Whether to enable debug logging */
  enableLogging?: boolean;
  /** Maximum execution time per tool (ms) */
  maxExecutionTime?: number;
  /** Whether to automatically start processing */
  autoStart?: boolean;
  /** Supported capabilities for this session */
  capabilities?: string[];
}

const DEFAULT_EXECUTOR_CONFIG: ToolExecutorConfig = {
  enableLogging: true,
  maxExecutionTime: 30000,
  autoStart: true,
  capabilities: ["CODAP"] // Default to CODAP only
};

/**
 * Tool execution result with metadata
 */
export interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: {
    type: "execution_error" | "tool_not_found" | "invalid_args" | "codap_error" | "routing_error";
    message: string;
    details?: any;
  };
  duration: number;
  timestamp: string;
}

/**
 * Tool Executor implementation
 * Provides sequential execution of tool requests against CODAP plugin API and SageModeler API
 */
export class ToolExecutor implements ToolExecutorInterface {
  private queue: ExecutionQueue;
  private config: ToolExecutorConfig;
  private isProcessing = false;
  private processingInterval?: NodeJS.Timeout;

  constructor(config: ToolExecutorConfig = {}) {
    this.config = { ...DEFAULT_EXECUTOR_CONFIG, ...config };
    this.queue = new ExecutionQueue(this.config.queueConfig);
    
    if (this.config.autoStart) {
      this.startProcessing();
    }
  }

  /**
   * Execute a tool request
   */
  async execute(request: ToolRequest): Promise<ToolResponse> {
    this.log("Received tool request", { tool: request.tool, requestId: request.id });
    
    // Check if tool is supported for current capabilities
    if (!isToolSupportedForCapabilities(request.tool, this.config.capabilities || ["CODAP"])) {
      return {
        requestId: request.id,
        success: false,
        error: {
          type: "tool_not_found",
          message: `Tool ${request.tool} not supported for current capabilities: ${(this.config.capabilities || ["CODAP"]).join(", ")}`,
          details: { supportedTools: getToolsByCapability(this.config.capabilities) }
        },
        timestamp: new Date().toISOString(),
        duration: 0
      };
    }

    // Add to queue for sequential processing
    return this.queue.enqueue(request);
  }

  /**
   * Check if a tool is supported
   */
  isToolSupported(toolName: string): boolean {
    return isToolSupportedForCapabilities(toolName, this.config.capabilities || ["CODAP"]);
  }

  /**
   * Get list of supported tools for current capabilities
   */
  getSupportedTools(): string[] {
    return getToolsByCapability(this.config.capabilities || ["CODAP"]);
  }

  /**
   * Check if executor is currently processing
   */
  isBusy(): boolean {
    return this.isProcessing;
  }

  /**
   * Get number of queued requests
   */
  getQueueSize(): number {
    return this.queue.size();
  }

  /**
   * Start processing queued requests
   */
  startProcessing(): void {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.processingInterval = setInterval(() => {
      this.processNext();
    }, 100); // Check every 100ms
  }

  /**
   * Stop processing queued requests
   */
  stopProcessing(): void {
    this.isProcessing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
  }

  /**
   * Process next request in queue
   */
  private async processNext(): Promise<void> {
    if (!this.isProcessing) return;
    
    const next = this.queue.dequeue();
    if (!next) return;
    
    const { request, resolve } = next;
    
    try {
      const result = await this.executeToolRequest(request);
      
      const response: ToolResponse = {
        requestId: request.id,
        success: result.success,
        result: result.result,
        error: result.error,
        timestamp: result.timestamp,
        duration: result.duration
      };
      
      resolve(response);
    } catch (error) {
      resolve({
        requestId: request.id,
        success: false,
        error: {
          type: "execution_error",
          message: error instanceof Error ? error.message : "Unknown execution error",
          details: error
        },
        timestamp: new Date().toISOString(),
        duration: 0
      });
    }
  }

  /**
   * Execute a specific tool request using capability-based routing
   */
  private async executeToolRequest(request: ToolRequest): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.log("Executing tool", { tool: request.tool, args: request.args });
      
      // Get routing information for this tool
      const routing = getToolRouting(request.tool);
      if (!routing) {
        throw new Error(`No routing information found for tool: ${request.tool}`);
      }

      let result: any;

      // Route based on target application
      console.log("🔧 [ToolExecutor] Routing tool:", { tool: request.tool, target: routing.target });
      
      if (routing.target === "CODAP") {
        console.log("🔧 [ToolExecutor] Calling executeCODAPTool...");
        result = await this.executeCODAPTool(request.tool, request.args);
        console.log("🔧 [ToolExecutor] executeCODAPTool completed:", result);
      } else if (routing.target === "SAGEMODELER") {
        console.log("🔧 [ToolExecutor] Calling executeSageModelerTool...");
        result = await this.executeSageModelerTool(request.tool, request.args);
        console.log("🔧 [ToolExecutor] executeSageModelerTool completed:", result);
      } else {
        throw new Error(`Unknown routing target: ${routing.target}`);
      }

      const duration = Date.now() - startTime;
      
      return {
        success: true,
        result,
        duration,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        error: {
          type: "routing_error",
          message: error instanceof Error ? error.message : "Tool execution failed",
          details: error
        },
        duration,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute CODAP-specific tool using standard CODAP Plugin API
   */
  private async executeCODAPTool(toolName: string, args: any): Promise<any> {
    console.log("🔧 [ToolExecutor] executeCODAPTool called:", { toolName, args });
    
    // Route to appropriate CODAP API call based on tool name
    switch (toolName) {
      case "initializePlugin":
        return await this.initializePlugin(args);
      case "createDataContext":
        console.log("🔧 [ToolExecutor] Executing createDataContext case");
        return await this.createDataContext(args);
      case "createItems":
        return await this.createItems(args);
      case "updateItems":
        return await this.updateItems(args);
      case "deleteItems":
        return await this.deleteItems(args);
      case "getAllItems":
        return await this.getAllItems(args);
      case "getItemCount":
        return await this.getItemCount(args);
      case "getItemByID":
        return await this.getItemByID(args);
      case "selectItems":
        return await this.selectItems(args);
      case "createCollection":
        return await this.createCollection(args);
      case "createAttribute":
        return await this.createAttribute(args);
      case "updateAttribute":
        return await this.updateAttribute(args);
      case "deleteAttribute":
        return await this.deleteAttribute(args);
      case "createGraph":
        return await this.createGraph(args);
      case "createTable":
        return await this.createTable(args);
      case "createSlider":
        return await this.createSlider(args);
      case "createCalculator":
        return await this.createCalculator(args);
      case "createText":
        return await this.createText(args);
      case "createWebView":
        return await this.createWebView(args);
      case "deleteComponent":
        return await this.deleteComponent(args);
      case "updateComponent":
        return await this.updateComponent(args);
      case "getAllComponents":
        return await this.getAllComponents(args);
      case "getComponent":
        return await this.getComponent(args);
      case "getListOfDataContexts":
        return await this.getListOfDataContexts(args);
      case "getDataContext":
        return await this.getDataContext(args);
      case "deleteDataContext":
        return await this.deleteDataContext(args);
      case "getSelectedItems":
        return await this.getSelectedItems(args);
      case "deselectAll":
        return await this.deselectAll(args);
      case "getCollectionList":
        return await this.getCollectionList(args);
      case "getCollection":
        return await this.getCollection(args);
      case "getAttributeList":
        return await this.getAttributeList(args);
      case "getAttribute":
        return await this.getAttribute(args);
      case "registerForNotifications":
        return await this.registerForNotifications(args);
      case "unregisterForNotifications":
        return await this.unregisterForNotifications(args);
      default:
        throw new Error(`Unsupported CODAP tool: ${toolName}`);
    }
  }

  /**
   * Execute SageModeler-specific tool using SageModeler API with proper prefixing
   */
  private async executeSageModelerTool(toolName: string, args: any): Promise<any> {
    // Map tool names to SageModeler API calls
    const sageApiMapping: Record<string, { action: string; resource: string }> = {
      "sage_create_node": { action: "create", resource: "nodes" },
      "sage_create_random_node": { action: "create", resource: "nodes/random" },
      "sage_update_node": { action: "update", resource: "nodes" },
      "sage_delete_node": { action: "delete", resource: "nodes" },
      "sage_get_all_nodes": { action: "get", resource: "nodes" },
      "sage_get_node_by_id": { action: "get", resource: "nodes" },
      "sage_select_node": { action: "call", resource: "nodes/select" },
      "sage_create_link": { action: "create", resource: "links" },
      "sage_update_link": { action: "update", resource: "links" },
      "sage_delete_link": { action: "delete", resource: "links" },
      "sage_get_all_links": { action: "get", resource: "links" },
      "sage_get_link_by_id": { action: "get", resource: "links" },
      "sage_reload_experiment_nodes": { action: "call", resource: "experiment/reloadNodes" },
      "sage_run_experiment": { action: "call", resource: "simulation/experimentRun" },
      "sage_start_recording": { action: "call", resource: "simulation/recordStream" },
      "sage_stop_recording": { action: "call", resource: "simulation/stopRecording" },
      "sage_set_recording_options": { action: "call", resource: "simulation/setRecordingOptions" },
      "sage_load_model": { action: "update", resource: "model" },
      "sage_export_model": { action: "get", resource: "model" },
      "sage_import_sd_json": { action: "call", resource: "model/importSdJson" },
      "sage_export_sd_json": { action: "call", resource: "model/exportSdJson" },
      "sage_set_model_complexity": { action: "update", resource: "model/complexity" },
      "sage_set_ui_settings": { action: "update", resource: "ui/settings" },
      "sage_restore_default_settings": { action: "call", resource: "settings/restoreDefaults" },
      "sage_get_simulation_state": { action: "get", resource: "simulation/state" }
    };

    const apiCall = sageApiMapping[toolName];
    if (!apiCall) {
      throw new Error(`No SageModeler API mapping found for tool: ${toolName}`);
    }

    // Adjust resource path for ID-based operations
    let resource = apiCall.resource;
    if (toolName === "sage_get_node_by_id" && args.nodeId) {
      resource = `nodes/${args.nodeId}`;
    } else if (toolName === "sage_update_node" && args.nodeId) {
      resource = `nodes/${args.nodeId}`;
    } else if (toolName === "sage_delete_node" && args.nodeId) {
      resource = `nodes/${args.nodeId}`;
    } else if (toolName === "sage_get_link_by_id" && args.linkId) {
      resource = `links/${args.linkId}`;
    } else if (toolName === "sage_update_link" && args.linkId) {
      resource = `links/${args.linkId}`;
    } else if (toolName === "sage_delete_link" && args.linkId) {
      resource = `links/${args.linkId}`;
    }

    return await this.sendSageMessage(apiCall.action, resource, args);
  }

  // ==================== CODAP Tool Implementations ====================

  /**
   * Initialize CODAP plugin
   */
  private async initializePlugin(args: any): Promise<any> {
    const { name, title, version, dimensions } = args;
    return await this.sendCODAPMessage("update", "interactiveFrame", {
      name: name || title,
      title: title || name,
      version,
      ...(dimensions && { dimensions })
    });
  }

  /**
   * Create data context
   */
  private async createDataContext(args: any): Promise<any> {
    // Revert to working approach - direct sendMessage call like in 687436b1
    console.log("🔧 [ToolExecutor] Creating data context with direct sendMessage:", args);
    
    try {
      console.log("🔧 [ToolExecutor] About to call sendMessage...");
      const result = await sendMessage("create", "dataContext", args);
      console.log("🔧 [ToolExecutor] sendMessage completed:", result);
      return result;
    } catch (error) {
      console.error("❌ [ToolExecutor] sendMessage failed:", error);
      throw error;
    }
  }

  /**
   * Create items in data context
   */
  private async createItems(args: any): Promise<any> {
    const { dataContextName, items } = args;
    return await this.sendCODAPMessage("create", `dataContext[${dataContextName}].item`, items);
  }

  /**
   * Create graph with optimal two-step approach for axis assignments
   */
  private async createGraph(args: any): Promise<any> {
    const { 
      dataContext, 
      dataContextName,
      graphType = "scatterPlot", 
      xAttribute, 
      yAttribute, 
      title, 
      width = 400, 
      height = 300,
      position = { x: 50, y: 50 },
      dimensions
    } = args;

    // Step 1: Create empty graph component (proven optimal approach)
    const componentValues: any = {
      type: "graph",
      dataContext: dataContext || dataContextName,
      graphType,
      dimensions: dimensions || { width, height },
      position
    };

    if (title) componentValues.name = title;

    console.log("Browser worker creating empty graph:", componentValues);
    const graphResult = await this.sendCODAPMessage("create", "component", componentValues);

    // Step 2: If axes are specified, update the graph with axis assignments (proven fastest method)
    if ((xAttribute || yAttribute) && graphResult.success && graphResult.values) {
      const componentId = graphResult.values.id;
      if (componentId) {
        const updateValues: any = {};
        if (xAttribute) updateValues.xAttributeName = xAttribute;
        if (yAttribute) updateValues.yAttributeName = yAttribute;

        console.log("Browser worker updating graph axes:", { componentId, updateValues });
        const updateResult = await this.sendCODAPMessage("update", `component[${componentId}]`, updateValues);

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
  }

  /**
   * Update component (for graph axis assignment)
   */
  private async updateComponent(args: any): Promise<any> {
    const { componentId, values, ...updateValues } = args;
    
    // If values object is provided, use it; otherwise use the direct properties
    const updateData = values || updateValues;
    
    // Use component[id] resource format for updates
    return await this.sendCODAPMessage("update", `component[${componentId}]`, updateData);
  }

  /**
   * Get list of data contexts
   */
  private async getDataContexts(): Promise<any> {
    return await this.sendCODAPMessage("get", "dataContextList");
  }

  /**
   * Get list of components
   */
  private async getComponents(): Promise<any> {
    return await this.sendCODAPMessage("get", "componentList");
  }

  /**
   * Create table component
   */
  private async createTable(args: any): Promise<any> {
    const { dataContext, name } = args;
    return await this.sendCODAPMessage("create", "component", { type: "caseTable", dataContext, name });
  }

  // ==================== Helper Methods ====================

  /**
   * Send CODAP message with timeout handling (matches SageModeler timeout approach)
   */
  private async sendCODAPMessage(action: "create" | "get" | "update" | "delete", resource: string, values?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      // Set up timeout (same as SageModeler: 10 seconds)
      const timeout = setTimeout(() => {
        reject(new Error("CODAP API timeout"));
      }, 10000);
      
      // Execute CODAP sendMessage
      sendMessage(action, resource, values)
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  // ==================== SageModeler Tool Implementations ====================

  /**
   * Send postMessage to SageModeler with standardized format
   */
  private async sendSageMessage(action: string, resource: string, values?: any, requestId?: string): Promise<any> {
    const message = {
      sageApi: true,
      action,
      resource,
      ...(values && { values }),
      ...(requestId && { requestId })
    };

    return new Promise((resolve, reject) => {
      // Generate request ID if not provided
      const id = requestId || `sage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Set up response listener
      const responseHandler = (event: MessageEvent) => {
        if (event.data && event.data.requestId === id) {
          window.removeEventListener("message", responseHandler);
          resolve(event.data);
        }
      };
      
      window.addEventListener("message", responseHandler);
      
      // Send message to SageModeler
      window.parent.postMessage({ ...message, requestId: id }, "*");
      
      // Timeout after 10 seconds
      setTimeout(() => {
        window.removeEventListener("message", responseHandler);
        reject(new Error("SageModeler API timeout"));
      }, 10000);
    });
  }

  /**
   * Log message if logging is enabled
   */
  private log(message: string, details?: Record<string, any>): void {
    if (this.config.enableLogging) {
      console.log(`[ToolExecutor] ${message}`, details || "");
    }
  }

  // ==================== Missing CODAP Tool Method Stubs ====================

  /**
   * Update items in data context
   */
  private async updateItems(args: any): Promise<any> {
    const { dataContextName, items } = args;
    return await this.sendCODAPMessage("update", `dataContext[${dataContextName}].item`, items);
  }

  /**
   * Delete items from data context
   */
  private async deleteItems(args: any): Promise<any> {
    const { dataContextName, itemIds } = args;
    return await this.sendCODAPMessage("delete", `dataContext[${dataContextName}].item`, { itemIds });
  }

  /**
   * Get all items from data context
   */
  private async getAllItems(args: any): Promise<any> {
    const { dataContextName } = args;
    return await this.sendCODAPMessage("get", `dataContext[${dataContextName}].itemCount`);
  }

  /**
   * Get item count from data context
   */
  private async getItemCount(args: any): Promise<any> {
    const { dataContextName } = args;
    return await this.sendCODAPMessage("get", `dataContext[${dataContextName}].itemCount`);
  }

  /**
   * Get item by ID from data context
   */
  private async getItemByID(args: any): Promise<any> {
    const { dataContextName, itemId } = args;
    return await this.sendCODAPMessage("get", `dataContext[${dataContextName}].item[${itemId}]`);
  }

  /**
   * Select items in data context
   */
  private async selectItems(args: any): Promise<any> {
    const { dataContextName, itemIds } = args;
    return await this.sendCODAPMessage("update", `dataContext[${dataContextName}].selectionList`, itemIds);
  }

  /**
   * Create collection in data context
   */
  private async createCollection(args: any): Promise<any> {
    const { dataContextName, collectionName, attributes, parent } = args;
    const values: any = {
      name: collectionName,
      title: collectionName,
      attrs: attributes
    };
    
    if (parent) {
      values.parent = parent;
    }
    
    return await this.sendCODAPMessage("create", `dataContext[${dataContextName}].collection`, values);
  }

  /**
   * Create attribute in collection
   */
  private async createAttribute(args: any): Promise<any> {
    const { dataContextName, collectionName, attribute } = args;
    return await this.sendCODAPMessage("create", `dataContext[${dataContextName}].collection[${collectionName}].attribute`, attribute);
  }

  /**
   * Update attribute in collection
   */
  private async updateAttribute(args: any): Promise<any> {
    const { dataContextName, collectionName, attributeName, attribute } = args;
    return await this.sendCODAPMessage("update", `dataContext[${dataContextName}].collection[${collectionName}].attribute[${attributeName}]`, attribute);
  }

  /**
   * Delete attribute from collection
   */
  private async deleteAttribute(args: any): Promise<any> {
    const { dataContextName, collectionName, attributeName } = args;
    return await this.sendCODAPMessage("delete", `dataContext[${dataContextName}].collection[${collectionName}].attribute[${attributeName}]`);
  }

  /**
   * Create slider component
   */
  private async createSlider(args: any): Promise<any> {
    return await this.sendCODAPMessage("create", "component", { type: "slider", ...args });
  }

  /**
   * Create calculator component
   */
  private async createCalculator(args: any): Promise<any> {
    return await this.sendCODAPMessage("create", "component", { type: "calculator", ...args });
  }

  /**
   * Create text component
   */
  private async createText(args: any): Promise<any> {
    return await this.sendCODAPMessage("create", "component", { type: "text", ...args });
  }

  /**
   * Create web view component
   */
  private async createWebView(args: any): Promise<any> {
    return await this.sendCODAPMessage("create", "component", { type: "webView", ...args });
  }

  /**
   * Delete component
   */
  private async deleteComponent(args: any): Promise<any> {
    const { componentId } = args;
    return await this.sendCODAPMessage("delete", `component[${componentId}]`);
  }

  /**
   * Get all components
   */
  private async getAllComponents(args: any): Promise<any> {
    return await this.sendCODAPMessage("get", "componentList");
  }

  /**
   * Get specific component
   */
  private async getComponent(args: any): Promise<any> {
    const { componentId } = args;
    return await this.sendCODAPMessage("get", `component[${componentId}]`);
  }

  /**
   * Get list of data contexts
   */
  private async getListOfDataContexts(args: any): Promise<any> {
    return await this.sendCODAPMessage("get", "dataContextList");
  }

  /**
   * Get data context
   */
  private async getDataContext(args: any): Promise<any> {
    const { dataContextName } = args;
    return await this.sendCODAPMessage("get", `dataContext[${dataContextName}]`);
  }

  /**
   * Delete data context
   */
  private async deleteDataContext(args: any): Promise<any> {
    const { dataContextName } = args;
    return await this.sendCODAPMessage("delete", `dataContext[${dataContextName}]`);
  }

  /**
   * Get selected items
   */
  private async getSelectedItems(args: any): Promise<any> {
    const { dataContextName } = args;
    return await this.sendCODAPMessage("get", `dataContext[${dataContextName}].selectionList`);
  }

  /**
   * Deselect all items
   */
  private async deselectAll(args: any): Promise<any> {
    const { dataContextName } = args;
    return await this.sendCODAPMessage("update", `dataContext[${dataContextName}].selectionList`, []);
  }

  /**
   * Get collection list
   */
  private async getCollectionList(args: any): Promise<any> {
    const { dataContextName } = args;
    return await this.sendCODAPMessage("get", `dataContext[${dataContextName}].collectionList`);
  }

  /**
   * Get collection
   */
  private async getCollection(args: any): Promise<any> {
    const { dataContextName, collectionName } = args;
    return await this.sendCODAPMessage("get", `dataContext[${dataContextName}].collection[${collectionName}]`);
  }

  /**
   * Get attribute list
   */
  private async getAttributeList(args: any): Promise<any> {
    const { dataContextName, collectionName } = args;
    return await this.sendCODAPMessage("get", `dataContext[${dataContextName}].collection[${collectionName}].attributeList`);
  }

  /**
   * Get attribute
   */
  private async getAttribute(args: any): Promise<any> {
    const { dataContextName, collectionName, attributeName } = args;
    return await this.sendCODAPMessage("get", `dataContext[${dataContextName}].collection[${collectionName}].attribute[${attributeName}]`);
  }

  /**
   * Register for notifications
   */
  private async registerForNotifications(args: any): Promise<any> {
    return await this.sendCODAPMessage("create", "notificationSubscription", args);
  }

  /**
   * Unregister for notifications
   */
  private async unregisterForNotifications(args: any): Promise<any> {
    return await this.sendCODAPMessage("delete", "notificationSubscription", args);
  }
} 
