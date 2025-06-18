/**
 * Exponential backoff utility for connection retry logic
 * Implements exponential backoff with jitter to prevent thundering herd problems
 */

import { RetryConfig, DEFAULT_RETRY_CONFIG } from "../types";

/**
 * Calculate delay for exponential backoff with jitter
 * @param attempt - Current attempt number (1-based)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(
  attempt: number, 
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  // Calculate exponential delay: baseDelay * (backoffMultiplier ^ (attempt - 1))
  const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  
  // Cap at maximum delay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
  
  // Add jitter (±25% random variation) to prevent thundering herd
  const jitterFactor = 0.25;
  const jitter = (Math.random() - 0.5) * 2 * jitterFactor;
  const finalDelay = cappedDelay * (1 + jitter);
  
  return Math.max(finalDelay, 0);
}

/**
 * Check if retry should be attempted based on attempt count
 * @param attempt - Current attempt number (1-based)
 * @param config - Retry configuration
 * @returns True if retry should be attempted
 */
export function shouldRetry(
  attempt: number, 
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): boolean {
  return attempt <= config.maxAttempts;
}

/**
 * Sleep for specified number of milliseconds
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry configuration builder with sensible defaults
 */
export class RetryConfigBuilder {
  private config: RetryConfig = { ...DEFAULT_RETRY_CONFIG };

  /**
   * Set maximum number of retry attempts
   */
  maxAttempts(attempts: number): RetryConfigBuilder {
    this.config.maxAttempts = Math.max(1, attempts);
    return this;
  }

  /**
   * Set base delay between attempts
   */
  baseDelay(delay: number): RetryConfigBuilder {
    this.config.baseDelay = Math.max(0, delay);
    return this;
  }

  /**
   * Set maximum delay cap
   */
  maxDelay(delay: number): RetryConfigBuilder {
    this.config.maxDelay = Math.max(this.config.baseDelay, delay);
    return this;
  }

  /**
   * Set exponential backoff multiplier
   */
  backoffMultiplier(multiplier: number): RetryConfigBuilder {
    this.config.backoffMultiplier = Math.max(1, multiplier);
    return this;
  }

  /**
   * Build the retry configuration
   */
  build(): RetryConfig {
    return { ...this.config };
  }
}

/**
 * Create a retry configuration builder
 */
export function retryConfig(): RetryConfigBuilder {
  return new RetryConfigBuilder();
} 
