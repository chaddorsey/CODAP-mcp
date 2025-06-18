/**
 * Batch Processor for Browser Worker Response Handler
 * Collects and processes responses in batches for improved efficiency
 */

import { ToolResponse } from "../types";

/**
 * Configuration for batch processor
 */
export interface BatchProcessorConfig {
  /** Maximum number of items in a batch */
  maxBatchSize: number;
  /** Maximum time to wait before sending a batch (ms) */
  maxBatchDelay: number;
  /** Whether to maintain response ordering */
  preserveOrder: boolean;
  /** Whether to enable batch processing (can be disabled for debugging) */
  enabled: boolean;
}

/**
 * Default batch processor configuration
 */
export const DEFAULT_BATCH_CONFIG: BatchProcessorConfig = {
  maxBatchSize: 10,
  maxBatchDelay: 1000, // 1 second
  preserveOrder: true,
  enabled: true
};

/**
 * Batch of responses ready for processing
 */
export interface ResponseBatch {
  /** Unique batch identifier */
  id: string;
  /** Array of responses in the batch */
  responses: ToolResponse[];
  /** Timestamp when batch was created */
  createdAt: number;
  /** Total size of batch payload in bytes (estimated) */
  estimatedSize: number;
}

/**
 * Batch processing statistics
 */
export interface BatchStatistics {
  /** Total batches processed */
  totalBatches: number;
  /** Total individual responses processed */
  totalResponses: number;
  /** Average batch size */
  averageBatchSize: number;
  /** Average time from first item to batch send */
  averageBatchDelay: number;
  /** Total bytes sent in batches */
  totalBytesSent: number;
}

/**
 * Batch processor implementation
 * Collects responses and processes them in efficient batches
 */
export class BatchProcessor {
  private config: BatchProcessorConfig;
  private currentBatch: ToolResponse[] = [];
  private batchTimer?: NodeJS.Timeout;
  private statistics: BatchStatistics;
  private batchCounter = 0;
  private batchTimes: number[] = [];

  constructor(
    config: Partial<BatchProcessorConfig> = {},
    private onBatchReady: (batch: ResponseBatch) => Promise<void>
  ) {
    this.config = { ...DEFAULT_BATCH_CONFIG, ...config };
    this.statistics = {
      totalBatches: 0,
      totalResponses: 0,
      averageBatchSize: 0,
      averageBatchDelay: 0,
      totalBytesSent: 0
    };
  }

  /**
   * Add a response to the batch queue
   * May trigger immediate batch processing if size limit reached
   */
  async addResponse(response: ToolResponse): Promise<void> {
    if (!this.config.enabled) {
      // Process immediately if batching disabled
      await this.processSingleResponse(response);
      return;
    }

    this.currentBatch.push(response);

    // Start timer if this is the first item in batch
    if (this.currentBatch.length === 1) {
      this.startBatchTimer();
    }

    // Check if batch is full
    if (this.currentBatch.length >= this.config.maxBatchSize) {
      await this.processBatch();
    }
  }

  /**
   * Force processing of current batch regardless of size or timing
   */
  async flush(): Promise<void> {
    if (this.currentBatch.length > 0) {
      await this.processBatch();
    }
  }

  /**
   * Get current batch statistics
   */
  getStatistics(): BatchStatistics {
    return { ...this.statistics };
  }

  /**
   * Reset batch statistics
   */
  resetStatistics(): void {
    this.statistics = {
      totalBatches: 0,
      totalResponses: 0,
      averageBatchSize: 0,
      averageBatchDelay: 0,
      totalBytesSent: 0
    };
    this.batchTimes = [];
  }

  /**
   * Update batch processor configuration
   */
  updateConfig(config: Partial<BatchProcessorConfig>): void {
    this.config = { ...this.config, ...config };
    
    // If disabled, flush current batch
    if (!config.enabled && this.currentBatch.length > 0) {
      this.flush();
    }
  }

  /**
   * Get current batch status
   */
  getBatchStatus(): {
    currentBatchSize: number;
    timeToNextFlush: number;
    batchingEnabled: boolean;
  } {
    const timeToNextFlush = this.batchTimer 
      ? this.config.maxBatchDelay - (Date.now() % this.config.maxBatchDelay)
      : 0;

    return {
      currentBatchSize: this.currentBatch.length,
      timeToNextFlush,
      batchingEnabled: this.config.enabled
    };
  }

  /**
   * Process the current batch
   */
  private async processBatch(): Promise<void> {
    if (this.currentBatch.length === 0) {
      return;
    }

    // Clear the timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    // Create batch object
    const responses = [...this.currentBatch];
    const batch: ResponseBatch = {
      id: this.generateBatchId(),
      responses: this.config.preserveOrder ? this.sortResponsesByTimestamp(responses) : responses,
      createdAt: Date.now(),
      estimatedSize: this.estimateBatchSize(responses)
    };

    // Clear current batch
    this.currentBatch = [];

    // Update statistics
    this.updateStatistics(batch);

    try {
      // Process the batch
      await this.onBatchReady(batch);
    } catch (error) {
      console.error("[BatchProcessor] Failed to process batch:", error);
      // Re-add responses for retry logic in the handler
      // Note: In a production system, we might want more sophisticated retry handling
      throw error;
    }
  }

  /**
   * Process a single response immediately (when batching disabled)
   */
  private async processSingleResponse(response: ToolResponse): Promise<void> {
    const batch: ResponseBatch = {
      id: this.generateBatchId(),
      responses: [response],
      createdAt: Date.now(),
      estimatedSize: this.estimateBatchSize([response])
    };

    this.updateStatistics(batch);
    await this.onBatchReady(batch);
  }

  /**
   * Start the batch timer
   */
  private startBatchTimer(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.processBatch().catch(error => {
        console.error("[BatchProcessor] Timer-triggered batch processing failed:", error);
      });
    }, this.config.maxBatchDelay);
  }

  /**
   * Sort responses by timestamp for ordering preservation
   */
  private sortResponsesByTimestamp(responses: ToolResponse[]): ToolResponse[] {
    return [...responses].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });
  }

  /**
   * Estimate the size of a batch in bytes
   */
  private estimateBatchSize(responses: ToolResponse[]): number {
    try {
      return JSON.stringify(responses).length;
    } catch {
      // Fallback estimation
      return responses.length * 1024; // Estimate 1KB per response
    }
  }

  /**
   * Generate a unique batch ID
   */
  private generateBatchId(): string {
    return `batch_${Date.now()}_${++this.batchCounter}`;
  }

  /**
   * Update batch processing statistics
   */
  private updateStatistics(batch: ResponseBatch): void {
    this.statistics.totalBatches++;
    this.statistics.totalResponses += batch.responses.length;
    this.statistics.totalBytesSent += batch.estimatedSize;

    // Calculate average batch size
    this.statistics.averageBatchSize = Math.round(
      this.statistics.totalResponses / this.statistics.totalBatches
    );

    // Track batch delays for average calculation
    const oldestResponse = batch.responses.reduce((oldest, current) => {
      const currentTime = new Date(current.timestamp).getTime();
      const oldestTime = new Date(oldest.timestamp).getTime();
      return currentTime < oldestTime ? current : oldest;
    });

    const batchDelay = batch.createdAt - new Date(oldestResponse.timestamp).getTime();
    this.batchTimes.push(batchDelay);

    // Keep only last 100 batch times for rolling average
    if (this.batchTimes.length > 100) {
      this.batchTimes.shift();
    }

    // Calculate average batch delay
    if (this.batchTimes.length > 0) {
      const sum = this.batchTimes.reduce((acc, time) => acc + time, 0);
      this.statistics.averageBatchDelay = Math.round(sum / this.batchTimes.length);
    }
  }
} 