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
    type: "execution_error" | "tool_not_found" | "invalid_args" | "codap_error" | "routing_error";
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

// ==================== Polling Types ====================

/**
 * Polling request response from relay server
 */
export interface PollingResponse {
  requests: ToolRequest[];
  lastRequestId?: string;
  timestamp: number;
}

/**
 * Request deduplication tracking
 */
export interface RequestTracker {
  lastProcessedId?: string;
  processedIds: Set<string>;
  maxTrackedIds: number;
}

/**
 * Polling manager interface
 */
export interface PollingManagerInterface {
  /** Start polling for requests */
  startPolling(): void;
  /** Stop polling */
  stopPolling(): void;
  /** Check if polling is active */
  isPolling(): boolean;
  /** Set polling interval */
  setPollingInterval(interval: number): void;
  /** Add event listener */
  addEventListener(event: "request" | "error" | "status-change", handler: (data: any) => void): void;
  /** Remove event listener */
  removeEventListener(event: "request" | "error" | "status-change", handler: (data: any) => void): void;
  /** Get current polling status */
  getStatus(): PollingStatus;
}

/**
 * Polling status information
 */
export interface PollingStatus {
  isActive: boolean;
  interval: number;
  lastPollTime?: number;
  lastSuccessTime?: number;
  errorCount: number;
  totalRequests: number;
}

/**
 * Polling configuration
 */
export interface PollingConfig {
  interval: number;
  maxTrackedIds: number;
  retryConfig: RetryConfig;
}

/**
 * Default polling configuration
 */
export const DEFAULT_POLLING_CONFIG: PollingConfig = {
  interval: 1000, // 1 second
  maxTrackedIds: 1000, // Track last 1000 request IDs
  retryConfig: DEFAULT_RETRY_CONFIG
};

// ==================== Tool Request Parser Types ====================

/**
 * Parsed and validated tool request
 */
export interface ParsedToolRequest {
  /** Unique request identifier */
  id: string;
  /** Name of the tool to execute */
  tool: string;
  /** Tool parameters/arguments */
  parameters: Record<string, unknown>;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Parse error details
 */
export interface ParseError {
  /** Error code for categorization */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: Record<string, unknown>;
}

/**
 * Result of parsing operation
 */
export interface ParseResult {
  /** Whether parsing was successful */
  success: boolean;
  /** Parsed request data if successful */
  data?: ParsedToolRequest;
  /** Error details if parsing failed */
  error?: ParseError;
}

/**
 * Tool request parser interface
 */
export interface ToolRequestParserInterface {
  /** Parse raw request data into structured format */
  parseRequest(rawRequest: unknown): ParseResult;
  /** Validate that a tool is supported */
  validateTool(toolName: string): boolean;
  /** Validate tool parameters against schema */
  validateParameters(toolName: string, parameters: Record<string, unknown>): ParseError | null;
  /** Get list of supported tools */
  getSupportedTools(): string[];
}

// ==================== Tool Schema and Registry Types ====================

/**
 * Schema for a tool parameter
 */
export interface ToolParameterSchema {
  /** Parameter data type */
  type: "string" | "number" | "boolean" | "object" | "array";
  /** Parameter description */
  description?: string;
  /** Whether parameter is required */
  required?: boolean;
  /** Allowed values for enum types */
  enum?: unknown[];
  /** Default value if not provided */
  default?: unknown;
  /** Minimum value for numbers */
  minimum?: number;
  /** Maximum value for numbers */
  maximum?: number;
  /** Pattern for string validation */
  pattern?: string;
  /** Schema for object properties */
  properties?: Record<string, ToolParameterSchema>;
  /** Schema for array items */
  items?: ToolParameterSchema;
}

/**
 * Schema definition for a tool
 */
// ToolSchema and ToolRegistry are now exported from schemas/toolSchemas.ts

// ==================== Parser Configuration ====================

/**
 * Configuration for tool request parser
 */
export interface ToolRequestParserConfig {
  /** Maximum request size in bytes */
  maxRequestSize: number;
  /** Whether to enable security validation */
  enableSecurityValidation: boolean;
  /** Allow execution of unknown/unregistered tools */
  allowUnknownTools: boolean;
  /** Custom validation functions */
  customValidators?: Record<string, (value: unknown) => boolean>;
  /** Whether to sanitize input parameters */
  sanitizeInputs: boolean;
  /** Maximum string length for parameters */
  maxStringLength: number;
  /** Maximum object depth for nested parameters */
  maxObjectDepth: number;
}

// ==================== Error Handling Types ====================

export enum ErrorSeverity {
  INFO = "info",
  WARNING = "warning", 
  ERROR = "error",
  CRITICAL = "critical"
}

export enum ErrorCategory {
  NETWORK = "network",
  AUTHENTICATION = "authentication",
  VALIDATION = "validation",
  EXECUTION = "execution",
  CONFIGURATION = "configuration",
  RESOURCE = "resource",
  TIMEOUT = "timeout",
  UNKNOWN = "unknown"
}

export interface BrowserWorkerError {
  /** Unique error identifier */
  id: string;
  /** Error category for classification */
  category: ErrorCategory;
  /** Error severity level */
  severity: ErrorSeverity;
  /** Human-readable error message */
  message: string;
  /** Technical error details */
  details?: Record<string, unknown>;
  /** Component that generated the error */
  component: string;
  /** Original error object if applicable */
  originalError?: Error;
  /** Error timestamp */
  timestamp: number;
  /** Correlation ID for tracking related errors */
  correlationId?: string;
  /** Whether this error is retryable */
  retryable: boolean;
  /** Suggested recovery actions */
  recoveryActions?: string[];
}

export interface BrowserWorkerErrorHandler {
  /** Handle an error with appropriate strategy */
  handleError(error: BrowserWorkerError): Promise<ErrorHandlingResult>;
  /** Check if this handler can process the error */
  canHandle(error: BrowserWorkerError): boolean;
  /** Get handler priority (higher numbers = higher priority) */
  getPriority(): number;
}

export interface ErrorHandlingResult {
  /** Whether the error was handled successfully */
  handled: boolean;
  /** Whether to continue error propagation */
  propagate: boolean;
  /** Recovery action taken */
  action?: "retry" | "failover" | "ignore" | "escalate" | "shutdown";
  /** Delay before retry (if applicable) */
  retryDelay?: number;
  /** Additional result data */
  data?: Record<string, unknown>;
}

// ==================== Circuit Breaker Types ====================

export enum CircuitState {
  CLOSED = "closed",
  OPEN = "open", 
  HALF_OPEN = "half_open"
}

export interface CircuitBreakerConfig {
  /** Failure threshold to open circuit */
  failureThreshold: number;
  /** Time window for failure counting (ms) */
  timeWindow: number;
  /** Timeout before attempting recovery (ms) */
  timeout: number;
  /** Number of test requests in half-open state */
  testRequestCount: number;
  /** Success threshold to close circuit from half-open */
  successThreshold: number;
}

export interface CircuitBreakerStats {
  /** Current circuit state */
  state: CircuitState;
  /** Failure count in current window */
  failureCount: number;
  /** Success count in current window */
  successCount: number;
  /** Total requests in current window */
  totalRequests: number;
  /** Time when circuit was last opened */
  lastOpenTime?: number;
  /** Next retry time when circuit is open */
  nextRetryTime?: number;
}

export interface CircuitBreakerInterface {
  /** Execute an operation with circuit breaker protection */
  execute<T>(operation: () => Promise<T>): Promise<T>;
  /** Get current circuit breaker statistics */
  getStats(): CircuitBreakerStats;
  /** Force circuit to open */
  forceOpen(): void;
  /** Force circuit to close */
  forceClose(): void;
  /** Reset circuit breaker statistics */
  reset(): void;
}

// ==================== Health Monitoring Types ====================

export enum HealthStatus {
  HEALTHY = "healthy",
  DEGRADED = "degraded",
  UNHEALTHY = "unhealthy",
  UNKNOWN = "unknown"
}

export interface HealthCheck {
  /** Component being checked */
  component: string;
  /** Current health status */
  status: HealthStatus;
  /** Health check timestamp */
  timestamp: number;
  /** Response time in milliseconds */
  responseTime: number;
  /** Health check details */
  details?: Record<string, unknown>;
  /** Error information if unhealthy */
  error?: string;
}

export interface HealthMonitorConfig {
  /** Health check interval in milliseconds */
  checkInterval: number;
  /** Health check timeout in milliseconds */
  checkTimeout: number;
  /** Number of failed checks before marking unhealthy */
  unhealthyThreshold: number;
  /** Number of successful checks to recover from unhealthy */
  healthyThreshold: number;
  /** Components to monitor */
  components: string[];
}

export interface HealthMonitorInterface {
  /** Start health monitoring */
  start(): void;
  /** Stop health monitoring */
  stop(): void;
  /** Get health status for all components */
  getHealthStatus(): Record<string, HealthCheck>;
  /** Get health status for specific component */
  getComponentHealth(component: string): HealthCheck | undefined;
  /** Register a health check function for a component */
  registerHealthCheck(component: string, checkFn: () => Promise<HealthCheck>): void;
  /** Unregister health check for a component */
  unregisterHealthCheck(component: string): void;
}

// ==================== Recovery Manager Types ====================

export interface RecoveryAction {
  /** Recovery action type */
  type: "reconnect" | "restart" | "failover" | "retry" | "reset";
  /** Component to apply recovery to */
  component: string;
  /** Recovery action parameters */
  parameters?: Record<string, unknown>;
  /** Priority of this recovery action */
  priority: number;
  /** Maximum attempts for this recovery */
  maxAttempts: number;
  /** Current attempt count */
  attemptCount: number;
}

export interface RecoveryResult {
  /** Whether recovery was successful */
  success: boolean;
  /** Recovery action that was executed */
  action: RecoveryAction;
  /** Time taken for recovery (ms) */
  duration: number;
  /** Error details if recovery failed */
  error?: string;
  /** Next recovery action if this one failed */
  nextAction?: RecoveryAction;
}

export interface RecoveryManagerInterface {
  /** Execute recovery action for a component */
  executeRecovery(component: string, error: BrowserWorkerError): Promise<RecoveryResult>;
  /** Register recovery strategy for error type */
  registerRecoveryStrategy(errorCategory: ErrorCategory, strategy: RecoveryStrategy): void;
  /** Get recovery statistics */
  getRecoveryStats(): Record<string, RecoveryStats>;
}

export interface RecoveryStrategy {
  /** Create recovery actions for an error */
  createRecoveryActions(error: BrowserWorkerError): RecoveryAction[];
  /** Check if this strategy applies to the error */
  appliesTo(error: BrowserWorkerError): boolean;
}

export interface RecoveryStats {
  /** Total recovery attempts */
  totalAttempts: number;
  /** Successful recoveries */
  successfulRecoveries: number;
  /** Failed recoveries */
  failedRecoveries: number;
  /** Average recovery time */
  averageRecoveryTime: number;
  /** Last recovery attempt timestamp */
  lastAttempt?: number;
}

/**
 * Default parser configuration
 */
export const DEFAULT_PARSER_CONFIG: ToolRequestParserConfig = {
  maxRequestSize: 1024 * 1024, // 1MB
  enableSecurityValidation: true,
  allowUnknownTools: false,
  customValidators: {},
  sanitizeInputs: true,
  maxStringLength: 10000,
  maxObjectDepth: 10
};
 
