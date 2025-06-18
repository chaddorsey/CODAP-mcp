/**
 * Type definitions for the Browser Worker component
 * Handles SSE connections, polling fallback, tool execution, and response handling
 */

// ==================== Connection Types ====================

export enum ConnectionState {
  DISCONNECTED = "disconnected", 
  CONNECTING = "connecting",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
  ERROR = "error"
}

export enum ConnectionType {
  SSE = "sse",
  POLLING = "polling"
}

export interface ConnectionStatus {
  /** Current connection state */
  state: ConnectionState;
  /** Type of connection currently in use */
  type: ConnectionType;
  /** Last successful connection timestamp */
  lastConnected?: number;
  /** Connection error details if in error state */
  error?: ConnectionError;
  /** Number of reconnection attempts */
  retryCount: number;
}

export interface ConnectionError {
  /** Error type for categorization */
  type: "network" | "authentication" | "parsing" | "timeout" | "server_error";
  /** Human-readable error message */
  message: string;
  /** HTTP status code if applicable */
  statusCode?: number;
  /** Original error object */
  originalError?: Error;
  /** Timestamp when error occurred */
  timestamp: number;
}

// ==================== Tool Request Types ====================

export interface ToolRequest {
  /** Unique request identifier */
  id: string;
  /** Name of the MCP tool to execute */
  tool: string;
  /** Arguments to pass to the tool */
  args: Record<string, any>;
  /** Request timestamp */
  timestamp: string;
  /** Session code this request belongs to */
  sessionCode: string;
}

export interface ToolResponse {
  /** Request ID this response corresponds to */
  requestId: string;
  /** Whether tool execution was successful */
  success: boolean;
  /** Tool execution result if successful */
  result?: any;
  /** Error details if execution failed */
  error?: {
    type: "execution_error" | "tool_not_found" | "invalid_args" | "codap_error";
    message: string;
    details?: any;
  };
  /** Response timestamp */
  timestamp: string;
  /** Execution duration in milliseconds */
  duration: number;
}

// ==================== SSE Event Types ====================

export interface SSEEvent {
  /** Event type */
  type: "connected" | "tool-request" | "heartbeat" | "error" | "timeout";
  /** Event data payload */
  data: Record<string, any>;
  /** Event timestamp */
  timestamp?: string;
}

export interface SSEConnectedEvent extends SSEEvent {
  type: "connected";
  data: {
    code: string;
    message: string;
    timestamp: string;
  };
}

export interface SSEToolRequestEvent extends SSEEvent {
  type: "tool-request";
  data: ToolRequest;
}

export interface SSEHeartbeatEvent extends SSEEvent {
  type: "heartbeat";
  data: {
    timestamp: string;
  };
}

export interface SSEErrorEvent extends SSEEvent {
  type: "error";
  data: {
    error: string;
    message: string;
    timestamp?: string;
  };
}

// ==================== Configuration Types ====================

export interface BrowserWorkerConfig {
  /** Base URL for the relay server */
  relayBaseUrl: string;
  /** Session code for this worker instance */
  sessionCode: string;
  /** SSE connection timeout in milliseconds */
  sseTimeout?: number;
  /** Polling interval in milliseconds for fallback */
  pollingInterval?: number;
  /** Maximum number of reconnection attempts */
  maxRetries?: number;
  /** Base delay between retry attempts in milliseconds */
  retryDelay?: number;
  /** Whether to enable debug logging */
  debug?: boolean;
}

export const DEFAULT_BROWSER_WORKER_CONFIG = {
  sseTimeout: 30000, // 30 seconds
  pollingInterval: 1000, // 1 second (confirmed acceptable)
  maxRetries: 5,
  retryDelay: 1000, // 1 second base delay
  debug: false
} as const;

// ==================== Service Interface Types ====================

export interface ConnectionManagerInterface {
  /** Current connection status */
  readonly status: ConnectionStatus;
  /** Start connection (SSE first, fallback to polling) */
  connect(): Promise<void>;
  /** Disconnect and cleanup */
  disconnect(): void;
  /** Register event handler */
  addEventListener(event: "message" | "error" | "status-change", handler: (data: any) => void): void;
  /** Remove event handler */
  removeEventListener(event: "message" | "error" | "status-change", handler: (data: any) => void): void;
}

export interface ToolExecutorInterface {
  /** Execute a tool request against CODAP */
  execute(request: ToolRequest): Promise<ToolResponse>;
  /** Check if a tool is supported */
  isToolSupported(toolName: string): boolean;
  /** Get list of supported tools */
  getSupportedTools(): string[];
  /** Check if executor is currently processing a request */
  isBusy(): boolean;
  /** Get number of queued requests */
  getQueueSize(): number;
}

export interface ResponseHandlerInterface {
  /** Post tool response back to relay */
  postResponse(response: ToolResponse): Promise<void>;
  /** Check if response posting is enabled */
  isEnabled(): boolean;
}

// ==================== Browser Worker Main Interface ====================

export interface BrowserWorkerInterface {
  /** Current configuration */
  readonly config: Required<BrowserWorkerConfig>;
  /** Current connection status */
  readonly status: ConnectionStatus;
  /** Start the browser worker */
  start(): Promise<void>;
  /** Stop the browser worker */
  stop(): void;
  /** Update configuration */
  updateConfig(config: Partial<BrowserWorkerConfig>): void;
  /** Register for status updates */
  onStatusChange(callback: (status: ConnectionStatus) => void): void;
  /** Register for tool execution events */
  onToolExecution(callback: (request: ToolRequest, response: ToolResponse) => void): void;
}

// ==================== Event Handler Types ====================

export type StatusChangeHandler = (status: ConnectionStatus) => void;
export type ToolExecutionHandler = (request: ToolRequest, response: ToolResponse) => void;
export type ErrorHandler = (error: ConnectionError) => void;
export type MessageHandler = (event: SSEEvent) => void;

// ==================== Tool Execution Queue Types ====================

export interface QueuedToolRequest {
  /** The original tool request */
  request: ToolRequest;
  /** Promise resolve function for response */
  resolve: (response: ToolResponse) => void;
  /** Promise reject function for errors */
  reject: (error: Error) => void;
  /** Timestamp when request was queued */
  queuedAt: number;
}

export interface ExecutionStatus {
  /** Whether executor is currently processing */
  isExecuting: boolean;
  /** Current request being processed */
  currentRequest?: ToolRequest;
  /** Number of requests in queue */
  queueSize: number;
  /** Last execution timestamp */
  lastExecution?: number;
}

// ==================== Utility Types ====================

export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Base delay between attempts in milliseconds */
  baseDelay: number;
  /** Maximum delay cap in milliseconds */
  maxDelay: number;
  /** Exponential backoff multiplier */
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2
};

// ==================== Integration Types ====================

/**
 * Interface for integrating with existing CODAP plugin API
 * Based on the existing CODAPCommandProcessor component
 */
export interface CODAPIntegration {
  /** Execute CODAP command via plugin API */
  executeCommand(action: string, resource: string, values: any): Promise<any>;
  /** Check if CODAP API is available */
  isAvailable(): boolean;
}

/**
 * Interface for integrating with existing session management
 * Based on the existing SessionService
 */
export interface SessionIntegration {
  /** Get current session data */
  getSessionData(): { code: string; ttl: number; expiresAt: string } | null;
  /** Check if session is still valid */
  isSessionValid(): boolean;
} 
