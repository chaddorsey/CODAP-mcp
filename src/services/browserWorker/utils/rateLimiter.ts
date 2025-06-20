/**
 * Rate Limiter for Browser Worker Response Handler
 * Implements client-side rate limiting to prevent server overload
 */

/**
 * Configuration for rate limiter
 */
export interface RateLimiterConfig {
  /** Requests per second allowed */
  requestsPerSecond: number;
  /** Maximum burst size */
  burstSize: number;
  /** Time window in milliseconds for rate calculations */
  windowMs: number;
}

/**
 * Default rate limiter configuration
 */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimiterConfig = {
  requestsPerSecond: 10,
  burstSize: 5,
  windowMs: 1000
};

/**
 * Rate limit status information
 */
export interface RateLimitStatus {
  /** Whether a request can be made now */
  allowed: boolean;
  /** Delay in milliseconds before next request is allowed */
  retryAfter: number;
  /** Current number of requests in window */
  currentRequests: number;
  /** Maximum requests allowed in window */
  maxRequests: number;
  /** Time remaining in current window (ms) */
  windowRemaining: number;
}

/**
 * Token bucket rate limiter implementation
 * Provides smooth rate limiting with burst capacity
 */
export class RateLimiter {
  private config: RateLimiterConfig;
  private tokens: number;
  private lastRefill: number;
  private requestTimes: number[] = [];

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config };
    this.tokens = this.config.burstSize;
    this.lastRefill = Date.now();
  }

  /**
   * Check if a request is allowed and consume a token if so
   */
  allowRequest(): RateLimitStatus {
    this.refillTokens();
    this.cleanOldRequests();

    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const requestsInWindow = this.requestTimes.filter(time => time > windowStart).length;

    // Check token bucket
    const hasTokens = this.tokens >= 1;
    
    // Check rate limit
    const withinRateLimit = requestsInWindow < this.config.requestsPerSecond;

    const allowed = hasTokens && withinRateLimit;

    if (allowed) {
      this.tokens -= 1;
      this.requestTimes.push(now);
    }

    return {
      allowed,
      retryAfter: this.calculateRetryAfter(),
      currentRequests: requestsInWindow,
      maxRequests: this.config.requestsPerSecond,
      windowRemaining: this.config.windowMs - (now % this.config.windowMs)
    };
  }

  /**
   * Wait for rate limit to allow a request
   * Returns a promise that resolves when a request can be made
   */
  async waitForRequest(): Promise<void> {
    const status = this.allowRequest();
    if (status.allowed) {
      return;
    }

    // Wait for the required delay
    await new Promise(resolve => setTimeout(resolve, status.retryAfter));
    
    // Recursively check again
    return this.waitForRequest();
  }

  /**
   * Update rate limits based on server response headers
   */
  updateFromHeaders(headers: Record<string, string>): void {
    // Standard rate limit headers
    const rateLimit = headers["x-ratelimit-limit"] || headers["ratelimit-limit"];
    const remaining = headers["x-ratelimit-remaining"] || headers["ratelimit-remaining"];
    const retryAfter = headers["retry-after"];

    if (rateLimit) {
      const limit = parseInt(rateLimit, 10);
      if (!isNaN(limit)) {
        this.config.requestsPerSecond = Math.min(limit, this.config.requestsPerSecond);
      }
    }

    if (remaining) {
      const rem = parseInt(remaining, 10);
      if (!isNaN(rem) && rem === 0) {
        // Rate limit exceeded, set tokens to 0
        this.tokens = 0;
      }
    }

    if (retryAfter) {
      const delay = parseInt(retryAfter, 10);
      if (!isNaN(delay)) {
        // Server telling us to wait - clear tokens
        this.tokens = 0;
        this.lastRefill = Date.now() + (delay * 1000);
      }
    }
  }

  /**
   * Get current rate limit status without consuming a token
   */
  getStatus(): RateLimitStatus {
    this.refillTokens();
    this.cleanOldRequests();

    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const requestsInWindow = this.requestTimes.filter(time => time > windowStart).length;

    return {
      allowed: this.tokens >= 1 && requestsInWindow < this.config.requestsPerSecond,
      retryAfter: this.calculateRetryAfter(),
      currentRequests: requestsInWindow,
      maxRequests: this.config.requestsPerSecond,
      windowRemaining: this.config.windowMs - (now % this.config.windowMs)
    };
  }

  /**
   * Reset the rate limiter state
   */
  reset(): void {
    this.tokens = this.config.burstSize;
    this.lastRefill = Date.now();
    this.requestTimes = [];
  }

  /**
   * Update rate limiter configuration
   */
  updateConfig(config: Partial<RateLimiterConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Adjust tokens if burst size changed
    if (config.burstSize !== undefined) {
      this.tokens = Math.min(this.tokens, config.burstSize);
    }
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refillTokens(): void {
    const now = Date.now();
    const timeDelta = now - this.lastRefill;
    
    if (timeDelta > 0) {
      const tokensToAdd = (timeDelta / 1000) * this.config.requestsPerSecond;
      this.tokens = Math.min(this.config.burstSize, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  /**
   * Remove request times outside the current window
   */
  private cleanOldRequests(): void {
    const cutoff = Date.now() - this.config.windowMs;
    this.requestTimes = this.requestTimes.filter(time => time > cutoff);
  }

  /**
   * Calculate how long to wait before next request
   */
  private calculateRetryAfter(): number {
    if (this.tokens >= 1) {
      const now = Date.now();
      const windowStart = now - this.config.windowMs;
      const requestsInWindow = this.requestTimes.filter(time => time > windowStart).length;
      
      if (requestsInWindow < this.config.requestsPerSecond) {
        return 0; // Can make request now
      }
      
      // Find oldest request in window and calculate when window will have space
      const oldestInWindow = Math.min(...this.requestTimes.filter(time => time > windowStart));
      return Math.max(0, (oldestInWindow + this.config.windowMs) - now);
    }

    // Wait for token refill
    const timeForOneToken = 1000 / this.config.requestsPerSecond;
    return timeForOneToken;
  }
} 
