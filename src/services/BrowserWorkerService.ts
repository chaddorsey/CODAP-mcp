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
  private isStarted = false;

  private connectionStatus: ConnectionStatus = {
    state: ConnectionState.DISCONNECTED,
    type: ConnectionType.SSE,
    retryCount: 0
  };

  constructor(config: BrowserWorkerServiceConfig) {
    this.config = config;
    this.errorSystem = new BrowserWorkerErrorSystem({ debug: config.debug });
  }

  async start(): Promise<void> {
    if (this.isStarted) return;
    this.isStarted = true;
    
    this.connectionStatus = {
      state: ConnectionState.CONNECTING,
      type: ConnectionType.SSE,
      retryCount: 0
    };

    // Simulate connection
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.connectionStatus = {
      state: ConnectionState.CONNECTED,
      type: ConnectionType.SSE,
      lastConnected: Date.now(),
      retryCount: 0
    };
  }

  async stop(): Promise<void> {
    this.isStarted = false;
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
  }
}

export function createBrowserWorkerService(config: BrowserWorkerServiceConfig): BrowserWorkerService {
  return new BrowserWorkerService(config);
} 
