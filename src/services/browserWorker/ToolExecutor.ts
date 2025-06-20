/**
 * Tool Executor for Browser Worker
 * Executes tool requests against CODAP plugin API with sequential processing and response formatting
 */

import { 
  ToolExecutorInterface, 
  ToolRequest, 
  ToolResponse, 
  ExecutionStatus,
  ParsedToolRequest
} from "./types";

import { ExecutionQueue, ExecutionQueueConfig } from "./ExecutionQueue";
import { getSupportedTools, isToolSupported } from "./schemas/toolSchemas";

// Import CODAP plugin API functions
import { 
  sendMessage, 
  createTable, 
  createItems,
  createDataContext,
  initializePlugin 
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

  /**
   * Log message if logging is enabled
   */
  private log(message: string, details?: Record<string, any>): void {
    if (this.config.enableLogging) {
      console.log(`[ToolExecutor] ${message}`, details || "");
    }
  }
} 
