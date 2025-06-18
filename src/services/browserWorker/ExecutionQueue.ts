/**
 * Execution Queue for Browser Worker Tool Requests
 * Manages sequential processing of tool requests with queue management and statistics
 */

import { QueuedToolRequest, ExecutionStatus, ToolRequest, ToolResponse } from "./types";

/**
 * Configuration for execution queue
 */
export interface ExecutionQueueConfig {
  /** Maximum number of requests in queue */
  maxQueueSize: number;
  /** Whether to log queue operations */
  enableLogging: boolean;
  /** Timeout for individual request processing (ms) */
  requestTimeout: number;
}

/**
 * Default queue configuration
 */
export const DEFAULT_QUEUE_CONFIG: ExecutionQueueConfig = {
  maxQueueSize: 100,
  enableLogging: false,
  requestTimeout: 30000 // 30 seconds
};

/**
 * Queue statistics for monitoring
 */
export interface QueueStatistics {
  /** Current number of items in queue */
  currentSize: number;
  /** Maximum size reached since last reset */
  maxSizeReached: number;
  /** Total requests processed */
  totalProcessed: number;
  /** Total requests that failed */
  totalFailed: number;
  /** Average processing time in milliseconds */
  averageProcessingTime: number;
  /** Queue creation timestamp */
  createdAt: number;
  /** Last reset timestamp */
  lastResetAt?: number;
}

/**
 * Execution Queue implementation
 * Provides FIFO processing of tool requests with size management and monitoring
 */
export class ExecutionQueue {
  private queue: QueuedToolRequest[] = [];
  private config: ExecutionQueueConfig;
  private stats: QueueStatistics;
  private isProcessing = false;
  private processingTimes: number[] = [];

  constructor(config: Partial<ExecutionQueueConfig> = {}) {
    this.config = { ...DEFAULT_QUEUE_CONFIG, ...config };
    this.stats = {
      currentSize: 0,
      maxSizeReached: 0,
      totalProcessed: 0,
      totalFailed: 0,
      averageProcessingTime: 0,
      createdAt: Date.now()
    };
  }

  /**
   * Add a request to the queue
   * Returns a promise that resolves when the request is processed
   */
  enqueue(request: ToolRequest): Promise<ToolResponse> {
    return new Promise((resolve, reject) => {
      // Check queue size limit
      if (this.queue.length >= this.config.maxQueueSize) {
        const error = new Error(`Queue size limit exceeded (${this.config.maxQueueSize})`);
        this.logOperation("QUEUE_FULL", { requestId: request.id, queueSize: this.queue.length });
        reject(error);
        return;
      }

      const queuedRequest: QueuedToolRequest = {
        request,
        resolve,
        reject,
        queuedAt: Date.now()
      };

      this.queue.push(queuedRequest);
      this.updateStats();
      
      this.logOperation("ENQUEUE", { 
        requestId: request.id, 
        tool: request.tool, 
        queueSize: this.queue.length 
      });

      // Set timeout for request
      setTimeout(() => {
        const index = this.queue.findIndex(item => item.request.id === request.id);
        if (index !== -1) {
          this.queue.splice(index, 1);
          this.stats.totalFailed++;
          this.updateStats();
          
          const timeoutError = new Error(`Request timeout: ${request.id}`);
          this.logOperation("TIMEOUT", { requestId: request.id });
          reject(timeoutError);
        }
      }, this.config.requestTimeout);
    });
  }

  /**
   * Get the next request from the queue (FIFO)
   * Returns undefined if queue is empty
   */
  dequeue(): QueuedToolRequest | undefined {
    const item = this.queue.shift();
    if (item) {
      this.updateStats();
      this.logOperation("DEQUEUE", { 
        requestId: item.request.id, 
        queueSize: this.queue.length 
      });
    }
    return item;
  }

  /**
   * Peek at the next request without removing it
   */
  peek(): QueuedToolRequest | undefined {
    return this.queue[0];
  }

  /**
   * Get current queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Clear all requests from queue
   * Rejects all pending promises with cancellation error
   */
  clear(): void {
    const cancelledCount = this.queue.length;
    
    // Reject all pending requests
    this.queue.forEach(item => {
      const error = new Error(`Request cancelled: ${item.request.id}`);
      item.reject(error);
    });

    this.queue = [];
    this.stats.totalFailed += cancelledCount;
    this.updateStats();
    
    this.logOperation("CLEAR", { cancelledCount });
  }

  /**
   * Mark a request as successfully processed
   */
  markProcessed(requestId: string, processingTime: number): void {
    this.stats.totalProcessed++;
    this.processingTimes.push(processingTime);
    
    // Keep only last 100 processing times for average calculation
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
    }
    
    this.updateStats();
    this.logOperation("PROCESSED", { requestId, processingTime });
  }

  /**
   * Mark a request as failed
   */
  markFailed(requestId: string, error: Error): void {
    this.stats.totalFailed++;
    this.updateStats();
    this.logOperation("FAILED", { requestId, error: error.message });
  }

  /**
   * Get current queue statistics
   */
  getStatistics(): QueueStatistics {
    return { ...this.stats };
  }

  /**
   * Reset statistics (keeps current queue intact)
   */
  resetStatistics(): void {
    this.stats = {
      currentSize: this.queue.length,
      maxSizeReached: this.queue.length,
      totalProcessed: 0,
      totalFailed: 0,
      averageProcessingTime: 0,
      createdAt: this.stats.createdAt,
      lastResetAt: Date.now()
    };
    this.processingTimes = [];
  }

  /**
   * Get current execution status
   */
  getExecutionStatus(): ExecutionStatus {
    const current = this.queue[0];
    return {
      isExecuting: this.isProcessing,
      currentRequest: current?.request,
      queueSize: this.queue.length,
      lastExecution: this.stats.totalProcessed > 0 ? Date.now() : undefined
    };
  }

  /**
   * Set processing state
   */
  setProcessing(isProcessing: boolean): void {
    this.isProcessing = isProcessing;
  }

  /**
   * Update internal statistics
   */
  private updateStats(): void {
    this.stats.currentSize = this.queue.length;
    this.stats.maxSizeReached = Math.max(this.stats.maxSizeReached, this.queue.length);
    
    if (this.processingTimes.length > 0) {
      const sum = this.processingTimes.reduce((acc, time) => acc + time, 0);
      this.stats.averageProcessingTime = Math.round(sum / this.processingTimes.length);
    }
  }

  /**
   * Log queue operations if enabled
   */
  private logOperation(operation: string, details: Record<string, any>): void {
    if (this.config.enableLogging) {
      console.log(`[ExecutionQueue] ${operation}:`, details);
    }
  }
} 
