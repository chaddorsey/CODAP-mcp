/**
 * Response Handler for Browser Worker
 * Posts tool execution results back to relay server with reliability features
 */

import { ToolResponse, ResponseHandlerInterface } from "./types";
import { RateLimiter, RateLimiterConfig } from "./utils/rateLimiter";
import { BatchProcessor, BatchProcessorConfig, ResponseBatch } from "./utils/batchProcessor";
import { exponentialBackoff } from "./utils/retry";

/**
 * Configuration for response handler
 */
export interface ResponseHandlerConfig {
  /** Base URL of the relay server */
  relayBaseUrl: string;
  /** API endpoint for posting responses */
  responseEndpoint: string;
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Request timeout in milliseconds */
  timeoutMs: number;
  /** Rate limiter configuration */
  rateLimiter: Partial<RateLimiterConfig>;
  /** Batch processor configuration */
  batchProcessor: Partial<BatchProcessorConfig>;
  /** Custom headers to include in requests */
  headers: Record<string, string>;
  /** Whether to enable debug logging */
  debug: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_RESPONSE_HANDLER_CONFIG: ResponseHandlerConfig = {
  relayBaseUrl: "/api/relay",
  responseEndpoint: "/responses",
  maxRetries: 3,
  timeoutMs: 10000, // 10 seconds
  rateLimiter: {
    requestsPerSecond: 10,
    burstSize: 5
  },
  batchProcessor: {
    maxBatchSize: 10,
    maxBatchDelay: 1000,
    enabled: true
  },
  headers: {
    "Content-Type": "application/json"
  },
  debug: false
};

/**
 * Response delivery result
 */
export interface DeliveryResult {
  /** Whether delivery was successful */
  success: boolean;
  /** HTTP status code returned */
  statusCode?: number;
  /** Error message if delivery failed */
  error?: string;
  /** Number of retry attempts made */
  retryCount: number;
  /** Total time taken for delivery (ms) */
  durationMs: number;
  /** Batch ID if response was sent as part of a batch */
  batchId?: string;
}

/**
 * Response handler statistics
 */
export interface ResponseHandlerStatistics {
  /** Total responses processed */
  totalResponses: number;
  /** Successful deliveries */
  successfulDeliveries: number;
  /** Failed deliveries */
  failedDeliveries: number;
  /** Total retry attempts made */
  totalRetries: number;
  /** Average delivery time (ms) */
  averageDeliveryTime: number;
  /** Rate limiter statistics */
  rateLimiter: {
    requestsInWindow: number;
    tokensAvailable: number;
  };
  /** Batch processor statistics */
  batching: {
    totalBatches: number;
    averageBatchSize: number;
    averageBatchDelay: number;
  };
}

/**
 * Response Handler implementation
 * Handles posting tool responses back to relay with retry, batching, and rate limiting
 */
export class ResponseHandler implements ResponseHandlerInterface {
  private config: ResponseHandlerConfig;
  private rateLimiter: RateLimiter;
  private batchProcessor: BatchProcessor;
  private statistics: ResponseHandlerStatistics;
  private deliveryTimes: number[] = [];

  constructor(config: Partial<ResponseHandlerConfig> = {}) {
    this.config = { ...DEFAULT_RESPONSE_HANDLER_CONFIG, ...config };
    
    // Initialize rate limiter
    this.rateLimiter = new RateLimiter(this.config.rateLimiter);
    
    // Initialize batch processor
    this.batchProcessor = new BatchProcessor(
      this.config.batchProcessor,
      this.processBatch.bind(this)
    );

    // Initialize statistics
    this.statistics = {
      totalResponses: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      totalRetries: 0,
      averageDeliveryTime: 0,
      rateLimiter: {
        requestsInWindow: 0,
        tokensAvailable: 0
      },
      batching: {
        totalBatches: 0,
        averageBatchSize: 0,
        averageBatchDelay: 0
      }
    };

    if (this.config.debug) {
      console.log("[ResponseHandler] Initialized with config:", this.config);
    }
  }

  /**
   * Post tool response back to relay (implementing ResponseHandlerInterface)
   */
  async postResponse(response: ToolResponse): Promise<void> {
    const result = await this.sendResponse(response);
    if (!result.success) {
      throw new Error(result.error || "Failed to post response");
    }
  }

  /**
   * Check if response posting is enabled (implementing ResponseHandlerInterface)
   */
  isEnabled(): boolean {
    return true; // Response handler is always enabled when instantiated
  }

  /**
   * Send a tool response back to the relay
   */
  async sendResponse(response: ToolResponse): Promise<DeliveryResult> {
    this.statistics.totalResponses++;

    if (this.config.debug) {
      console.log("[ResponseHandler] Queuing response:", response.requestId);
    }

    try {
      // Add to batch processor
      await this.batchProcessor.addResponse(response);
      
      // For individual tracking, we return a success status
      // The actual delivery happens asynchronously through batching
      return {
        success: true,
        retryCount: 0,
        durationMs: 0,
        batchId: undefined // Will be set when batch is processed
      };
    } catch (error) {
      if (this.config.debug) {
        console.error("[ResponseHandler] Failed to queue response:", error);
      }
      
      this.statistics.failedDeliveries++;
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        retryCount: 0,
        durationMs: 0
      };
    }
  }

  /**
   * Flush any pending responses immediately
   */
  async flush(): Promise<void> {
    await this.batchProcessor.flush();
  }

  /**
   * Get current handler statistics
   */
  getStatistics(): ResponseHandlerStatistics {
    const rateLimiterStatus = this.rateLimiter.getStatus();
    const batchStats = this.batchProcessor.getStatistics();

    return {
      ...this.statistics,
      rateLimiter: {
        requestsInWindow: rateLimiterStatus.currentRequests,
        tokensAvailable: rateLimiterStatus.allowed ? 1 : 0
      },
      batching: {
        totalBatches: batchStats.totalBatches,
        averageBatchSize: batchStats.averageBatchSize,
        averageBatchDelay: batchStats.averageBatchDelay
      }
    };
  }

  /**
   * Reset handler statistics
   */
  resetStatistics(): void {
    this.statistics = {
      totalResponses: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      totalRetries: 0,
      averageDeliveryTime: 0,
      rateLimiter: {
        requestsInWindow: 0,
        tokensAvailable: 0
      },
      batching: {
        totalBatches: 0,
        averageBatchSize: 0,
        averageBatchDelay: 0
      }
    };
    this.deliveryTimes = [];
    this.rateLimiter.reset();
    this.batchProcessor.resetStatistics();
  }

  /**
   * Update handler configuration
   */
  updateConfig(config: Partial<ResponseHandlerConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.rateLimiter) {
      this.rateLimiter.updateConfig(config.rateLimiter);
    }
    
    if (config.batchProcessor) {
      this.batchProcessor.updateConfig(config.batchProcessor);
    }
  }

  /**
   * Process a batch of responses
   * Called by BatchProcessor when a batch is ready
   */
  private async processBatch(batch: ResponseBatch): Promise<void> {
    const startTime = Date.now();
    
    if (this.config.debug) {
      console.log(`[ResponseHandler] Processing batch ${batch.id} with ${batch.responses.length} responses`);
    }

    // Wait for rate limiter
    await this.rateLimiter.waitForRequest();

    let lastError: Error | undefined;
    let success = false;

    // Retry with exponential backoff
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await this.sendBatchToRelay(batch);
        
        if (result.success) {
          success = true;
          this.statistics.successfulDeliveries += batch.responses.length;
          break;
        } else {
          lastError = new Error(result.error || "Unknown delivery error");
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error");
        
        if (this.config.debug) {
          console.warn(`[ResponseHandler] Batch delivery attempt ${attempt + 1} failed:`, lastError.message);
        }
      }

      if (attempt < this.config.maxRetries) {
        this.statistics.totalRetries++;
        const delay = exponentialBackoff(attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    const duration = Date.now() - startTime;
    this.updateDeliveryStats(duration);

    if (!success) {
      this.statistics.failedDeliveries += batch.responses.length;
      console.error(`[ResponseHandler] Failed to deliver batch ${batch.id} after ${this.config.maxRetries + 1} attempts:`, lastError?.message);
      throw lastError || new Error("Batch delivery failed");
    }

    if (this.config.debug) {
      console.log(`[ResponseHandler] Successfully delivered batch ${batch.id} in ${duration}ms`);
    }
  }

  /**
   * Send a batch to the relay server
   */
  private async sendBatchToRelay(batch: ResponseBatch): Promise<{ success: boolean; error?: string; statusCode?: number }> {
    const url = `${this.config.relayBaseUrl}${this.config.responseEndpoint}`;
    
    const payload = {
      batchId: batch.id,
      timestamp: new Date().toISOString(),
      responses: batch.responses
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

      const response = await fetch(url, {
        method: "POST",
        headers: this.config.headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Update rate limiter with response headers
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });
      this.rateLimiter.updateFromHeaders(headers);

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status
        };
      }

      return { success: true, statusCode: response.status };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          return { success: false, error: "Request timeout" };
        }
        return { success: false, error: error.message };
      }
      return { success: false, error: "Unknown network error" };
    }
  }

  /**
   * Update delivery time statistics
   */
  private updateDeliveryStats(duration: number): void {
    this.deliveryTimes.push(duration);
    
    // Keep only last 100 delivery times for rolling average
    if (this.deliveryTimes.length > 100) {
      this.deliveryTimes.shift();
    }

    // Calculate average delivery time
    if (this.deliveryTimes.length > 0) {
      const sum = this.deliveryTimes.reduce((acc, time) => acc + time, 0);
      this.statistics.averageDeliveryTime = Math.round(sum / this.deliveryTimes.length);
    }
  }
} 
