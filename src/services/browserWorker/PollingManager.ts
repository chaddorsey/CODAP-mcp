/**
 * Polling Manager for Browser Worker
 * Handles HTTP polling as fallback when SSE connections fail
 */

import {
  PollingManagerInterface,
  PollingStatus,
  PollingConfig,
  PollingResponse,
  ToolRequest,
  BrowserWorkerConfig,
  DEFAULT_BROWSER_WORKER_CONFIG,
  DEFAULT_POLLING_CONFIG,
  ConnectionError
} from "./types";
import { RequestDeduplicator } from "./utils/requestDeduplication";
import { calculateBackoffDelay, shouldRetry } from "./utils/exponentialBackoff";

/**
 * Event listener map for polling events
 */
interface PollingEventListeners {
  request: ((request: ToolRequest) => void)[];
  error: ((error: ConnectionError) => void)[];
  "status-change": ((status: PollingStatus) => void)[];
}

/**
 * PollingManager handles HTTP polling for tool requests
 */
export class PollingManager implements PollingManagerInterface {
  private config: Required<BrowserWorkerConfig>;
  private pollingConfig: PollingConfig;
  private isActive = false;
  private pollingTimer: NodeJS.Timeout | null = null;
  private retryTimer: NodeJS.Timeout | null = null;
  private currentInterval: number;
  private status: PollingStatus;
  private deduplicator: RequestDeduplicator;
  private eventListeners: PollingEventListeners;
  private retryCount = 0;
  private isPollingInProgress = false;

  constructor(config: BrowserWorkerConfig, pollingConfig?: Partial<PollingConfig>) {
    this.config = { ...DEFAULT_BROWSER_WORKER_CONFIG, ...config };
    this.pollingConfig = { ...DEFAULT_POLLING_CONFIG, ...pollingConfig };
    this.currentInterval = this.pollingConfig.interval;
    
    this.status = {
      isActive: false,
      interval: this.currentInterval,
      errorCount: 0,
      totalRequests: 0
    };

    this.deduplicator = new RequestDeduplicator(this.pollingConfig.maxTrackedIds);
    
    this.eventListeners = {
      request: [],
      error: [],
      "status-change": []
    };

    this.log("PollingManager initialized", {
      interval: this.currentInterval,
      maxTrackedIds: this.pollingConfig.maxTrackedIds
    });
  }

  /**
   * Start polling for requests
   */
  startPolling(): void {
    if (this.isActive) {
      this.log("Polling already active");
      return;
    }

    this.log("Starting polling", { interval: this.currentInterval });
    this.isActive = true;
    this.retryCount = 0;
    this.updateStatus();
    this.scheduleNextPoll();
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (!this.isActive) {
      this.log("Polling already stopped");
      return;
    }

    this.log("Stopping polling");
    this.isActive = false;
    this.clearTimers();
    this.updateStatus();
  }

  /**
   * Check if polling is active
   */
  isPolling(): boolean {
    return this.isActive;
  }

  /**
   * Set polling interval
   */
  setPollingInterval(interval: number): void {
    const oldInterval = this.currentInterval;
    this.currentInterval = Math.max(100, interval); // Minimum 100ms
    this.status.interval = this.currentInterval;
    
    this.log("Polling interval updated", { 
      from: oldInterval, 
      to: this.currentInterval 
    });

    // Restart polling with new interval if active
    if (this.isActive) {
      this.clearTimers();
      this.scheduleNextPoll();
    }

    this.updateStatus();
  }

  /**
   * Add event listener
   */
  addEventListener(event: "request" | "error" | "status-change", handler: (data: any) => void): void {
    const listeners = this.eventListeners[event];
    if (listeners && !listeners.includes(handler)) {
      listeners.push(handler);
      this.log(`Event listener added for ${event}`, { listenerCount: listeners.length });
    }
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: "request" | "error" | "status-change", handler: (data: any) => void): void {
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
   * Get current polling status
   */
  getStatus(): PollingStatus {
    return { ...this.status };
  }

  /**
   * Schedule the next polling attempt
   */
  private scheduleNextPoll(): void {
    if (!this.isActive) {
      return;
    }

    this.pollingTimer = setTimeout(() => {
      this.performPoll();
    }, this.currentInterval);
  }

  /**
   * Perform a single polling request
   */
  private async performPoll(): Promise<void> {
    if (!this.isActive || this.isPollingInProgress) {
      return;
    }

    this.isPollingInProgress = true;
    this.status.lastPollTime = Date.now();

    try {
      this.log("Performing poll request");
      
      const response = await this.fetchRequests();
      this.handlePollingResponse(response);
      
      // Reset retry count on successful poll
      this.retryCount = 0;
      this.status.lastSuccessTime = Date.now();
      
      // Schedule next poll
      this.scheduleNextPoll();

    } catch (error) {
      this.handlePollingError(error);
    } finally {
      this.isPollingInProgress = false;
      this.updateStatus();
    }
  }

  /**
   * Fetch requests from the relay server
   */
  private async fetchRequests(): Promise<PollingResponse> {
    const url = this.buildPollingUrl();
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data as PollingResponse;
  }

  /**
   * Build polling endpoint URL
   */
  private buildPollingUrl(): string {
    const baseUrl = this.config.relayBaseUrl.replace(/\/$/, "");
    let url = `${baseUrl}/api/poll?code=${encodeURIComponent(this.config.sessionCode)}`;
    
    // Add last processed ID for efficient polling
    const lastProcessedId = this.deduplicator.getLastProcessedId();
    if (lastProcessedId) {
      url += `&after=${encodeURIComponent(lastProcessedId)}`;
    }
    
    return url;
  }

  /**
   * Handle successful polling response
   */
  private handlePollingResponse(response: PollingResponse): void {
    this.log("Received polling response", { 
      requestCount: response.requests.length,
      timestamp: response.timestamp 
    });

    if (response.requests.length === 0) {
      this.log("No new requests in polling response");
      return;
    }

    // Filter out already processed requests
    const newRequests = this.deduplicator.filterNewRequests(response.requests);
    
    this.log("Processing new requests", { 
      total: response.requests.length,
      new: newRequests.length,
      filtered: response.requests.length - newRequests.length
    });

    // Process each new request
    newRequests.forEach(request => {
      this.deduplicator.markProcessed(request.id);
      this.status.totalRequests++;
      this.emitEvent("request", request);
    });

    // Update last processed ID if provided by server
    if (response.lastRequestId) {
      this.deduplicator.setLastProcessedId(response.lastRequestId);
    }
  }

  /**
   * Handle polling errors
   */
  private handlePollingError(error: unknown): void {
    this.status.errorCount++;
    
    const connectionError: ConnectionError = {
      type: "network",
      message: error instanceof Error ? error.message : "Unknown polling error",
      originalError: error instanceof Error ? error : undefined,
      timestamp: Date.now()
    };

    this.log("Polling error occurred", { error: connectionError });
    this.emitEvent("error", connectionError);

    // Implement retry with exponential backoff
    this.retryCount++;
    
    if (shouldRetry(this.retryCount, this.pollingConfig.retryConfig)) {
      const delay = calculateBackoffDelay(this.retryCount, this.pollingConfig.retryConfig);
      
      this.log("Scheduling polling retry", {
        attempt: this.retryCount,
        delay: `${delay}ms`
      });

      this.retryTimer = setTimeout(() => {
        this.scheduleNextPoll();
      }, delay);
    } else {
      this.log("Max polling retry attempts reached", { 
        retryCount: this.retryCount 
      });
      
      // Continue polling with normal interval even after max retries
      // This allows recovery if network conditions improve
      this.retryCount = 0;
      this.scheduleNextPoll();
    }
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
    
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /**
   * Update status and notify listeners
   */
  private updateStatus(): void {
    this.status.isActive = this.isActive;
    this.emitEvent("status-change", this.status);
  }

  /**
   * Emit event to registered listeners
   */
  private emitEvent(event: keyof PollingEventListeners, data: any): void {
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
      console.log(`[PollingManager] ${message}`, data || "");
    }
  }

  /**
   * Cleanup and dispose
   */
  dispose(): void {
    this.stopPolling();
    this.deduplicator.clear();
    
    // Clear all event listeners
    Object.keys(this.eventListeners).forEach(event => {
      this.eventListeners[event as keyof PollingEventListeners] = [];
    });
  }
} 
 
