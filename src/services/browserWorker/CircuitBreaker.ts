/**
 * Circuit Breaker for Browser Worker
 * Prevents cascading failures by monitoring operation success rates
 */

import { 
  CircuitState, 
  CircuitBreakerConfig, 
  CircuitBreakerStats, 
  CircuitBreakerInterface 
} from "./types";

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  timeWindow: 60000, // 1 minute
  timeout: 30000, // 30 seconds
  testRequestCount: 3,
  successThreshold: 2
};

/**
 * Circuit Breaker implementation
 * Monitors operation failures and prevents cascading failures
 */
export class CircuitBreaker implements CircuitBreakerInterface {
  private config: CircuitBreakerConfig;
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private totalRequests = 0;
  private lastOpenTime?: number;
  private requestHistory: Array<{ timestamp: number; success: boolean }> = [];

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
  }

  /**
   * Execute an operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit is open and timeout has not elapsed
    if (this.state === CircuitState.OPEN) {
      if (!this.shouldAttemptRetry()) {
        throw new Error("Circuit breaker is OPEN - operation not allowed");
      }
      // Move to half-open state
      this.state = CircuitState.HALF_OPEN;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      lastOpenTime: this.lastOpenTime,
      nextRetryTime: this.calculateNextRetryTime()
    };
  }

  /**
   * Force circuit to open
   */
  forceOpen(): void {
    this.state = CircuitState.OPEN;
    this.lastOpenTime = Date.now();
  }

  /**
   * Force circuit to close
   */
  forceClose(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastOpenTime = undefined;
  }

  /**
   * Reset circuit breaker statistics
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.totalRequests = 0;
    this.lastOpenTime = undefined;
    this.requestHistory = [];
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.totalRequests++;
    this.successCount++;
    this.addToHistory(true);

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
      }
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.totalRequests++;
    this.failureCount++;
    this.addToHistory(false);

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.lastOpenTime = Date.now();
    } else if (this.state === CircuitState.CLOSED) {
      if (this.failureCount >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN;
        this.lastOpenTime = Date.now();
      }
    }
  }

  /**
   * Check if we should attempt retry when circuit is open
   */
  private shouldAttemptRetry(): boolean {
    if (!this.lastOpenTime) {
      return true;
    }
    return Date.now() - this.lastOpenTime >= this.config.timeout;
  }

  /**
   * Calculate next retry time
   */
  private calculateNextRetryTime(): number | undefined {
    if (this.state !== CircuitState.OPEN || !this.lastOpenTime) {
      return undefined;
    }
    return this.lastOpenTime + this.config.timeout;
  }

  /**
   * Add operation result to history
   */
  private addToHistory(success: boolean): void {
    const now = Date.now();
    this.requestHistory.push({ timestamp: now, success });

    // Clean old entries outside time window
    const cutoff = now - this.config.timeWindow;
    this.requestHistory = this.requestHistory.filter(entry => entry.timestamp > cutoff);
  }
} 