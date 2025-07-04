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
import { getSupportedTools, isToolSupported } from "./schemas/toolSchemas";

// Import CODAP plugin API functions
import { 
  sendMessage, 
  createTable, 
  createItems
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
}

/**
 * Default executor configuration
 */
export const DEFAULT_EXECUTOR_CONFIG: ToolExecutorConfig = {
  enableLogging: false,
  maxExecutionTime: 30000, // 30 seconds
  autoStart: true
};

/**
 * Tool execution result with metadata
 */
export interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: {
    type: "execution_error" | "tool_not_found" | "invalid_args" | "codap_error";
    message: string;
    details?: any;
  };
  duration: number;
  timestamp: string;
}

/**
 * Tool Executor implementation
 * Provides sequential execution of tool requests against CODAP plugin API
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
   * Adds request to queue and returns promise for response
   */
  async execute(request: ToolRequest): Promise<ToolResponse> {
    this.log("Executing tool request", { id: request.id, tool: request.tool });

    // Validate tool is supported
    if (!this.isToolSupported(request.tool)) {
      const error: ToolResponse = {
        requestId: request.id,
        success: false,
        error: {
          type: "tool_not_found",
          message: `Tool '${request.tool}' is not supported`,
          details: { supportedTools: this.getSupportedTools() }
        },
        timestamp: new Date().toISOString(),
        duration: 0
      };
      return error;
    }

    // Add to queue and wait for processing
    return this.queue.enqueue(request);
  }

  /**
   * Check if a tool is supported
   */
  isToolSupported(toolName: string): boolean {
    return isToolSupported(toolName);
  }

  /**
   * Get list of supported tools
   */
  getSupportedTools(): string[] {
    return getSupportedTools();
  }

  /**
   * Check if executor is currently processing a request
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
   * Get current execution status
   */
  getExecutionStatus(): ExecutionStatus {
    return this.queue.getExecutionStatus();
  }

  /**
   * Start processing queue
   */
  startProcessing(): void {
    if (this.processingInterval) {
      return; // Already processing
    }

    this.processingInterval = setInterval(() => {
      this.processNext();
    }, 100); // Check queue every 100ms

    this.log("Started queue processing");
  }

  /**
   * Stop processing queue
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    this.log("Stopped queue processing");
  }

  /**
   * Clear all queued requests
   */
  clearQueue(): void {
    this.queue.clear();
    this.log("Cleared execution queue");
  }

  /**
   * Process next request in queue
   */
  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.isEmpty()) {
      return;
    }

    const queuedRequest = this.queue.dequeue();
    if (!queuedRequest) {
      return;
    }

    this.isProcessing = true;
    this.queue.setProcessing(true);

    const startTime = Date.now();

    try {
      const result = await this.executeToolRequest(queuedRequest.request);
      const duration = Date.now() - startTime;

      const response: ToolResponse = {
        requestId: queuedRequest.request.id,
        success: result.success,
        timestamp: result.timestamp,
        duration,
        ...(result.success ? { result: result.result } : { error: result.error })
      };

      this.queue.markProcessed(queuedRequest.request.id, duration);
      queuedRequest.resolve(response);
      
      this.log("Request processed successfully", { 
        id: queuedRequest.request.id, 
        duration 
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorResponse: ToolResponse = {
        requestId: queuedRequest.request.id,
        success: false,
        timestamp: new Date().toISOString(),
        duration,
        error: {
          type: "execution_error",
          message: error instanceof Error ? error.message : "Unknown execution error",
          details: error
        }
      };

      this.queue.markFailed(queuedRequest.request.id, error instanceof Error ? error : new Error(String(error)));
      queuedRequest.reject(error instanceof Error ? error : new Error(String(error)));
      
      this.log("Request processing failed", { 
        id: queuedRequest.request.id, 
        error: errorResponse.error?.message 
      });
    } finally {
      this.isProcessing = false;
      this.queue.setProcessing(false);
    }
  }

  /**
   * Execute a specific tool request against CODAP
   */
  private async executeToolRequest(request: ToolRequest): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.log("Executing tool", { tool: request.tool, args: request.args });
      
      let result: any;

      // Route to appropriate CODAP API call based on tool
      switch (request.tool) {
        case "create_dataset_with_table":
          result = await this.createDatasetWithTable(request.args);
          break;
          
        case "create_graph":
          result = await this.createGraph(request.args);
          break;
          
        case "create_data_context":
          result = await this.createDataContext(request.args);
          break;
          
        case "create_collection":
          result = await this.createCollection(request.args);
          break;
          
        case "create_items":
          result = await this.createItems(request.args);
          break;
          
        case "create_table":
          result = await this.createTable(request.args);
          break;
          
        case "get_data_contexts":
          result = await this.getDataContexts();
          break;
          
        case "get_components":
          result = await this.getComponents();
          break;
          
        case "get_data_context":
          result = await this.getDataContext(request.args);
          break;
          
        case "update_component":
          result = await this.updateComponent(request.args);
          break;
          
        // SageModeler Tools - Node Management
        case "sage_create_node":
          result = await this.sageCreateNode(request.args);
          break;
          
        case "sage_create_random_node":
          result = await this.sageCreateRandomNode(request.args);
          break;
          
        case "sage_update_node":
          result = await this.sageUpdateNode(request.args);
          break;
          
        case "sage_delete_node":
          result = await this.sageDeleteNode(request.args);
          break;
          
        case "sage_get_all_nodes":
          result = await this.sageGetAllNodes(request.args);
          break;
          
        case "sage_get_node_by_id":
          result = await this.sageGetNodeById(request.args);
          break;
          
        case "sage_select_node":
          result = await this.sageSelectNode(request.args);
          break;
          
        // SageModeler Tools - Link Management  
        case "sage_create_link":
          result = await this.sageCreateLink(request.args);
          break;
          
        case "sage_update_link":
          result = await this.sageUpdateLink(request.args);
          break;
          
        case "sage_delete_link":
          result = await this.sageDeleteLink(request.args);
          break;
          
        case "sage_get_all_links":
          result = await this.sageGetAllLinks(request.args);
          break;
          
        case "sage_get_link_by_id":
          result = await this.sageGetLinkById(request.args);
          break;
          
        // SageModeler Tools - Experiments
        case "sage_reload_experiment_nodes":
          result = await this.sageReloadExperimentNodes(request.args);
          break;
          
        case "sage_run_experiment":
          result = await this.sageRunExperiment(request.args);
          break;
          
        // SageModeler Tools - Recording
        case "sage_start_recording":
          result = await this.sageStartRecording(request.args);
          break;
          
        case "sage_stop_recording":
          result = await this.sageStopRecording(request.args);
          break;
          
        case "sage_set_recording_options":
          result = await this.sageSetRecordingOptions(request.args);
          break;
          
        // SageModeler Tools - Model Import/Export
        case "sage_load_model":
          result = await this.sageLoadModel(request.args);
          break;
          
        case "sage_export_model":
          result = await this.sageExportModel(request.args);
          break;
          
        case "sage_import_sd_json":
          result = await this.sageImportSdJson(request.args);
          break;
          
        case "sage_export_sd_json":
          result = await this.sageExportSdJson(request.args);
          break;
          
        // SageModeler Tools - Settings
        case "sage_set_model_complexity":
          result = await this.sageSetModelComplexity(request.args);
          break;
          
        case "sage_set_ui_settings":
          result = await this.sageSetUiSettings(request.args);
          break;
          
        case "sage_restore_default_settings":
          result = await this.sageRestoreDefaultSettings(request.args);
          break;
          
        // SageModeler Tools - Simulation State
        case "sage_get_simulation_state":
          result = await this.sageGetSimulationState(request.args);
          break;
          
        default:
          throw new Error(`Unsupported tool: ${request.tool}`);
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
          type: "codap_error",
          message: error instanceof Error ? error.message : "CODAP execution failed",
          details: error
        },
        duration,
        timestamp: new Date().toISOString()
      };
    }
  }

  // ==================== CODAP Tool Implementations ====================

  /**
   * Create dataset with automatic table display
   */
  private async createDatasetWithTable(args: any): Promise<any> {
    const { name, attributes, data = [], title, tableName } = args;

    // 1. Create data context
    const dataContextResult = await sendMessage("create", "dataContext", {
      name,
      title: title || name,
      collections: [{
        name: "Cases",
        attrs: attributes
      }]
    });

    // 2. Add data if provided
    let itemsResult = null;
    if (data.length > 0) {
      itemsResult = await createItems(name, data);
    }

    // 3. Create table for immediate feedback
    const tableResult = await createTable(name, tableName || `${name} Table`);

    return {
      dataContext: dataContextResult,
      items: itemsResult,
      table: tableResult,
      recordCount: data.length
    };
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
    const graphResult = await sendMessage("create", "component", componentValues);

    // Step 2: If axes are specified, update the graph with axis assignments (proven fastest method)
    if ((xAttribute || yAttribute) && graphResult.success && graphResult.values) {
      const componentId = graphResult.values.id;
      if (componentId) {
        const updateValues: any = {};
        if (xAttribute) updateValues.xAttributeName = xAttribute;
        if (yAttribute) updateValues.yAttributeName = yAttribute;

        console.log("Browser worker updating graph axes:", { componentId, updateValues });
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
  }

  /**
   * Create data context
   */
  private async createDataContext(args: any): Promise<any> {
    return await sendMessage("create", "dataContext", args);
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
    
    return await sendMessage("create", `dataContext[${dataContextName}].collection`, values);
  }

  /**
   * Create items in data context
   */
  private async createItems(args: any): Promise<any> {
    const { dataContextName, items } = args;
    return await createItems(dataContextName, items);
  }

  /**
   * Create table component
   */
  private async createTable(args: any): Promise<any> {
    const { dataContext, name } = args;
    return await createTable(dataContext, name);
  }

  // Removed createComponent - not a valid CODAP API call
  // Use specific tools like create_graph, create_table, create_map instead

  /**
   * Update component (for graph axis assignment)
   */
  private async updateComponent(args: any): Promise<any> {
    const { componentId, values, ...updateValues } = args;
    
    // If values object is provided, use it; otherwise use the direct properties
    const updateData = values || updateValues;
    
    // Use component[id] resource format for updates
    return await sendMessage("update", `component[${componentId}]`, updateData);
  }

  /**
   * Get list of data contexts
   */
  private async getDataContexts(): Promise<any> {
    return await sendMessage("get", "dataContextList");
  }

  /**
   * Get list of components
   */
  private async getComponents(): Promise<any> {
    return await sendMessage("get", "componentList");
  }

  /**
   * Get specific data context
   */
  private async getDataContext(args: any): Promise<any> {
    const { name } = args;
    return await sendMessage("get", "dataContext", { name });
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
          window.removeEventListener('message', responseHandler);
          resolve(event.data);
        }
      };
      
      window.addEventListener('message', responseHandler);
      
      // Send message to SageModeler
      window.parent.postMessage({ ...message, requestId: id }, '*');
      
      // Timeout after 10 seconds
      setTimeout(() => {
        window.removeEventListener('message', responseHandler);
        reject(new Error('SageModeler API timeout'));
      }, 10000);
    });
  }

  // Node Management Functions
  
  /**
   * Create a new node in SageModeler
   */
  private async sageCreateNode(args: any): Promise<any> {
    const { title, initialValue, x, y, min, max, isAccumulator, isFlowVariable, 
            allowNegativeValues, valueDefinedSemiQuantitatively, color, combineMethod, 
            image, usesDefaultImage, paletteItem, sourceApp } = args;
    
    const nodeData = {
      title,
      ...(initialValue !== undefined && { initialValue }),
      ...(x !== undefined && { x }),
      ...(y !== undefined && { y }),
      ...(min !== undefined && { min }),
      ...(max !== undefined && { max }),
      ...(isAccumulator !== undefined && { isAccumulator }),
      ...(isFlowVariable !== undefined && { isFlowVariable }),
      ...(allowNegativeValues !== undefined && { allowNegativeValues }),
      ...(valueDefinedSemiQuantitatively !== undefined && { valueDefinedSemiQuantitatively }),
      ...(color && { color }),
      ...(combineMethod && { combineMethod }),
      ...(image && { image }),
      ...(usesDefaultImage !== undefined && { usesDefaultImage }),
      ...(paletteItem && { paletteItem }),
      ...(sourceApp && { sourceApp })
    };
    
    return await this.sendSageMessage("create", "nodes", nodeData);
  }

  /**
   * Create a random node in SageModeler
   */
  private async sageCreateRandomNode(args: any): Promise<any> {
    // Generate random node properties
    const randomNodeData = {
      title: `Node_${Math.random().toString(36).substr(2, 9)}`,
      initialValue: Math.floor(Math.random() * 100),
      x: Math.floor(Math.random() * 500),
      y: Math.floor(Math.random() * 500),
      min: 0,
      max: 100
    };
    
    return await this.sendSageMessage("create", "nodes", randomNodeData);
  }

  /**
   * Update an existing node in SageModeler
   */
  private async sageUpdateNode(args: any): Promise<any> {
    const { nodeId, ...updateData } = args;
    
    if (!nodeId) {
      throw new Error("nodeId is required for updating a node");
    }
    
    return await this.sendSageMessage("update", `nodes/${nodeId}`, updateData);
  }

  /**
   * Delete a node in SageModeler
   */
  private async sageDeleteNode(args: any): Promise<any> {
    const { nodeId } = args;
    
    if (!nodeId) {
      throw new Error("nodeId is required for deleting a node");
    }
    
    return await this.sendSageMessage("delete", `nodes/${nodeId}`);
  }

  /**
   * Get all nodes in SageModeler
   */
  private async sageGetAllNodes(args: any): Promise<any> {
    return await this.sendSageMessage("get", "nodes");
  }

  /**
   * Get a specific node by ID in SageModeler
   */
  private async sageGetNodeById(args: any): Promise<any> {
    const { nodeId } = args;
    
    if (!nodeId) {
      throw new Error("nodeId is required for getting a node");
    }
    
    return await this.sendSageMessage("get", `nodes/${nodeId}`);
  }

  /**
   * Select a node in SageModeler UI
   */
  private async sageSelectNode(args: any): Promise<any> {
    const { nodeId } = args;
    
    if (!nodeId) {
      throw new Error("nodeId is required for selecting a node");
    }
    
    return await this.sendSageMessage("call", "ui/selectNode", { nodeId });
  }

  // Link Management Functions
  
  /**
   * Create a link between nodes in SageModeler
   */
  private async sageCreateLink(args: any): Promise<any> {
    const { source, target, relationVector, relationScalar, customData, label, color, sourceApp } = args;
    
    if (!source || !target || !relationVector) {
      throw new Error("source, target, and relationVector are required for creating a link");
    }
    
    const linkData = {
      source,
      target,
      relationVector,
      ...(relationScalar && { relationScalar }),
      ...(customData && { customData }),
      ...(label && { label }),
      ...(color && { color }),
      ...(sourceApp && { sourceApp })
    };
    
    return await this.sendSageMessage("create", "links", linkData);
  }

  /**
   * Update an existing link in SageModeler
   */
  private async sageUpdateLink(args: any): Promise<any> {
    const { linkId, ...updateData } = args;
    
    if (!linkId) {
      throw new Error("linkId is required for updating a link");
    }
    
    return await this.sendSageMessage("update", `links/${linkId}`, updateData);
  }

  /**
   * Delete a link in SageModeler
   */
  private async sageDeleteLink(args: any): Promise<any> {
    const { linkId } = args;
    
    if (!linkId) {
      throw new Error("linkId is required for deleting a link");
    }
    
    return await this.sendSageMessage("delete", `links/${linkId}`);
  }

  /**
   * Get all links in SageModeler
   */
  private async sageGetAllLinks(args: any): Promise<any> {
    return await this.sendSageMessage("get", "links");
  }

  /**
   * Get a specific link by ID in SageModeler
   */
  private async sageGetLinkById(args: any): Promise<any> {
    const { linkId } = args;
    
    if (!linkId) {
      throw new Error("linkId is required for getting a link");
    }
    
    return await this.sendSageMessage("get", `links/${linkId}`);
  }

  // Experiment Functions
  
  /**
   * Reload experiment nodes in SageModeler
   */
  private async sageReloadExperimentNodes(args: any): Promise<any> {
    return await this.sendSageMessage("call", "experiment/reloadNodes");
  }

  /**
   * Run an experiment in SageModeler
   */
  private async sageRunExperiment(args: any): Promise<any> {
    const { mode, duration, stepUnit, delivery, parameters } = args;
    
    if (!mode || !parameters) {
      throw new Error("mode and parameters are required for running an experiment");
    }
    
    const experimentData = {
      mode,
      parameters,
      ...(duration !== undefined && { duration }),
      ...(stepUnit && { stepUnit }),
      ...(delivery && { delivery })
    };
    
    return await this.sendSageMessage("call", "simulation/experimentRun", experimentData);
  }

  // Recording Functions
  
  /**
   * Start recording in SageModeler
   */
  private async sageStartRecording(args: any): Promise<any> {
    const { duration, units } = args;
    
    const recordingData = {
      ...(duration !== undefined && { duration }),
      ...(units && { units })
    };
    
    return await this.sendSageMessage("call", "simulation/record", recordingData);
  }

  /**
   * Stop recording in SageModeler
   */
  private async sageStopRecording(args: any): Promise<any> {
    return await this.sendSageMessage("call", "simulation/stopRecord");
  }

  /**
   * Set recording options in SageModeler
   */
  private async sageSetRecordingOptions(args: any): Promise<any> {
    const { options } = args;
    
    if (!options) {
      throw new Error("options are required for setting recording options");
    }
    
    return await this.sendSageMessage("update", "simulation/settings", options);
  }

  // Model Import/Export Functions
  
  /**
   * Load a model in SageModeler
   */
  private async sageLoadModel(args: any): Promise<any> {
    const { model } = args;
    
    if (!model) {
      throw new Error("model data is required for loading a model");
    }
    
    return await this.sendSageMessage("update", "model", model);
  }

  /**
   * Export the current model from SageModeler
   */
  private async sageExportModel(args: any): Promise<any> {
    return await this.sendSageMessage("get", "model");
  }

  /**
   * Import SD-JSON format in SageModeler
   */
  private async sageImportSdJson(args: any): Promise<any> {
    const { sdJson } = args;
    
    if (!sdJson) {
      throw new Error("sdJson data is required for importing SD-JSON");
    }
    
    return await this.sendSageMessage("call", "model/importSdJson", sdJson);
  }

  /**
   * Export to SD-JSON format from SageModeler
   */
  private async sageExportSdJson(args: any): Promise<any> {
    return await this.sendSageMessage("call", "model/exportSdJson");
  }

  // Settings Functions
  
  /**
   * Set model complexity in SageModeler
   */
  private async sageSetModelComplexity(args: any): Promise<any> {
    const { complexity } = args;
    
    if (!complexity) {
      throw new Error("complexity level is required for setting model complexity");
    }
    
    return await this.sendSageMessage("update", "settings/complexity", { complexity });
  }

  /**
   * Set UI settings in SageModeler
   */
  private async sageSetUiSettings(args: any): Promise<any> {
    const { settings } = args;
    
    if (!settings) {
      throw new Error("settings are required for setting UI settings");
    }
    
    return await this.sendSageMessage("update", "settings/ui", settings);
  }

  /**
   * Restore default settings in SageModeler
   */
  private async sageRestoreDefaultSettings(args: any): Promise<any> {
    return await this.sendSageMessage("call", "settings/restoreDefaults");
  }

  // Simulation State Functions
  
  /**
   * Get simulation state from SageModeler
   */
  private async sageGetSimulationState(args: any): Promise<any> {
    return await this.sendSageMessage("get", "simulation/state");
  }

  /**
   * Log message if logging is enabled
   */
  private log(message: string, details?: Record<string, any>): void {
    if (this.config.enableLogging) {
      console.log(`[ToolExecutor] ${message}`, details || "");
    }
  }
} 
