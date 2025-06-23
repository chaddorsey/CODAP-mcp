/**
 * Connection Manager for Browser Worker
 * Handles SSE connections with EventSource API, heartbeat monitoring, and error recovery
 */

import {
  ConnectionManagerInterface,
  ConnectionStatus,
  ConnectionState,
  ConnectionType,
  ConnectionError,
  SSEEvent,
  SSEConnectedEvent,
  SSEToolRequestEvent,
  SSEHeartbeatEvent,
  SSEErrorEvent,
  BrowserWorkerConfig,
  DEFAULT_BROWSER_WORKER_CONFIG,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  StatusChangeHandler,
  MessageHandler,
  ErrorHandler
} from "./types";
import { calculateBackoffDelay, shouldRetry } from "./utils/exponentialBackoff";

/**
 * Event listener type definition
 */
interface EventListenerMap {
  "message": MessageHandler[];
  "error": ErrorHandler[];
  "status-change": StatusChangeHandler[];
}

/**
 * ConnectionManager handles SSE connections to the relay server
 */
export class ConnectionManager implements ConnectionManagerInterface {
  private config: Required<BrowserWorkerConfig>;
  private retryConfig: RetryConfig;
  private eventSource: EventSource | null = null;
  private currentStatus: ConnectionStatus;
  private eventListeners: EventListenerMap;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private lastHeartbeat = 0;
  private isConnecting = false;
  private isDisconnected = true;
  private connectionResolver: ((value?: void | PromiseLike<void>) => void) | null = null;
  private connectionRejecter: ((reason?: any) => void) | null = null;

  // Timing constants - optimized for faster connection
  private static readonly HEARTBEAT_TIMEOUT_MS = 45000; // Reduced from 60s to 45s
  private static readonly HEARTBEAT_CHECK_INTERVAL_MS = 15000; // Reduced from 30s to 15s
  private static readonly INITIAL_POLL_INTERVAL_MS = 500; // Fast polling for first 30 seconds
  private static readonly NORMAL_POLL_INTERVAL_MS = 2000; // Normal polling after initial period

  constructor(config: BrowserWorkerConfig, retryConfig?: RetryConfig) {
    this.config = { ...DEFAULT_BROWSER_WORKER_CONFIG, ...config };
    this.retryConfig = retryConfig || DEFAULT_RETRY_CONFIG;
    
    this.currentStatus = {
      state: ConnectionState.DISCONNECTED,
      type: ConnectionType.SSE,
      retryCount: 0
    };

    this.eventListeners = {
      "message": [],
      "error": [],
      "status-change": []
    };

    this.log("ConnectionManager initialized", { 
      relayBaseUrl: this.config.relayBaseUrl,
      sessionCode: this.config.sessionCode 
    });
  }

  /**
   * Get current connection status
   */
  get status(): ConnectionStatus {
    return { ...this.currentStatus };
  }

  /**
   * Start SSE connection to relay server
   */
  async connect(): Promise<void> {
    if (this.isConnecting) {
      this.log("Connection already in progress");
      return;
    }

    this.isConnecting = true;
    this.isDisconnected = false;
    this.updateStatus(ConnectionState.CONNECTING);

    try {
      await this.establishSSEConnection();
    } catch (error) {
      this.handleConnectionError(error as Error);
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.log("Disconnecting connection manager");
    
    this.isDisconnected = true;
    this.isConnecting = false;

    // Clear timers
    this.clearHeartbeatTimer();
    this.clearReconnectTimer();

    // Close EventSource
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // Update status
    this.updateStatus(ConnectionState.DISCONNECTED);
    this.currentStatus.retryCount = 0;
  }

  /**
   * Add event listener
   */
  addEventListener(event: "message" | "error" | "status-change", handler: (data: any) => void): void {
    const listeners = this.eventListeners[event];
    if (listeners && !listeners.includes(handler)) {
      listeners.push(handler);
      this.log(`Event listener added for ${event}`, { listenerCount: listeners.length });
    }
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: "message" | "error" | "status-change", handler: (data: any) => void): void {
    const listeners = this.eventListeners[event];
    if (listeners) {
      const index = listeners.indexOf(handler);
      if (index !== -1) {
        listeners.splice(index, 1);
        this.log(`Event listener removed for ${event}`, { listenerCount: listeners.length });
      }
    }
  }

  /**
   * Establish SSE connection with EventSource
   */
  private async establishSSEConnection(): Promise<void> {
    const url = this.buildSSEUrl();
    this.log("Establishing SSE connection", { url });

    return new Promise((resolve, reject) => {
      // Store resolvers for later use
      this.connectionResolver = resolve;
      this.connectionRejecter = reject;
      
      try {
        this.eventSource = new EventSource(url);
        
        // Set up a timeout for connection establishment
        const connectionTimeout = setTimeout(() => {
          this.log("SSE connection timeout");
          if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
          }
          this.connectionResolver = null;
          this.connectionRejecter = null;
          reject(new Error("SSE connection timeout"));
        }, 10000); // 10 second timeout

        // Connection opened successfully - but wait for server confirmation
        this.eventSource.onopen = () => {
          clearTimeout(connectionTimeout);
          this.log("SSE connection opened - waiting for server confirmation");
          // Don't update to CONNECTED yet - wait for server's "connected" event
          this.updateStatus(ConnectionState.CONNECTING);
          this.currentStatus.retryCount = 0;
          this.currentStatus.lastConnected = Date.now();
          // Don't resolve yet - wait for server confirmation
        };

        // Handle SSE messages
        this.eventSource.onmessage = (event) => {
          this.handleSSEMessage(event);
        };

        // Handle named events
        this.eventSource.addEventListener("connected", (event) => {
          this.handleConnectedEvent(event as MessageEvent);
        });

        this.eventSource.addEventListener("tool-request", (event) => {
          this.handleToolRequestEvent(event as MessageEvent);
        });

        this.eventSource.addEventListener("heartbeat", (event) => {
          this.handleHeartbeatEvent(event as MessageEvent);
        });

        this.eventSource.addEventListener("error", (event) => {
          this.handleServerErrorEvent(event as MessageEvent);
        });

        this.eventSource.addEventListener("timeout", (event) => {
          this.handleTimeoutEvent(event as MessageEvent);
        });

        // Handle EventSource errors
        this.eventSource.onerror = (event) => {
          clearTimeout(connectionTimeout);
          this.log("EventSource error occurred", { 
            readyState: this.eventSource?.readyState,
            event 
          });
          this.handleEventSourceError(event);
          
          // Clean up resolvers and reject
          if (this.connectionRejecter) {
            this.connectionRejecter(new Error("EventSource connection failed"));
            this.connectionResolver = null;
            this.connectionRejecter = null;
          } else {
            reject(new Error("EventSource connection failed"));
          }
        };

      } catch (error) {
        this.log("Failed to create EventSource", { error });
        reject(error);
      }
    });
  }

  /**
   * Build SSE endpoint URL
   */
  private buildSSEUrl(): string {
    const baseUrl = this.config.relayBaseUrl.replace(/\/$/, "");
    return `${baseUrl}/api/stream?sessionCode=${encodeURIComponent(this.config.sessionCode)}`;
  }

  /**
   * Handle generic SSE message
   */
  private handleSSEMessage(event: MessageEvent): void {
    this.log("Received SSE message", { data: event.data });
    
    try {
      const data = JSON.parse(event.data);
      const sseEvent: SSEEvent = {
        type: "tool-request", // Default type for unnamed events
        data,
        timestamp: new Date().toISOString()
      };
      this.emitEvent("message", sseEvent);
    } catch (error) {
      this.log("Failed to parse SSE message", { error, data: event.data });
    }
  }

  /**
   * Handle connected event
   */
  private handleConnectedEvent(event: MessageEvent): void {
    this.log("Received connected event - server confirmed connection");
    
    try {
      const data = JSON.parse(event.data);
      const connectedEvent: SSEConnectedEvent = {
        type: "connected",
        data,
        timestamp: new Date().toISOString()
      };
      
      // Now we're truly connected - server has confirmed
      this.updateStatus(ConnectionState.CONNECTED);
      this.startHeartbeatMonitoring();
      
      // Resolve the connection promise
      if (this.connectionResolver) {
        this.connectionResolver();
        this.connectionResolver = null;
        this.connectionRejecter = null;
      }
      
      this.emitEvent("message", connectedEvent);
    } catch (error) {
      this.log("Failed to parse connected event", { error });
    }
  }

  /**
   * Handle tool request event
   */
  private handleToolRequestEvent(event: MessageEvent): void {
    this.log("Received tool-request event", { data: event.data });
    
    try {
      const data = JSON.parse(event.data);
      const toolRequestEvent: SSEToolRequestEvent = {
        type: "tool-request",
        data,
        timestamp: new Date().toISOString()
      };
      this.emitEvent("message", toolRequestEvent);
    } catch (error) {
      this.log("Failed to parse tool-request event", { error });
    }
  }

  /**
   * Handle heartbeat event
   */
  private handleHeartbeatEvent(event: MessageEvent): void {
    this.log("Received heartbeat event", { data: event.data });
    
    this.lastHeartbeat = Date.now();
    
    try {
      const data = JSON.parse(event.data);
      const heartbeatEvent: SSEHeartbeatEvent = {
        type: "heartbeat",
        data,
        timestamp: new Date().toISOString()
      };
      this.emitEvent("message", heartbeatEvent);
    } catch (error) {
      this.log("Failed to parse heartbeat event", { error });
    }
  }

  /**
   * Handle server error event
   */
  private handleServerErrorEvent(event: MessageEvent): void {
    this.log("Received error event", { data: event.data });
    
    try {
      const data = JSON.parse(event.data);
      const errorEvent: SSEErrorEvent = {
        type: "error",
        data,
        timestamp: new Date().toISOString()
      };
      this.emitEvent("message", errorEvent);
      
      // Treat server errors as connection errors
      const connectionError: ConnectionError = {
        type: "server_error",
        message: data.message || "Server error received",
        timestamp: Date.now()
      };
      this.handleConnectionError(connectionError);
    } catch (error) {
      this.log("Failed to parse error event", { error });
    }
  }

  /**
   * Handle timeout event
   */
  private handleTimeoutEvent(event: MessageEvent): void {
    this.log("Received timeout event", { data: event.data });
    
    const connectionError: ConnectionError = {
      type: "timeout",
      message: "Session timeout received from server",
      timestamp: Date.now()
    };
    this.handleConnectionError(connectionError);
  }

  /**
   * Handle EventSource errors
   */
  private handleEventSourceError(event: Event): void {
    this.log("EventSource error occurred", { readyState: this.eventSource?.readyState });
    
    const connectionError: ConnectionError = {
      type: "network",
      message: "EventSource connection error",
      timestamp: Date.now()
    };

    // Check if this is a connection failure vs. temporary error
    if (this.eventSource?.readyState === EventSource.CLOSED) {
      this.handleConnectionError(connectionError);
    }
  }

  /**
   * Handle connection errors with retry logic
   */
  private handleConnectionError(error: Error | ConnectionError): void {
    const connectionError: ConnectionError = error instanceof Error ? {
      type: "network",
      message: error.message,
      originalError: error,
      timestamp: Date.now()
    } : error;

    this.log("Connection error occurred", { error: connectionError });

    // Update status
    this.currentStatus.error = connectionError;
    this.updateStatus(ConnectionState.ERROR);

    // Emit error event
    this.emitEvent("error", connectionError);

    // Close current connection
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.clearHeartbeatTimer();

    // Attempt reconnection if not disconnected
    if (!this.isDisconnected) {
      this.attemptReconnection();
    }
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private async attemptReconnection(): Promise<void> {
    this.currentStatus.retryCount++;
    
    if (!shouldRetry(this.currentStatus.retryCount, this.retryConfig)) {
      this.log("Max retry attempts reached", { retryCount: this.currentStatus.retryCount });
      this.updateStatus(ConnectionState.ERROR);
      return;
    }

    const delay = calculateBackoffDelay(this.currentStatus.retryCount, this.retryConfig);
    this.log("Scheduling reconnection", { 
      attempt: this.currentStatus.retryCount, 
      delay: `${delay}ms` 
    });

    this.updateStatus(ConnectionState.RECONNECTING);

    this.reconnectTimer = setTimeout(async () => {
      if (!this.isDisconnected) {
        this.log("Attempting reconnection", { attempt: this.currentStatus.retryCount });
        
                 try {
           await this.establishSSEConnection();
         } catch (error) {
           this.handleConnectionError(error as Error);
         }
      }
    }, delay);
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeatMonitoring(): void {
    this.lastHeartbeat = Date.now();
    
    this.heartbeatTimer = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
      
      if (timeSinceLastHeartbeat > ConnectionManager.HEARTBEAT_TIMEOUT_MS) {
        this.log("Heartbeat timeout detected", { 
          timeSinceLastHeartbeat: `${timeSinceLastHeartbeat}ms`,
          timeout: `${ConnectionManager.HEARTBEAT_TIMEOUT_MS}ms`
        });
        
        const connectionError: ConnectionError = {
          type: "timeout",
          message: "Heartbeat timeout - connection appears to be dead",
          timestamp: Date.now()
        };
        this.handleConnectionError(connectionError);
      }
    }, ConnectionManager.HEARTBEAT_CHECK_INTERVAL_MS);
  }

  /**
   * Clear heartbeat timer
   */
  private clearHeartbeatTimer(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Clear reconnect timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Update connection status and notify listeners
   */
  private updateStatus(state: ConnectionState): void {
    const previousState = this.currentStatus.state;
    this.currentStatus.state = state;
    
    if (state === ConnectionState.CONNECTED) {
      this.currentStatus.error = undefined;
    }

    this.log("Connection status updated", { 
      from: previousState, 
      to: state,
      retryCount: this.currentStatus.retryCount
    });

    this.emitEvent("status-change", this.currentStatus);
  }

  /**
   * Emit event to registered listeners
   */
  private emitEvent(event: keyof EventListenerMap, data: any): void {
    const listeners = this.eventListeners[event];
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          this.log("Error in event listener", { event, error });
        }
      });
    }
  }

  /**
   * Debug logging
   */
  private log(message: string, data?: Record<string, any>): void {
    if (this.config.debug) {
      console.log(`[ConnectionManager] ${message}`, data || "");
    }
  }
} 
