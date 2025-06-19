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
import { BrowserWorkerConfig, SSEEvent } from "./browserWorker/types";
import { 
  createDataContext, 
  createNewCollection, 
  createItems,
  createTable,
  sendMessage
} from "@concord-consortium/codap-plugin-api";

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
  private isStarted = false;

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
  }

  /**
   * Handle incoming tool request from SSE stream
   */
  private async handleToolRequest(event: SSEEvent): Promise<void> {
    try {
      const toolRequest = event.data as ToolRequest;
      
      if (this.config.debug) {
        console.log("Processing tool request:", toolRequest);
      }

      // Log that we received the request
      console.log("🎉 TOOL REQUEST RECEIVED!", {
        tool: toolRequest.tool,
        requestId: toolRequest.id,
        arguments: toolRequest.args
      });

      // Execute the tool based on the tool name
      if (toolRequest.tool === "create_dataset_with_table") {
        await this.executeCreateDatasetWithTable(toolRequest);
      } else {
        console.warn("Unsupported tool:", toolRequest.tool);
      }
      
    } catch (error) {
      if (this.config.debug) {
        console.error("Failed to process tool request:", error);
      }
    }
  }

  /**
   * Execute create_dataset_with_table tool
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
